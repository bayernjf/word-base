import type { AppLanguage } from '../../types';

/**
 * 公告系统领域类型。
 * 枚举值必须是稳定的英文机器值,与 Supabase `announcements` 表的 CHECK 约束保持一致,
 * 禁止保存中文展示文案(展示文案走 i18n key)。
 */

export const ANNOUNCEMENT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type AnnouncementSeverity = (typeof ANNOUNCEMENT_SEVERITIES)[number];

export const ANNOUNCEMENT_TARGETS = [
  'all',
  'web',
  'desktop',
  'mobile',
  'ios',
  'android',
] as const;
export type AnnouncementTarget = (typeof ANNOUNCEMENT_TARGETS)[number];

/** Supabase announcements 表原始行(snake_case) */
export interface AnnouncementRow {
  id: string;
  title_zh: string;
  title_en: string | null;
  content_zh: string;
  content_en: string | null;
  severity: AnnouncementSeverity;
  target_platform: AnnouncementTarget;
  publish_at: string;
  expire_at: string | null;
  is_pinned: boolean;
  is_dismissible: boolean;
  action_url: string | null;
  created_at: string;
  updated_at: string;
}

/** 云端公告(经 coerce 后的 camelCase 形态) */
export interface Announcement {
  id: string;
  titleZh: string;
  titleEn: string | null;
  contentZh: string;
  contentEn: string | null;
  severity: AnnouncementSeverity;
  targetPlatform: AnnouncementTarget;
  publishAt: string;
  expireAt: string | null;
  isPinned: boolean;
  isDismissible: boolean;
  actionUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 本地已读/关闭状态(存 platform.kv 下的 JSON map) */
export interface AnnouncementReadState {
  announcementId: string;
  /** 已读时间(unix 秒),null 表示未读 */
  readAt: number | null;
  /** banner 关闭时间(unix 秒),null 表示未关闭 */
  dismissedAt: number | null;
}

/** 合并本地状态后的公告(供 UI 直接消费) */
export interface AnnouncementWithState extends Announcement {
  read: boolean;
  dismissed: boolean;
}

/** 按当前语言取标题,缺失时 fallback 到另一语言 */
export function pickTitle(a: Announcement, language: AppLanguage): string {
  if (language === 'en') return a.titleEn ?? a.titleZh;
  return a.titleZh ?? a.titleEn ?? '';
}

/** 按当前语言取正文,缺失时 fallback 到另一语言 */
export function pickContent(a: Announcement, language: AppLanguage): string {
  if (language === 'en') return a.contentEn ?? a.contentZh;
  return a.contentZh ?? a.contentEn ?? '';
}
