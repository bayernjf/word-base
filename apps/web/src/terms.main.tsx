import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TermsPage } from './terms/TermsPage';
import { AnalyticsConsentBanner } from '@wordbase/shared/components/AnalyticsConsentBanner';
import './landing/landing.css';
import { initAnalytics, trackPageView } from '@wordbase/shared/lib/analytics';

initAnalytics();
trackPageView('服务条款 - WordBase');

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <TermsPage />
    <AnalyticsConsentBanner />
  </StrictMode>,
);
