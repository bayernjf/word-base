import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import type { AiProvider, AiProviderInput } from '../../../lib/aiProviderConfigs';

type EditableModel = {
  id?: string;
  name?: string;
  provider?: string;
  model?: string;
  endpoint?: string;
};

type SelectableProvider = 'openai' | 'anthropic' | 'gemini' | 'openai-compatible';
type ModelOption = {
  value: string;
  label: string;
};

const providerOptions: Array<{ value: SelectableProvider; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai-compatible', label: 'OpenAI Compatible / Custom' },
];

const modelOptionsByProvider: Record<SelectableProvider, ModelOption[]> = {
  openai: [
    { value: 'gpt-5.5', label: 'GPT-5.5' },
    { value: 'gpt-5.4', label: 'GPT-5.4' },
    { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
    { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano' },
  ],
  anthropic: [
    { value: 'claude-fable-5', label: 'Claude Fable 5' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ],
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  'openai-compatible': [],
};

const CUSTOM_MODEL_VALUE = '__custom_model__';

interface AddNewModelProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  onSaveModel: (model: AiProviderInput) => void | Promise<void>;
  initialModel?: EditableModel | null;
}

export const AddNewModelView: React.FC<AddNewModelProps> = ({ themeStyles, language, onNavigate, onSaveModel, initialModel }) => {
  const isEditing = Boolean(initialModel?.id);
  const initialProvider = normalizeProvider(initialModel?.provider);
  const initialModelValue = initialModel?.model || defaultModelForProvider(initialProvider);
  const [name, setName] = useState(initialModel?.name || '');
  const [provider, setProvider] = useState<AiProvider>(initialProvider);
  const [model, setModel] = useState(initialModelValue);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState(initialModel?.endpoint || defaultEndpointForProvider(initialProvider));
  const [isSaving, setIsSaving] = useState(false);
  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(!isKnownProviderModel(initialProvider, initialModelValue));
  const [saveError, setSaveError] = useState<string | null>(null);
  const t = createTranslator(language);
  const providerLabel = providerOptions.find((option) => option.value === provider)?.label || 'OpenAI';
  const modelOptions = modelOptionsByProvider[provider as SelectableProvider] || modelOptionsByProvider.openai;
  const selectedModelOption = modelOptions.find((option) => option.value === model);
  const modelLabel = isCustomModel
    ? (language === 'zh' ? '自定义模型 ID' : 'Custom model ID')
    : selectedModelOption?.label || model;
  const isGlass = themeStyles.borderClass === 'border-white/10';
  const fieldClass = isGlass
    ? 'bg-white/10 border-white/10 text-white placeholder:text-white/35 focus:border-white/30 focus:bg-white/[0.14]'
    : 'bg-[#faf9f4] border-[#d6d2c4] text-[#1c2e24] placeholder:text-[#788174] focus:border-emerald-700/50';
  const providerButtonClass = isGlass
    ? 'bg-white/10 border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl hover:bg-white/[0.14] focus:border-white/30 focus:bg-white/[0.16] focus:ring-2 focus:ring-white/15 [color-scheme:dark]'
    : 'bg-[#faf9f4] border-[#d6d2c4] text-[#1c2e24] shadow-sm hover:bg-white focus:border-emerald-700/50 focus:ring-2 focus:ring-emerald-800/10 [color-scheme:light]';
  const providerMenuClass = isGlass
    ? 'bg-slate-950/80 border-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_28px_72px_rgba(2,6,23,0.62)] backdrop-blur-3xl'
    : 'bg-[#faf9f4] border-[#d6d2c4] text-[#1c2e24] shadow-xl';

  useEffect(() => {
    setName(initialModel?.name || '');
    const nextProvider = normalizeProvider(initialModel?.provider);
    const nextModel = initialModel?.model || defaultModelForProvider(nextProvider);
    setProvider(nextProvider);
    setModel(nextModel);
    setEndpoint(initialModel?.endpoint || defaultEndpointForProvider(nextProvider));
    setIsCustomModel(!isKnownProviderModel(nextProvider, nextModel));
    setIsProviderMenuOpen(false);
    setIsModelMenuOpen(false);
    setApiKey('');
    setSaveError(null);
  }, [initialModel]);

  const handleProviderChange = (nextProvider: AiProvider) => {
    setProvider(nextProvider);
    setModel(defaultModelForProvider(nextProvider));
    setEndpoint(defaultEndpointForProvider(nextProvider));
    setIsCustomModel(nextProvider === 'openai-compatible');
    setIsProviderMenuOpen(false);
    setIsModelMenuOpen(false);
  };

  const selectProvider = (nextProvider: AiProvider) => {
    handleProviderChange(nextProvider);
    setIsProviderMenuOpen(false);
  };

  const selectModel = (nextModel: string) => {
    if (nextModel === CUSTOM_MODEL_VALUE) {
      setIsCustomModel(true);
      if (isKnownProviderModel(provider, model)) {
        setModel('');
      }
    } else {
      setIsCustomModel(false);
      setModel(nextModel);
    }
    setIsModelMenuOpen(false);
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const trimmedApiKey = apiKey.trim();
      if (!isEditing && !trimmedApiKey) {
        throw new Error(language === 'zh' ? '请填写 API Key' : 'API Key is required');
      }

      if (!model.trim()) {
        throw new Error(language === 'zh' ? '请填写模型 ID' : 'Model ID is required');
      }

      await onSaveModel({
        name: name.trim(),
        provider,
        model: model.trim(),
        endpoint: endpoint.trim() || undefined,
        ...(trimmedApiKey ? { apiKey: trimmedApiKey } : {}),
      });
      onNavigate('settings-aimodels');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'save_failed';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
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
          <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>
            {isEditing ? (language === 'zh' ? '编辑 AI 模型' : 'Edit AI Provider') : t('addModel.title')}
          </h3>
          <p className="text-xs text-neutral-400">
            {isEditing
              ? (language === 'zh' ? '更新模型、接口地址或重新保存新的 API Key。' : 'Update the model, endpoint, or replace the saved API key.')
              : t('addModel.subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={submitForm} className="space-y-4 text-xs">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('addModel.name')}</label>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('addModel.namePlaceholder')}
            className={`w-full px-3 py-2 border rounded-xl text-xs outline-hidden transition-colors ${fieldClass}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('addModel.provider')}</label>
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsProviderMenuOpen(false);
                }
              }}
            >
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isProviderMenuOpen}
                onClick={() => setIsProviderMenuOpen((open) => !open)}
                className={`flex w-full items-center justify-between px-3 py-2 border rounded-xl text-xs outline-hidden transition-all ${providerButtonClass}`}
              >
                <span>{providerLabel}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    isProviderMenuOpen ? 'rotate-180' : ''
                  } ${isGlass ? 'text-white/65 drop-shadow-[0_1px_4px_rgba(255,255,255,0.18)]' : 'text-[#525f54]'}`}
                />
              </button>

              {isProviderMenuOpen && (
                <div
                  role="listbox"
                  className={`absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border p-1 ${providerMenuClass}`}
                >
                  {providerOptions.map((option) => {
                    const isSelected = option.value === provider;
                    const optionClass = isGlass
                      ? `${isSelected ? 'bg-white/24 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]' : 'text-white/82 hover:bg-white/16 hover:text-white'}`
                      : `${isSelected ? 'bg-emerald-700 text-[#f4f2eb]' : 'text-[#1c2e24] hover:bg-[#ece9df]'}`;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectProvider(option.value)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${optionClass}`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('addModel.endpoint')}</label>
            <input
              type="text"
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder={defaultEndpointForProvider(provider) || t('addModel.endpointPlaceholder')}
              className={`w-full px-3 py-2 border rounded-xl text-xs outline-hidden transition-colors ${fieldClass}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Model *</label>
          <div
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsModelMenuOpen(false);
              }
            }}
          >
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isModelMenuOpen}
              onClick={() => setIsModelMenuOpen((open) => !open)}
              className={`flex w-full items-center justify-between px-3 py-2 border rounded-xl text-xs outline-hidden transition-all ${providerButtonClass}`}
            >
              <span>{modelLabel}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  isModelMenuOpen ? 'rotate-180' : ''
                } ${isGlass ? 'text-white/65 drop-shadow-[0_1px_4px_rgba(255,255,255,0.18)]' : 'text-[#525f54]'}`}
              />
            </button>

            {isModelMenuOpen && (
              <div
                role="listbox"
                className={`absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border p-1 ${providerMenuClass}`}
              >
                {[...modelOptions, { value: CUSTOM_MODEL_VALUE, label: language === 'zh' ? '自定义模型 ID' : 'Custom model ID' }].map((option) => {
                  const isSelected = option.value === CUSTOM_MODEL_VALUE ? isCustomModel : option.value === model && !isCustomModel;
                  const optionClass = isGlass
                    ? `${isSelected ? 'bg-white/24 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]' : 'text-white/82 hover:bg-white/16 hover:text-white'}`
                    : `${isSelected ? 'bg-emerald-700 text-[#f4f2eb]' : 'text-[#1c2e24] hover:bg-[#ece9df]'}`;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectModel(option.value)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${optionClass}`}
                    >
                      <span>{option.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {isCustomModel && (
            <input
              type="text"
              required
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={language === 'zh' ? '输入自定义模型 ID' : 'Enter custom model ID'}
              className={`mt-2 w-full px-3 py-2 border rounded-xl text-xs outline-hidden transition-colors ${fieldClass}`}
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('addModel.apiKey')}</label>
          <input
            type="password"
            required={!isEditing}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={isEditing ? (language === 'zh' ? '留空则继续使用已保存的 Key' : 'Leave blank to keep the saved key') : t('addModel.apiPlaceholder')}
            className={`w-full px-3 py-2 border rounded-xl text-xs outline-hidden transition-colors ${fieldClass}`}
          />
          <p className="mt-2 text-[11px] text-neutral-400">
            {isEditing
              ? 'Leave this blank unless you want to replace the encrypted key stored on the server.'
              : 'The key is sent to the server once, encrypted, and never shown again.'}
          </p>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
            {saveError}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button type="submit" disabled={isSaving} className={`${themeStyles.btnPrimary} py-2 font-bold flex-1 disabled:opacity-60`}>
            {isSaving ? 'Saving...' : (isEditing ? (language === 'zh' ? '保存修改' : 'Save Changes') : t('addModel.save'))}
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

function normalizeProvider(provider?: string): AiProvider {
  if (provider === 'anthropic') return 'anthropic';
  if (provider === 'gemini') return 'gemini';
  if (provider === 'openai-compatible') return 'openai-compatible';
  return 'openai';
}

function defaultModelForProvider(provider: AiProvider): string {
  if (provider === 'anthropic') return 'claude-fable-5';
  if (provider === 'gemini') return 'gemini-2.5-pro';
  if (provider === 'openai-compatible') return '';
  return 'gpt-5.5';
}

function defaultEndpointForProvider(provider: AiProvider): string {
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';
  if (provider === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta';
  if (provider === 'openai-compatible') return '';
  return 'https://api.openai.com/v1';
}

function isKnownProviderModel(provider: AiProvider, value: string): boolean {
  const options = modelOptionsByProvider[provider as SelectableProvider] || modelOptionsByProvider.openai;
  return options.some((option) => option.value === value);
}
