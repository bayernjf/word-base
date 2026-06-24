import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 初始化 Supabase 客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const genAiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || ''
const genAiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const genAiClient = genAiApiKey ? new GoogleGenAI({ apiKey: genAiApiKey }) : null
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

app.use(express.json())

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// 健康检查
app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true })
})

// 静态文件服务
app.use(express.static(join(__dirname, 'dist')))

// =============================================
// 辅助函数：记录同步变更日志
// =============================================
const createUserSupabaseClient = (token) =>
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

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
}

const getRequestContext = async (req) => {
  const token = extractBearerToken(req)
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

const recordChange = async (dbClient, userId, entityType, entityId, action) => {
  try {
    // 获取下一个版本号
    const { data: lastChange } = await dbClient
      .from('sync_changelogs')
      .select('sync_version')
      .eq('user_id', userId)
      .order('sync_version', { ascending: false })
      .limit(1)
    
    const nextVersion = (lastChange[0]?.sync_version || 0) + 1
    
    await dbClient
      .from('sync_changelogs')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        sync_version: nextVersion
      })
    
    return nextVersion
  } catch (err) {
    console.error('Error recording change:', err)
  }
}

// =============================================
// 兼容性中间件：模拟身份验证
// =============================================
const buildAuthResponse = (session) => ({
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  user: session.user ? {
    id: session.user.id,
    email: session.user.email,
    nickname: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User'
  } : null
})

const ensureSingleSyncBook = async (client, userId) => {
  const now = new Date().toISOString()
  
  const { data: existingBooks, error: existingBooksError } = await client
    .from('vocabulary_books')
    .select('id, name, is_sync, updated_at, created_at')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (existingBooksError) {
    throw existingBooksError
  }

  const allBooks = existingBooks || []
  const syncBooks = allBooks.filter((book) => book.is_sync)

  if (syncBooks.length === 1) {
    return syncBooks[0]
  }

  if (syncBooks.length > 1) {
    const preferredSyncBook = [...syncBooks].sort((left, right) => {
      const leftIsDefault = left.name === '默认'
      const rightIsDefault = right.name === '默认'
      if (leftIsDefault !== rightIsDefault) {
        return leftIsDefault ? 1 : -1
      }

      const leftUpdated = Date.parse(left.updated_at || left.created_at || '') || 0
      const rightUpdated = Date.parse(right.updated_at || right.created_at || '') || 0
      return rightUpdated - leftUpdated
    })[0]

    const { error } = await client
      .from('vocabulary_books')
      .update({
        is_sync: false,
        updated_at: now
      })
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('is_sync', true)
      .neq('id', preferredSyncBook.id)

    if (error) {
      console.error('修复重复同步单词本失败:', error)
      throw error
    }

    return preferredSyncBook
  }

  const defaultBook = allBooks.find((book) => book.name === '默认')
  if (defaultBook) {
    const { error } = await client
      .from('vocabulary_books')
      .update({
        is_sync: true,
        updated_at: now
      })
      .eq('id', defaultBook.id)
      .eq('user_id', userId)

    if (error) {
      console.error('修复默认同步单词本失败:', error)
      throw error
    }
    return { ...defaultBook, is_sync: true, updated_at: now }
  }

  const { error } = await client
    .from('vocabulary_books')
    .insert(
      {
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
      }
    )

  if (error) {
    console.error('创建默认同步单词本失败:', error)
    throw error
  }

  const { data: createdBook, error: createdBookError } = await client
    .from('vocabulary_books')
    .select('id, name, is_sync, updated_at, created_at')
    .eq('user_id', userId)
    .eq('name', '默认')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (createdBookError) {
    throw createdBookError
  }

  return createdBook
}

const normalizeWordKey = (word, bookId) =>
  `${String(word || '').trim().toLowerCase()}::${String(bookId || '').trim()}`

const mergeContexts = (left, right) => {
  const list = [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])]
  const seen = new Set()
  const merged = []

  for (const item of list) {
    const key = JSON.stringify({
      context: item?.context || '',
      sourceLink: item?.sourceLink || ''
    })
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  return merged
}

const dedupeIncomingWords = (words) => {
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

const buildAiEnrichmentPrompt = ({ word, translation, contexts }) => {
  const contextLines = (Array.isArray(contexts) ? contexts : [])
    .map((item) => String(item?.context || '').trim())
    .filter(Boolean)
    .slice(0, 5)

  return [
    'Generate vocabulary enrichment as strict JSON only.',
    'Schema: {"definition":"...","translation":"...","synonyms":["..."],"examples":[{"en":"...","zh":"..."}],"usageHistory":[{"context":"...","translation":"...","source":"AI"}],"memoryTip":"..."}',
    `Word: ${String(word || '').trim()}`,
    `Current translation: ${String(translation || '').trim()}`,
    `Contexts: ${JSON.stringify(contextLines)}`,
    'Rules: examples must be natural English with Chinese translations; synonyms must be English; do not include markdown.'
  ].join('\n')
}

const parseAiEnrichmentPayload = (raw) => {
  const text = String(raw || '').trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  const jsonText = fenced?.[1]
    ? fenced[1].trim()
    : start >= 0 && end > start
      ? text.slice(start, end + 1)
      : text

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('invalid_ai_enrichment_json')
  }

  const readString = (value) => (typeof value === 'string' ? value.trim() : '')
  const readStringArray = (value) => (Array.isArray(value) ? value.map(readString).filter(Boolean) : [])
  const readExamples = (value) => (Array.isArray(value) ? value : [])
    .map((item) => {
      const en = readString(item?.en)
      const zh = readString(item?.zh)
      return en && zh ? { en, zh } : null
    })
    .filter(Boolean)
  const readUsageHistory = (value) => (Array.isArray(value) ? value : [])
    .map((item) => {
      const context = readString(item?.context)
      const translation = readString(item?.translation)
      const source = readString(item?.source) || 'AI'
      return context && translation ? { context, translation, source } : null
    })
    .filter(Boolean)

  return {
    definition: readString(parsed?.definition),
    translation: readString(parsed?.translation),
    synonyms: readStringArray(parsed?.synonyms).slice(0, 8),
    examples: readExamples(parsed?.examples).slice(0, 5),
    usageHistory: readUsageHistory(parsed?.usageHistory).slice(0, 5),
    memoryTip: readString(parsed?.memoryTip)
  }
}

const getAiConfigEncryptionKey = () => {
  if (!aiConfigEncryptionSecret) {
    throw new Error('ai_config_encryption_key_required')
  }
  return createHash('sha256').update(aiConfigEncryptionSecret).digest()
}

const encryptApiKey = (apiKey) => {
  const key = getAiConfigEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(String(apiKey), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join('.')
}

const decryptApiKey = (payload) => {
  const key = getAiConfigEncryptionKey()
  const [ivText, tagText, encryptedText] = String(payload || '').split('.')
  if (!ivText || !tagText || !encryptedText) {
    throw new Error('invalid_encrypted_api_key')
  }

  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final()
  ]).toString('utf8')
}

const buildApiKeyHint = (apiKey) => {
  const trimmed = String(apiKey || '').trim()
  return trimmed ? `••••${trimmed.slice(-4)}` : ''
}

const serializeAiProviderConfig = (row) => ({
  id: row.id,
  name: row.name,
  provider: row.provider,
  model: row.model,
  endpoint: row.endpoint || '',
  apiKeyHint: row.api_key_hint || '',
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const normalizeAiProvider = (provider) =>
  provider === 'anthropic'
    ? 'anthropic'
    : provider === 'gemini'
      ? 'gemini'
      : provider === 'openai-compatible'
        ? 'openai-compatible'
        : 'openai'

const defaultModelForProvider = (provider) => {
  if (provider === 'anthropic') return 'claude-fable-5'
  if (provider === 'gemini') return 'gemini-2.5-flash'
  if (provider === 'openai-compatible') return 'gpt-4o-mini'
  return 'gpt-5.5'
}

const resolveOpenAiChatUrl = (endpoint) => {
  const base = String(endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '')
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`
}

const resolveAnthropicMessagesUrl = (endpoint) => {
  const base = String(endpoint || 'https://api.anthropic.com/v1').replace(/\/+$/, '')
  return base.endsWith('/messages') ? base : `${base}/messages`
}

const resolveGeminiGenerateContentUrl = ({ endpoint, model, apiKey }) => {
  const base = String(endpoint || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '')
  return `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
}

const fetchAiProvider = async (url, options) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('ai_provider_request_timeout')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

const generateAiEnrichmentWithConfig = async ({ config, prompt }) => {
  const apiKey = decryptApiKey(config.encrypted_api_key)
  const provider = normalizeAiProvider(config.provider)
  const model = config.model || defaultModelForProvider(provider)

  if (provider === 'gemini') {
    if (config.endpoint) {
      const response = await fetchAiProvider(resolveGeminiGenerateContentUrl({ endpoint: config.endpoint, model, apiKey }), {
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
            responseMimeType: 'application/json'
          }
        })
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.error || 'gemini_request_failed')
      }

      const text = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('\n') || ''
      return parseAiEnrichmentPayload(text)
    }

    const client = new GoogleGenAI({ apiKey })
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    })
    return parseAiEnrichmentPayload(response.text || '')
  }

  if (provider === 'anthropic') {
    const response = await fetchAiProvider(resolveAnthropicMessagesUrl(config.endpoint), {
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
      ? data.content.map((item) => item?.text || '').join('\n')
      : ''
    return parseAiEnrichmentPayload(text)
  }

  const response = await fetchAiProvider(resolveOpenAiChatUrl(config.endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'openai_compatible_request_failed')
  }

  return parseAiEnrichmentPayload(data?.choices?.[0]?.message?.content || '')
}

// =============================================
// 兼容性 API 端点
// =============================================

// 0. 认证相关
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')

    if (!email || !password) {
      return res.status(400).json({ error: 'email_and_password_required' })
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return res.status(401).json({ error: error.message })
    }
    if (!data?.session) {
      return res.status(401).json({ error: 'session_not_created' })
    }

    res.json(buildAuthResponse(data.session))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const nickname = String(req.body?.nickname || '').trim()

    if (!email || !password) {
      return res.status(400).json({ error: 'email_and_password_required' })
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
      return res.status(400).json({ error: error.message })
    }

    const userId = data?.user?.id || data?.session?.user?.id
    if (userId) {
      try {
        const bookClient = data?.session?.access_token
          ? createUserSupabaseClient(data.session.access_token)
          : supabaseAdmin
        if (bookClient) {
          await ensureSingleSyncBook(bookClient, userId)
        }
      } catch (bookErr) {
        console.error('创建默认单词本失败:', bookErr.message)
      }
    }

    if (!data?.session) {
      return res.status(400).json({ error: 'email_confirmation_required' })
    }

    res.json(buildAuthResponse(data.session))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/v1/auth/refresh', async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken || '').trim()
    if (!refreshToken) {
      return res.status(400).json({ error: 'refresh_token_required' })
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    })

    if (error) {
      return res.status(401).json({ error: error.message })
    }
    if (!data?.session) {
      return res.status(401).json({ error: 'refresh_failed' })
    }

    res.json(buildAuthResponse(data.session))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/v1/auth/logout', async (_req, res) => {
  res.json({ ok: true })
})

app.delete('/api/v1/auth/delete-account', async (req, res) => {
  try {
    const { user } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'service_role_key_required' })
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 1. 单词本相关
app.get('/api/v1/ai/providers', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await db
      .from('ai_provider_configs')
      .select('id, name, provider, model, endpoint, api_key_hint, is_active, created_at, updated_at')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    res.json({ configs: (data || []).map(serializeAiProviderConfig) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/v1/ai/providers', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const provider = normalizeAiProvider(req.body?.provider)
    const apiKey = String(req.body?.apiKey || '').trim()
    if (!apiKey) return res.status(400).json({ error: 'api_key_required' })

    const isActive = Boolean(req.body?.isActive)
    if (isActive) {
      const { error: clearError } = await db
        .from('ai_provider_configs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_active', true)
      if (clearError) throw clearError
    }

    const { data, error } = await db
      .from('ai_provider_configs')
      .insert({
        user_id: user.id,
        name: String(req.body?.name || '').trim() || 'AI Provider',
        provider,
        model: String(req.body?.model || '').trim() || defaultModelForProvider(provider),
        endpoint: String(req.body?.endpoint || '').trim() || null,
        encrypted_api_key: encryptApiKey(apiKey),
        api_key_hint: buildApiKeyHint(apiKey),
        is_active: isActive
      })
      .select('id, name, provider, model, endpoint, api_key_hint, is_active, created_at, updated_at')
      .single()

    if (error) throw error
    res.json({ config: serializeAiProviderConfig(data) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/v1/ai/providers/:id', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const payload = {
      updated_at: new Date().toISOString()
    }

    if (req.body?.name !== undefined) payload.name = String(req.body.name || '').trim() || 'AI Provider'
    if (req.body?.provider !== undefined) payload.provider = normalizeAiProvider(req.body.provider)
    if (req.body?.model !== undefined) payload.model = String(req.body.model || '').trim()
    if (req.body?.endpoint !== undefined) payload.endpoint = String(req.body.endpoint || '').trim() || null
    if (req.body?.apiKey !== undefined && String(req.body.apiKey || '').trim()) {
      const apiKey = String(req.body.apiKey).trim()
      payload.encrypted_api_key = encryptApiKey(apiKey)
      payload.api_key_hint = buildApiKeyHint(apiKey)
    }
    if (req.body?.isActive !== undefined) payload.is_active = Boolean(req.body.isActive)

    if (payload.is_active) {
      const { error: clearError } = await db
        .from('ai_provider_configs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('id', req.params.id)
      if (clearError) throw clearError
    }

    const { data, error } = await db
      .from('ai_provider_configs')
      .update(payload)
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .select('id, name, provider, model, endpoint, api_key_hint, is_active, created_at, updated_at')
      .single()

    if (error) throw error
    res.json({ config: serializeAiProviderConfig(data) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/v1/ai/providers/:id', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { error } = await db
      .from('ai_provider_configs')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', user.id)

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/v1/ai/enrich', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const word = String(req.body?.word || '').trim()
    if (!word) return res.status(400).json({ error: 'word_required' })

    const prompt = buildAiEnrichmentPrompt({
      word,
      translation: req.body?.translation,
      contexts: req.body?.contexts
    })

    const { data: activeConfig, error: configError } = await db
      .from('ai_provider_configs')
      .select('provider, model, endpoint, encrypted_api_key')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (configError) throw configError

    let enrichment
    if (activeConfig) {
      enrichment = await generateAiEnrichmentWithConfig({ config: activeConfig, prompt })
    } else {
      if (!genAiClient) return res.status(500).json({ error: 'ai_key_not_configured' })
      const response = await genAiClient.models.generateContent({
        model: genAiModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      })
      enrichment = parseAiEnrichmentPayload(response.text || '')
    }

    // 直接入库：拿到 wordId 时立即持久化，确保前端刷新/离开页面也不会丢失结果
    const wordId = String(req.body?.wordId || '').trim()
    if (wordId) {
      const nowIso = new Date().toISOString()
      const { error: updateError } = await db
        .from('words')
        .update({
          definition: enrichment.definition,
          translation: enrichment.translation,
          chinese_translation: enrichment.translation,
          synonyms: enrichment.synonyms,
          examples: enrichment.examples,
          usage_history: enrichment.usageHistory,
          time_updated: nowIso,
          updated_at: nowIso
        })
        .eq('id', wordId)
        .eq('user_id', user.id)

      if (updateError) throw updateError
      await recordChange(db, user.id, 'word', wordId, 'update')
    }

    res.json({ enrichment })
  } catch (err) {
    console.error('[ai/enrich] error:', err.message)
    const status = err.message === 'invalid_ai_enrichment_json' ? 502 : 500
    res.status(status).json({ error: err.message })
  }
})

app.get('/api/v1/books', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    await ensureSingleSyncBook(db, user.id)

    const { data, error } = await db
      .from('vocabulary_books')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('is_sync', { ascending: false })
      .order('created_at')

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/v1/books', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const book = {
      user_id: user.id,
      ...req.body,
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
    
    await recordChange(db, user.id, 'book', data[0].id, 'create')
    res.json(data[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/v1/books/:id', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await db
      .from('vocabulary_books')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    
    await recordChange(db, user.id, 'book', req.params.id, 'update')
    res.json(data[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/v1/books/:id', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await db
      .from('vocabulary_books')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    
    await recordChange(db, user.id, 'book', req.params.id, 'delete')
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 2. 单词相关
app.get('/api/v1/words', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    let query = db
      .from('words')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)

    if (req.query.bookId) {
      query = query.eq('book_id', req.query.bookId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/v1/words', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const word = {
      user_id: user.id,
      ...req.body,
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
    
    await recordChange(db, user.id, 'word', data[0].id, 'create')
    res.json(data[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/v1/words/:id', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await db
      .from('words')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    
    await recordChange(db, user.id, 'word', req.params.id, 'delete')
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 3. 同步相关（新的 Supabase 优化版）
app.get('/api/v1/sync/status', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await db
      .from('sync_changelogs')
      .select('sync_version')
      .eq('user_id', user.id)
      .order('sync_version', { ascending: false })
      .limit(1)

    if (error) throw error
    res.json({ version: data[0]?.sync_version || 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/v1/sync/changes', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const sinceVersion = parseInt(req.query.sinceVersion) || 0

    const { data, error } = await db
      .from('sync_changelogs')
      .select('*')
      .eq('user_id', user.id)
      .gt('sync_version', sinceVersion)
      .order('sync_version', { ascending: true })

    if (error) throw error

    // 获取相关的变更实体数据
    const changes = []
    for (const log of data) {
      let entityData = null
      if (log.entity_type === 'book') {
        const { data: book } = await db
          .from('vocabulary_books')
          .select('*')
          .eq('id', log.entity_id)
          .single()
        entityData = book
      } else if (log.entity_type === 'word') {
        const { data: word } = await db
          .from('words')
          .select('*')
          .eq('id', log.entity_id)
          .single()
        entityData = word
      }

      changes.push({
        ...log,
        data: entityData
      })
    }

    res.json(changes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/v1/sync/full', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

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

    res.json({
      books: booksRes.data,
      words: wordsRes.data
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 4. 批量操作
app.post('/api/v1/words/batch', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    // 确保用户有一个默认的同步单词本
    const ensuredSyncBook = await ensureSingleSyncBook(db, user.id)

    // 查找用户的同步单词本，为缺少 book_id 的单词自动分配
    const defaultBookId = ensuredSyncBook?.id

    if (!defaultBookId) {
      console.error('[words/batch] 用户没有可用的同步单词本')
      return res.status(500).json({ error: '没有可用的同步单词本' })
    }

    const now = new Date().toISOString()
    const words = (req.body.words?.map(word => {
      const mapped = {
        user_id: user.id,
        ...word,
        book_id: word.book_id || defaultBookId,
        created_at: now,
        updated_at: now,
        sync_version: 1,
        is_deleted: false
      }
      // 移除客户端可能传来的 user_id（强制使用服务端验证的 user.id）
      return mapped
    }) || [])
    const dedupedWords = dedupeIncomingWords(words)

    if (dedupedWords.length === 0) {
      return res.json([])
    }

    // 在 upsert 前先查询已存在的单词，以便区分插入和更新，并合并已有 contexts
    const { data: existingData, error: existingWordsError } = await db
      .from('words')
      .select('word, book_id, contexts')
      .eq('user_id', user.id)
      .eq('is_deleted', false)

    if (existingWordsError) throw existingWordsError

    const existingWords = new Set()
    const existingWordMap = new Map()
    if (existingData) {
      existingData.forEach(w => {
        const key = `${w.word.toLowerCase()}:${w.book_id}`
        existingWords.add(key)
        existingWordMap.set(key, w)
      })
    }

    const wordsForUpsert = dedupedWords.map(word => {
      const key = `${word.word.toLowerCase()}:${word.book_id}`
      const existing = existingWordMap.get(key)
      if (!existing) return word

      const contexts = mergeContexts(existing.contexts, word.contexts)
      return {
        ...word,
        contexts,
        frequency: Math.max(Number(word.frequency) || 0, contexts.length, 1)
      }
    })

    // 使用 upsert 替代 insert，当遇到唯一约束冲突时进行更新
    const { data, error } = await db
      .from('words')
      .upsert(wordsForUpsert, {
        onConflict: ['user_id', 'word', 'book_id'],
        update: [
          'translation', 
          'frequency', 
          'contexts', 
          'time_updated', 
          'updated_at',
          'phonetic',
          'part_of_speech',
          'definition',
          'chinese_translation',
          'synonyms',
          'examples',
          'usage_history',
          'level',
          'familiarity',
          'meta'
        ]
      })
      .select()

    if (error) throw error
    
    // 更新对应单词本的 word_count（仅对新插入的单词计数）
    if (data?.length > 0) {
      const newWordCountByBook = {}
      data.forEach(word => {
        const key = `${word.word.toLowerCase()}:${word.book_id}`
        if (!existingWords.has(key)) {
          newWordCountByBook[word.book_id] = (newWordCountByBook[word.book_id] || 0) + 1
        }
      })
      
      for (const [bookId, count] of Object.entries(newWordCountByBook)) {
        try {
          await db.rpc('increment_book_word_count', { p_book_id: bookId, p_count: count })
        } catch {
          // ignore word_count refresh failure
        }
      }
    }
    
    // 记录每个单词的变更（区分插入和更新）
    for (const word of data) {
      const key = `${word.word.toLowerCase()}:${word.book_id}`
      const action = existingWords.has(key) ? 'update' : 'create'
      await recordChange(db, user.id, 'word', word.id, action)
    }
    
    console.log(`[words/batch] 成功处理 ${data.length} 个单词（去重后插入/更新），用户: ${user.id}`)
    res.json(data)
  } catch (err) {
    console.error('[words/batch] 错误:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/v1/words/batch-delete', async (req, res) => {
  try {
    const { user, db } = await getRequestContext(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const wordIds = req.body.wordIds || []

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
    
    // 记录每个单词的删除变更
    for (const wordId of wordIds) {
      await recordChange(db, user.id, 'word', wordId, 'delete')
    }
    
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 所有其他路由返回 React 应用
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`🚀 Supabase 后端服务运行在 http://localhost:${PORT}`)
  console.log('  - 与现有 API 完全兼容')
  console.log('  - 所有数据存储在 Supabase')
  if (!supabaseAdmin) {
    console.warn('  - 警告: 未配置 SUPABASE_SERVICE_ROLE_KEY，注销账号无法真正删除 auth 用户')
  }
})
