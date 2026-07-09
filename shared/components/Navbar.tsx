import React, { useState } from 'react';
import { LogIn, LogOut, Settings as SettingsIcon, User, ChevronDown, Languages } from 'lucide-react';

const WordBaseFullLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 340 128" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bookLeft" x1="10" y1="10" x2="26" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
      <linearGradient id="bookRight" x1="36" y1="14" x2="52" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#a5b4fc"/>
        <stop offset="100%" stopColor="#818cf8"/>
      </linearGradient>
      <linearGradient id="card" x1="22" y1="16" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fbbf24"/>
        <stop offset="100%" stopColor="#f59e0b"/>
      </linearGradient>
      <linearGradient id="textGrad" x1="72" y1="36" x2="240" y2="92" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="50%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#f59e0b"/>
      </linearGradient>
    </defs>
    <g transform="translate(4, 24) scale(1.2)">
      <rect x="36" y="14" width="16" height="40" rx="3" fill="url(#bookRight)"/>
      <rect x="10" y="10" width="16" height="44" rx="3" fill="url(#bookLeft)"/>
      <rect x="22" y="16" width="20" height="28" rx="3.5" fill="url(#card)"/>
      <path d="M26 23.5h12M26 29.5h12M26 35.5h10" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
    </g>
    <text x="78" y="78" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="50" fontWeight="800" fill="url(#textGrad)" letterSpacing="-1.5">WordBase</text>
  </svg>
);
import { AppLanguage, ThemeType } from '../types';
import { ThemeClasses } from './ThemeStyles';
import { AVATARS } from '../avatars';
import { createTranslator } from '../i18n';

interface NavbarProps {
  theme: ThemeType;
  language: AppLanguage;
  onThemeChange: (theme: ThemeType) => void;
  onLanguageChange: (language: AppLanguage) => void;
  themeStyles: ThemeClasses;
  isLoggedIn: boolean;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  activeView: string;
  user?: { id: string; email: string; nickname?: string; avatar?: number; createdAt: number } | null;
  isMobile?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  theme, language, onThemeChange, onLanguageChange, themeStyles, isLoggedIn, onLogout, onNavigate, activeView, user, isMobile = false
}) => {
  const isGlass = theme === 'glass';
  const [showDropdown, setShowDropdown] = useState(false);
  const avatarIndex = user?.avatar ?? 0;
  const avatarSvg = AVATARS[Math.max(0, Math.min(AVATARS.length - 1, avatarIndex))];
  const t = createTranslator(language);
  const dropdownDividerClass = isGlass
    ? 'border-white/10'
    : theme === 'natural'
      ? 'border-[#bad8b7]'
      : 'border-neutral-200 dark:border-white/10';
  const dropdownItemClass = isGlass
    ? 'hover:bg-white/5'
    : theme === 'natural'
      ? 'hover:bg-[#f2faee]'
      : 'hover:bg-black/5 dark:hover:bg-white/5';
  const copy = {
    subtitle: t('nav.subtitle'),
    theme: t('nav.theme'),
    languageToggle: t('nav.languageToggle'),
    profile: t('nav.profile'),
    account: t('nav.account'),
    signOut: t('nav.signOut'),
    logIn: t('nav.logIn'),
    userFallback: t('nav.userFallback'),
  };
  const themeOptions = [
    {
      id: 'glass',
      label: t('nav.glassLabel'),
    },
    {
      id: 'natural',
      label: t('nav.sageLabel'),
    },
  ] as const;

  return (
    <nav className={`${themeStyles.navClass} sticky top-0 z-40 backdrop-blur-md bg-opacity-95 ${isMobile ? 'px-0' : ''}`}
    style={isMobile ? { paddingTop: 'env(safe-area-inset-top)' } : undefined}
    >
      <div className={`${isMobile ? 'px-4' : 'max-w-7xl mx-auto'} flex items-center justify-between h-24`}>
        {/* App Title & Brand Logo */}
        <div
          onClick={() => onNavigate(isLoggedIn ? 'dashboard' : 'welcome')}
          className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
        >
          <WordBaseFullLogo className="h-20 w-auto" />
          {!isMobile && isGlass && (
            <div className="ml-3 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] text-white/60 font-mono whitespace-nowrap self-center">
              collect and learn
            </div>
          )}
          {!isMobile && !isGlass && (
            <span className={`ml-2 text-[9px] font-mono tracking-widest uppercase self-end mb-1.5 ${theme === 'natural' ? 'text-[#556a5b]' : 'text-neutral-400'}`}>
              {copy.subtitle}
            </span>
          )}
        </div>

        {/* Dynamic Global Theme Switcher & Login actions */}
        <div className="flex items-center gap-2">
          {!isMobile && (
            <button
              type="button"
              onClick={() => onLanguageChange(language === 'zh' ? 'en' : 'zh')}
              className={`flex items-center space-x-2 py-2 px-3 rounded-full text-[10px] font-mono border transition-all ${
                isGlass
                  ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  : theme === 'natural'
                    ? 'bg-[#fffdf7] border-[#bad8b7] text-[#244235] hover:bg-[#e3f0dd] shadow-xs shadow-[#8fb998]/10'
                    : 'bg-slate-150/80 dark:bg-white/5 border-neutral-300 dark:border-white/10 text-slate-800 dark:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span className="font-sans font-semibold">{copy.languageToggle}</span>
            </button>
          )}

          {!isMobile && (
            <div className={`flex items-center space-x-1 p-1.5 rounded-full text-[10px] font-mono border ${
              isGlass 
                ? 'bg-white/5 border-white/10 text-white' 
                : theme === 'natural'
                  ? 'bg-[#e3f0dd] border-[#bad8b7] text-[#244235] shadow-xs shadow-[#8fb998]/10'
                  : 'bg-slate-150/80 dark:bg-white/5 border-neutral-300 dark:border-white/10'
            }`}>
              <span className={`mr-1.5 px-2 font-sans font-semibold ${isGlass ? 'text-white/40' : theme === 'natural' ? 'text-[#556a5b]' : 'text-neutral-450'}`}>{copy.theme}</span>
              {themeOptions.map(thm => {
                const isSelected = theme === thm.id;
                let btnClass = '';
                
                if (isSelected) {
                  if (isGlass) {
                    btnClass = 'bg-white text-slate-900 shadow-md font-bold';
                  } else if (theme === 'natural') {
                    btnClass = 'bg-[#fffdf7] text-[#173f2b] shadow-sm shadow-[#8fb998]/20 font-bold border border-[#84c796]';
                  } else {
                    btnClass = 'bg-indigo-650 text-white shadow-xs font-bold';
                  }
                } else {
                  if (isGlass) {
                    btnClass = 'text-white/60 hover:text-white hover:bg-white/5 font-semibold';
                  } else if (theme === 'natural') {
                    btnClass = 'text-[#5d7564] hover:text-[#1d3a2b] hover:bg-[#d5ebd0] font-semibold';
                  } else {
                    btnClass = 'text-neutral-550 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-white/5';
                  }
                }

                return (
                  <button
                    key={thm.id}
                    onClick={() => onThemeChange(thm.id as ThemeType)}
                    className={`px-2.5 py-1 rounded-full font-sans transition-all ${btnClass}`}
                  >
                    {thm.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* User Sign status toggle */}
          {isLoggedIn ? (
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center ${isMobile ? 'p-1' : 'space-x-2 py-1.5 px-3'} border rounded-xl text-xs transition-colors cursor-pointer font-bold ${
                  isGlass 
                    ? 'border-white/15 text-white/80 hover:bg-white/5 hover:text-white' 
                    : theme === 'natural'
                      ? 'border-[#bad8b7] text-[#244235] hover:bg-[#e3f0dd] hover:text-[#173f2b] bg-[#fffdf7] shadow-xs shadow-[#8fb998]/10'
                      : 'border-neutral-300 dark:border-white/15 text-neutral-750 dark:text-neutral-300 hover:bg-slate-50'
                }`}
              >
                <div className={isMobile ? 'w-7 h-7' : 'w-6 h-6'} dangerouslySetInnerHTML={{ __html: avatarSvg }} />
                {!isMobile && <span>{user?.nickname || user?.email?.split('@')[0] || copy.userFallback}</span>}
                {!isMobile && <ChevronDown className="w-3 h-3" />}
              </button>

              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className={`absolute right-0 top-full mt-2 ${isMobile ? 'w-56' : 'w-48'} rounded-xl shadow-lg border z-50 ${
                    isGlass 
                      ? 'bg-slate-900/95 border-white/10 text-white' 
                      : theme === 'natural'
                        ? 'bg-[#fffdf7] border-[#bad8b7] text-[#244235]'
                        : 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-white/10'
                  }`}>
                    <div className="py-2">
                      <button
                        onClick={() => { setShowDropdown(false); onNavigate('profile'); }}
                        className={`w-full text-left px-4 py-2 text-xs ${dropdownItemClass} ${themeStyles.textPrimary}`}
                      >
                        <div className="flex items-center space-x-2">
                          <User className="w-3.5 h-3.5" />
                          <span>{copy.profile}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => { setShowDropdown(false); onNavigate('settings-account'); }}
                        className={`w-full text-left px-4 py-2 text-xs ${dropdownItemClass} ${themeStyles.textPrimary}`}
                      >
                        <div className="flex items-center space-x-2">
                          <SettingsIcon className="w-3.5 h-3.5" />
                          <span>{copy.account}</span>
                        </div>
                      </button>
                      <div className={`border-t ${dropdownDividerClass} my-1`} />
                      <button
                        onClick={() => { setShowDropdown(false); onLogout(); }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                      >
                        <div className="flex items-center space-x-2">
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{copy.signOut}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button 
              onClick={() => onNavigate('welcome')}
              className={`flex items-center space-x-1 py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                isGlass 
                  ? 'bg-white text-slate-950 hover:bg-white/90' 
                  : theme === 'natural'
                    ? 'bg-[#56a978] hover:bg-[#4a9669] text-white shadow-sm shadow-[#56a978]/25'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{copy.logIn}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
