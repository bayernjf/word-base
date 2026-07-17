import { getSupabase } from '../supabase';
import { createLogger } from '../logger';
import { API_PLATFORM } from '../apiBase';
import { getPlatform, hasPlatform } from '../../platform';
import { isPlatformMatch } from './config';
import type {
  Announcement,
  AnnouncementReadState,
  AnnouncementRow,
  AnnouncementSeverity,
  AnnouncementTarget,
  AnnouncementWithState,
} from './types';

const logger = createLogger('announcement');

const VALID_SEVERITIES: ReadonlySet<AnnouncementSeverity> = new Set([
  'info',
  'warning',
  'critical',
]);
const VALID_TARGETS: ReadonlySet<AnnouncementTarget> = new Set([
  'all',
  'web',
  'desktop',
  'mobile',
  'ios',
  'android',
]);

const READS_KV_KEY = 'wordbase_announcement_reads';

function coerceRow(row: Partial<AnnouncementRow>): Announcement | null {
  if (typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.title_zh !== 'string' || !row.title_zh) return null;
  const severity = VALID_SEVERITIES.has(row.severity as AnnouncementSeverity)
    ? (row.severity as AnnouncementSeverity)
    : 'info';
  const targetPlatform = VALID_TARGETS.has(
    row.target_platform as AnnouncementTarget
  )
    ? (row.target_platform as AnnouncementTarget)
    : 'all';
  return {
    id: row.id,
    titleZh: row.title_zh,
    titleEn: row.title_en ?? null,
    contentZh: typeof row.content_zh === 'string' ? row.content_zh : '',
    contentEn: row.content_en ?? null,
    severity,
    targetPlatform,
    publishAt: row.publish_at ?? new Date().toISOString(),
    expireAt: row.expire_at ?? null,
    isPinned: !!row.is_pinned,
    isDismissible: row.is_dismissible !== false,
    actionUrl: row.action_url ?? null,
    createdAt: row.created_at ?? row.publish_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

/**
 * 从 Supabase 拉取当前生效的公告(publish_at <= now 且未过期),
 * 按平台过滤(all 或匹配当前平台),置顶优先、发布时间倒序。
 * 云端未配置/失败时返回空数组,不阻断 UI。
 */
export async function fetchActiveAnnouncements(
  apiPlatform: string
): Promise<Announcement[]> {
  try {
    const { data, error } = await getSupabase()
      .from('announcements')
      .select(
        'id, title_zh, title_en, content_zh, content_en, severity, target_platform, publish_at, expire_at, is_pinned, is_dismissible, action_url, created_at, updated_at'
      )
      .lte('publish_at', new Date().toISOString())
      .order('is_pinned', { ascending: false })
      .order('publish_at', { ascending: false });

    if (error) {
      logger.warn('fetch announcements error:', error.message);
      return [];
    }
    if (!Array.isArray(data)) return [];

    const now = Date.now();
    return data
      .map((r) => coerceRow(r as Partial<AnnouncementRow>))
      .filter((a): a is Announcement => a !== null)
      .filter((a) => {
        if (a.expireAt && new Date(a.expireAt).getTime() <= now) return false;
        return isPlatformMatch(a.targetPlatform, apiPlatform);
      });
  } catch (err) {
    logger.warn('fetch announcements exception:', err);
    return [];
  }
}

/** 本地已读/关闭状态 map 的类型 */
type ReadMap = Record<string, AnnouncementReadState>;

/** 从 platform.kv 读取本地已读/关闭状态 map */
export async function fetchReadStateMap(): Promise<
  Map<string, AnnouncementReadState>
> {
  const map = new Map<string, AnnouncementReadState>();
  if (!hasPlatform()) return map;
  try {
    const raw = await getPlatform().kv.get(READS_KV_KEY);
    if (!raw) return map;
    const parsed = JSON.parse(raw) as ReadMap;
    if (parsed && typeof parsed === 'object') {
      for (const [id, state] of Object.entries(parsed)) {
        if (state && typeof state.announcementId === 'string') {
          map.set(state.announcementId, state);
        }
      }
    }
  } catch (err) {
    logger.warn('fetchReadStateMap failed:', err);
  }
  return map;
}

async function persistReadStateMap(
  map: Map<string, AnnouncementReadState>
): Promise<void> {
  if (!hasPlatform()) return;
  try {
    const obj: ReadMap = {};
    for (const [id, state] of map.entries()) {
      obj[id] = state;
    }
    await getPlatform().kv.set(READS_KV_KEY, JSON.stringify(obj));
  } catch (err) {
    logger.warn('persistReadStateMap failed:', err);
  }
}

/** 把云端公告与本地已读状态合并为 UI 直接消费的形态 */
export function mergeWithState(
  announcements: Announcement[],
  readMap: Map<string, AnnouncementReadState>
): AnnouncementWithState[] {
  return announcements.map((a) => {
    const state = readMap.get(a.id);
    return {
      ...a,
      read: !!state?.readAt,
      dismissed: !!state?.dismissedAt,
    };
  });
}

/** 标记某条公告为已读(已存在则仅更新 read_at,保留 dismissed_at) */
export async function markAnnouncementRead(
  announcementId: string
): Promise<boolean> {
  if (!hasPlatform()) return false;
  try {
    const map = await fetchReadStateMap();
    const prev = map.get(announcementId);
    map.set(announcementId, {
      announcementId,
      readAt: Math.floor(Date.now() / 1000),
      dismissedAt: prev?.dismissedAt ?? null,
    });
    await persistReadStateMap(map);
    return true;
  } catch (err) {
    logger.warn('markAnnouncementRead failed:', err);
    return false;
  }
}

/** 标记某条公告的 banner 已关闭(不改变已读状态) */
export async function markBannerDismissed(
  announcementId: string
): Promise<boolean> {
  if (!hasPlatform()) return false;
  try {
    const map = await fetchReadStateMap();
    const prev = map.get(announcementId);
    const now = Math.floor(Date.now() / 1000);
    map.set(announcementId, {
      announcementId,
      readAt: prev?.readAt ?? null,
      dismissedAt: now,
    });
    await persistReadStateMap(map);
    return true;
  } catch (err) {
    logger.warn('markBannerDismissed failed:', err);
    return false;
  }
}

/** 解析当前 API_PLATFORM(供 Context 启动时使用) */
export function resolveApiPlatform(): string {
  return API_PLATFORM;
}
