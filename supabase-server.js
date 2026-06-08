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
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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

// 静态文件服务
app.use(express.static(join(__dirname, 'dist')))

// =============================================
// 辅助函数：记录同步变更日志
// =============================================
const recordChange = async (userId, entityType, entityId, action) => {
  try {
    // 获取下一个版本号
    const { data: lastChange } = await supabase
      .from('sync_changelogs')
      .select('sync_version')
      .eq('user_id', userId)
      .order('sync_version', { ascending: false })
      .limit(1)
    
    const nextVersion = (lastChange[0]?.sync_version || 0) + 1
    
    await supabase
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
const getUserFromToken = async (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const token = authHeader.split(' ')[1]
  
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

const buildAuthResponse = (session) => ({
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  user: session.user ? {
    id: session.user.id,
    email: session.user.email,
    nickname: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User'
  } : null
})

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

// 1. 单词本相关
app.get('/api/v1/books', async (req, res) => {
  try {
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await supabase
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
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const book = {
      user_id: user.id,
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_version: 1,
      is_deleted: false
    }

    const { data, error } = await supabase
      .from('vocabulary_books')
      .insert(book)
      .select()

    if (error) throw error
    
    await recordChange(user.id, 'book', data[0].id, 'create')
    res.json(data[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/v1/books/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await supabase
      .from('vocabulary_books')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    
    await recordChange(user.id, 'book', req.params.id, 'update')
    res.json(data[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/v1/books/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await supabase
      .from('vocabulary_books')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    
    await recordChange(user.id, 'book', req.params.id, 'delete')
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 2. 单词相关
app.get('/api/v1/words', async (req, res) => {
  try {
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    let query = supabase
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
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const word = {
      user_id: user.id,
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_version: 1,
      is_deleted: false
    }

    const { data, error } = await supabase
      .from('words')
      .insert(word)
      .select()

    if (error) throw error
    
    await recordChange(user.id, 'word', data[0].id, 'create')
    res.json(data[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/v1/words/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await supabase
      .from('words')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    
    await recordChange(user.id, 'word', req.params.id, 'delete')
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 3. 同步相关（新的 Supabase 优化版）
app.get('/api/v1/sync/status', async (req, res) => {
  try {
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { data, error } = await supabase
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
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const sinceVersion = parseInt(req.query.sinceVersion) || 0

    const { data, error } = await supabase
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
        const { data: book } = await supabase
          .from('vocabulary_books')
          .select('*')
          .eq('id', log.entity_id)
          .single()
        entityData = book
      } else if (log.entity_type === 'word') {
        const { data: word } = await supabase
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
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const [booksRes, wordsRes] = await Promise.all([
      supabase
        .from('vocabulary_books')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false),
      supabase
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
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const words = req.body.words?.map(word => ({
      user_id: user.id,
      ...word,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_version: 1,
      is_deleted: false
    })) || []

    const { data, error } = await supabase
      .from('words')
      .insert(words)
      .select()

    if (error) throw error
    
    // 记录每个单词的变更
    for (const word of data) {
      await recordChange(user.id, 'word', word.id, 'create')
    }
    
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/v1/words/batch-delete', async (req, res) => {
  try {
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const wordIds = req.body.wordIds || []

    const { data, error } = await supabase
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
      await recordChange(user.id, 'word', wordId, 'delete')
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
})
