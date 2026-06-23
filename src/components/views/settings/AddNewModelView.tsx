import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AppLanguage, AIModel } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface AddNewModelProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  onSaveModel: (model: Omit<AIModel, 'id' | 'isActive'>) => void;
}

export const AddNewModelView: React.FC<AddNewModelProps> = ({ themeStyles, language, onNavigate, onSaveModel }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('OpenAI');
  const [apiKey, setApiKey] = useState('');
  const [purpose, setPurpose] = useState('Vocabulary scenarios generation');
  const [endpoint, setEndpoint] = useState('');
  const t = createTranslator(language);

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveModel({
      name,
      provider,
      apiKey: apiKey ? `sk-••••${apiKey.slice(-4)}` : 'sk-notset',
      purpose,
      endpoint
    });
    onNavigate('settings-aimodels');
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center space-x-2 border-b border-neutral-200 dark:border-white/10 pb-4">
        <button 
          onClick={() => onNavigate('settings-aimodels')}
          className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-neutral-400 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('addModel.title')}</h3>
          <p className="text-xs text-neutral-400">{t('addModel.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={submitForm} className="space-y-4 text-xs">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('addModel.name')}</label>
          <input 
            type="text" 
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('addModel.namePlaceholder')}
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('addModel.provider')}</label>
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-stone-850 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
            >
              <option value="OpenAI">OpenAI Compatible Gateway</option>
              <option value="Anthropic">Anthropic API SDK</option>
              <option value="Google GenAI">Google GenAI Client</option>
              <option value="DeepSeek">DeepSeek API Key Node</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('addModel.endpoint')}</label>
            <input 
              type="text" 
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={t('addModel.endpointPlaceholder')}
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('addModel.apiKey')}</label>
          <input 
            type="password" 
            required
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('addModel.apiPlaceholder')}
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('addModel.purpose')}</label>
          <input 
            type="text" 
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button type="submit" className={`${themeStyles.btnPrimary} py-2 font-bold flex-1`}>
            {t('addModel.save')}
          </button>
          <button 
            type="button" 
            onClick={() => onNavigate('settings-aimodels')} 
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-400 py-2 border border-neutral-200 dark:border-white/10 rounded-xl font-bold flex-1 cursor-pointer"
          >
            {t('addModel.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};
