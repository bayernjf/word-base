import { ThemeType } from '../types';

export interface ThemeClasses {
  bodyBg: string;
  card: string;
  sidebar: string;
  textPrimary: string;
  textSecondary: string;
  btnPrimary: string;
  btnSecondary: string;
  accent: string;
  borderClass: string;
  badgeClass: string;
  navClass: string;
  accentText: string;
  glowEffect: string;
}

export function getThemeClasses(theme: ThemeType, isSmallTypography: boolean = false): ThemeClasses {
  const textSizeMod = isSmallTypography ? 'text-sm' : 'text-base';
  
  switch (theme) {
    case 'natural':
      return {
        bodyBg: 'bg-[#f4f2eb] font-sans transition-colors duration-500 min-h-screen text-emerald-950',
        card: 'bg-[#faf9f4] border border-[#d6d2c4] rounded-2xl shadow-sm p-6 hover:shadow-md transition-all duration-300',
        sidebar: 'bg-[#ece9df] border-r border-[#d6d2c4] p-6',
        textPrimary: 'text-[#1c2e24] font-semibold tracking-tight',
        textSecondary: 'text-[#525f54] font-normal leading-relaxed',
        btnPrimary: 'bg-emerald-700 hover:bg-emerald-800 text-[#f4f2eb] rounded-xl transition-all shadow-sm hover:shadow-md px-4 py-2 hover:scale-[1.01] active:translate-y-0 px-4 py-2 text-center cursor-pointer',
        btnSecondary: 'bg-stone-100 hover:bg-stone-200 text-emerald-900 rounded-xl border border-stone-300 px-4 py-2 text-center cursor-pointer',
        accent: 'bg-amber-100 border border-amber-200 text-amber-800',
        borderClass: 'border-[#d6d2c4]',
        badgeClass: 'bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-xs font-serif uppercase tracking-wider border border-emerald-900/10',
        navClass: 'bg-[#ece9df] border-b border-[#d6d2c4] py-4 px-6',
        accentText: 'text-emerald-700 underline decoration-amber-500/50 decoration-wavy decoration-2 underline-offset-4 font-normal',
        glowEffect: '',
      };
      
    case 'glass':
    default:
      return {
        bodyBg: 'bg-[#0f172a] font-sans min-h-screen text-white transition-colors duration-500 relative overflow-x-hidden',
        card: 'bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 transition-all hover:bg-white/[0.08] hover:border-white/15 hover:shadow-lg hover:shadow-indigo-500/5 duration-300',
        sidebar: 'bg-white/5 border border-white/10 backdrop-blur-xl p-5 rounded-2xl shadow-xl shadow-black/10',
        textPrimary: 'text-white font-semibold tracking-tight',
        textSecondary: 'text-white/65 font-medium leading-relaxed',
        btnPrimary: 'bg-white text-slate-900 font-semibold rounded-full px-6 py-2.5 transition-all hover:bg-white/90 active:scale-95 text-center cursor-pointer hover:shadow-lg text-sm',
        btnSecondary: 'bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 px-4 py-2 text-center cursor-pointer transition-all active:scale-95 text-xs font-semibold',
        accent: 'bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 border border-white/10 text-white',
        borderClass: 'border-white/10',
        badgeClass: 'bg-white/10 border border-white/10 text-white/70 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-xs',
        navClass: 'bg-white/5 border-b border-white/10 py-4 px-6 backdrop-blur-md',
        accentText: 'text-indigo-400 font-bold drop-shadow-[0_0_6px_rgba(129,140,248,0.4)]',
        glowEffect: '',
      };
  }
}
