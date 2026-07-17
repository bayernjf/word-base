import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DeleteAccountPage } from './delete-account/DeleteAccountPage';
import './landing/landing.css';
import { initAnalytics, trackPageView } from '@wordbase/shared/lib/analytics';

initAnalytics();
trackPageView('账号删除 - WordBase');

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <DeleteAccountPage />
    <AnalyticsConsentBanner />
  </StrictMode>,
);