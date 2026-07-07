import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppSupabase from './AppSupabase.tsx';
import { SupabaseProvider } from './context/SupabaseContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SupabaseProvider>
      <AppSupabase />
    </SupabaseProvider>
  </StrictMode>,
);
