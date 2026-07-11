import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import { encryptApiKey, decryptApiKey } from './utils/crypto'

const app = new Hono()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const aiConfigEncryptionSecret = process.env.AI_CONFIG_ENCRYPTION_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

app.use(async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (c.req.method === 'OPTIONS') {
    return c.json({ ok: true }, 200)
  }
  
  await next()
})

const createUserSupabaseClient = (token: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

const extractBearerToken = (c: { req: { header: (key: string) => string | undefined } }) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
}

const getRequestContext = async (c: { req: { header: (key: string) => string | undefined } }) => {
  const token = extractBearerToken(c)
  if (!token) {
    return { token: '', user: null, db: null }
  }

  const db = createUserSupabaseClient(token)
  const {
    data: { user },
    error
  } = await db.auth.getUser(token)

  if (error || !user) {
    return { token, user: null, db }
  }

  return { token, user, db }
}

const buildAuthResponse = (session: { access_token: string; refresh_token: string; user: { id: string; email?: string; user_metadata?: { display_name?: string } } | null }) => ({
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  user: session.user ? {
    id: session.user.id,
    email: session.user.email || '',
    nickname: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User'
  } : null
})

const normalizeWordKey = (word: string, bookId: string) =>
  `${String(word || '').trim().toLowerCase()}::${String(bookId || '').trim()}`

const normalizeSourceLink = (link: string) => {
  const raw = String(link || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    url.hash = ''
    return url.toString()
  } catch {
    // 非 URL（纯文本来源），按原始值去重，仅去掉尾部 #fragment
    const hashIndex = raw.indexOf('#')
    return hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  }
}

const mergeContexts = (left: any[], right: any[]) => {
  const list = [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])]
  const seen = new Set()
  const merged: any[] = []

  for (const item of list) {
    const key = JSON.stringify({
      context: String(item?.context || '').trim(),
      sourceLink: normalizeSourceLink(item?.sourceLink || '')
    })
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  return merged
}

const dedupeIncomingWords = (words: any[]) => {
  const merged = new Map()

  for (const word of words) {
    const key = normalizeWordKey(word.word, word.book_id)
    if (!String(word.word || '').trim() || !String(word.book_id || '').trim()) {
      continue
    }

    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, word)
      continue
    }

    merged.set(key, {
      ...existing,
      ...word,
      frequency: Math.max(Number(existing.frequency) || 0, Number(word.frequency) || 0, 1),
      contexts: mergeContexts(existing.contexts, word.contexts),
      time_added: existing.time_added || word.time_added,
      time_updated: word.time_updated || existing.time_updated,
      updated_at: word.updated_at || existing.updated_at
    })
  }

  return [...merged.values()]
}

const buildApiKeyHint = (apiKey: string) => {
  const trimmed = String(apiKey || '').trim()
  return trimmed ? `••••${trimmed.slice(-4)}` : ''
}

const normalizeAiProvider = (provider: string) =>
  provider === 'anthropic'
    ? 'anthropic'
    : provider === 'gemini'
      ? 'gemini'
      : provider === 'openai-compatible'
        ? 'openai-compatible'
        : 'openai'

const defaultModelForProvider = (provider: string) => {
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

const callAiProviderRaw = async ({ config, prompt, jsonMode = true }: { config: any; prompt: string; jsonMode?: boolean }) => {
  const apiKey = await decryptApiKey(config.encrypted_api_key, aiConfigEncryptionSecret)
  const provider = normalizeAiProvider(config.provider)
  const model = config.model || defaultModelForProvider(provider)

  if (provider === 'gemini') {
    const response = await fetch(resolveGeminiGenerateContentUrl({ endpoint: config.endpoint || '', model, apiKey }), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          ...(jsonMode ? { responseMimeType: 'application/json' } : {})
        }
      })
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || 'gemini_request_failed')
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text || '')
      .join('\n') || ''
    return text
  }

  if (provider === 'anthropic') {
    const response = await fetch(resolveAnthropicMessagesUrl(config.endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || 'anthropic_request_failed')
    }

    const text = Array.isArray(data?.content)
      ? data.content.map((item: any) => item?.text || '').join('\n')
      : ''
    return text
  }

  const response = await fetch(resolveOpenAiChatUrl(config.endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      temperature: 0.2
    })
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'openai_compatible_request_failed')
  }

  return data?.choices?.[0]?.message?.content || ''
}

app.get('/api/v1/health', (c) => {
  return c.json({ ok: true })
})

app.post('/api/v1/auth/login', async (c) => {
  try {
    const body = await c.req.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!email || !password) {
      return c.json({ error: 'email_and_password_required' }, 400)
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return c.json({ error: error.message }, 401)
    }
    if (!data?.session) {
      return c.json({ error: 'session_not_created' }, 401)
    }

    return c.json(buildAuthResponse(data.session))
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.post('/api/v1/auth/register', async (c) => {
  try {
    const body = await c.req.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const nickname = String(body?.nickname || '').trim()

    if (!email || !password) {
      return c.json({ error: 'email_and_password_required' }, 400)
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: nickname || email.split('@')[0]
        }
      }
    })

    if (error) {
      return c.json({ error: error.message }, 400)
    }

    const userId = data?.user?.id || data?.session?.user?.id
    if (userId && data?.session?.access_token) {
      try {
        const bookClient = createUserSupabaseClient(data.session.access_token)
        const { data: books } = await bookClient
          .from('vocabulary_books')
          .select('id, name, is_sync, updated_at, created_at')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true })
        
        const allBooks = books || []
        const syncBooks = allBooks.filter((book: any) => book.is_sync)
        
        if (syncBooks.length === 0) {
          const now = new Date().toISOString()
          await bookClient
            .from('vocabulary_books')
            .insert({
              user_id: userId,
              name: '默认',
              description: '用于存放单词的默认单词本',
              word_count: 0,
              icon: 'BookOpen',
              is_sync: true,
              is_deleted: false,
              sync_version: 1,
              created_at: now,
              updated_at: now,
            })
        }
      } catch (bookErr) {
        console.error('创建默认单词本失败:', (bookErr as Error).message)
      }
    }

    if (!data?.session) {
      return c.json({ error: 'email_confirmation_required' }, 400)
    }

    return c.json(buildAuthResponse(data.session))
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.post('/api/v1/auth/refresh', async (c) => {
  try {
    const body = await c.req.json()
    const refreshToken = String(body?.refreshToken || '').trim()
    if (!refreshToken) {
      return c.json({ error: 'refresh_token_required' }, 400)
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    })

    if (error) {
      return c.json({ error: error.message }, 401)
    }
    if (!data?.session) {
      return c.json({ error: 'refresh_failed' }, 401)
    }

    return c.json(buildAuthResponse(data.session))
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.post('/api/v1/auth/logout', (c) => {
  return c.json({ ok: true })
})

app.delete('/api/v1/auth/delete-account', async (c) => {
  try {
    const { user } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    if (!supabaseAdmin) {
      return c.json({ error: 'service_role_key_required' }, 500)
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) {
      return c.json({ error: error.message }, 500)
    }

    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.get('/api/v1/ai/providers', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { data, error } = await db
      .from('ai_provider_configs')
      .select('id, name, provider, model, endpoint, api_key_hint, is_active, created_at, updated_at')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return c.json({ configs: (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      provider: row.provider,
      model: row.model,
      endpoint: row.endpoint || '',
      apiKeyHint: row.api_key_hint || '',
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })) })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.post('/api/v1/ai/providers', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const provider = normalizeAiProvider(body?.provider)
    const apiKey = String(body?.apiKey || '').trim()
    if (!apiKey) return c.json({ error: 'api_key_required' }, 400)

    const isActive = Boolean(body?.isActive)
    if (isActive) {
      const { error: clearError } = await db
        .from('ai_provider_configs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_active', true)
      if (clearError) throw clearError
    }

    const encryptedApiKey = await encryptApiKey(apiKey, aiConfigEncryptionSecret)

    const { data, error } = await db
      .from('ai_provider_configs')
      .insert({
        user_id: user.id,
        name: String(body?.name || '').trim() || 'AI Provider',
        provider,
        model: String(body?.model || '').trim() || defaultModelForProvider(provider),
        endpoint: String(body?.endpoint || '').trim() || null,
        encrypted_api_key: encryptedApiKey,
        api_key_hint: buildApiKeyHint(apiKey),
        is_active: isActive
      })
      .select('id, name, provider, model, endpoint, api_key_hint, is_active, created_at, updated_at')
      .single()

    if (error) throw error
    return c.json({ config: {
      id: data.id,
      name: data.name,
      provider: data.provider,
      model: data.model,
      endpoint: data.endpoint || '',
      apiKeyHint: data.api_key_hint || '',
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.patch('/api/v1/ai/providers/:id', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const payload: any = {
      updated_at: new Date().toISOString()
    }

    if (body?.name !== undefined) payload.name = String(body.name || '').trim() || 'AI Provider'
    if (body?.provider !== undefined) payload.provider = normalizeAiProvider(body.provider)
    if (body?.model !== undefined) payload.model = String(body.model || '').trim()
    if (body?.endpoint !== undefined) payload.endpoint = String(body.endpoint || '').trim() || null
    if (body?.apiKey !== undefined && String(body.apiKey || '').trim()) {
      const apiKey = String(body.apiKey).trim()
      payload.encrypted_api_key = await encryptApiKey(apiKey, aiConfigEncryptionSecret)
      payload.api_key_hint = buildApiKeyHint(apiKey)
    }
    if (body?.isActive !== undefined) payload.is_active = Boolean(body.isActive)

    if (payload.is_active) {
      const { error: clearError } = await db
        .from('ai_provider_configs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('id', c.req.param('id'))
      if (clearError) throw clearError
    }

    const { data, error } = await db
      .from('ai_provider_configs')
      .update(payload)
      .eq('id', c.req.param('id'))
      .eq('user_id', user.id)
      .select('id, name, provider, model, endpoint, api_key_hint, is_active, created_at, updated_at')
      .single()

    if (error) throw error
    return c.json({ config: {
      id: data.id,
      name: data.name,
      provider: data.provider,
      model: data.model,
      endpoint: data.endpoint || '',
      apiKeyHint: data.api_key_hint || '',
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.delete('/api/v1/ai/providers/:id', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { error } = await db
      .from('ai_provider_configs')
      .delete()
      .eq('id', c.req.param('id'))
      .eq('user_id', user.id)

    if (error) throw error
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.post('/api/v1/ai/providers/test', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const provider = normalizeAiProvider(body?.provider)
    const model = String(body?.model || '').trim() || defaultModelForProvider(provider)
    const endpoint = String(body?.endpoint || '').trim()
    const apiKey = String(body?.apiKey || '').trim()
    const id = String(body?.id || '').trim()

    let encrypted_api_key: string
    if (apiKey) {
      encrypted_api_key = await encryptApiKey(apiKey, aiConfigEncryptionSecret)
    } else if (id) {
      const { data: saved, error: savedErr } = await db
        .from('ai_provider_configs')
        .select('encrypted_api_key')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (savedErr) throw savedErr
      if (!saved?.encrypted_api_key) return c.json({ error: 'api_key_required' }, 400)
      encrypted_api_key = saved.encrypted_api_key
    } else {
      return c.json({ error: 'api_key_required' }, 400)
    }

    const config = { provider, model, endpoint: endpoint || undefined, encrypted_api_key }
    let raw: string
    try {
      raw = await callAiProviderRaw({ config, prompt: 'Reply with the single word: OK', jsonMode: false })
    } catch (firstErr) {
      if (provider === 'openai-compatible' && endpoint && !/\/v\d+(\/|$)/.test(endpoint)) {
        const fallbackEndpoint = endpoint.replace(/\/+$/, '') + '/v1'
        const fallbackConfig = { ...config, endpoint: fallbackEndpoint }
        raw = await callAiProviderRaw({ config: fallbackConfig, prompt: 'Reply with the single word: OK', jsonMode: false })
      } else {
        throw firstErr
      }
    }
    const ok = String(raw || '').trim().length > 0
    return c.json({ ok, model, provider })
  } catch (err) {
    console.error('[ai/providers/test] error:', (err as Error).message)
    return c.json({ error: (err as Error).message || 'connection_test_failed' }, 502)
  }
})

app.post('/api/v1/books', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const book = {
      user_id: user.id,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_version: 1,
      is_deleted: false
    }

    const { data, error } = await db
      .from('vocabulary_books')
      .insert(book)
      .select()

    if (error) throw error
    return c.json(data[0])
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.get('/api/v1/books', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { data, error } = await db
      .from('vocabulary_books')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('is_sync', { ascending: false })
      .order('created_at')

    if (error) throw error
    return c.json(data)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.put('/api/v1/books/:id', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const { data, error } = await db
      .from('vocabulary_books')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', c.req.param('id'))
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    return c.json(data[0])
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.delete('/api/v1/books/:id', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { data, error } = await db
      .from('vocabulary_books')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', c.req.param('id'))
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    return c.json(data)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.get('/api/v1/words', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    let query = db
      .from('words')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)

    const bookId = c.req.query('bookId')
    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return c.json(data)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.post('/api/v1/words', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const word = {
      user_id: user.id,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_version: 1,
      is_deleted: false
    }

    const { data, error } = await db
      .from('words')
      .insert(word)
      .select()

    if (error) throw error
    return c.json(data[0])
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.delete('/api/v1/words/:id', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { data, error } = await db
      .from('words')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', c.req.param('id'))
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    return c.json(data)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.get('/api/v1/sync/status', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { data, error } = await db
      .from('sync_changelogs')
      .select('sync_version')
      .eq('user_id', user.id)
      .order('sync_version', { ascending: false })
      .limit(1)

    if (error) throw error
    return c.json({ version: data[0]?.sync_version || 0 })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.get('/api/v1/sync/full', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const [booksRes, wordsRes] = await Promise.all([
      db
        .from('vocabulary_books')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false),
      db
        .from('words')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
    ])

    if (booksRes.error) throw booksRes.error
    if (wordsRes.error) throw wordsRes.error

    return c.json({
      books: booksRes.data,
      words: wordsRes.data
    })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.post('/api/v1/words/batch', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const now = new Date().toISOString()
    const words = (body.words?.map((word: any) => {
      const mapped = {
        user_id: user.id,
        ...word,
        created_at: now,
        updated_at: now,
        sync_version: 1,
        is_deleted: false
      }
      return mapped
    }) || [])
    const dedupedWords = dedupeIncomingWords(words)

    if (dedupedWords.length === 0) {
      return c.json([])
    }

    const { data, error } = await db
      .from('words')
      .upsert(dedupedWords, {
        onConflict: 'user_id,word,book_id'
      })
      .select()

    if (error) throw error
    return c.json(data)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

app.post('/api/v1/words/batch-delete', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const wordIds = body.wordIds || []

    const { data, error } = await db
      .from('words')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .in('id', wordIds)
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    return c.json(data)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// =============================================
// AI Endpoints
// =============================================

const getActiveAiConfig = async (db: any, providerId?: string) => {
  let query = db
    .from('ai_provider_configs')
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

const extractJsonText = (raw: string): string => {
  const text = String(raw || '').trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text
}

const readString = (v: unknown): string => typeof v === 'string' ? v.trim() : ''
const readStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(readString).filter(Boolean) : []

// --- /api/v1/ai/enrich ---
app.post('/api/v1/ai/enrich', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const word = String(body?.word || '').trim()
    if (!word) return c.json({ error: 'word_required' }, 400)

    const config = await getActiveAiConfig(db, body?.providerId)
    const contexts = (body?.contexts || [])
      .map((item: any) => item?.context?.trim())
      .filter(Boolean)
      .slice(0, 5)

    const prompt = [
      'Generate vocabulary enrichment as strict JSON only.',
      'Schema: {"definition":"...","translation":"...","synonyms":["..."],"examples":[{"en":"...","zh":"..."}],"usageHistory":[{"context":"...","translation":"...","source":"AI"}],"memoryTip":"..."}',
      `Word: ${word}`,
      `Current translation: ${body?.translation || ''}`,
      `Contexts: ${JSON.stringify(contexts)}`,
      'Rules: "definition" must be an English explanation of the word meaning (English-English style); "translation" must be the Chinese translation; examples must be natural English with Chinese translations; synonyms must be English; memoryTip must be in Chinese; do not include markdown.',
    ].join('\n')

    const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
    const parsed = JSON.parse(extractJsonText(raw))

    const enrichment = {
      definition: readString(parsed.definition),
      translation: readString(parsed.translation),
      synonyms: readStringArray(parsed.synonyms).slice(0, 8),
      examples: (Array.isArray(parsed.examples) ? parsed.examples : [])
        .map((item: any) => {
          const en = readString(item?.en)
          const zh = readString(item?.zh)
          return en && zh ? { en, zh } : null
        })
        .filter(Boolean)
        .slice(0, 5),
      usageHistory: (Array.isArray(parsed.usageHistory) ? parsed.usageHistory : [])
        .map((item: any) => {
          const ctx = readString(item?.context)
          const tr = readString(item?.translation)
          return ctx && tr ? { context: ctx, translation: tr, source: readString(item?.source) || 'AI' } : null
        })
        .filter(Boolean)
        .slice(0, 5),
      memoryTip: readString(parsed.memoryTip) || undefined,
    }

    // Persist to word record if wordId provided
    if (body?.wordId) {
      await db.from('words').update({
        definition: enrichment.definition,
        translation: enrichment.translation,
        chinese_translation: enrichment.translation,
        synonyms: enrichment.synonyms,
        examples: enrichment.examples,
        usage_history: enrichment.usageHistory,
        memory_tip: enrichment.memoryTip || null,
        updated_at: new Date().toISOString(),
      }).eq('id', body.wordId).eq('user_id', user.id)
    }

    return c.json({ enrichment })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// --- /api/v1/ai/explain ---
app.post('/api/v1/ai/explain', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const word = String(body?.word || '').trim()
    if (!word) return c.json({ error: 'word_required' }, 400)

    const config = await getActiveAiConfig(db, body?.providerId)
    const contexts = (body?.contexts || [])
      .map((item: any) => item?.context?.trim())
      .filter(Boolean)
      .slice(0, 5)

    const prompt = [
      'Generate a deep explanation of the word as strict JSON only.',
      'Schema: {"contextInsights":[{"context":"...","insight":"..."}],"synonymComparison":"...","memoryHook":"..."}',
      `Word: ${word}`,
      `Contexts: ${JSON.stringify(contexts)}`,
      'Rules: contextInsights should analyze how the word is used in each context; synonymComparison should compare synonyms in Chinese; memoryHook should be a Chinese mnemonic; do not include markdown.',
    ].join('\n')

    const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
    const parsed = JSON.parse(extractJsonText(raw))

    const deepExplanation = {
      contextInsights: (Array.isArray(parsed.contextInsights) ? parsed.contextInsights : [])
        .map((item: any) => {
          const ctx = readString(item?.context)
          const insight = readString(item?.insight)
          return ctx && insight ? { context: ctx, insight } : null
        })
        .filter(Boolean)
        .slice(0, 5),
      synonymComparison: readString(parsed.synonymComparison),
      memoryHook: readString(parsed.memoryHook),
      generatedAt: Date.now(),
    }

    // Persist to word record if wordId provided
    if (body?.wordId) {
      await db.from('words').update({
        deep_explanation: deepExplanation,
        updated_at: new Date().toISOString(),
      }).eq('id', body.wordId).eq('user_id', user.id)
    }

    return c.json({ deepExplanation })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// --- /api/v1/ai/sense-cluster ---
app.post('/api/v1/ai/sense-cluster', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const word = String(body?.word || '').trim()
    if (!word) return c.json({ error: 'word_required' }, 400)

    const config = await getActiveAiConfig(db, body?.providerId)
    const contexts = (body?.contexts || [])
      .map((item: any) => item?.context?.trim())
      .filter(Boolean)
      .slice(0, 10)

    const prompt = [
      'Cluster the contexts of the word by its senses as strict JSON only.',
      'Schema: {"groups":[{"sense":"...","translation":"...","definition":"...","contexts":["..."]}]}',
      `Word: ${word}`,
      `Contexts: ${JSON.stringify(contexts)}`,
      'Rules: group contexts that share the same meaning; "sense" is a short English label; "translation" is the Chinese meaning; "definition" is an English explanation; "contexts" lists the input contexts that belong to this group; do not include markdown.',
    ].join('\n')

    const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
    const parsed = JSON.parse(extractJsonText(raw))

    const senseGroups = {
      groups: (Array.isArray(parsed.groups) ? parsed.groups : [])
        .map((item: any) => {
          const sense = readString(item?.sense)
          if (!sense) return null
          return {
            sense,
            translation: readString(item?.translation),
            definition: readString(item?.definition),
            contexts: readStringArray(item?.contexts),
          }
        })
        .filter(Boolean)
        .slice(0, 8),
      generatedAt: Date.now(),
    }

    // Persist to word record if wordId provided
    if (body?.wordId) {
      await db.from('words').update({
        sense_groups: senseGroups,
        updated_at: new Date().toISOString(),
      }).eq('id', body.wordId).eq('user_id', user.id)
    }

    return c.json({ senseGroups })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// --- /api/v1/ai/translate ---
app.post('/api/v1/ai/translate', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const text = String(body?.text || '').trim()
    if (!text) return c.json({ error: 'text_required' }, 400)
    const targetLanguage = String(body?.targetLanguage || 'zh')

    const config = await getActiveAiConfig(db, body?.providerId)
    const prompt = `Translate the following text to ${targetLanguage === 'zh' ? 'Chinese' : targetLanguage}. Return only the translation, no explanation.\n\nText: ${text}`

    const raw = await callAiProviderRaw({ config, prompt, jsonMode: false })
    const translatedText = String(raw || '').trim()

    return c.json({ translatedText })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// --- /api/v1/ai/story-generate ---
app.post('/api/v1/ai/story-generate', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const topic = String(body?.topic || '').trim()
    const difficulty = String(body?.difficulty || 'B2')
    const words = Array.isArray(body?.words) ? body.words : []
    const sourceWordIds = Array.isArray(body?.sourceWordIds) ? body.sourceWordIds : []

    // Check daily quota
    const today = new Date().toISOString().slice(0, 10)
    const { data: quota } = await db
      .from('story_generation_quota')
      .select('generated_count')
      .eq('user_id', user.id)
      .eq('quota_date', today)
      .maybeSingle()

    const DAILY_LIMIT = 20
    const currentCount = quota?.generated_count || 0
    if (currentCount >= DAILY_LIMIT) {
      return c.json({ error: 'daily_quota_exceeded' }, 429)
    }
    const remaining = DAILY_LIMIT - currentCount - 1

    const config = await getActiveAiConfig(db)
    const prompt = [
      'Generate a short English story for vocabulary learning as strict JSON only.',
      'Schema: {"title":"...","category":"...","contentEn":"...","contentZh":"...","sentences":[{"en":"...","zh":"...","words":["..."]}],"highlightedWords":["..."],"grammarInsight":"..."}',
      `Difficulty: ${difficulty}`,
      topic ? `Topic: ${topic}` : 'Topic: free choice',
      words.length ? `Include these words: ${words.join(', ')}` : '',
      'Rules: contentEn should be 150-300 words; contentZh is the full Chinese translation; sentences should be split with word arrays containing key vocabulary; highlightedWords lists target words; grammarInsight is a Chinese explanation of key grammar; do not include markdown.',
    ].filter(Boolean).join('\n')

    const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
    const parsed = JSON.parse(extractJsonText(raw))

    const story = {
      title: readString(parsed.title),
      category: readString(parsed.category) || topic || 'general',
      difficulty,
      contentEn: readString(parsed.contentEn),
      contentZh: readString(parsed.contentZh),
      sentences: Array.isArray(parsed.sentences) ? parsed.sentences.map((s: any) => ({
        en: readString(s?.en),
        zh: readString(s?.zh),
        words: readStringArray(s?.words),
      })).filter((s: any) => s.en) : [],
      highlightedWords: readStringArray(parsed.highlightedWords),
      grammarInsight: readString(parsed.grammarInsight),
    }

    // Persist story
    const { data: inserted, error: insertErr } = await db
      .from('stories')
      .insert({
        user_id: user.id,
        title: story.title,
        category: story.category,
        difficulty,
        content_en: story.contentEn,
        content_zh: story.contentZh,
        sentences: story.sentences,
        highlighted_words: story.highlightedWords,
        grammar_insight: story.grammarInsight,
        source_word_ids: sourceWordIds,
        is_public: false,
        is_deleted: false,
      })
      .select('id, created_at')
      .single()

    if (insertErr) throw insertErr

    // Update quota
    if (quota) {
      await db.from('story_generation_quota')
        .update({ generated_count: currentCount + 1 })
        .eq('user_id', user.id)
        .eq('quota_date', today)
    } else {
      await db.from('story_generation_quota')
        .insert({ user_id: user.id, quota_date: today, generated_count: 1 })
    }

    return c.json({
      story: { ...story, id: inserted.id, createdAt: inserted.created_at },
      remaining,
    })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// --- /api/v1/ai/tutor-chat ---
app.post('/api/v1/ai/tutor-chat', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const message = String(body?.message || '').trim()
    if (!message) return c.json({ error: 'message_required' }, 400)

    const config = await getActiveAiConfig(db)
    const story = body?.story
    const history = Array.isArray(body?.history) ? body.history : []

    const systemParts: string[] = [
      'You are an English tutor helping a Chinese student learn vocabulary through stories.',
      'Respond in Chinese. Be encouraging and concise.',
    ]

    if (story) {
      systemParts.push(`Current story title: ${story.title || ''}`)
      systemParts.push(`Story content: ${story.contentEn || ''}`)
    }

    const messages = [
      { role: 'system', content: systemParts.join('\n') },
      ...history.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: String(m.text || ''),
      })),
      { role: 'user', content: message },
    ]

    const prompt = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n')

    const raw = await callAiProviderRaw({ config, prompt, jsonMode: false })
    const reply = String(raw || '').trim()

    return c.json({ reply })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// =============================================
// Session & Pairing Endpoints
// =============================================

// --- /api/v1/session/bootstrap ---
app.post('/api/v1/session/bootstrap', async (c) => {
  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) {
      return c.json({ error: error.message }, 400)
    }
    if (!data?.session) {
      return c.json({ error: 'session_not_created' }, 400)
    }
    return c.json({ token: data.session.access_token })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// --- /api/v1/pairing/new ---
app.post('/api/v1/pairing/new', async (c) => {
  try {
    const { user, db } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000))
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
    return c.json({ error: (err as Error).message }, 500)
  }
})

// --- /api/v1/pairing/code ---
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
    return c.json({ error: (err as Error).message }, 500)
  }
})

export default app