import express from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 初始化 Supabase 客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
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
      sourceLink: item?.sourceLink || '',
      translation: item?.translation || ''
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

    // 在 upsert 前先查询已存在的单词，以便区分插入和更新
    const wordBookPairs = dedupedWords
      .filter(w => w.word && w.book_id)
      .map(w => ({ word: w.word.toLowerCase(), book_id: w.book_id }))
    
    let existingWords = new Set()
    if (wordBookPairs.length > 0) {
      const { data: existingData } = await db
        .from('words')
        .select('word, book_id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
      
      if (existingData) {
        existingWords = new Set(
          existingData.map(w => `${w.word.toLowerCase()}:${w.book_id}`)
        )
      }
    }

    // 使用 upsert 替代 insert，当遇到唯一约束冲突时进行更新
    const { data, error } = await db
      .from('words')
      .upsert(dedupedWords, {
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
