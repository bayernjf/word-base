import { Hono } from 'hono'
import { getRequestContext } from '../context'

export function registerSyncRoutes(app: Hono) {
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
      return c.json({ error: 'internal_server_error' }, 500)
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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })
}
