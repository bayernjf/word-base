import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppSupabase from '@wordbase/shared/AppSupabase';
import { SupabaseProvider } from '@wordbase/shared/context/SupabaseContext';
import '@wordbase/shared/index.css';
import { getPlatform, setPlatform } from '@wordbase/shared/platform';
import { mobilePlatform } from './platform-mobile';

setPlatform(mobilePlatform);

const root = createRoot(document.getElementById('root')!);
getPlatform().kv.init().then(() => {
  root.render(
    <StrictMode>
      <SupabaseProvider>
        <AppSupabase />
      </SupabaseProvider>
    </StrictMode>
  );
});
