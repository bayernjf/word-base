import { Hono } from 'hono'
import { getRequestContext } from '../context'
import { parseBody, settingsBodySchema } from '../utils/validation'

export function registerSettingsRoutes(app: Hono) {
  app.get('/api/v1/settings', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const { data, error } = await db
        .from('user_settings')
        .select('settings_json, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        return c.json({ settings: null })
      }

      return c.json({ settings: data.settings_json, updatedAt: data.updated_at })
    } catch (err) {
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.put('/api/v1/settings', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, settingsBodySchema, { fallback: 'settings_required' })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)

      const now = new Date().toISOString()
      const { data, error } = await db
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings_json: parsed.data.settings,
          updated_at: now,
        }, { onConflict: 'user_id' })
        .select('settings_json, updated_at')
        .single()

      if (error) throw error
      return c.json({ settings: data.settings_json, updatedAt: data.updated_at })
    } catch (err) {
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })
}
