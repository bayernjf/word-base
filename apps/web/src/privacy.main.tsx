import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivacyPage } from './privacy/PrivacyPage';
import './landing/landing.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <PrivacyPage />
  </StrictMode>,
);
