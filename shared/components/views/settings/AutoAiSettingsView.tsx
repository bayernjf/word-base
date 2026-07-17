import React from 'react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface AutoAiSettingsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  autoEnrich: boolean;
  autoExplain: boolean;
  onAutoEnrichToggle: () => void;
  onAutoExplainToggle: () => void;
  hasActiveModel: boolean;
}

export const AutoAiSettingsView: React.FC<AutoAiSettingsProps> = ({
  themeStyles, language, autoEnrich, autoExplain, onAutoEnrichToggle, onAutoExplainToggle, hasActiveModel
}) => {
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';
  const rowEnabledClass = isGlass
    ? 'bg-white/10 border border-white/10 text-white/80 cursor-pointer hover:bg-white/15'
    : 'bg-[#eaf4e4] border border-[#bad8b7] cursor-pointer hover:bg-[#e1f0db]';
  const rowDisabledClass = isGlass
    ? 'bg-white/[0.04] border border-white/5 text-white/40 opacity-60 cursor-not-allowed'
    : 'bg-[#f2f7ee] border border-[#d4e6cf] opacity-60 cursor-not-allowed';
  const checkboxClass = isGlass ? 'accent-indigo-400' : 'accent-[#56a978]';
  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('appearance.autoAiTitle')}</h3>
        {!hasActiveModel && (
          <p className="text-[10px] text-amber-500 mt-1">{t('appearance.autoAiNeedModel')}</p>
        )}
      </div>

      <div className="space-y-4 text-xs">
        <label className={`flex justify-between items-center py-2.5 px-4 rounded-xl transition-colors ${hasActiveModel ? rowEnabledClass : rowDisabledClass}`}>
          <div>
            <span className="font-bold block">{t('appearance.autoEnrich')}</span>
            <span className={`text-[10px] ${isGlass ? 'text-white/40' : 'text-neutral-400'}`}>{t('appearance.autoEnrichDesc')}</span>
          </div>
          <input
            type="checkbox"
            checked={autoEnrich}
            disabled={!hasActiveModel}
            onChange={onAutoEnrichToggle}
            className={`w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed ${checkboxClass}`}
          />
        </label>

        <label className={`flex justify-between items-center py-2.5 px-4 rounded-xl transition-colors ${hasActiveModel ? rowEnabledClass : rowDisabledClass}`}>
          <div>
            <span className="font-bold block">{t('appearance.autoExplain')}</span>
            <span className={`text-[10px] ${isGlass ? 'text-white/40' : 'text-neutral-400'}`}>{t('appearance.autoExplainDesc')}</span>
          </div>
          <input
            type="checkbox"
            checked={autoExplain}
            disabled={!hasActiveModel}
            onChange={onAutoExplainToggle}
            className={`w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed ${checkboxClass}`}
          />
        </label>
      </div>
    </div>
  );
};
