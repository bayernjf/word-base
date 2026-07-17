import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppSupabase from '@wordbase/shared/AppSupabase';
import { SupabaseProvider } from '@wordbase/shared/context/SupabaseContext';
import { AnnouncementProvider } from '@wordbase/shared/context/AnnouncementContext';
import '@wordbase/shared/index.css';
import { getPlatform, setPlatform } from '@wordbase/shared/platform';
import { webPlatform } from './platform-web';

setPlatform(webPlatform);

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
