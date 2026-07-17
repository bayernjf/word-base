import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivacyPage } from './privacy/PrivacyPage';
import './landing/landing.css';
import { initAnalytics, trackPageView } from '@wordbase/shared/lib/analytics';

initAnalytics();
trackPageView('隐私政策 - WordBase');

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <PrivacyPage />
    <AnalyticsConsentBanner />
  </StrictMode>,
);
