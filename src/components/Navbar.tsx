import React, { useState } from 'react';
import { Sparkles, LogIn, LogOut, Settings as SettingsIcon, User, ChevronDown, Languages } from 'lucide-react';
import { AppLanguage, ThemeType } from '../types';
import { ThemeClasses } from './ThemeStyles';
import { AVATARS } from '../avatars';

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
}

export const Navbar: React.FC<NavbarProps> = ({ 
  theme, language, onThemeChange, onLanguageChange, themeStyles, isLoggedIn, onLogout, onNavigate, activeView, user 
}) => {
  const isGlass = theme === 'glass';
  const [showDropdown, setShowDropdown] = useState(false);
  const avatarIndex = user?.avatar ?? 0;
  const avatarSvg = AVATARS[Math.max(0, Math.min(AVATARS.length - 1, avatarIndex))];
  const copy = {
    subtitle: language === 'zh' ? '翻译与间隔学习' : 'Translation & Spaced Study',
    theme: language === 'zh' ? '主题:' : 'Theme:',
    languageToggle: language === 'zh' ? '中 / EN' : 'EN / 中',
    profile: language === 'zh' ? '个人中心' : 'Personal Center',
    account: language === 'zh' ? '账户设置' : 'Account Settings',
    signOut: language === 'zh' ? '退出登录' : 'Sign Out',
    logIn: language === 'zh' ? '登录' : 'Log In',
    userFallback: language === 'zh' ? '用户' : 'User',
  };
  const themeOptions = [
    {
      id: 'glass',
      label: language === 'zh' ? '液态玻璃' : 'Liquid Glass',
    },
    {
      id: 'natural',
      label: language === 'zh' ? '清新' : 'Sage',
    },
  ] as const;

  return (
    <nav className={`${themeStyles.navClass} sticky top-0 z-40 backdrop-blur-md bg-opacity-95`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* App Title & Brand Logo */}
        <div 
          onClick={() => onNavigate(isLoggedIn ? 'dashboard' : 'welcome')}
          className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className={`p-1.5 rounded-xl flex items-center justify-center transition-all ${
            isGlass 
              ? 'w-9 h-9 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/10' 
              : theme === 'natural'
                ? 'bg-emerald-700/15 text-emerald-800'
                : 'bg-indigo-650/15 text-indigo-600'
          }`}>
            <Sparkles className={`w-5 h-5 ${isGlass ? 'fill-white/10' : theme === 'natural' ? 'fill-emerald-800/10' : 'fill-indigo-600/10'}`} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <h1 className={`text-lg font-bold tracking-tight ${theme === 'natural' ? 'text-[#1c2e24]' : 'text-slate-900 dark:text-white'}`}>WordScene AI</h1>
              {isGlass && (
                <div className="ml-3 px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[9px] text-white/60 font-mono">
                  v4.2.0
                </div>
              )}
            </div>
            <span className={`text-[9px] font-mono tracking-widest block uppercase -mt-0.5 ${isGlass ? 'text-white/45' : theme === 'natural' ? 'text-emerald-900/60' : 'text-neutral-400'}`}>
              {copy.subtitle}
            </span>
          </div>
        </div>

        {/* Dynamic Global Theme Switcher & Login actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onLanguageChange(language === 'zh' ? 'en' : 'zh')}
            className={`flex items-center space-x-2 py-2 px-3 rounded-full text-[10px] font-mono border transition-all ${
              isGlass
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : theme === 'natural'
                  ? 'bg-[#dfdbcf] border-[#c4c0b1] text-emerald-950 hover:bg-[#ece9df]'
                  : 'bg-slate-150/80 dark:bg-white/5 border-neutral-300 dark:border-white/10 text-slate-800 dark:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="font-sans font-semibold">{copy.languageToggle}</span>
          </button>

          <div className={`flex items-center space-x-1 p-1.5 rounded-full text-[10px] font-mono border ${
            isGlass 
              ? 'bg-white/5 border-white/10 text-white' 
              : theme === 'natural'
                ? 'bg-[#dfdbcf] border-[#c4c0b1] text-emerald-950'
                : 'bg-slate-150/80 dark:bg-white/5 border-neutral-300 dark:border-white/10'
          }`}>
            <span className={`mr-1.5 px-2 font-sans font-semibold ${isGlass ? 'text-white/40' : theme === 'natural' ? 'text-emerald-900/70' : 'text-neutral-450'}`}>{copy.theme}</span>
            {themeOptions.map(thm => {
              const isSelected = theme === thm.id;
              let btnClass = '';
              
              if (isSelected) {
                if (isGlass) {
                  btnClass = 'bg-white text-slate-900 shadow-md font-bold';
                } else if (theme === 'natural') {
                  btnClass = 'bg-white text-black shadow-xs font-bold border border-[#c4c0b1]';
                } else {
                  btnClass = 'bg-indigo-650 text-white shadow-xs font-bold';
                }
              } else {
                if (isGlass) {
                  btnClass = 'text-white/60 hover:text-white hover:bg-white/5 font-semibold';
                } else if (theme === 'natural') {
                  btnClass = 'text-emerald-900/60 hover:text-[#1c2e24] hover:bg-[#ece9df] font-semibold';
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

          {/* User Sign status toggle */}
          {isLoggedIn ? (
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center space-x-2 py-1.5 px-3 border rounded-xl text-xs transition-colors cursor-pointer font-bold ${
                  isGlass 
                    ? 'border-white/15 text-white/80 hover:bg-white/5 hover:text-white' 
                    : theme === 'natural'
                      ? 'border-[#c4c0b1] text-black hover:bg-[#dfdbcf] hover:text-black'
                      : 'border-neutral-300 dark:border-white/15 text-neutral-750 dark:text-neutral-300 hover:bg-slate-50'
                }`}
              >
                <div className="w-6 h-6" dangerouslySetInnerHTML={{ __html: avatarSvg }} />
                <span>{user?.nickname || user?.email?.split('@')[0] || copy.userFallback}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg border z-50 ${
                    isGlass 
                      ? 'bg-slate-900/95 border-white/10 text-white' 
                      : theme === 'natural'
                        ? 'bg-[#f5f2eb] border-[#c4c0b1]'
                        : 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-white/10'
                  }`}>
                    <div className="py-2">
                      <button
                        onClick={() => { setShowDropdown(false); onNavigate('profile'); }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 ${themeStyles.textPrimary}`}
                      >
                        <div className="flex items-center space-x-2">
                          <User className="w-3.5 h-3.5" />
                          <span>{copy.profile}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => { setShowDropdown(false); onNavigate('settings-account'); }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 ${themeStyles.textPrimary}`}
                      >
                        <div className="flex items-center space-x-2">
                          <SettingsIcon className="w-3.5 h-3.5" />
                          <span>{copy.account}</span>
                        </div>
                      </button>
                      <div className="border-t border-neutral-200 dark:border-white/10 my-1" />
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
