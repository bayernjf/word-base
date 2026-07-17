import React from 'react';
import { User, Sliders, Sparkles, Database, Wand2, Info, ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react';
import { ThemeClasses } from './ThemeStyles';
import { AppLanguage } from '../types';
import { createTranslator } from '../i18n';
import { useIsMobile } from '../hooks/useIsMobile';

interface SettingsLayoutProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  activeSettingsTab: string;
  activeView?: string;
  onNavigateSettings: (tab: string) => void;
  children?: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ 
  themeStyles, language, activeSettingsTab, activeView, onNavigateSettings, children 
}) => {
  const t = createTranslator(language);
  const isMobile = useIsMobile();
  const copy = {
    account: t('settingsLayout.account'),
    appearance: t('settingsLayout.appearance'),
    aiModels: t('settingsLayout.aiModels'),
    autoAi: t('settingsLayout.autoAi'),
    sync: t('settingsLayout.sync'),
    about: t('settingsLayout.about'),
    feedback: t('settingsLayout.feedback'),
    title: t('settingsLayout.title'),
    subtitle: t('settingsLayout.subtitle'),
    preferences: t('settingsLayout.preferences'),
    back: language === 'zh' ? '设置' : 'Settings',
  };
  const settingsMenus = [
    { id: 'settings-account', label: copy.account, icon: User },
    { id: 'settings-appearance', label: copy.appearance, icon: Sliders },
    { id: 'settings-aimodels', label: copy.aiModels, icon: Sparkles },
    { id: 'settings-autoai', label: copy.autoAi, icon: Wand2 },
    { id: 'settings-sync', label: copy.sync, icon: Database, hidden: true },
    { id: 'settings-feedback', label: copy.feedback, icon: MessageSquare },
    { id: 'settings-about', label: copy.about, icon: Info },
  ];

  const isGlass = themeStyles.name === 'glass';
  const settingsNavPanelClass = isGlass
    ? 'bg-white/5 border-white/10 backdrop-blur-xl'
    : 'bg-[#e3f0dd] border-[#bad8b7] shadow-sm shadow-[#8fb998]/20';
  const settingsNavLabelClass = isGlass ? 'text-white/40' : 'text-[#556a5b]';

  const isMobileList = isMobile && activeSettingsTab === 'settings-list';

  // 移动端：列表式分组导航（iOS 设置风格）
  if (isMobileList) {
    const visibleMenus = settingsMenus.filter(m => !m.hidden);

    return (
      <div className="space-y-4">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>{copy.title}</h2>
          <p className={`text-xs ${themeStyles.textSecondary}`}>{copy.subtitle}</p>
        </div>

        {/* 设置列表分组 */}
        <div className={`rounded-2xl border overflow-hidden ${
          isGlass ? 'bg-white/5 border-white/10' : 'bg-[#fffdf7] border-[#bad8b7]'
        }`}>
          <div className={`px-4 pt-3 pb-1.5 text-[10px] font-mono uppercase tracking-widest font-bold ${
            isGlass ? 'text-white/40' : 'text-[#556a5b]'
          }`}>
            {copy.preferences}
          </div>
          <div className={`divide-y ${isGlass ? 'divide-white/5' : 'divide-[#d0e4cb]'}`}>
            {visibleMenus.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => onNavigateSettings(m.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer ${
                    isGlass
                      ? 'hover:bg-white/5'
                      : 'hover:bg-[#f4f9ef]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isGlass ? 'bg-white/10 text-indigo-300' : 'bg-[#e8f2e1] text-[#336f4e]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`flex-1 text-left text-sm font-medium ${themeStyles.textPrimary}`}>
                    {m.label}
                  </span>
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                    isGlass ? 'text-white/30' : 'text-[#9ab3a0]'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 移动端详情页
  if (isMobile) {
    const visibleMenus = settingsMenus.filter(m => !m.hidden);
    const currentMenu = visibleMenus.find(m => m.id === activeSettingsTab);
    const isSubPage = activeView === 'settings-addmodel' || activeView?.startsWith('settings-editmodel-') || activeView === 'settings-privacy';

    // 子页面（添加/编辑模型）不渲染外层标题栏和卡片包裹，子组件自己处理
    if (isSubPage) {
      return <>{children}</>;
    }

    return (
      <div className="space-y-4">
        {/* 顶部导航栏 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateSettings('settings-list')}
            className={`flex items-center gap-1 text-sm font-semibold transition-colors cursor-pointer ${
              isGlass ? 'text-indigo-300 hover:text-indigo-200' : 'text-[#2f805d] hover:text-[#1f5e3f]'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{copy.back}</span>
          </button>
        </div>

        {/* 页面标题 */}
        {currentMenu && (
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>
              {currentMenu.label}
            </h2>
          </div>
        )}

        {/* 设置内容 */}
        <div className={`${themeStyles.card}`}>
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
