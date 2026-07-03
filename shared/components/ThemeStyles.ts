import { ThemeType } from '../types';

export interface ThemeClasses {
  name: ThemeType;
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
  secondaryBg: string;
}

export function getThemeClasses(theme: ThemeType, isSmallTypography: boolean = false): ThemeClasses {
  const textSizeMod = isSmallTypography ? 'text-sm' : 'text-base';
  
  switch (theme) {
    case 'natural':
      return {
        name: 'natural',
        bodyBg: 'bg-[#edf6e7] font-sans transition-colors duration-500 min-h-screen text-[#244235]',
        card: 'bg-[#fffdf7] border border-[#bad8b7] rounded-2xl shadow-md shadow-[#8fb998]/20 p-6 hover:shadow-lg hover:shadow-[#8fb998]/25 transition-all duration-300',
        sidebar: 'bg-[#e3f0dd] border-r border-[#bad8b7] p-6 shadow-sm shadow-[#8fb998]/20',
        textPrimary: 'text-[#1d3a2b] font-semibold tracking-tight',
        textSecondary: 'text-[#556a5b] font-normal leading-relaxed',
        btnPrimary: 'bg-[#56a978] hover:bg-[#4a9669] text-white rounded-full transition-all shadow-sm shadow-[#56a978]/30 hover:shadow-md hover:shadow-[#56a978]/35 px-4 py-2 hover:scale-[1.01] active:scale-[0.99] text-center cursor-pointer',
        btnSecondary: 'bg-[#fffdf7] hover:bg-[#e1f0db] text-[#2a4d3a] rounded-xl border border-[#adcfa9] px-4 py-2 text-center cursor-pointer transition-all shadow-xs shadow-[#8fb998]/10 active:scale-[0.99]',
        accent: 'bg-[#fff4d8] border border-[#f2d8aa] text-[#8a6338]',
        borderClass: 'border-[#bad8b7]',
        badgeClass: 'bg-[#d9efd2] text-[#336f4e] px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border border-[#9fcea8]',
        navClass: 'bg-[#f8fbf5]/95 border-b border-[#bad8b7] py-4 px-6 shadow-sm shadow-[#8fb998]/10',
        accentText: 'text-[#2f805d] underline decoration-[#e6b85c]/80 decoration-wavy decoration-2 underline-offset-4 font-semibold',
        glowEffect: '',
        secondaryBg: 'bg-[#dfeeda]',
      };
      
    case 'glass':
    default:
      return {
        name: 'glass',
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
        secondaryBg: 'bg-white/10',
      };
  }
}
