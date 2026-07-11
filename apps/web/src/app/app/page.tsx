'use client';

import { useEffect, useState } from 'react';
import AppSupabase from '@wordbase/shared/AppSupabase';
import { SupabaseProvider } from '@wordbase/shared/context/SupabaseContext';
import '@wordbase/shared/index.css';
import { getPlatform, setPlatform } from '@wordbase/shared/platform';
import { setPrimitives, PrimitiveThemeProvider } from '@wordbase/shared/primitives';
import { webPrimitives } from '../../primitives';
import { webPlatform } from '../../platform-web';

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