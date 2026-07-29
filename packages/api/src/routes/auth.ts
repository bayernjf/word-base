import { Hono } from 'hono'
import {
  supabase,
  supabaseAdmin,
  createUserSupabaseClient,
  getRequestContext,
  buildAuthResponse,
  logger,
  errorContext,
} from '../context'
import { parseBody, loginBodySchema, registerBodySchema, refreshBodySchema } from '../utils/validation'

export function registerAuthRoutes(app: Hono) {
  app.post('/api/v1/auth/login', async (c) => {
    try {
      const parsed = await parseBody(c, loginBodySchema, { fallback: 'email_and_password_required' })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const { email, password } = parsed.data

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return c.json({ error: error.message }, 401)
      }
      if (!data?.session) {
        return c.json({ error: 'session_not_created' }, 401)
      }

      return c.json(buildAuthResponse(data.session))
    } catch (err) {
      logger.error('auth_login_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.post('/api/v1/auth/register', async (c) => {
    try {
      const parsed = await parseBody(c, registerBodySchema, { fallback: 'email_and_password_required' })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const { email, password, nickname } = parsed.data

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
          logger.error('register_default_book_failed', errorContext(bookErr))
        }
      }

      if (!data?.session) {
        return c.json({ error: 'email_confirmation_required' }, 400)
      }

      return c.json(buildAuthResponse(data.session))
    } catch (err) {
      logger.error('auth_register_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.post('/api/v1/auth/refresh', async (c) => {
    try {
      const parsed = await parseBody(c, refreshBodySchema, { fallback: 'refresh_token_required' })
      if (!parsed.ok) return c.json({ error: parsed.error }, 400)
      const { refreshToken } = parsed.data

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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.post('/api/v1/auth/logout', async (c) => {
    const { user } = await getRequestContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })
}
