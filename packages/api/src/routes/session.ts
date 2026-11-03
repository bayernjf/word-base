import { Hono } from 'hono'
import { randomInt } from 'crypto'
import { supabase, getRequestContext } from '../context'
import { createSessionBootstrapIpLimiter, createSessionBootstrapGlobalLimiter } from '../utils/rateLimit'

// 评审 P2-2：匿名会话发放此前无任何限流，可被无限批量刷匿名用户。
// IP 级 + 全局双阈值（内存态，单实例；硬兜底为 Supabase 侧匿名用户配额）。
const bootstrapIpLimiter = createSessionBootstrapIpLimiter()
const bootstrapGlobalLimiter = createSessionBootstrapGlobalLimiter()

type HeaderReader = { req: { header: (key: string) => string | undefined } }

function clientIpKey(c: HeaderReader): string {
  const forwarded = c.req.header('x-forwarded-for')
  const ip = (forwarded ? forwarded.split(',')[0].trim() : '') || c.req.header('x-real-ip')?.trim() || ''
  return ip || 'unknown'
}

export function registerSessionRoutes(app: Hono) {
  app.post('/api/v1/session/bootstrap', async (c) => {
    try {
      const globalHit = bootstrapGlobalLimiter.hit('global')
      if (!globalHit.allowed) {
        return c.json({ error: 'rate_limited', retryAfterSeconds: globalHit.retryAfterSeconds }, 429)
      }
      const ipHit = bootstrapIpLimiter.hit(`ip:${clientIpKey(c)}`)
      if (!ipHit.allowed) {
        return c.json({ error: 'rate_limited', retryAfterSeconds: ipHit.retryAfterSeconds }, 429)
      }

      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) {
        return c.json({ error: error.message }, 400)
      }
      if (!data?.session) {
        return c.json({ error: 'session_not_created' }, 400)
      }
      return c.json({ token: data.session.access_token })
    } catch (err) {
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.post('/api/v1/pairing/new', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      // Generate 6-digit code using cryptographically secure random
      const code = String(randomInt(100000, 1000000))
      const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

      // Upsert pairing code (one active per user)
      const { error } = await db
        .from('pairing_codes')
        .upsert({
          user_id: user.id,
          code,
          expires_at: new Date(expiresAt).toISOString(),
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (error) throw error
      return c.json({ code, expiresAt })
    } catch (err) {
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.get('/api/v1/pairing/code', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const { data, error } = await db
        .from('pairing_codes')
        .select('code, expires_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        return c.json({ error: 'no_active_pairing_code' }, 404)
      }

      const expiresAt = new Date(data.expires_at).getTime()
      if (expiresAt < Date.now()) {
        return c.json({ error: 'pairing_code_expired' }, 410)
      }

      return c.json({ code: data.code, expiresAt })
    } catch (err) {
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })
}
