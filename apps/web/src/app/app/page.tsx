'use client';

import { useEffect, useState } from 'react';
import AppSupabase from '@wordbase/shared/AppSupabase';
import { SupabaseProvider } from '@wordbase/shared/context/SupabaseContext';
import '@wordbase/shared/index.css';
import { getPlatform, setPlatform } from '@wordbase/shared/platform';
import { setPrimitives, PrimitiveThemeProvider } from '@wordbase/shared/primitives';
import { webPrimitives } from '../../primitives';
import { webPlatform } from '../../platform-web';

// Inject public env vars into global for shared package access
;(globalThis as any).__APP_ENV__ = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_SYNC_SERVER_URL: process.env.NEXT_PUBLIC_SYNC_SERVER_URL,
}

export default function AppPage() {
  const [platformReady, setPlatformReady] = useState(false);

  useEffect(() => {
    setPlatform(webPlatform);
    setPrimitives(webPrimitives);
    getPlatform().kv.init().then(() => {
      setPlatformReady(true);
    });
  }, []);

  if (!platformReady) {
    return <div className="min-h-screen flex items-center justify-center text-white">加载中...</div>;
  }

  return (
    <PrimitiveThemeProvider theme="glass">
      <SupabaseProvider>
        <AppSupabase />
      </SupabaseProvider>
    </PrimitiveThemeProvider>
  );
}