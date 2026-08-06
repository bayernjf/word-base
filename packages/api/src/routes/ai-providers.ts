import { Hono } from 'hono'
import {
  getRequestContext,
  encryptApiKey,
  aiConfigEncryptionSecret,
  buildApiKeyHint,
  normalizeAiProvider,
  defaultModelForProvider,
  callAiProviderRaw,
  logger,
  errorContext,
} from '../context'
import { parseBody, aiProviderBodySchema, aiProviderPatchBodySchema } from '../utils/validation'

export function registerAiProviderRoutes(app: Hono) {
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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.post('/api/v1/ai/providers', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, aiProviderBodySchema, { fallback: 'invalid_provider_data', fieldErrors: { provider: 'invalid_provider', apiKey: 'api_key_required' } })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const provider = normalizeAiProvider(parsed.data.provider)
      const apiKey = parsed.data.apiKey

      const isActive = Boolean(parsed.data.isActive)
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
          name: parsed.data.name?.trim() || 'AI Provider',
          provider,
          model: parsed.data.model?.trim() || defaultModelForProvider(provider),
          endpoint: parsed.data.endpoint?.trim() || null,
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
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.patch('/api/v1/ai/providers/:id', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, aiProviderPatchBodySchema, { fallback: 'invalid_provider_data', fieldErrors: { provider: 'invalid_provider' } })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const body = parsed.data
      const payload: any = {
        updated_at: new Date().toISOString()
      }

      if (body.name !== undefined) payload.name = body.name.trim() || 'AI Provider'
      if (body.provider !== undefined) payload.provider = normalizeAiProvider(body.provider)
      if (body.model !== undefined) payload.model = body.model.trim()
      if (body.endpoint !== undefined) payload.endpoint = body.endpoint.trim() || null
      if (body.apiKey !== undefined && body.apiKey.trim()) {
        const apiKey = body.apiKey.trim()
        payload.encrypted_api_key = await encryptApiKey(apiKey, aiConfigEncryptionSecret)
        payload.api_key_hint = buildApiKeyHint(apiKey)
      }
      if (body.isActive !== undefined) payload.is_active = Boolean(body.isActive)

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
      return c.json({ error: 'internal_server_error' }, 500)
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
      return c.json({ error: 'internal_server_error' }, 500)
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
      logger.error('ai_provider_test_failed', errorContext(err))
      return c.json({ error: 'connection_test_failed' }, 502)
    }
  })
}
