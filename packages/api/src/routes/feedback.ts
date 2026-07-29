import { Hono } from 'hono'
import { getRequestContext, logger, errorContext } from '../context'

const FEEDBACK_CATEGORIES = ['bug', 'feature', 'content_error', 'question', 'other'] as const
const FEEDBACK_TITLE_MAX = 100
const FEEDBACK_CONTENT_MAX = 5000
const FEEDBACK_CONTACT_MAX = 200
const FEEDBACK_DAILY_LIMIT = 10
const FEEDBACK_HISTORY_LIMIT = 20

export function registerFeedbackRoutes(app: Hono) {
  app.post('/api/v1/feedback', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'auth_required' }, 401)
      if (!db) return c.json({ error: 'auth_required' }, 401)

      const body = await c.req.json().catch(() => ({}))

      // 1. 校验分类
      const category = String(body?.category || '')
      if (!(FEEDBACK_CATEGORIES as readonly string[]).includes(category)) {
        return c.json({ error: 'category_invalid' }, 400)
      }

      // 2. 校验标题
      const title = String(body?.title || '').trim()
      if (!title) return c.json({ error: 'title_required' }, 400)
      if (title.length > FEEDBACK_TITLE_MAX) return c.json({ error: 'title_too_long' }, 400)

      // 3. 校验内容
      const content = String(body?.content || '').trim()
      if (!content) return c.json({ error: 'content_required' }, 400)
      if (content.length > FEEDBACK_CONTENT_MAX) return c.json({ error: 'content_too_long' }, 400)

      // 4. 校验联系方式
      const contact = body?.contact != null ? String(body.contact).trim() : ''
      if (contact.length > FEEDBACK_CONTACT_MAX) return c.json({ error: 'contact_too_long' }, 400)

      // 5. 限流检查
      const today = new Date().toISOString().slice(0, 10)
      const { data: quotaRow } = await db
        .from('feedback_quota')
        .select('count')
        .eq('user_id', user.id)
        .eq('quota_date', today)
        .maybeSingle()

      const currentCount = quotaRow?.count ?? 0
      if (currentCount >= FEEDBACK_DAILY_LIMIT) {
        return c.json({ error: 'quota_exceeded', limit: FEEDBACK_DAILY_LIMIT }, 429)
      }

      // 6. 写入反馈
      const { data: feedbackRow, error: feedbackError } = await db
        .from('feedbacks')
        .insert({
          user_id: user.id,
          category,
          title,
          content,
          contact: contact || null,
          app_version: String(body?.app_version || 'unknown'),
          platform: String(body?.platform || 'unknown'),
          os_version: body?.os_version ? String(body.os_version) : null,
          device_model: body?.device_model ? String(body.device_model) : null,
          status: 'new',
        })
        .select('id')
        .single()

      if (feedbackError || !feedbackRow) {
        logger.error('feedback_insert_failed', errorContext(feedbackError))
        throw feedbackError
      }

      const feedbackId = feedbackRow.id

      // 7. 写入诊断日志
      const log = body?.log
      if (log && typeof log.content === 'string' && log.content.length > 0) {
        try {
          await db.from('feedback_logs').insert({
            feedback_id: feedbackId,
            content: String(log.content),
            line_count: typeof log.lineCount === 'number' ? Math.max(0, Math.floor(log.lineCount)) : 0,
            started_at: log.startedAt ? String(log.startedAt) : null,
            ended_at: log.endedAt ? String(log.endedAt) : null,
            truncated: Boolean(log.truncated),
          })
        } catch (logErr) {
          logger.warn('feedback_log_insert_failed', errorContext(logErr))
        }
      }

      // 8. 限流计数 +1
      try {
        if (quotaRow) {
          await db
            .from('feedback_quota')
            .update({ count: currentCount + 1 })
            .eq('user_id', user.id)
            .eq('quota_date', today)
        } else {
          await db
            .from('feedback_quota')
            .insert({ user_id: user.id, quota_date: today, count: 1 })
        }
      } catch (quotaErr) {
        logger.warn('feedback_quota_update_failed', errorContext(quotaErr))
      }

      return c.json({ success: true, feedbackId })
    } catch (err) {
      logger.error('feedback_submit_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.get('/api/v1/feedback', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'auth_required' }, 401)
      if (!db) return c.json({ error: 'auth_required' }, 401)

      const { data: feedbacks, error } = await db
        .from('feedbacks')
        .select('id, category, title, content, status, admin_reply, replied_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(FEEDBACK_HISTORY_LIMIT)

      if (error) throw error
      if (!feedbacks || feedbacks.length === 0) {
        return c.json({ items: [] })
      }

      // 批量查询日志附件
      const feedbackIds = feedbacks.map((f: any) => f.id)
      const { data: logs, error: logsError } = await db
        .from('feedback_logs')
        .select('feedback_id')
        .in('feedback_id', feedbackIds)

      const logFeedbackIds = new Set<string>()
      if (!logsError && Array.isArray(logs)) {
        for (const row of logs) {
          if (row?.feedback_id) logFeedbackIds.add(String(row.feedback_id))
        }
      }

      const items = feedbacks.map((f: any) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        content: f.content,
        status: f.status,
        admin_reply: f.admin_reply ?? null,
        replied_at: f.replied_at ?? null,
        created_at: f.created_at,
        has_log: logFeedbackIds.has(String(f.id)),
      }))

      return c.json({ items })
    } catch (err) {
      logger.error('feedback_list_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })
}
