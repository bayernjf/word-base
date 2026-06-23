import React from 'react';
import { User, Sliders, Sparkles, Database } from 'lucide-react';
import { ThemeClasses } from './ThemeStyles';
import { AppLanguage } from '../types';
import { createTranslator } from '../i18n';

interface SettingsLayoutProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  activeSettingsTab: string;
  onNavigateSettings: (tab: string) => void;
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ 
  themeStyles, language, activeSettingsTab, onNavigateSettings, children 
}) => {
  const t = createTranslator(language);
  const copy = {
    account: t('settingsLayout.account'),
    appearance: t('settingsLayout.appearance'),
    aiModels: t('settingsLayout.aiModels'),
    sync: t('settingsLayout.sync'),
    title: t('settingsLayout.title'),
    subtitle: t('settingsLayout.subtitle'),
    preferences: t('settingsLayout.preferences'),
  };
  const settingsMenus = [
    { id: 'settings-account', label: copy.account, icon: User },
    { id: 'settings-appearance', label: copy.appearance, icon: Sliders },
    { id: 'settings-aimodels', label: copy.aiModels, icon: Sparkles, hidden: true },
    { id: 'settings-sync', label: copy.sync, icon: Database, hidden: true }
  ];

  const isGlass = themeStyles.borderClass === 'border-white/10';

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>{copy.title}</h2>
        <p className={`text-xs ${themeStyles.textSecondary}`}>{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Left sub-nav sidebar */}
        <div className={`md:col-span-1 space-y-1.5 p-3 rounded-2xl border ${
          isGlass 
            ? 'bg-white/5 border-white/10 backdrop-blur-xl' 
            : 'bg-slate-100/50 dark:bg-white/5 border-neutral-200 dark:border-white/5'
        }`}>
          <span className={`block text-[10px] font-mono uppercase tracking-widest mb-2 px-2.5 font-bold ${isGlass ? 'text-white/40' : 'text-neutral-400'}`}>
            {copy.preferences}
          </span>
          <ul className="space-y-1">
            {settingsMenus.filter(m => !m.hidden).map(m => {
              const isSelected = activeSettingsTab === m.id;
              const Icon = m.icon;
              
              let btnClass = '';
              if (isSelected) {
                btnClass = isGlass 
                  ? 'bg-white/10 border border-white/10 text-white shadow-md' 
                  : 'bg-indigo-600 text-white shadow-xs';
              } else {
                btnClass = isGlass 
                  ? 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent' 
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5';
              }

              return (
                <li key={m.id}>
                  <button
                    onClick={() => onNavigateSettings(m.id)}
                    className={`w-full flex items-center space-x-2.5 p-2.5 rounded-xl transition-all font-sans text-xs font-semibold cursor-pointer ${btnClass}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{m.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Settings main form slot */}
        <div className="md:col-span-3">
          <div className={`${themeStyles.card} min-h-[400px]`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
