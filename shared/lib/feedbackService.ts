/**
 * 意见反馈服务层。
 *
 * 设计参考 soft-desk 的 src/services/feedback.service.ts：
 *   - 提交走 Hono API（/api/v1/feedback），由后端处理限流、写入、限流计数
 *   - 历史查询走 Hono API（统一鉴权），返回带 admin_reply 和 has_log 的列表
 *   - service 层返回 errorKey（而非文案），UI 层 t(key) 渲染，三层解耦
 *   - 对 DB 读出的数据逐字段类型校验，非法值整条丢弃并记日志
 *
 * accessToken 由调用方从 supabase.auth.getSession() 传入（与 aiEnrich.ts 范式一致）。
 */

import { apiUrl } from './apiBase';
import { createLogger } from './logger';
import {
  FEEDBACK_LIMITS,
  FEEDBACK_QUOTA,
  isFeedbackCategory,
  isFeedbackStatus,
  type FeedbackCategory,
  type FeedbackErrorKey,
  type FeedbackHistoryItem,
  type FeedbackInput,
  type FeedbackLogData,
  type FeedbackSystemInfo,
  type SubmitFeedbackResult,
} from './feedback';

const logger = createLogger('feedback');

// =============================================
// 提交反馈
// =============================================
export async function submitFeedback(
  userId: string,
  input: FeedbackInput,
  systemInfo: FeedbackSystemInfo,
  logData: FeedbackLogData | null,
  accessToken: string,
): Promise<SubmitFeedbackResult> {
  // 1. 校验登录
  if (!userId || !accessToken) {
    return { success: false, errorKey: 'feedback.errors.authRequired' };
  }

  // 2. 校验分类
  if (!isFeedbackCategory(input.category)) {
    return { success: false, errorKey: 'feedback.errors.categoryInvalid' };
  }

  // 3. trim + 校验长度
  const title = String(input.title || '').trim();
  const content = String(input.content || '').trim();
  const contact = input.contact != null ? String(input.contact).trim() : '';

  if (!title) return { success: false, errorKey: 'feedback.errors.titleRequired' };
  if (title.length > FEEDBACK_LIMITS.titleMaxLength) {
    return { success: false, errorKey: 'feedback.errors.titleTooLong', errorOptions: { count: FEEDBACK_LIMITS.titleMaxLength } };
  }
  if (!content) return { success: false, errorKey: 'feedback.errors.contentRequired' };
  if (content.length > FEEDBACK_LIMITS.contentMaxLength) {
    return { success: false, errorKey: 'feedback.errors.contentTooLong', errorOptions: { count: FEEDBACK_LIMITS.contentMaxLength } };
  }
  if (contact.length > FEEDBACK_LIMITS.contactMaxLength) {
    return { success: false, errorKey: 'feedback.errors.contactTooLong', errorOptions: { count: FEEDBACK_LIMITS.contactMaxLength } };
  }

  // 4. 调用 API
  try {
    const response = await fetch(apiUrl('/api/v1/feedback'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        category: input.category,
        title,
        content,
        contact: contact || undefined,
        app_version: systemInfo.appVersion,
        platform: systemInfo.platform,
        os_version: systemInfo.osVersion,
        device_model: systemInfo.deviceModel,
        log: logData,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 429) {
      const limit = typeof data?.limit === 'number' ? data.limit : FEEDBACK_QUOTA.dailyLimit;
      return { success: false, errorKey: 'feedback.errors.quotaExceeded', errorOptions: { count: limit } };
    }

    if (!response.ok || !data?.success) {
      const errorKey = String(data?.error || '');
      // 映射后端返回的短错误键到 i18n key
      const mapped = mapBackendError(errorKey);
      return { success: false, errorKey: mapped };
    }

    return { success: true, feedbackId: String(data.feedbackId) };
  } catch (err) {
    logger.warn('submitFeedback failed', err);
    return { success: false, errorKey: 'feedback.errors.submitFailed' };
  }
}

function mapBackendError(error: string): FeedbackErrorKey {
  const map: Record<string, FeedbackErrorKey> = {
    auth_required: 'feedback.errors.authRequired',
    category_invalid: 'feedback.errors.categoryInvalid',
    title_required: 'feedback.errors.titleRequired',
    title_too_long: 'feedback.errors.titleTooLong',
    content_required: 'feedback.errors.contentRequired',
    content_too_long: 'feedback.errors.contentTooLong',
    contact_too_long: 'feedback.errors.contactTooLong',
    quota_exceeded: 'feedback.errors.quotaExceeded',
  };
  return map[error] || 'feedback.errors.submitFailed';
}

// =============================================
// 查询历史
// =============================================
export async function fetchFeedbackHistory(
  userId: string,
  accessToken: string,
): Promise<FeedbackHistoryItem[]> {
  if (!userId || !accessToken) return [];

  try {
    const response = await fetch(apiUrl('/api/v1/feedback'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.warn('fetchFeedbackHistory http error', response.status);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data?.items)) return [];

    const items: FeedbackHistoryItem[] = [];
    for (const row of data.items) {
      const parsed = parseHistoryRow(row);
      if (parsed) items.push(parsed);
    }
    return items;
  } catch (err) {
    logger.warn('fetchFeedbackHistory failed', err);
    return [];
  }
}

function parseHistoryRow(row: unknown): FeedbackHistoryItem | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;

  const id = r.id;
  const category = r.category;
  const title = r.title;
  const content = r.content;
  const status = r.status;
  const adminReply = r.admin_reply;
  const repliedAt = r.replied_at;
  const createdAt = r.created_at;
  const hasLog = r.has_log;

  if (typeof id !== 'string' || !isFeedbackCategory(category) || typeof title !== 'string'
      || typeof content !== 'string' || !isFeedbackStatus(status) || typeof createdAt !== 'string') {
    logger.warn('parseHistoryRow: invalid row, discarded', { id });
    return null;
  }

  return {
    id,
    category: category as FeedbackCategory,
    title,
    content,
    status,
    admin_reply: typeof adminReply === 'string' ? adminReply : null,
    replied_at: typeof repliedAt === 'string' ? repliedAt : null,
    created_at: createdAt,
    has_log: Boolean(hasLog),
  };
}
