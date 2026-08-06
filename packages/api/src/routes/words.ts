import { Hono } from 'hono'
import { getRequestContext, dedupeIncomingWords } from '../context'
import {
  parseBody,
  createWordBodySchema,
  batchWordsBodySchema,
  batchDeleteBodySchema,
} from '../utils/validation'

export function registerWordRoutes(app: Hono) {
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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.post('/api/v1/words', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, createWordBodySchema, { fallback: 'invalid_word_data' })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const word = {
        ...parsed.data,
        user_id: user.id,
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
      return c.json({ error: 'internal_server_error' }, 500)
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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.post('/api/v1/words/batch', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, batchWordsBodySchema, { fallback: 'invalid_words_batch' })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const now = new Date().toISOString()
      const words = parsed.data.words.map((word: any) => {
        const { user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, is_deleted: _isDeleted, ...input } = word
        const mapped = {
          ...input,
          user_id: user.id,
          created_at: now,
          updated_at: now,
          sync_version: (word.sync_version || 0) + 1,
          is_deleted: false
        }
        return mapped
      })
      const dedupedWords = dedupeIncomingWords(words)

      if (dedupedWords.length === 0) {
        return c.json([])
      }

      // 先查询现有记录的 sync_version，检测冲突
      const { data: existingWords, error: fetchError } = await db
        .from('words')
        .select('id, word, book_id, sync_version')
        .in('word', dedupedWords.map(w => w.word))
        .eq('user_id', user.id)

      if (fetchError) throw fetchError

      // 标记冲突的单词
      const existingMap = new Map<string, number>()
      for (const w of (existingWords || [])) {
        const key = `${user.id}:${w.word}:`
        existingMap.set(key + (w.book_id || ''), w.sync_version || 0)
      }

      const conflicts: string[] = []
      const cleanWords = dedupedWords.filter(w => {
        const key = `${user.id}:${w.word}:${w.book_id}`
        const existingVersion = existingMap.get(key)
        const incomingVersion = w.sync_version || 1
        if (existingVersion !== undefined && incomingVersion < existingVersion) {
          conflicts.push(w.word)
          return false
        }
        return true
      })

      let data: any[] = []
      if (cleanWords.length > 0) {
        const { data: inserted, error: upsertError } = await db
          .from('words')
          .upsert(cleanWords, {
            onConflict: 'user_id,word,book_id',
            ignoreDuplicates: false
          })
          .select()
        if (upsertError) throw upsertError
        data = inserted
      }

      return c.json({ data, conflicts })
    } catch (err) {
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.post('/api/v1/words/batch-delete', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, batchDeleteBodySchema, { fallback: 'invalid_word_ids' })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const wordIds = parsed.data.wordIds

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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })
}
