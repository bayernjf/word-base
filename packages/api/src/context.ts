// Shared context: Supabase clients, helpers, and AI utilities used by route modules.
// Extracted from index.ts to avoid circular dependencies.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { encryptApiKey, decryptApiKey } from './utils/crypto'
import { logger, errorContext } from './utils/logger'
import { createAiUserLimiter, createAiGlobalLimiter, AI_DAILY_LIMIT } from './utils/rateLimit'

// ── Supabase clients ──

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
export const aiConfigEncryptionSecret = process.env.AI_CONFIG_ENCRYPTION_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null

// ── Auth helpers ──

export const createUserSupabaseClient = (token: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

export const extractBearerToken = (c: { req: { header: (key: string) => string | undefined } }) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
}

export const getRequestContext = async (c: { req: { header: (key: string) => string | undefined } }) => {
  const token = extractBearerToken(c)
  if (!token) return { token: '', user: null, db: null }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { token, user: null, db: null }
  return { token, user, db: createUserSupabaseClient(token) }
}

export const buildAuthResponse = (session: {
  access_token: string; refresh_token: string;
  user: { id: string; email?: string; user_metadata?: { display_name?: string } } | null
}) => ({
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  user: session.user ? {
    id: session.user.id,
    email: session.user.email || '',
    nickname: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User'
  } : null
})

// ── AI rate limiting ──

const aiUserLimiter = createAiUserLimiter()
const aiGlobalLimiter = createAiGlobalLimiter()

export interface AiLimitState {
  allowed: boolean; error?: string; retryAfterSeconds?: number
  quota?: { call_count: number } | null; quotaAvailable?: boolean
}

const quotaDateToday = () => new Date().toISOString().slice(0, 10)

export const checkAiCallLimits = async (
  db: ReturnType<typeof createUserSupabaseClient>, userId: string
): Promise<AiLimitState> => {
  const userHit = aiUserLimiter.hit(`u:${userId}`)
  if (!userHit.allowed) return { allowed: false, error: 'rate_limited', retryAfterSeconds: userHit.retryAfterSeconds }
  const globalHit = aiGlobalLimiter.hit('global')
  if (!globalHit.allowed) {
    logger.warn('ai_global_rate_limited', { userId })
    return { allowed: false, error: 'rate_limited', retryAfterSeconds: globalHit.retryAfterSeconds }
  }
  const { data: quota, error } = await db.from('ai_call_quota').select('call_count')
    .eq('user_id', userId).eq('quota_date', quotaDateToday()).maybeSingle()
  if (error) {
    logger.warn('ai_call_quota_read_failed', { code: error.code })
    return { allowed: true, quota: null, quotaAvailable: false }
  }
  if ((quota?.call_count || 0) >= AI_DAILY_LIMIT) return { allowed: false, error: 'daily_quota_exceeded' }
  return { allowed: true, quota, quotaAvailable: true }
}

export const recordAiCall = async (
  db: ReturnType<typeof createUserSupabaseClient>, userId: string, limit: AiLimitState
) => {
  if (!limit.quotaAvailable) return
  try {
    if (limit.quota) {
      await db.from('ai_call_quota').update({ call_count: limit.quota.call_count + 1 })
        .eq('user_id', userId).eq('quota_date', quotaDateToday())
    } else {
      await db.from('ai_call_quota').insert({ user_id: userId, quota_date: quotaDateToday(), call_count: 1 })
    }
  } catch (err) {
    logger.warn('ai_call_quota_write_failed', errorContext(err))
  }
}

export const aiLimitResponse = (c: { json: (obj: object, status: 429) => Response }, limit: AiLimitState) =>
  c.json({ error: limit.error || 'rate_limited', retryAfterSeconds: limit.retryAfterSeconds }, 429)

// ── Word helpers ──

export const normalizeWordKey = (word: string, bookId: string) =>
  `${String(word || '').trim().toLowerCase()}::${String(bookId || '').trim()}`

export const normalizeSourceLink = (link: string) => {
  const raw = String(link || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw); url.hash = ''; return url.toString()
  } catch {
    const hashIndex = raw.indexOf('#')
    return hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  }
}

export const mergeContexts = (left: any[], right: any[]) => {
  const list = [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])]
  const seen = new Set(); const merged: any[] = []
  for (const item of list) {
    const key = JSON.stringify({ context: String(item?.context || '').trim(), sourceLink: normalizeSourceLink(item?.sourceLink || '') })
    if (seen.has(key)) continue; seen.add(key); merged.push(item)
  }
  return merged
}

export const dedupeIncomingWords = (words: any[]) => {
  const merged = new Map()
  for (const word of words) {
    const key = normalizeWordKey(word.word, word.book_id)
    if (!String(word.word || '').trim() || !String(word.book_id || '').trim()) continue
    const existing = merged.get(key)
    if (!existing) { merged.set(key, word); continue }
    merged.set(key, {
      ...existing, ...word,
      frequency: Math.max(Number(existing.frequency) || 0, Number(word.frequency) || 0, 1),
      contexts: mergeContexts(existing.contexts, word.contexts),
      time_added: existing.time_added || word.time_added,
      time_updated: word.time_updated || existing.time_updated,
      updated_at: word.updated_at || existing.updated_at
    })
  }
  return [...merged.values()]
}

// ── AI Provider helpers ──

export const buildApiKeyHint = (apiKey: string) => {
  const trimmed = String(apiKey || '').trim()
  return trimmed ? `••••${trimmed.slice(-4)}` : ''
}

export const normalizeAiProvider = (provider: string) =>
  provider === 'anthropic' ? 'anthropic'
    : provider === 'gemini' ? 'gemini'
      : provider === 'openai-compatible' ? 'openai-compatible' : 'openai'

export const defaultModelForProvider = (provider: string) => {
  if (provider === 'anthropic') return 'claude-fable-5'
  if (provider === 'gemini') return 'gemini-2.5-flash'
  if (provider === 'openai-compatible') return 'gpt-4o-mini'
  return 'gpt-5.5'
}

const resolveOpenAiChatUrl = (endpoint: string) => {
  const base = String(endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '')
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`
}
const resolveAnthropicMessagesUrl = (endpoint: string) => {
  const base = String(endpoint || 'https://api.anthropic.com/v1').replace(/\/+$/, '')
  return base.endsWith('/messages') ? base : `${base}/messages`
}
const resolveGeminiGenerateContentUrl = ({ endpoint, model, apiKey }: { endpoint: string; model: string; apiKey: string }) => {
  const base = String(endpoint || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '')
  return `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
}

export const callAiProviderRaw = async ({ config, prompt, jsonMode = true }: { config: any; prompt: string; jsonMode?: boolean }) => {
  const apiKey = await decryptApiKey(config.encrypted_api_key, aiConfigEncryptionSecret)
  const provider = normalizeAiProvider(config.provider)
  const model = config.model || defaultModelForProvider(provider)

  if (provider === 'gemini') {
    const response = await fetch(resolveGeminiGenerateContentUrl({ endpoint: config.endpoint || '', model, apiKey }), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { ...(jsonMode ? { responseMimeType: 'application/json' } : {}) } })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error?.message || data?.error || 'gemini_request_failed')
    return data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('\n') || ''
  }

  if (provider === 'anthropic') {
    const response = await fetch(resolveAnthropicMessagesUrl(config.endpoint), {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error?.message || data?.error || 'anthropic_request_failed')
    return Array.isArray(data?.content) ? data.content.map((item: any) => item?.text || '').join('\n') : ''
  }

  const response = await fetch(resolveOpenAiChatUrl(config.endpoint), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}), temperature: 0.2 })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || data?.error || 'openai_compatible_request_failed')
  return data?.choices?.[0]?.message?.content || ''
}

export const getActiveAiConfig = async (db: any, providerId?: string) => {
  let query = db.from('ai_provider_configs')
    .select('id, name, provider, model, endpoint, encrypted_api_key, is_active')

  if (providerId) {
    query = query.eq('id', providerId)
  } else {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data) throw new Error('no_active_ai_provider')
  return data
}

export const extractJsonText = (raw: string): string => {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const braceMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  return braceMatch ? braceMatch[0] : trimmed
}

export const readString = (v: unknown): string => typeof v === 'string' ? v.trim() : ''
export const readStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean) : []

// Re-export for route modules
export { encryptApiKey, decryptApiKey } from './utils/crypto'
export { logger, errorContext } from './utils/logger'
