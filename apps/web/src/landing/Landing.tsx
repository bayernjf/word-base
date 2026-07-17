'use client';

import { useState, useEffect } from 'react';
import { initAnalytics, trackPageView } from '@wordbase/shared/lib/analytics';
import { AnalyticsConsentBanner } from '@wordbase/shared/components/AnalyticsConsentBanner';
import { LandingNav } from './components/LandingNav';
import { Hero } from './components/Hero';
import { WorkflowSection } from './components/WorkflowSection';
import { ExtensionSection } from './components/ExtensionSection';
import { LearningSection } from './components/LearningSection';
import { MultiPlatformSection } from './components/MultiPlatformSection';
import { FinalCTA } from './components/FinalCTA';
import { LandingFooter } from './components/LandingFooter';

export type LandingTheme = 'dark' | 'light';

export function Landing() {
  const [theme, setTheme] = useState<LandingTheme>(() => {
    try {
      const saved = localStorage.getItem('wordbase-landing-theme');
      return (saved === 'light' ? 'light' : 'dark') as LandingTheme;
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.body.classList.remove('landing-dark', 'landing-light');
    document.body.classList.add(`landing-${theme}`);
    try {
      localStorage.setItem('wordbase-landing-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    initAnalytics();
    let attempts = 0;
    const tryTrack = () => {
      const w = window as any;
      if (typeof w.gtag === 'function') {
        trackPageView('WordBase - 浏览即学习的 AI 词汇工作台');
      } else if (attempts < 20) {
        attempts++;
        setTimeout(tryTrack, 500);
      }
    };
    tryTrack();
  }, []);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div className="min-h-screen">
      <LandingNav theme={theme} toggleTheme={toggleTheme} />
      <main>
        <Hero theme={theme} />
        <WorkflowSection theme={theme} />
        <ExtensionSection theme={theme} />
        <LearningSection theme={theme} />
        <MultiPlatformSection theme={theme} />
        <FinalCTA theme={theme} />
      </main>
      <LandingFooter theme={theme} />
      <AnalyticsConsentBanner />
    </div>
  );
}
