import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from './landing/Landing';
import './landing/landing.css';
import { initAnalytics } from '@wordbase/shared/lib/analytics';

initAnalytics();

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <Landing />
  </StrictMode>,
);
