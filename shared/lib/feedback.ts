/**
 * 意见反馈系统的类型 / 枚举 / 常量 / 校验（前端单一来源）。
 *
 * 设计参考 soft-desk 项目的 src/data/feedback.ts：
 *   - DB 只存英文机器值，UI 显示通过 i18n key 映射
 *   - service 层返回 errorKey（而非文案），UI 层 t(key) 渲染，三层解耦
 *   - 修改枚举时必须同步 supabase/migrations/017_feedback.sql 的 CHECK 约束
 *
 * 注意：本文件不引入 i18n 依赖，便于测试和跨端复用。
 */

// =============================================
// 分类（category）
// =============================================
export const FEEDBACK_CATEGORIES = ['bug', 'feature', 'content_error', 'question', 'other'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_I18N_KEYS: Record<FeedbackCategory, string> = {
  bug: 'feedback.category.bug',
  feature: 'feedback.category.feature',
  content_error: 'feedback.category.content_error',
  question: 'feedback.category.question',
  other: 'feedback.category.other',
};

// =============================================
// 状态（status）
// =============================================
export const FEEDBACK_STATUSES = ['new', 'processing', 'resolved', 'closed'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_I18N_KEYS: Record<FeedbackStatus, string> = {
  new: 'feedback.status.new',
  processing: 'feedback.status.processing',
  resolved: 'feedback.status.resolved',
  closed: 'feedback.status.closed',
};

// 状态徽章样式（与 soft-desk 一致：slate / amber / green / slate-muted）
export const FEEDBACK_STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: 'bg-slate-500/15 text-slate-400',
  processing: 'bg-amber-500/15 text-amber-400',
  resolved: 'bg-green-500/15 text-green-400',
  closed: 'bg-slate-600/15 text-slate-500',
};

// =============================================
// 字段长度限制（与 DB CHECK 约束一致）
// =============================================
export const FEEDBACK_LIMITS = {
  titleMaxLength: 100,
  contentMaxLength: 5000,
  contactMaxLength: 200,
} as const;

// =============================================
// 限流（与 API 路由一致）
// =============================================
export const FEEDBACK_QUOTA = {
  dailyLimit: 10,
} as const;

// =============================================
// 诊断日志采集选项
// =============================================
export const FEEDBACK_LOG_TIME_OPTIONS = [5, 15, 30] as const;
export type FeedbackLogMinutes = (typeof FEEDBACK_LOG_TIME_OPTIONS)[number];

// =============================================
// 类型守卫
// =============================================
export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === 'string' && (FEEDBACK_CATEGORIES as readonly string[]).includes(value);
}

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return typeof value === 'string' && (FEEDBACK_STATUSES as readonly string[]).includes(value);
}

// =============================================
// 提交反馈的输入类型
// =============================================
export interface FeedbackInput {
  category: FeedbackCategory;
  title: string;
  content: string;
  contact?: string;
}

export interface FeedbackSystemInfo {
  appVersion: string;
  platform: string;
  osVersion?: string;
  deviceModel?: string;
}

export interface FeedbackLogData {
  content: string;
  lineCount: number;
  startedAt?: string;
  endedAt?: string;
  truncated: boolean;
}

// =============================================
// service 层返回的错误键（对应 i18n feedback.errors.*）
// =============================================
export type FeedbackErrorKey =
  | 'feedback.errors.cloudNotConfigured'
  | 'feedback.errors.authRequired'
  | 'feedback.errors.categoryInvalid'
  | 'feedback.errors.titleRequired'
  | 'feedback.errors.titleTooLong'
  | 'feedback.errors.contentRequired'
  | 'feedback.errors.contentTooLong'
  | 'feedback.errors.contactTooLong'
  | 'feedback.errors.quotaExceeded'
  | 'feedback.errors.submitFailed';

export type SubmitFeedbackResult =
  | { success: true; feedbackId: string }
  | { success: false; errorKey: FeedbackErrorKey; errorOptions?: { count: number } };

// =============================================
// 历史记录条目
// =============================================
export interface FeedbackHistoryItem {
  id: string;
  category: FeedbackCategory;
  title: string;
  content: string;
  status: FeedbackStatus;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  has_log: boolean;
}
