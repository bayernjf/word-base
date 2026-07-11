import React, { useState } from 'react';
import { Upload, Database } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface SyncStorageProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
}

export const SyncStorageView: React.FC<SyncStorageProps> = ({ themeStyles, language }) => {
  const t = createTranslator(language);
  const [cloudSync, setCloudSync] = useState(true);

  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('sync.title')}</h3>
        <p className="text-xs text-neutral-400">{t('sync.subtitle')}</p>
      </div>

      <div className="space-y-5 text-xs">
        {/* Sync status element */}
        <div className="flex justify-between items-center py-3 bg-zinc-500/5 px-4 rounded-xl border border-neutral-300/30">
          <div>
            <span className="font-bold block">{t('sync.syncTitle')}</span>
            <span className="text-[10px] text-neutral-400">{t('sync.syncDesc')}</span>
          </div>
          <input 
            type="checkbox" 
            checked={cloudSync}
            onChange={() => setCloudSync(!cloudSync)}
            className="rounded cursor-pointer accent-indigo-650"
          />
        </div>

        {/* Extensions details */}
        <div className={`${themeStyles.card} space-y-3 p-4`}>
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-sm">{t('sync.extensionTitle')}</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">{t('sync.extensionDesc')}</p>
            </div>
            <span className="bg-emerald-550/15 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-extrabold uppercase">
              {t('sync.statusEnabled')}
            </span>
          </div>

          <div className="rounded-lg border border-neutral-300 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-3 text-[11px] leading-5 text-neutral-500 dark:text-neutral-300">
            {t('sync.extensionHint')}
          </div>
        </div>

        {/* Cache bounds storage bar */}
        <div className="space-y-1 bg-slate-100 dark:bg-white/5 p-4 rounded-xl border border-neutral-200 dark:border-white/10">
          <div className="flex justify-between uppercase font-mono text-[9px] text-neutral-400 font-bold">
            <span>{t('sync.cache')}</span>
            <span>{t('sync.cacheAmount')}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: '28%' }} />
          </div>
        </div>

        {/* Dynamic backup data operations */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <button className="flex items-center justify-center space-x-1.5 py-2.5 border border-neutral-300 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold">
            <Upload className="w-4 h-4 text-neutral-400" />
            <span>{t('sync.export')}</span>
          </button>
          
          <button className="flex items-center justify-center space-x-1.5 py-2.5 border border-neutral-300 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold">
            <Database className="w-4 h-4 text-neutral-400" />
            <span>{t('sync.import')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
