import type { AnnouncementSeverity } from './types';
import type { ThemeType } from '../../types';

/**
 * severity -> 展示配置(颜色/图标/i18n key)的唯一定义。
 * 禁止在页面里重复定义这些映射,所有 severity 视觉差异集中在此处。
 * 颜色按主题分流(glass 暗底用稍亮色,natural 亮底用稍深色)。
 */
export interface SeverityVisual {
  labelKey: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconName: 'Info' | 'AlertTriangle' | 'AlertOctagon';
}

export const SEVERITY_CONFIG: Record<
  AnnouncementSeverity,
  { glass: SeverityVisual; natural: SeverityVisual }
> = {
  info: {
    glass: {
      labelKey: 'announcement.severity.info',
      color: '#93c5fd',
      bgColor: 'rgba(147,197,253,0.12)',
      borderColor: 'rgba(147,197,253,0.30)',
      iconName: 'Info',
    },
    natural: {
      labelKey: 'announcement.severity.info',
      color: '#2563eb',
      bgColor: 'rgba(37,99,235,0.10)',
      borderColor: 'rgba(37,99,235,0.28)',
      iconName: 'Info',
    },
  },
  warning: {
    glass: {
      labelKey: 'announcement.severity.warning',
      color: '#fbbf24',
      bgColor: 'rgba(251,191,36,0.12)',
      borderColor: 'rgba(251,191,36,0.30)',
      iconName: 'AlertTriangle',
    },
    natural: {
      labelKey: 'announcement.severity.warning',
      color: '#b45309',
      bgColor: 'rgba(180,83,9,0.10)',
      borderColor: 'rgba(180,83,9,0.28)',
      iconName: 'AlertTriangle',
    },
  },
  critical: {
    glass: {
      labelKey: 'announcement.severity.critical',
      color: '#f87171',
      bgColor: 'rgba(248,113,113,0.12)',
      borderColor: 'rgba(248,113,113,0.30)',
      iconName: 'AlertOctagon',
    },
    natural: {
      labelKey: 'announcement.severity.critical',
      color: '#dc2626',
      bgColor: 'rgba(220,38,38,0.10)',
      borderColor: 'rgba(220,38,38,0.28)',
      iconName: 'AlertOctagon',
    },
  },
};

export function getSeverityVisual(
  severity: AnnouncementSeverity,
  theme: ThemeType
): SeverityVisual {
  return SEVERITY_CONFIG[severity][theme === 'natural' ? 'natural' : 'glass'];
}

/**
 * 把 apiBase.ts 的 API_PLATFORM 映射到公告投放平台维度。
 * API_PLATFORM: 'web' | 'desktop' | 'ios' | 'android'
 * 公告 target_platform: 'all' | 'web' | 'desktop' | 'mobile' | 'ios' | 'android'
 */
export function isPlatformMatch(
  targetPlatform: string,
  apiPlatform: string
): boolean {
  if (targetPlatform === 'all') return true;
  if (targetPlatform === apiPlatform) return true;
  if (targetPlatform === 'mobile') {
    return apiPlatform === 'ios' || apiPlatform === 'android';
  }
  return false;
}
