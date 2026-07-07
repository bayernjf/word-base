import React from 'react';
import { Check } from 'lucide-react';
import { AppLanguage, ThemeType } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface AppearanceSettingsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  activeTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  isCompactMode: boolean;
  onCompactToggle: () => void;
  isSmallTypography: boolean;
  onTypographyToggle: () => void;
}

export const AppearanceSettingsView: React.FC<AppearanceSettingsProps> = ({ 
  themeStyles, language, activeTheme, onThemeChange, isCompactMode, onCompactToggle, isSmallTypography, onTypographyToggle
}) => {
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';
  const cardSelectedClass = isGlass
    ? 'border-indigo-600 bg-linear-to-tr from-indigo-500/5 to-indigo-500/10'
    : 'border-[#56a978] bg-[#d9efd2] shadow-sm shadow-[#8fb998]/25';
  const cardIdleClass = isGlass
    ? 'hover:bg-slate-100 dark:hover:bg-white/5 border-neutral-200 dark:border-white/10'
    : 'border-[#9fc89f] bg-[#fffdf7] hover:bg-[#f2faee] hover:border-[#84c796]';
  const checkBadgeClass = isGlass ? 'bg-indigo-600 text-white' : 'bg-[#56a978] text-white';
  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('appearance.title')}</h3>
        <p className="text-xs text-neutral-400">{t('appearance.subtitle')}</p>
      </div>

      <div className="space-y-6 text-xs">
        {/* Theme select radios */}
        <div>
          <span className="block text-xs font-extrabold uppercase tracking-widest mb-3 text-neutral-400">
            {t('appearance.palette')}
          </span>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'glass', label: t('appearance.glassLabel'), color: 'bg-blue-500', desc: t('appearance.glassDesc') },
              { id: 'natural', label: t('appearance.naturalLabel'), color: 'bg-emerald-700', desc: t('appearance.naturalDesc') }
            ].map(thm => (
              <button 
                key={thm.id}
                type="button"
                onClick={() => onThemeChange(thm.id as ThemeType)}
                className={`p-3.5 border text-left rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.01] ${activeTheme === thm.id ? cardSelectedClass : cardIdleClass} cursor-pointer`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${thm.color}`} />
                    <span>{thm.label}</span>
                  </span>
                  
                  {activeTheme === thm.id && (
                    <span className={`p-0.5 rounded-full ${checkBadgeClass}`}>
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 leading-normal">{thm.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles - Hidden */}
        {false && (
        <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/10">
          <span className="block text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            {t('appearance.typography')}
          </span>

          {/* Typography slider simulate */}
          <div className="flex justify-between items-center py-2 bg-slate-100 dark:bg-white/5 px-4 rounded-xl">
            <div>
              <span className="font-bold block">{t('appearance.smallFont')}</span>
              <span className="text-[10px] text-neutral-400">{t('appearance.smallFontDesc')}</span>
            </div>
            <input 
              type="checkbox" 
              checked={isSmallTypography}
              onChange={onTypographyToggle}
              className="rounded cursor-pointer accent-indigo-650"
            />
          </div>

          <div className="flex justify-between items-center py-2 bg-slate-100 dark:bg-white/5 px-4 rounded-xl">
            <div>
              <span className="font-bold block">{t('appearance.compact')}</span>
              <span className="text-[10px] text-neutral-400">{t('appearance.compactDesc')}</span>
            </div>
            <input 
              type="checkbox" 
              checked={isCompactMode}
              onChange={onCompactToggle}
              className="rounded cursor-pointer accent-indigo-650"
            />
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
