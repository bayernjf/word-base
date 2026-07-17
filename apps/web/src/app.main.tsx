import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppSupabase from '@wordbase/shared/AppSupabase';
import { SupabaseProvider } from '@wordbase/shared/context/SupabaseContext';
import { AnnouncementProvider } from '@wordbase/shared/context/AnnouncementContext';
import '@wordbase/shared/index.css';
import { getPlatform, setPlatform } from '@wordbase/shared/platform';
import { installGlobalErrorHandlers } from '@wordbase/shared/lib/feedbackLogger';
import { webPlatform } from './platform-web';
import { initAnalytics } from '@wordbase/shared/lib/analytics';

setPlatform(webPlatform);
installGlobalErrorHandlers();
initAnalytics();

const root = createRoot(document.getElementById('root')!);
getPlatform().kv.init().then(() => {
  root.render(
    <StrictMode>
      <SupabaseProvider>
        <AnnouncementProvider>
          <AppSupabase />
        </AnnouncementProvider>
      </SupabaseProvider>
    </StrictMode>
  );
});
