import React, { useState } from 'react';
import { AlertTriangle, Pencil, Trash2, X } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

type ModelCard = {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  model?: string;
  endpoint?: string;
  apiKeyHint?: string;
  apiKey?: string;
  purpose?: string;
};

interface AIModelsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  models: ModelCard[];
  onToggleModel: (modelId: string) => void | Promise<void>;
  onEditModel?: (modelId: string) => void;
  onDeleteModel?: (modelId: string) => void | Promise<void>;
}

export const AIModelsView: React.FC<AIModelsProps> = ({
  themeStyles,
  language,
  onNavigate,
  models,
  onToggleModel,
  onEditModel,
  onDeleteModel,
}) => {
  const t = createTranslator(language);
  const [deleteTarget, setDeleteTarget] = useState<ModelCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isGlass = themeStyles.borderClass === 'border-white/10';
  const activateBtnClass = isGlass
    ? 'bg-white/10 border border-white/10 text-white hover:bg-white/15'
    : 'bg-[#cceac8] border border-[#84c796] text-[#173f2b] hover:bg-[#bce0b6] shadow-sm shadow-[#88bd90]/25';
  const suspendBtnClass = isGlass
    ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/60'
    : 'bg-[#fffdf7] hover:bg-[#f2faee] border border-[#9fc89f] text-[#5d7564]';

  const requestDelete = (model: ModelCard) => {
    if (!onDeleteModel) return;
    setDeleteTarget(model);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !onDeleteModel) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteModel(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'delete_failed');
    } finally {
      setIsDeleting(false);
    }
  };

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
        {models.map((m) => (
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
                  <span className="text-neutral-400">Model</span>
                  <span className="font-semibold text-right">{m.model || m.purpose || 'not configured'}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-400">{t('aiModels.apiKey')}</span>
                  <span className="font-mono">{m.apiKeyHint || m.apiKey || 'not set'}</span>
                </div>
                {m.endpoint && (
                  <div className="flex justify-between text-[11px] gap-3">
                    <span className="text-neutral-400">Endpoint</span>
                    <span className="font-mono text-right break-all">{m.endpoint}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={() => void onToggleModel(m.id)}
                className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${m.isActive ? suspendBtnClass : activateBtnClass}`}
              >
                {m.isActive ? t('aiModels.suspend') : t('aiModels.activate')}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onEditModel?.(m.id)}
                  disabled={!onEditModel}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${suspendBtnClass}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {language === 'zh' ? '编辑' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(m)}
                  disabled={!onDeleteModel}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {language === 'zh' ? '删除' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ai-model-title"
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
              isGlass
                ? 'border-white/15 bg-slate-950/80 text-white shadow-black/40 backdrop-blur-3xl'
                : 'border-[#d6d2c4] bg-[#faf9f4] text-[#1c2e24] shadow-slate-900/15'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl border p-2 ${isGlass ? 'border-red-400/20 bg-red-500/12 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="delete-ai-model-title" className="text-base font-bold">
                    {language === 'zh' ? '删除模型配置' : 'Delete model configuration'}
                  </h3>
                  <p className={`mt-1 text-xs leading-relaxed ${isGlass ? 'text-white/65' : 'text-[#525f54]'}`}>
                    {language === 'zh'
                      ? '删除后，该 API Key 配置会从服务器移除，之后 AI 丰富功能不会再使用它。'
                      : 'This removes the saved API key configuration from the server. AI enrichment will no longer use it.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className={`rounded-xl p-1.5 transition-colors disabled:opacity-50 ${isGlass ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-[#525f54] hover:bg-[#ece9df]'}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={`mt-5 rounded-2xl border p-4 ${isGlass ? 'border-white/10 bg-white/8' : 'border-[#d6d2c4] bg-[#ece9df]'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{deleteTarget.name}</div>
                  <div className={`mt-1 text-[10px] font-mono uppercase tracking-widest ${isGlass ? 'text-white/45' : 'text-[#788174]'}`}>
                    {deleteTarget.provider}
                  </div>
                </div>
                {deleteTarget.isActive && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                    {t('aiModels.active')}
                  </span>
                )}
              </div>
              <div className={`mt-3 text-xs ${isGlass ? 'text-white/65' : 'text-[#525f54]'}`}>
                {deleteTarget.model || deleteTarget.purpose || 'not configured'}
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                  isGlass
                    ? 'border-white/10 bg-white/8 text-white/75 hover:bg-white/12 hover:text-white'
                    : 'border-[#d6d2c4] bg-[#ece9df] text-[#525f54] hover:bg-[#e4dfd1]'
                }`}
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? (language === 'zh' ? '删除中...' : 'Deleting...') : (language === 'zh' ? '确认删除' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
