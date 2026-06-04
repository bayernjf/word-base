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
    case 'minimalist':
      return {
        bodyBg: 'bg-[#fafafa] font-sans transition-colors duration-500 min-h-screen text-black',
        card: 'bg-white border-2 border-black rounded-none shadow-none p-6 transition-all duration-300',
        sidebar: 'bg-white border-r-2 border-black p-6',
        textPrimary: 'text-black font-semibold tracking-tight',
        textSecondary: 'text-neutral-600 font-normal',
        btnPrimary: 'bg-black hover:bg-neutral-800 text-white rounded-none border border-black px-4 py-2 font-mono transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-center cursor-pointer',
        btnSecondary: 'bg-white hover:bg-neutral-100 text-black rounded-none border-2 border-black px-4 py-2 font-mono text-center cursor-pointer',
        accent: 'bg-neutral-200 border border-black text-black',
        borderClass: 'border-black border-2',
        badgeClass: 'bg-black text-white font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-none',
        navClass: 'bg-white border-b-2 border-black py-4 px-6 font-mono',
        accentText: 'text-black underline decoration-2 underline-offset-4',
        glowEffect: '',
      };
      
    case 'glass':
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
      
    case 'original':
    default:
      return {
        bodyBg: 'bg-slate-50 font-sans transition-colors duration-500 min-h-screen text-slate-800',
        card: 'bg-white border border-slate-100 rounded-2xl shadow-xs hover:shadow-sm hover:border-slate-200/80 transition-all duration-300',
        sidebar: 'bg-slate-900 text-white p-6',
        textPrimary: 'text-slate-800 font-semibold tracking-tight',
        textSecondary: 'text-slate-500 font-normal',
        btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md px-4 py-2 active:scale-95 text-center cursor-pointer',
        btnSecondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-4 py-2 text-center cursor-pointer',
        accent: 'bg-indigo-50 border border-indigo-100 text-indigo-700',
        borderClass: 'border-slate-100',
        badgeClass: 'bg-indigo-150 text-indigo-800 px-2.5 py-0.5 rounded-lg text-xs font-semibold border border-indigo-200/40',
        navClass: 'bg-white border-b border-slate-200/60 py-4 px-6 shadow-xs',
        accentText: 'text-indigo-650 font-semibold',
        glowEffect: '',
      };
  }
}
