import React from 'react';
import { Sparkles, LogIn, LogOut, Settings as SettingsIcon, Layers, Sliders } from 'lucide-react';
import { ThemeType } from '../types';
import { ThemeClasses } from './ThemeStyles';

interface NavbarProps {
  theme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  themeStyles: ThemeClasses;
  isLoggedIn: boolean;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  theme, onThemeChange, themeStyles, isLoggedIn, onLogout, onNavigate, activeView 
}) => {
  const isGlass = theme === 'glass';

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
              : 'bg-indigo-650/15 text-indigo-600'
          }`}>
            <Sparkles className="w-5 h-5 fill-white/10" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">WordScene AI</h1>
              {isGlass && (
                <div className="ml-3 px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[9px] text-white/60 font-mono">
                  v4.2.0
                </div>
              )}
            </div>
            <span className={`text-[9px] font-mono tracking-widest block uppercase -mt-0.5 ${isGlass ? 'text-white/45' : 'text-neutral-400'}`}>
              Translation & Spaced Study
            </span>
          </div>
        </div>

        {/* Dynamic Global Theme Switcher & Login actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Theme Quick Selector pill box */}
          <div className={`flex items-center space-x-1 p-1.5 rounded-full text-[10px] font-mono border ${
            isGlass 
              ? 'bg-white/5 border-white/10 text-white' 
              : 'bg-slate-150/80 dark:bg-white/5 border-neutral-300 dark:border-white/10'
          }`}>
            <span className={`mr-1.5 px-2 font-sans font-semibold ${isGlass ? 'text-white/40' : 'text-neutral-450'}`}>Theme:</span>
            {[
              { id: 'original', label: '原本/Sky' },
              { id: 'minimalist', label: '极简/Black' },
              { id: 'glass', label: 'iOS26/Glass' },
              { id: 'natural', label: '清新/Sage' }
            ].map(thm => {
              const isSelected = theme === thm.id;
              let btnClass = '';
              
              if (isSelected) {
                btnClass = isGlass 
                  ? 'bg-white text-slate-900 shadow-md font-bold' 
                  : 'bg-indigo-650 text-white shadow-xs';
              } else {
                btnClass = isGlass 
                  ? 'text-white/60 hover:text-white hover:bg-white/5 font-semibold' 
                  : 'text-neutral-550 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-white/5';
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
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => onNavigate('settings-account')}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isGlass ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-neutral-500'
                }`}
                title="Account Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
              
              <button 
                onClick={onLogout}
                className={`flex items-center space-x-1 py-1.5 px-3 border rounded-xl text-xs transition-colors cursor-pointer font-bold ${
                  isGlass 
                    ? 'border-white/15 text-white/80 hover:bg-white/5 hover:text-white' 
                    : 'border-neutral-300 dark:border-white/15 text-neutral-750 dark:text-neutral-300 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
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
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
