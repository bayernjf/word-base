import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppSupabase from '@wordbase/shared/AppSupabase';
import { SupabaseProvider } from '@wordbase/shared/context/SupabaseContext';
import { AnnouncementProvider } from '@wordbase/shared/context/AnnouncementContext';
import '@wordbase/shared/index.css';
import { getPlatform, setPlatform } from '@wordbase/shared/platform';
import { setPrimitives, PrimitiveThemeProvider } from '@wordbase/shared/primitives';
import { installGlobalErrorHandlers } from '@wordbase/shared/lib/feedbackLogger';
import { webPrimitives } from '@wordbase/web-primitives';
import { desktopPlatform } from './platform-desktop';

setPlatform(desktopPlatform);
setPrimitives(webPrimitives);
installGlobalErrorHandlers();

const root = createRoot(document.getElementById('root')!);
getPlatform().kv.init().then(() => {
  root.render(
    <StrictMode>
      <PrimitiveThemeProvider theme="glass">
        <SupabaseProvider>
          <AnnouncementProvider>
            <AppSupabase />
          </AnnouncementProvider>
        </SupabaseProvider>
      </PrimitiveThemeProvider>
    </StrictMode>
  );
});
