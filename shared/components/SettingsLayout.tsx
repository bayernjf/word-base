import React from 'react';
import { User, Sliders, Sparkles, Database, Wand2, ChevronRight } from 'lucide-react';
import { ThemeClasses } from './ThemeStyles';
import { AppLanguage } from '../types';
import { createTranslator } from '../i18n';
import { useIsMobile } from '../hooks/useIsMobile';

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
  const isMobile = useIsMobile();
  const copy = {
    account: t('settingsLayout.account'),
    appearance: t('settingsLayout.appearance'),
    aiModels: t('settingsLayout.aiModels'),
    autoAi: t('settingsLayout.autoAi'),
    sync: t('settingsLayout.sync'),
    title: t('settingsLayout.title'),
    subtitle: t('settingsLayout.subtitle'),
    preferences: t('settingsLayout.preferences'),
  };
  const settingsMenus = [
    { id: 'settings-account', label: copy.account, icon: User },
    { id: 'settings-appearance', label: copy.appearance, icon: Sliders },
    { id: 'settings-aimodels', label: copy.aiModels, icon: Sparkles },
    { id: 'settings-autoai', label: copy.autoAi, icon: Wand2 },
    { id: 'settings-sync', label: copy.sync, icon: Database, hidden: true }
  ];

  const isGlass = themeStyles.name === 'glass';
  const settingsNavPanelClass = isGlass
    ? 'bg-white/5 border-white/10 backdrop-blur-xl'
    : 'bg-[#e3f0dd] border-[#bad8b7] shadow-sm shadow-[#8fb998]/20';
  const settingsNavLabelClass = isGlass ? 'text-white/40' : 'text-[#556a5b]';

  // 移动端：顶部分段控件 + 内容
  if (isMobile) {
    const visibleMenus = settingsMenus.filter(m => !m.hidden);
    return (
      <div className="space-y-4">
        <div>
          <h2 className={`text-lg font-bold tracking-tight ${themeStyles.textPrimary}`}>{copy.title}</h2>
          <p className={`text-xs ${themeStyles.textSecondary}`}>{copy.subtitle}</p>
        </div>

        {/* 移动端设置菜单：水平滚动分段控件 */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {visibleMenus.map(m => {
            const isSelected = activeSettingsTab === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onNavigateSettings(m.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? isGlass
                      ? 'bg-white/15 text-white border border-white/10 shadow-md'
                      : 'bg-[#cceac8] text-[#173f2b] border border-[#84c796] shadow-md shadow-[#88bd90]/25'
                    : isGlass
                      ? 'text-white/50 bg-white/5 border border-white/10 hover:bg-white/10'
                      : 'text-[#5d7564] bg-[#f4f9ef] border border-[#bad8b7] hover:bg-[#e8f2e1]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* 设置内容区 */}
        <div className={`${themeStyles.card} min-h-[400px]`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>{copy.title}</h2>
        <p className={`text-xs ${themeStyles.textSecondary}`}>{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Left sub-nav sidebar */}
        <div className={`md:col-span-1 space-y-1.5 p-3 rounded-2xl border ${
          settingsNavPanelClass
        }`}>
          <span className={`block text-[10px] font-mono uppercase tracking-widest mb-2 px-2.5 font-bold ${settingsNavLabelClass}`}>
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
                  : 'bg-[#cceac8] border border-[#84c796] text-[#173f2b] shadow-md shadow-[#88bd90]/25';
              } else {
                btnClass = isGlass 
                  ? 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent' 
                  : 'text-[#5d7564] hover:text-[#1f422f] hover:bg-[#f8fff2] border border-transparent hover:border-[#bad8b7]';
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
