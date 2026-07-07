import type { LandingTheme } from './Landing';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function themeVars(theme: LandingTheme) {
  return {
    isDark: theme === 'dark',
    bg: theme === 'dark' ? 'bg-[#0a0e1a]' : 'bg-[#fafaf9]',
    text: theme === 'dark' ? 'text-white' : 'text-slate-800',
    textMuted: theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
    textSubtle: theme === 'dark' ? 'text-slate-500' : 'text-slate-400',
    border: theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200',
    cardBg: theme === 'dark' ? 'bg-slate-900/50' : 'bg-white',
    cardHover: theme === 'dark' ? 'hover:border-slate-700/80' : 'hover:border-slate-300',
    cardSolid: theme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-50',
    inputBg: theme === 'dark' ? 'bg-slate-800/60' : 'bg-slate-100',
    navBg: theme === 'dark' ? 'bg-[#0a0e1a]/80' : 'bg-white/80',
    sectionAlt: theme === 'dark' ? 'bg-slate-900/20' : 'bg-slate-50/80',
  };
}
