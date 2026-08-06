import { useCallback, useEffect, useMemo, useState } from 'react';
import { createLogger } from '../lib/logger';
import { apiUrl } from '../lib/apiBase';
import { supabase, profileApi } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';

const logger = createLogger('useProfile');

export interface ProfileRow {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  theme_preference?: string | null;
  auto_enrich?: boolean | null;
  auto_explain?: boolean | null;
}

export function toTimestamp(value?: string | null): number {
  if (!value) return Date.now();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function parseAvatarIndex(avatarValue?: string | null): number {
  if (!avatarValue) return 0;
  const matched = String(avatarValue).match(/\d+/);
  const parsed = matched ? Number(matched[0]) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 最小 user 结构，避免引入 Supabase 泛型 */
interface MinimalUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
  created_at?: string;
}

/**
 * 用户 Profile 管理 hook。
 * 封装 profile 加载/更新、密码修改、账号删除、currentUser 派生。
 */
export function useProfile(
  user: MinimalUser | null,
  signOut: () => Promise<void>,
) {
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  // 加载 profile
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const data = (await profileApi.getProfile(user.id)) as ProfileRow;
        if (!cancelled) {
          setProfile(data);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const currentUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || '',
      nickname: profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
      avatar: parseAvatarIndex(profile?.avatar_url),
      createdAt: toTimestamp(profile?.created_at || user.created_at),
    };
  }, [user, profile]);

  const handleUpdateProfile = useCallback(async (data: { nickname?: string; avatar?: number }) => {
    if (!user) return false;
    logger.debug('handleUpdateProfile', { nickname: data.nickname, avatar: data.avatar });

    try {
      const payload = {
        id: user.id,
        display_name:
          data.nickname !== undefined
            ? data.nickname
            : profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || '',
        avatar_url:
          data.avatar !== undefined
            ? `avatar:${data.avatar}`
            : profile?.avatar_url || `avatar:${parseAvatarIndex(profile?.avatar_url)}`,
      };

      const { data: profileRow, error } = await supabase.from('profiles').upsert(payload).select().single();
      if (error) throw error;

      setProfile(profileRow as ProfileRow);
      logger.info('handleUpdateProfile success');
      return true;
    } catch (error) {
      logger.error('Error updating profile:', error);
      return false;
    }
  }, [user, profile]);

  const handleChangePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    if (!user?.email) {
      return { ok: false, error: '未登录' };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (verifyError) {
      return { ok: false, error: '当前密码不正确' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }, [user]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) {
      return { ok: false, error: '未登录' };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return { ok: false, error: '登录状态已失效，请重新登录后再试' };
    }

    try {
      const response = await fetch(apiUrl('/api/v1/auth/delete-account'), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMap: Record<string, string> = {
          service_role_key_required: '后端未配置 Supabase service role key，暂时无法注销账号。',
          Unauthorized: '登录状态已失效，请重新登录后再试',
        };
        return {
          ok: false,
          error: errorMap[payload?.error] || payload?.error || '注销失败，请稍后重试',
        };
      }

      await signOut();
      trackEvent('delete_account');
      return { ok: true };
    } catch {
      return { ok: false, error: '无法连接 3001 服务，请先启动后端服务后再试' };
    }
  }, [user, signOut]);

  return {
    profile,
    setProfile,
    currentUser,
    handleUpdateProfile,
    handleChangePassword,
    handleDeleteAccount,
  };
}
