import React from 'react';
import { AppLanguage, AIModel } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface AIModelsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  models: AIModel[];
  onToggleModel: (modelId: string) => void;
}

export const AIModelsView: React.FC<AIModelsProps> = ({ themeStyles, language, onNavigate, models, onToggleModel }) => {
  const t = createTranslator(language);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/10 pb-4">
        <div>
          <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('aiModels.title')}</h3>
          <p className="text-xs text-neutral-400">{t('aiModels.subtitle')}</p>
        </div>
        <button 
          onClick={() => onNavigate('settings-addmodel')}
          className={`${themeStyles.btnPrimary} text-xs font-semibold py-1.5 px-3`}
        >
          {t('aiModels.add')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map(m => (
          <div key={m.id} className={`${themeStyles.card} flex flex-col justify-between`}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-sm font-bold">{m.name}</h4>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">{m.provider}</span>
                </div>
                
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-black tracking-wider ${m.isActive ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/20' : 'bg-neutral-200 dark:bg-white/5 text-neutral-400'}`}>
                  {m.isActive ? t('aiModels.active') : t('aiModels.offline')}
                </span>
              </div>
              
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-white/5 space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-400">{t('aiModels.purpose')}</span>
                  <span className="font-semibold text-right">{m.purpose}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-400">{t('aiModels.apiKey')}</span>
                  <span className="font-mono">{m.apiKey}</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button 
                onClick={() => onToggleModel(m.id)}
                className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${m.isActive ? 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {m.isActive ? t('aiModels.suspend') : t('aiModels.activate')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
