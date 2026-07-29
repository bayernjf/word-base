import { Hono } from 'hono'
import { getRequestContext } from '../context'
import { parseBody, createBookBodySchema, updateBookBodySchema } from '../utils/validation'

export function registerBookRoutes(app: Hono) {
  app.post('/api/v1/books', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, createBookBodySchema, { fallback: 'invalid_book_data' })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const book = {
        ...parsed.data,
        user_id: user.id,
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
      return c.json({ error: 'internal_server_error' }, 500)
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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.put('/api/v1/books/:id', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, updateBookBodySchema, { fallback: 'invalid_book_data' })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const updates = { ...parsed.data, updated_at: new Date().toISOString() }
      const { data, error } = await db
        .from('vocabulary_books')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', c.req.param('id'))
        .eq('user_id', user.id)
        .select()

      if (error) throw error
      return c.json(data[0])
    } catch (err) {
      return c.json({ error: 'internal_server_error' }, 500)
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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })
}
