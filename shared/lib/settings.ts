import { apiUrl } from './apiBase';

// =============================================
// 类型定义
// =============================================

export interface UserSettings {
  [key: string]: unknown;
}

export interface SettingsResponse {
  settings: UserSettings | null;
  updatedAt?: string;
}

export interface SaveSettingsResponse {
  settings: UserSettings;
  updatedAt: string;
}

// =============================================
// API 客户端
// =============================================

/**
 * 获取用户设置（浏览器扩展同步用）。
 * 未设置过时返回 { settings: null }。
 */
export async function requestGetSettings(
  accessToken: string
): Promise<SettingsResponse> {
  const response = await fetch(apiUrl('/api/v1/settings'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'settings_fetch_failed'));
  }
  return data as SettingsResponse;
}

/**
 * 保存用户设置（浏览器扩展同步用）。
 * settings 为任意 JSON 对象，上限 64KB。
 */
export async function requestSaveSettings(
  settings: UserSettings,
  accessToken: string
): Promise<SaveSettingsResponse> {
  const response = await fetch(apiUrl('/api/v1/settings'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ settings }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'settings_save_failed'));
  }
  return data as SaveSettingsResponse;
}
