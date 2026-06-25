import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, ArrowLeft, Volume2, Globe, ChevronDown, Languages, Save, Trash2, Sparkles, BrainCircuit } from 'lucide-react';
import { AppLanguage, Word, WordContext } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getFrequency, formatDateTime } from '../shared/helpers';
import { enrichmentToWordUpdates, requestAiEnrichment, requestDeepExplanation, requestAiTranslate } from '../../../lib/aiEnrich';
import { useSupabase } from '../../../context/SupabaseContext';
import { AiProviderConfig } from '../../../lib/aiProviderConfigs';

interface WordDetailProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  word: Word | undefined;
  onUpdateFamiliarity: (wordId: string, level: number) => void;
  onUpdateContexts: (wordId: string, contexts: WordContext[]) => Promise<Word | null>;
  onUpdateWord: (wordId: string, updates: Partial<Word>) => Promise<Word | null>;
  aiProviders?: AiProviderConfig[];
}

// 语境表列定义：总宽固定为容器宽（百分比），列间可此消彼长地调宽，行高随换行自适应
type ContextColumnKey = 'index' | 'context' | 'timeAdded' | 'sourceLink' | 'translation' | 'actions';
const CONTEXT_COLUMN_DEFS: Array<{ key: ContextColumnKey; defaultPct: number; minPct: number }> = [
  { key: 'index', defaultPct: 5, minPct: 4 },
  { key: 'context', defaultPct: 32, minPct: 12 },
  { key: 'timeAdded', defaultPct: 14, minPct: 9 },
  { key: 'sourceLink', defaultPct: 10, minPct: 6 },
  { key: 'translation', defaultPct: 25, minPct: 10 },
  { key: 'actions', defaultPct: 14, minPct: 10 },
];
const CONTEXT_COLUMN_WIDTH_STORAGE_KEY = 'wordDetail.contextColumnWidths';

function loadContextColumnWidths(): Record<ContextColumnKey, number> {
  const defaults = Object.fromEntries(
    CONTEXT_COLUMN_DEFS.map((col) => [col.key, col.defaultPct])
  ) as Record<ContextColumnKey, number>;
  try {
    const raw = localStorage.getItem(CONTEXT_COLUMN_WIDTH_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<ContextColumnKey, number>>;
    CONTEXT_COLUMN_DEFS.forEach((col) => {
      const value = parsed[col.key];
      if (typeof value === 'number' && value >= col.minPct) {
        defaults[col.key] = value;
      }
    });
    return defaults;
  } catch {
    return defaults;
  }
}

export const WordDetailView: React.FC<WordDetailProps> = ({ 
  themeStyles, language, onNavigate, word, onUpdateFamiliarity, onUpdateContexts, onUpdateWord, aiProviders = []
}) => {
  const { session } = useSupabase();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showChineseExample, setShowChineseExample] = useState<Record<number, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [topHeight, setTopHeight] = useState(50); // 百分比
  const [translateDropdownOpen, setTranslateDropdownOpen] = useState(false);
  const [selectedTranslateLang, setSelectedTranslateLang] = useState<string>('Chinese');
  const [contextTranslations, setContextTranslations] = useState<Record<number, string>>({});
  const [contextActionLoading, setContextActionLoading] = useState<Record<number, 'translate' | 'save' | 'delete'>>({});
  const [selectedTranslateEngine, setSelectedTranslateEngine] = useState<string>('mymemory');
  const [engineDropdownOpen, setEngineDropdownOpen] = useState(false);
  const [aiEnrichLoading, setAiEnrichLoading] = useState(false);
  const [aiEnrichError, setAiEnrichError] = useState<string | null>(null);
  const [deepExplainLoading, setDeepExplainLoading] = useState(false);
  const [deepExplainError, setDeepExplainError] = useState<string | null>(null);
  const [contextColumnWidths, setContextColumnWidths] = useState<Record<ContextColumnKey, number>>(loadContextColumnWidths);
  const contextResizeRef = useRef<{
    key: ContextColumnKey;
    nextKey: ContextColumnKey;
    startX: number;
    startPct: number;
    startNextPct: number;
    curMinPct: number;
    nextMinPct: number;
  } | null>(null);
  const contextTableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';
  const contextColDivider = isGlass ? 'border-r border-white/10' : 'border-r border-[#c7dfbd]';
  const dropdownBtnHover = isGlass ? 'hover:bg-indigo-500/10' : 'hover:bg-[#e1f0db]';
  const dropdownPanelClass = isGlass
    ? 'border-white/10 bg-slate-900/90'
    : 'border-[#9fc89f] bg-[#fffdf7]';
  const dropdownItemSelected = isGlass
    ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
    : 'bg-[#d9efd2] text-[#2f805d] font-semibold';
  const dropdownItemHover = isGlass ? 'hover:bg-indigo-500/10' : 'hover:bg-[#e1f0db]';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const newTopHeight = ((e.clientY - rect.top) / totalHeight) * 100;
      // 限制在 20% 到 80% 之间
      const clampedHeight = Math.max(20, Math.min(80, newTopHeight));
      setTopHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const nextTranslations: Record<number, string> = {};
    (word?.contexts || []).forEach((ctx, index) => {
      nextTranslations[index] = ctx.translation || '';
    });
    setContextTranslations(nextTranslations);
    setContextActionLoading({});
  }, [word?.id]);

  // 语境表列宽拖拽：拖动把宽度在「当前列」与「右邻列」间转移，总宽恒定为容器宽
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = contextResizeRef.current;
      if (!state) return;
      const tableWidth = contextTableRef.current?.clientWidth || 0;
      if (tableWidth <= 0) return;
      // 像素位移换算成百分比位移
      let deltaPct = ((e.clientX - state.startX) / tableWidth) * 100;
      // 受两列各自最小宽度约束：当前列不能小于 min，右邻列也不能小于 min
      const maxIncrease = state.startNextPct - state.nextMinPct; // 右邻列最多被压缩这么多
      const maxDecrease = state.startPct - state.curMinPct;      // 当前列最多被压缩这么多
      deltaPct = Math.min(maxIncrease, Math.max(-maxDecrease, deltaPct));
      setContextColumnWidths((prev) => ({
        ...prev,
        [state.key]: state.startPct + deltaPct,
        [state.nextKey]: state.startNextPct - deltaPct,
      }));
    };

    const handleMouseUp = () => {
      if (!contextResizeRef.current) return;
      contextResizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setContextColumnWidths((current) => {
        try {
          localStorage.setItem(CONTEXT_COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(current));
        } catch {
          // ignore persistence failure
        }
        return current;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startContextResize = (key: ContextColumnKey) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const index = CONTEXT_COLUMN_DEFS.findIndex((col) => col.key === key);
    const nextDef = CONTEXT_COLUMN_DEFS[index + 1];
    if (!nextDef) return; // 最后一列无右邻，不可拖
    const curDef = CONTEXT_COLUMN_DEFS[index];
    contextResizeRef.current = {
      key,
      nextKey: nextDef.key,
      startX: e.clientX,
      startPct: contextColumnWidths[key],
      startNextPct: contextColumnWidths[nextDef.key],
      curMinPct: curDef.minPct,
      nextMinPct: nextDef.minPct,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const renderContextColgroup = () => (
    <colgroup>
      {CONTEXT_COLUMN_DEFS.map((col) => (
        <col key={col.key} style={{ width: `${contextColumnWidths[col.key]}%` }} />
      ))}
    </colgroup>
  );

  const renderContextResizeHandle = (key: ContextColumnKey) => (
    <span
      onMouseDown={startContextResize(key)}
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-indigo-400/40 active:bg-indigo-400/60"
    />
  );

  if (!word) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
        <p className="text-sm">{t('wordDetail.noWord')}</p>
        <button onClick={() => onNavigate('vocabulary')} className="mt-4 text-xs hover:underline text-indigo-650">
          {t('wordDetail.returnToVocab')}
        </button>
      </div>
    );
  }

  const handleSpeech = () => {
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const updateContextTranslation = async (contextIndex: number, translation: string) => {
    const contexts = word.contexts || [];
    const nextContexts = contexts.map((ctx, index) => (
      index === contextIndex ? { ...ctx, translation } : ctx
    ));
    return onUpdateContexts(word.id, nextContexts);
  };

  const setContextLoading = (contextIndex: number, action?: 'translate' | 'save' | 'delete') => {
    setContextActionLoading((prev) => {
      const next = { ...prev };
      if (action) {
        next[contextIndex] = action;
      } else {
        delete next[contextIndex];
      }
      return next;
    });
  };

  const handleTranslateContext = async (contextIndex: number, text: string) => {
    const targetLangMap: Record<string, string> = {
      Chinese: 'zh-CN',
      Japanese: 'ja',
      German: 'de',
    };
    const targetLang = targetLangMap[selectedTranslateLang] || 'zh-CN';
    const engine = selectedTranslateEngine;
    setContextLoading(contextIndex, 'translate');
    try {
      let translatedText = '';
      if (engine === 'mymemory') {
        const url = new URL('https://api.mymemory.translated.net/get');
        url.search = new URLSearchParams({
          q: text,
          langpair: `en|${targetLang}`,
        }).toString();
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error('translate_failed');
        const data = await response.json();
        translatedText = String(data?.responseData?.translatedText || '').trim();
        if (!translatedText) throw new Error('empty_translation');
      } else {
        const accessToken = session?.access_token;
        if (!accessToken) throw new Error('auth_required');
        translatedText = await requestAiTranslate(text, targetLang, accessToken, engine === 'active' ? undefined : engine);
      }
      setContextTranslations((prev) => ({ ...prev, [contextIndex]: translatedText }));
    } catch (error) {
      console.error('Error translating context:', error);
      setContextTranslations((prev) => ({ ...prev, [contextIndex]: t('wordDetail.translateError') }));
    } finally {
      setContextLoading(contextIndex);
    }
  };

  const handleSaveContextTranslation = async (contextIndex: number) => {
    setContextLoading(contextIndex, 'save');
    try {
      await updateContextTranslation(contextIndex, contextTranslations[contextIndex] || '');
    } finally {
      setContextLoading(contextIndex);
    }
  };

  const handleDeleteContextTranslation = async (contextIndex: number) => {
    setContextLoading(contextIndex, 'delete');
    try {
      setContextTranslations((prev) => ({ ...prev, [contextIndex]: '' }));
      await updateContextTranslation(contextIndex, '');
    } finally {
      setContextLoading(contextIndex);
    }
  };

  const handleAiEnrich = async () => {
    if (!word) return;
    const accessToken = session?.access_token;
    if (!accessToken) {
      setAiEnrichError(language === 'en' ? 'Please sign in again before using AI enrich.' : '请重新登录后再使用 AI 丰富。');
      return;
    }

    setAiEnrichLoading(true);
    setAiEnrichError(null);
    try {
      const enrichment = await requestAiEnrichment(
        {
          wordId: word.id,
          word: word.word,
          translation: word.translation || word.chineseTranslation || word.definition || '',
          contexts: word.contexts || [],
        },
        accessToken
      );
      // 后端已直接入库（刷新/离开页面也不丢失）；此处同步更新本地状态以即时反映到 UI
      await onUpdateWord(word.id, enrichmentToWordUpdates(enrichment));
    } catch (error) {
      console.error('Error enriching word:', error);
      const message = error instanceof Error ? error.message : 'ai_enrich_failed';
      setAiEnrichError(message === 'ai_key_not_configured'
        ? (language === 'en' ? 'Gemini API key is not configured on the server.' : '服务器还没有配置 Gemini API Key。')
        : (language === 'en' ? 'AI enrich failed. Please try again later.' : 'AI 丰富失败，请稍后重试。'));
    } finally {
      setAiEnrichLoading(false);
    }
  };

  const handleDeepExplain = async () => {
    if (!word) return;
    const accessToken = session?.access_token;
    if (!accessToken) {
      setDeepExplainError(language === 'en' ? 'Please sign in again before using deep explanation.' : '请重新登录后再使用深入理解。');
      return;
    }

    setDeepExplainLoading(true);
    setDeepExplainError(null);
    try {
      const deepExplanation = await requestDeepExplanation(
        {
          wordId: word.id,
          word: word.word,
          translation: word.translation || word.chineseTranslation || word.definition || '',
          contexts: word.contexts || [],
        },
        accessToken
      );
      // 后端已直接入库；此处同步本地状态以即时反映到 UI
      await onUpdateWord(word.id, { deepExplanation });
    } catch (error) {
      console.error('Error explaining word:', error);
      const message = error instanceof Error ? error.message : 'ai_explain_failed';
      setDeepExplainError(message === 'ai_key_not_configured'
        ? (language === 'en' ? 'Gemini API key is not configured on the server.' : '服务器还没有配置 Gemini API Key。')
        : (language === 'en' ? 'Deep explanation failed. Please try again later.' : '深入理解失败，请稍后重试。'));
    } finally {
      setDeepExplainLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={() => onNavigate('vocabulary')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t('wordDetail.backToWordbook')}</span>
      </button>

      {/* 主容器，包含两部分和分隔条 */}
      <div 
        ref={containerRef}
        className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]"
      >
        {/* 上面部分：字典翻译 */}
        <div 
          className={`${themeStyles.card} overflow-y-auto`}
          style={{ height: `${topHeight}%` }}
        >
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 pb-6 mb-6">
              <div className="flex items-center space-x-3.5">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className={`text-3xl font-extrabold tracking-tight ${themeStyles.textPrimary}`}>
                      {word.word}
                    </h2>
                    {word.partOfSpeech && (
                      <span className="bg-indigo-500/10 px-2 py-0.5 text-indigo-600 dark:text-indigo-400 text-xs font-mono rounded-md uppercase font-semibold">
                        {word.partOfSpeech}
                      </span>
                    )}
                    {word.level && (
                      <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-neutral-500 text-xs font-mono rounded-md">
                        {word.level}
                      </span>
                    )}
                  </div>
                  {word.phonetic && (
                    <p className="text-sm text-neutral-400 font-mono mt-1 flex items-center space-x-2">
                      <span>/{word.phonetic}/</span>
                      <button 
                        onClick={handleSpeech}
                        disabled={isPlaying}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                      >
                        <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
                      </button>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAiEnrich}
                    disabled={aiEnrichLoading}
                    className={`${themeStyles.btnSecondary} inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <Sparkles className={`w-4 h-4 ${aiEnrichLoading ? 'animate-pulse' : ''}`} />
                    <span>{aiEnrichLoading ? (language === 'en' ? 'Enriching...' : 'AI 丰富中...') : (language === 'en' ? 'AI Enrich' : 'AI 丰富')}</span>
                  </button>
                  <button
                    onClick={handleDeepExplain}
                    disabled={deepExplainLoading}
                    className={`${themeStyles.btnSecondary} inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <BrainCircuit className={`w-4 h-4 ${deepExplainLoading ? 'animate-pulse' : ''}`} />
                    <span>{deepExplainLoading
                      ? (language === 'en' ? 'Analyzing...' : '深入理解中...')
                      : word.deepExplanation
                        ? (language === 'en' ? 'Re-explain' : '重新解读')
                        : (language === 'en' ? 'Deep Insight' : '深入理解')}</span>
                  </button>
                </div>
                {word.familiarity !== undefined && (
                  <>
                    <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">{t('wordDetail.confidence')}</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={word.familiarity}
                        disabled
                        readOnly
                        className="w-32 accent-indigo-650 cursor-not-allowed pointer-events-none"
                      />
                      <span className="font-mono text-xs font-bold">{word.familiarity}%</span>
                    </div>
                  </>
                )}
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">{t('wordDetail.frequency')}</span>
                    <span className="font-mono text-xs font-bold text-indigo-600">{getFrequency(word)}</span>
                  </div>
              </div>
            </div>

            <div className="space-y-4">
              {aiEnrichError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                  {aiEnrichError}
                </div>
              )}
              {word.definition && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">{t('wordDetail.definition')}</span>
                  <p className={`text-base mt-0.5 font-medium ${themeStyles.textPrimary}`}>
                    {word.definition}
                  </p>
                </div>
              )}
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">{t('wordDetail.translation')}</span>
                <p className="text-base text-indigo-650 dark:text-indigo-400 font-semibold mt-0.5">
                  {word.translation || word.chineseTranslation}
                </p>
              </div>

              {word.synonyms && word.synonyms.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider block mb-1">{t('wordDetail.synonyms')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {word.synonyms.map((s, i) => (
                      <span key={i} className="bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 text-xs px-2.5 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {word.memoryTip && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider block mb-1">{t('wordDetail.memoryTip')}</span>
                  <p className={`text-sm ${themeStyles.textSecondary} italic leading-relaxed`}>
                    {word.memoryTip}
                  </p>
                </div>
              )}

              {deepExplainError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                  {deepExplainError}
                </div>
              )}
              {word.deepExplanation && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-3">
                  <span className="text-[10px] font-mono uppercase text-indigo-500 tracking-wider block">{t('wordDetail.deepExplanation')}</span>
                  {word.deepExplanation.contextInsights.length > 0 && (
                    <div className="space-y-2">
                      {word.deepExplanation.contextInsights.map((item, i) => (
                        <div key={i} className="space-y-0.5">
                          <p className={`text-xs ${themeStyles.textSecondary} italic leading-relaxed`}>“{item.context}”</p>
                          <p className={`text-sm ${themeStyles.textPrimary} leading-relaxed`}>{item.insight}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {word.deepExplanation.synonymComparison && (
                    <div>
                      <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider block mb-0.5">{t('wordDetail.synonymComparison')}</span>
                      <p className={`text-sm ${themeStyles.textPrimary} leading-relaxed`}>{word.deepExplanation.synonymComparison}</p>
                    </div>
                  )}
                  {word.deepExplanation.memoryHook && (
                    <div>
                      <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider block mb-0.5">{t('wordDetail.memoryHook')}</span>
                      <p className={`text-sm ${themeStyles.textSecondary} italic leading-relaxed`}>{word.deepExplanation.memoryHook}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 可拖动的分隔条 */}
        <div 
          className={`h-2 cursor-row-resize flex items-center justify-center border-t border-b ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/30' 
              : 'border-neutral-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-700'
          } transition-colors`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex gap-1">
            <div className={`w-8 h-1 rounded-full ${isDragging ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-white/20'}`} />
            <div className={`w-8 h-1 rounded-full ${isDragging ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-white/20'}`} />
            <div className={`w-8 h-1 rounded-full ${isDragging ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-white/20'}`} />
          </div>
        </div>

        {/* 下面部分：上下文列表 */}
        <div 
          className={`${themeStyles.card} overflow-y-auto`}
          style={{ height: `${100 - topHeight}%` }}
        >
          <div className="p-6">
            {/* Usage History 风格标题 */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <h3 className={`text-lg font-semibold uppercase tracking-wider ${themeStyles.textPrimary}`}>
                  {t('wordDetail.contexts')}
                </h3>
                <p className={`text-xs mt-0.5 ${themeStyles.textSecondary}`}>
                  {t('wordDetail.contextsDesc')}
                </p>
              </div>
              {/* 引擎选择 + Translate to... 下拉栏 */}
              <div className="flex items-center gap-2">
                {/* 引擎选择自定义下拉 */}
                <div className="relative">
                  <button
                    onClick={() => setEngineDropdownOpen(!engineDropdownOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all active:scale-95 ${
                      themeStyles.card
                    } ${themeStyles.textPrimary} ${dropdownBtnHover}`}
                  >
                    <BrainCircuit className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {selectedTranslateEngine === 'mymemory'
                        ? 'MyMemory'
                        : aiProviders.find((p) => p.id === selectedTranslateEngine)?.name || selectedTranslateEngine}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${engineDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {engineDropdownOpen && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl z-50 overflow-hidden border backdrop-blur-xl ${dropdownPanelClass}`}>
                      <div className="p-2 flex flex-col gap-1">
                        {(() => {
                          const allEngines = [
                            { key: 'mymemory', label: 'MyMemory' },
                            ...aiProviders.map((p) => ({ key: p.id, label: p.name })),
                          ];
                          const sorted = selectedTranslateEngine
                            ? [
                                ...allEngines.filter((e) => e.key === selectedTranslateEngine),
                                ...allEngines.filter((e) => e.key !== selectedTranslateEngine),
                              ]
                            : allEngines;
                          return sorted.map((engine) => {
                            const isSelected = engine.key === selectedTranslateEngine;
                            return (
                              <button
                                key={engine.key}
                                onClick={() => {
                                  setSelectedTranslateEngine(engine.key);
                                  setEngineDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 rounded-lg text-xs text-left transition-colors active:scale-95 ${
                                  isSelected
                                    ? dropdownItemSelected
                                    : `${themeStyles.textPrimary} ${dropdownItemHover}`
                                }`}
                              >
                                {engine.label}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                {/* 翻译到语言下拉 */}
                <div className="relative">
                  <button
                    onClick={() => setTranslateDropdownOpen(!translateDropdownOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all active:scale-95 ${
                      themeStyles.card
                    } ${themeStyles.textPrimary} ${dropdownBtnHover}`}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-xs font-medium">
                        {selectedTranslateLang
                          ? (() => {
                              const labelMap: Record<string, string> = {
                                Chinese: t('wordDetail.langChinese'),
                                Japanese: t('wordDetail.langJapanese'),
                                German: t('wordDetail.langGerman'),
                              };
                              const label = labelMap[selectedTranslateLang] || selectedTranslateLang;
                              return t('wordDetail.translateTo', { label });
                            })()
                        : t('wordDetail.translatePlaceholder')}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${translateDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {translateDropdownOpen && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl z-50 overflow-hidden border backdrop-blur-xl ${dropdownPanelClass}`}>
                      <div className="p-2 flex flex-col gap-1">
                        {(() => {
                          const allLangs = [
                            { key: 'Chinese', label: t('wordDetail.langChinese') },
                            { key: 'Japanese', label: t('wordDetail.langJapanese') },
                            { key: 'German', label: t('wordDetail.langGerman') },
                          ];
                          // 把选中的语言排到最前面
                          const sorted = selectedTranslateLang
                            ? [
                                ...allLangs.filter((l) => l.key === selectedTranslateLang),
                                ...allLangs.filter((l) => l.key !== selectedTranslateLang),
                              ]
                            : allLangs;
                          return sorted.map((lang) => {
                            const isSelected = lang.key === selectedTranslateLang;
                            return (
                              <button
                                key={lang.key}
                                onClick={() => {
                                  setSelectedTranslateLang(lang.key);
                                  setTranslateDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 rounded-lg text-xs text-left transition-colors active:scale-95 ${
                                  isSelected
                                    ? dropdownItemSelected
                                    : `${themeStyles.textPrimary} ${dropdownItemHover}`
                                }`}
                              >
                                {lang.label}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {word.contexts && word.contexts.length > 0 ? (
              <div>
                <table ref={contextTableRef} className="w-full table-fixed text-left border-collapse">
                  {renderContextColgroup()}
                  <thead className="border-b border-neutral-200 dark:border-white/10">
                    <tr className="text-neutral-400 font-mono uppercase tracking-wider text-xs">
                      <th className={`relative py-3 px-4 ${contextColDivider}`}>#{renderContextResizeHandle('index')}</th>
                      <th className={`relative py-3 px-4 ${contextColDivider}`}>{t('wordDetail.context')}{renderContextResizeHandle('context')}</th>
                      <th className={`relative py-3 px-4 ${contextColDivider}`}>{t('wordDetail.timeAdded')}{renderContextResizeHandle('timeAdded')}</th>
                      <th className={`relative py-3 px-4 ${contextColDivider}`}>{t('wordDetail.sourceLink')}{renderContextResizeHandle('sourceLink')}</th>
                      <th className={`relative py-3 px-4 ${contextColDivider}`}>{t('wordDetail.translation')}{renderContextResizeHandle('translation')}</th>
                      <th className="relative py-3 px-4 text-center">{t('wordDetail.translationActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {word.contexts.map((ctx, i) => (
                      <tr 
                        key={i} 
                        className={`border-b ${isGlass ? 'border-white/5 hover:bg-white/5' : 'border-[#c7dfbd] hover:bg-[#f2faee]'} `}
                      >
                        <td className={`py-4 px-4 text-neutral-500 font-mono text-xs ${contextColDivider}`}>{i + 1}</td>
                        <td className={`py-4 px-4 align-top ${contextColDivider}`}>
                          <p className={`text-sm break-words ${themeStyles.textPrimary}`}>{ctx.context}</p>
                        </td>
                        <td className={`py-4 px-4 text-neutral-500 text-xs ${contextColDivider}`}>
                          {(() => {
                            const dateVal = ctx.timeAdded ?? ctx.addedDate;
                            if (dateVal === undefined) return '-';
                            return formatDateTime(dateVal);
                          })()}
                        </td>
                        <td className={`py-4 px-4 ${contextColDivider}`}>
                          {ctx.sourceLink ? (
                            <a 
                              href={ctx.sourceLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              {t('wordDetail.source')}
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-xs">-</span>
                          )}
                        </td>
                        <td className={`py-4 px-4 align-top ${contextColDivider}`}>
                          <p className={`text-sm break-words ${themeStyles.textPrimary}`}>{contextTranslations[i] || ''}</p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTranslateContext(i, ctx.context)}
                              disabled={!!contextActionLoading[i]}
                              className="p-1.5 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t('wordDetail.translateToSelected')}
                            >
                              <Languages className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSaveContextTranslation(i)}
                              disabled={!!contextActionLoading[i]}
                              className="p-1.5 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all duration-200 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t('wordDetail.saveTranslation')}
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteContextTranslation(i)}
                              disabled={!!contextActionLoading[i]}
                              className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t('wordDetail.deleteTranslation')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">{t('wordDetail.noContexts')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
