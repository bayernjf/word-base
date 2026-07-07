import React from 'react';
import { Home, BookOpen, Layers, Sparkles, Activity, User } from 'lucide-react';
import { ThemeClasses } from './ThemeStyles';
import { AppLanguage } from '../types';
import { createTranslator } from '../i18n';

interface MobileTabBarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  themeStyles: ThemeClasses;
  language: AppLanguage;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ activeView, onNavigate, themeStyles, language }) => {
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';

  const tabs = [
    { id: 'dashboard', label: t('sidebar.dashboard'), icon: Home },
    { id: 'vocabulary', label: t('sidebar.vocabulary'), icon: BookOpen },
    { id: 'mylists', label: t('sidebar.mylists'), icon: Layers },
    { id: 'stories', label: t('sidebar.stories'), icon: Sparkles },
    { id: 'practice', label: t('sidebar.practice'), icon: Activity },
    { id: 'profile', label: t('sidebar.settings'), icon: User },
  ];

  const parentView = activeView.split('-')[0];

  const isActive = (tabId: string) => {
    if (tabId === 'profile') {
      return activeView.startsWith('settings') || activeView === 'profile';
    }
    return parentView === tabId;
  };

  const handleNavigate = (tabId: string) => {
    if (tabId === 'profile') {
      onNavigate('settings-list');
    } else {
      onNavigate(tabId);
    }
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 ${
      isGlass
        ? 'bg-slate-900/90 border-t border-white/10 backdrop-blur-md'
        : 'bg-[#fffdf7] border-t border-[#bad8b7]'
    }`}
    style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.id);
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleNavigate(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all duration-200 cursor-pointer active:scale-90 ${
                active
                  ? isGlass
                    ? 'text-indigo-400'
                    : 'text-[#2f7051]'
                  : isGlass
                    ? 'text-white/40'
                    : 'text-[#8a9c89]'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{tab.label}</span>
              {active && (
                <span className={`absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                  isGlass ? 'bg-indigo-400' : 'bg-[#2f7051]'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
