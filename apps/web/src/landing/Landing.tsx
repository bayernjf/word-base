'use client';

import { useState, useEffect } from 'react';
import { LandingNav } from './components/LandingNav';
import { Hero } from './components/Hero';
import { WorkflowSection } from './components/WorkflowSection';
import { ExtensionSection } from './components/ExtensionSection';
import { LearningSection } from './components/LearningSection';
import { MultiPlatformSection } from './components/MultiPlatformSection';
import { FinalCTA } from './components/FinalCTA';
import { MacInstallGuide } from './components/MacInstallGuide';

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

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const [macGuideOpen, setMacGuideOpen] = useState(false);
  const openMacGuide = () => setMacGuideOpen(true);

  return (
    <div className="min-h-screen">
      <LandingNav theme={theme} toggleTheme={toggleTheme} />
      <main>
        <Hero theme={theme} onMacDownload={openMacGuide} />
        <WorkflowSection theme={theme} />
        <ExtensionSection theme={theme} />
        <LearningSection theme={theme} />
        <MultiPlatformSection theme={theme} />
        <FinalCTA theme={theme} onMacDownload={openMacGuide} />
      </main>
      <MacInstallGuide open={macGuideOpen} onClose={() => setMacGuideOpen(false)} theme={theme} />
    </div>
  );
}
