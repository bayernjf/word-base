import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { createLogger } from '../lib/logger';

const logger = createLogger('SupabaseContext');

interface SupabaseContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    // 检查现有会话
    const init = async () => {
      try {
        logger.debug('SupabaseContext init session');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!initializedRef.current) {
          initializedRef.current = true;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          logger.info('SupabaseContext session loaded', { userId: currentSession?.user?.id });
        }
      } catch (error) {
        logger.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void init();

    // 监听认证状态变化（跳过 INITIAL_SESSION，避免与 getSession 重复）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (event === 'INITIAL_SESSION' && initializedRef.current) {
          return;
        }
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    logger.debug('signUp', { email });
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) logger.error('signUp failed', { error: error.message });
    else logger.info('signUp success');
    return { error };
  };

  const signIn = async (email: string, password: string, remember?: boolean) => {
    logger.debug('signIn', { email, remember });
    // Web 平台走同源 /api/v1/* (由 Cloudflare _worker.js 代理到 Vercel),
    // 避免跨源 CORS 问题。desktop/mobile 平台通过 apiBase.ts 拿到绝对 URL。
    const { getApiBaseUrl, API_PLATFORM } = await import('../lib/apiBase');
    const rawBase = API_PLATFORM === 'web' ? '' : getApiBaseUrl();
    const apiBaseUrl = rawBase.replace(/\/+$/, '');
    if (API_PLATFORM === 'web' || apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, remember }),
        });
        const result = await response.json();
        if (!response.ok) {
          const error = new Error(result.error || 'Login failed');
          logger.error('signIn failed via API', { error: error.message });
          return { error };
        }
        if (result.accessToken) {
          await supabase.auth.setSession({
            access_token: result.accessToken,
            refresh_token: result.refreshToken,
          });
        }
        logger.info('signIn success via API');
        return { error: null };
      } catch (apiError: any) {
        logger.error('signIn API error', { error: apiError.message });
        return { error: apiError };
      }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) logger.error('signIn failed', { error: error.message });
    else logger.info('signIn success');
    return { error };
  };

  const signOut = async () => {
    logger.debug('signOut');
    await supabase.auth.signOut();
    logger.info('signOut success');
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  return (
    <SupabaseContext.Provider
      value={{
        user,
        session,
        isLoading,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
