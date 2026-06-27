import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { AlertCircle, ArrowLeft, Globe, ChevronDown, Languages, Save, Trash2, Sparkles, BrainCircuit } from 'lucide-react';
import { createLogger } from '../../../lib/logger';
import { AppLanguage, Word, WordContext } from '../../../types';

const logger = createLogger('WordDetailView');
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getFrequency, formatDateTime, formatDate } from '../shared/helpers';
import { WordPhonetics } from '../shared/WordPhonetics';
import { EncounterCurve } from './EncounterCurve';
import { enrichmentToWordUpdates, requestAiEnrichment, requestDeepExplanation, requestAiTranslate, requestSenseClusters } from '../../../lib/aiEnrich';
import {
  subscribe as subscribeBatchAi,
  getSnapshot as getBatchAiSnapshot,
} from '../../../lib/batchAiStore';
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

// 模块级存储：记录每个单词的 AI 请求 loading 状态（不持久化，刷新即清空，符合刷新请求中断的预期）
const aiLoadingMap = new Map<string, { enrich: boolean; explain: boolean; sense: boolean }>();

function getAiLoading(wordId: string | undefined, type: 'enrich' | 'explain' | 'sense'): boolean {
  if (!wordId) return false;
  return aiLoadingMap.get(wordId)?.[type] ?? false;
}

function setAiLoading(wordId: string, type: 'enrich' | 'explain' | 'sense', value: boolean) {
  const current = aiLoadingMap.get(wordId) || { enrich: false, explain: false, sense: false };
  current[type] = value;
  aiLoadingMap.set(wordId, current);
}

export const WordDetailView: React.FC<WordDetailProps> = ({ 
  themeStyles, language, onNavigate, word, onUpdateFamiliarity, onUpdateContexts, onUpdateWord, aiProviders = []
}) => {
  const { session } = useSupabase();
  const [showChineseExample, setShowChineseExample] = useState<Record<number, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [topHeight, setTopHeight] = useState(50); // 百分比
  const [translateDropdownOpen, setTranslateDropdownOpen] = useState(false);
  const [selectedTranslateLang, setSelectedTranslateLang] = useState<string>('Chinese');
  const [contextTranslations, setContextTranslations] = useState<Record<number, string>>({});
  const [contextActionLoading, setContextActionLoading] = useState<Record<number, 'translate' | 'save' | 'delete'>>({});
  const [selectedTranslateEngine, setSelectedTranslateEngine] = useState<string>('mymemory');
  const [engineDropdownOpen, setEngineDropdownOpen] = useState(false);
  const [aiEnrichLoading, setAiEnrichLoadingState] = useState(() => getAiLoading(word?.id, 'enrich'));
  const [aiEnrichError, setAiEnrichError] = useState<string | null>(null);
  const [hasAiEnrichment, setHasAiEnrichment] = useState(() => !!(word?.definition || word?.memoryTip || word?.examples?.length));
  const [deepExplainLoading, setDeepExplainLoadingState] = useState(() => getAiLoading(word?.id, 'explain'));
  const [deepExplainError, setDeepExplainError] = useState<string | null>(null);
  const [hasDeepExplanation, setHasDeepExplanation] = useState(() => !!word?.deepExplanation);
  const [senseClusterLoading, setSenseClusterLoading] = useState(() => getAiLoading(word?.id, 'sense'));
  const [senseClusterError, setSenseClusterError] = useState<string | null>(null);
  // 订阅批量任务 store：若当前单词正被批量任务处理，则按钮同步显示进行中
  const batchState = useSyncExternalStore(subscribeBatchAi, getBatchAiSnapshot);
  const batchProcessingType = word?.id ? batchState.processingMap[word.id] : undefined;
  const effectiveEnrichLoading = aiEnrichLoading || batchProcessingType === 'enrich';
  const effectiveDeepExplainLoading = deepExplainLoading || batchProcessingType === 'explain';
  const [contextViewMode, setContextViewMode] = useState<'table' | 'timeline'>('table');
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
  const topPanelRef = useRef<HTMLDivElement>(null);
  const bottomPanelRef = useRef<HTMLDivElement>(null);
  const topHeightRef = useRef(50);
  const dragRafRef = useRef<number | null>(null);
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
      topHeightRef.current = clampedHeight;
      // 拖拽过程直接改 DOM 样式，避免每帧触发整棵组件重渲染
      if (dragRafRef.current == null) {
        dragRafRef.current = requestAnimationFrame(() => {
          dragRafRef.current = null;
          const h = topHeightRef.current;
          if (topPanelRef.current) topPanelRef.current.style.height = `${h}%`;
          if (bottomPanelRef.current) bottomPanelRef.current.style.height = `${100 - h}%`;
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // 拖拽结束落一次最终值到 state
      setTopHeight(topHeightRef.current);
      // 恢复文本选择与光标
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (dragRafRef.current != null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };
  }, [isDragging]);

  useEffect(() => {
    const nextTranslations: Record<number, string> = {};
    (word?.contexts || []).forEach((ctx, index) => {
      nextTranslations[index] = ctx.translation || '';
    });
    setContextTranslations(nextTranslations);
    setContextActionLoading({});
    const hasEnrichment = !!(word?.definition || word?.memoryTip || word?.examples?.length);
    const hasDeep = !!word?.deepExplanation;
    setHasAiEnrichment(hasEnrichment);
    setHasDeepExplanation(hasDeep);
    // 从模块级 Map 同步当前单词的 loading 状态（切换路由返回时恢复）
    // 模块级 Map 是唯一可信源：只有请求真正结束才会被设置为 false
    if (word?.id) {
      const enrichLoading = getAiLoading(word.id, 'enrich');
      const explainLoading = getAiLoading(word.id, 'explain');
      const senseLoading = getAiLoading(word.id, 'sense');
      setAiEnrichLoadingState(enrichLoading);
      setDeepExplainLoadingState(explainLoading);
      setSenseClusterLoading(senseLoading);
    }
  }, [word?.id, word?.definition, word?.memoryTip, word?.examples?.length, word?.deepExplanation]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    topHeightRef.current = topHeight;
    // 拖拽全程禁用文本选择并锁定光标，防止选中文字、提升流畅度
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
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
    logger.debug('handleTranslateContext', { contextIndex, engine });
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
      logger.info('handleTranslateContext success', { contextIndex, preview: translatedText.slice(0, 30) });
    } catch (error) {
      logger.error('Error translating context:', error);
      const code = error instanceof Error ? error.message : 'translate_failed';
      const reason =
        code === 'auth_required'
          ? (language === 'en' ? 'please sign in again' : '请重新登录')
          : code === 'ai_key_not_configured'
            ? (language === 'en' ? 'no AI model configured' : '未配置 AI 模型')
            : code === 'empty_translation'
              ? (language === 'en' ? 'empty result' : '返回为空')
              : code;
      setContextTranslations((prev) => ({ ...prev, [contextIndex]: `${t('wordDetail.translateError')}（${reason}）` }));
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
    const currentWordId = word.id;
    if (getAiLoading(currentWordId, 'enrich')) return; // 防重入
    const accessToken = session?.access_token;
    if (!accessToken) {
      setAiEnrichError(language === 'en' ? 'Please sign in again before using AI enrich.' : '请重新登录后再使用 AI 丰富。');
      return;
    }

    // 开始加载：同时更新本地 state 和模块级 Map
    setAiEnrichLoadingState(true);
    setAiLoading(currentWordId, 'enrich', true);
    setAiEnrichError(null);
    logger.debug('handleAiEnrich', { wordId: currentWordId, word: word.word });
    try {
      const enrichment = await requestAiEnrichment(
        {
          wordId: currentWordId,
          word: word.word,
          translation: word.translation || word.chineseTranslation || word.definition || '',
          contexts: word.contexts || [],
        },
        accessToken
      );
      // 后端已直接入库（刷新/离开页面也不丢失）；此处同步更新本地状态以即时反映到 UI
      if (onUpdateWord) {
        await onUpdateWord(currentWordId, enrichmentToWordUpdates(enrichment));
      }
      setHasAiEnrichment(true);
      logger.info('handleAiEnrich success', { wordId: currentWordId });
    } catch (error) {
      logger.error('Error enriching word:', error);
      const message = error instanceof Error ? error.message : 'ai_enrich_failed';
      setAiEnrichError(message === 'ai_key_not_configured'
        ? (language === 'en' ? 'Gemini API key is not configured on the server.' : '服务器还没有配置 Gemini API Key。')
        : (language === 'en' ? 'AI enrich failed. Please try again later.' : 'AI 丰富失败，请稍后重试。'));
    } finally {
      // 结束：始终更新模块级 Map；只有当前仍显示这个单词时才更新本地 state
      setAiLoading(currentWordId, 'enrich', false);
      if (word?.id === currentWordId) {
        setAiEnrichLoadingState(false);
      }
    }
  };

  const handleDeepExplain = async () => {
    if (!word) return;
    const currentWordId = word.id;
    if (getAiLoading(currentWordId, 'explain')) return; // 防重入
    const accessToken = session?.access_token;
    if (!accessToken) {
      setDeepExplainError(language === 'en' ? 'Please sign in again before using deep explanation.' : '请重新登录后再使用深入理解。');
      return;
    }

    // 开始加载：同时更新本地 state 和模块级 Map
    setDeepExplainLoadingState(true);
    setAiLoading(currentWordId, 'explain', true);
    setDeepExplainError(null);
    logger.debug('handleDeepExplain', { wordId: currentWordId, word: word.word });
    try {
      const deepExplanation = await requestDeepExplanation(
        {
          wordId: currentWordId,
          word: word.word,
          translation: word.translation || word.chineseTranslation || word.definition || '',
          contexts: word.contexts || [],
        },
        accessToken
      );
      // 后端已直接入库；此处同步本地状态以即时反映到 UI
      if (onUpdateWord) {
        await onUpdateWord(currentWordId, { deepExplanation });
      }
      setHasDeepExplanation(true);
      logger.info('handleDeepExplain success', { wordId: currentWordId });
    } catch (error) {
      logger.error('Error explaining word:', error);
      const message = error instanceof Error ? error.message : 'ai_explain_failed';
      setDeepExplainError(message === 'ai_key_not_configured'
        ? (language === 'en' ? 'Gemini API key is not configured on the server.' : '服务器还没有配置 Gemini API Key。')
        : (language === 'en' ? 'Deep explanation failed. Please try again later.' : '深入理解失败，请稍后重试。'));
    } finally {
      // 结束：始终更新模块级 Map；只有当前仍显示这个单词时才更新本地 state
      setAiLoading(currentWordId, 'explain', false);
      if (word?.id === currentWordId) {
        setDeepExplainLoadingState(false);
      }
    }
  };

  const handleSenseCluster = async () => {
    if (!word) return;
    const currentWordId = word.id;
    if (getAiLoading(currentWordId, 'sense')) return; // 防重入
    const accessToken = session?.access_token;
    if (!accessToken) {
      setSenseClusterError(language === 'en' ? 'Please sign in again before using sense clustering.' : '请重新登录后再使用义项分离。');
      return;
    }

    // 开始加载：同时更新本地 state 和模块级 Map
    setSenseClusterLoading(true);
    setAiLoading(currentWordId, 'sense', true);
    setSenseClusterError(null);
    logger.debug('handleSenseCluster', { wordId: currentWordId, word: word.word });
    try {
      const senseGroups = await requestSenseClusters(
        {
          wordId: currentWordId,
          word: word.word,
          translation: word.translation || word.chineseTranslation || word.definition || '',
          contexts: word.contexts || [],
        },
        accessToken
      );
      // 后端已直接入库；此处同步本地状态以即时反映到 UI
      if (onUpdateWord) {
        await onUpdateWord(currentWordId, { senseGroups });
      }
      logger.info('handleSenseCluster success', { wordId: currentWordId, groups: senseGroups.groups.length });
    } catch (error) {
      logger.error('Error clustering senses:', error);
      const message = error instanceof Error ? error.message : 'ai_sense_cluster_failed';
      setSenseClusterError(message === 'ai_key_not_configured'
        ? (language === 'en' ? 'Gemini API key is not configured on the server.' : '服务器还没有配置 Gemini API Key。')
        : (language === 'en' ? `Sense clustering failed: ${message}` : `义项分离失败：${message}`));
    } finally {
      // 结束：始终更新模块级 Map；只有当前仍显示这个单词时才更新本地 state
      setAiLoading(currentWordId, 'sense', false);
      if (word?.id === currentWordId) {
        setSenseClusterLoading(false);
      }
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
          ref={topPanelRef}
          className={`${themeStyles.card} overflow-y-auto`}
          style={{ height: `${topHeight}%`, willChange: 'height', transition: isDragging ? 'none' : undefined }}
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
                  {/* 音标 + 发音（与复习卡片共用组件） */}
                  <WordPhonetics word={word.word} fallbackPhonetic={word.phonetic} language={language} />
                  {/* 外部词典链接 */}
                  {word.word && (
                    <p className="flex items-center gap-2 mt-1.5 text-[11px]">
                      <span className="text-neutral-400">{t('wordDetail.dictLinks')}:</span>
                      <a
                        href={`https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodeURIComponent(word.word.toLowerCase().replace(/\s+/g, '-'))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Cambridge
                      </a>
                      <span className="text-neutral-300 dark:text-white/20">·</span>
                      <a
                        href={`https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(word.word.toLowerCase().replace(/\s+/g, '_'))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Oxford
                      </a>
                      <span className="text-neutral-300 dark:text-white/20">·</span>
                      <a
                        href={`https://www.collinsdictionary.com/dictionary/english/${encodeURIComponent(word.word.toLowerCase().replace(/\s+/g, '-'))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Collins
                      </a>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAiEnrich}
                    disabled={effectiveEnrichLoading}
                    className={`${themeStyles.btnSecondary} inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <Sparkles className={`w-4 h-4 ${effectiveEnrichLoading ? 'animate-pulse' : ''}`} />
                    <span>{effectiveEnrichLoading 
                      ? t('wordDetail.aiEnrichLoading') 
                      : (hasAiEnrichment || word?.definition || word?.memoryTip || (word?.examples?.length ?? 0) > 0)
                        ? t('wordDetail.aiEnrichAgain') 
                        : t('wordDetail.aiEnrich')}</span>
                  </button>
                  <button
                    onClick={handleDeepExplain}
                    disabled={effectiveDeepExplainLoading}
                    className={`${themeStyles.btnSecondary} inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <BrainCircuit className={`w-4 h-4 ${effectiveDeepExplainLoading ? 'animate-pulse' : ''}`} />
                    <span>{effectiveDeepExplainLoading
                      ? t('wordDetail.deepExplainLoading')
                      : (hasDeepExplanation || word?.deepExplanation)
                        ? t('wordDetail.deepExplainAgain')
                        : t('wordDetail.deepExplain')}</span>
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
                  {/* 语境收集统计面板 */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className={`rounded-lg px-3 py-2 ${isGlass ? 'bg-white/5' : 'bg-slate-50'}`}>
                      <span className="text-[10px] text-neutral-400 font-mono uppercase block">{language === 'zh' ? '收集次数' : 'Collections'}</span>
                      <span className="font-mono text-lg font-bold text-indigo-600">{word.contexts?.length || 0}</span>
                    </div>
                    <div className={`rounded-lg px-3 py-2 ${isGlass ? 'bg-white/5' : 'bg-slate-50'}`}>
                      <span className="text-[10px] text-neutral-400 font-mono uppercase block">{language === 'zh' ? '首次收集' : 'First'}</span>
                      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">{word.timeAdded ? formatDate(word.timeAdded) : '-'}</span>
                    </div>
                    <div className={`rounded-lg px-3 py-2 ${isGlass ? 'bg-white/5' : 'bg-slate-50'}`}>
                      <span className="text-[10px] text-neutral-400 font-mono uppercase block">{language === 'zh' ? '最近收集' : 'Latest'}</span>
                      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">{word.timeUpdated ? formatDate(word.timeUpdated) : '-'}</span>
                    </div>
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
              ? (isGlass ? 'border-indigo-500 bg-indigo-900/30' : 'border-[#56a978] bg-[#cceac8]')
              : (isGlass ? 'border-white/10 hover:border-indigo-700' : 'border-[#bad8b7] hover:border-[#84c796]')
          } transition-colors`}
          onMouseDown={handleMouseDown}
        >
          {(() => {
            const barClass = isDragging
              ? (isGlass ? 'bg-indigo-500' : 'bg-[#56a978]')
              : (isGlass ? 'bg-white/20' : 'bg-[#84c796]');
            return (
              <div className="flex gap-1">
                <div className={`w-8 h-1 rounded-full ${barClass}`} />
                <div className={`w-8 h-1 rounded-full ${barClass}`} />
                <div className={`w-8 h-1 rounded-full ${barClass}`} />
              </div>
            );
          })()}
        </div>

        {/* 下面部分：上下文列表 */}
        <div 
          ref={bottomPanelRef}
          className={`${themeStyles.card} overflow-y-auto`}
          style={{ height: `${100 - topHeight}%`, willChange: 'height', transition: isDragging ? 'none' : undefined }}
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
                {/* 语境视图切换 */}
                <div className="flex items-center rounded-lg border overflow-hidden text-xs">
                  <button
                    onClick={() => setContextViewMode('table')}
                    className={`px-3 py-2 transition-colors ${
                      contextViewMode === 'table'
                        ? (isGlass ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#d9efd2] text-[#2f805d]')
                        : (isGlass ? 'hover:bg-white/5 text-neutral-400' : 'hover:bg-[#f2faee] text-neutral-500')
                    }`}
                    title={language === 'zh' ? '表格视图' : 'Table View'}
                  >
                    <span className="font-medium">{language === 'zh' ? '表格' : 'Table'}</span>
                  </button>
                  <button
                    onClick={() => setContextViewMode('timeline')}
                    className={`px-3 py-2 transition-colors ${
                      contextViewMode === 'timeline'
                        ? (isGlass ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#d9efd2] text-[#2f805d]')
                        : (isGlass ? 'hover:bg-white/5 text-neutral-400' : 'hover:bg-[#f2faee] text-neutral-500')
                    }`}
                    title={language === 'zh' ? '时间线视图' : 'Timeline View'}
                  >
                    <span className="font-medium">{language === 'zh' ? '时间线' : 'Timeline'}</span>
                  </button>
                </div>
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
                <EncounterCurve contexts={word.contexts} themeStyles={themeStyles} language={language} />

                {/* AI 多语境义项分离 */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${themeStyles.textPrimary}`}>
                      {t('wordDetail.senseTitle')}
                    </span>
                    <button
                      onClick={() => void handleSenseCluster()}
                      disabled={senseClusterLoading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                        isGlass ? 'border-white/10 text-indigo-300 hover:bg-indigo-500/10' : 'border-[#bad8b7] text-[#2f805d] hover:bg-[#e1f0db]'
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${senseClusterLoading ? 'animate-pulse' : ''}`} />
                      <span>
                        {senseClusterLoading
                          ? t('wordDetail.senseClustering')
                          : word.senseGroups?.groups?.length
                            ? t('wordDetail.senseRecluster')
                            : t('wordDetail.senseCluster')}
                      </span>
                    </button>
                  </div>

                  {senseClusterError && (
                    <p className="text-xs text-rose-500 mb-2">{senseClusterError}</p>
                  )}

                  {word.senseGroups?.groups && word.senseGroups.groups.length > 0 && (
                    <div className="space-y-2">
                      {word.senseGroups.groups.map((group, gi) => (
                        <div
                          key={gi}
                          className={`rounded-xl border px-4 py-3 ${isGlass ? 'border-white/10 bg-white/[0.03]' : 'border-[#bad8b7] bg-[#f3faef]'}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-sm font-bold truncate ${themeStyles.textPrimary}`}>{group.sense}</span>
                              {group.translation && (
                                <span className={`text-xs ${isGlass ? 'text-indigo-300' : 'text-[#2f805d]'}`}>{group.translation}</span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400 whitespace-nowrap">
                              {t('wordDetail.senseCount', { count: group.contexts.length })}
                            </span>
                          </div>
                          {group.definition && (
                            <p className={`text-xs mb-2 ${themeStyles.textSecondary}`}>{group.definition}</p>
                          )}
                          <ul className="space-y-1">
                            {group.contexts.map((ctx, ci) => (
                              <li key={ci} className={`text-xs leading-relaxed pl-3 border-l-2 ${isGlass ? 'border-white/10 text-white/80' : 'border-[#84c796] text-[#3a5244]'}`}>
                                {ctx}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {contextViewMode === 'table' ? (
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
                ) : (
                  /* 时间线视图 */
                  <div className="space-y-4">
                    {word.contexts.map((ctx, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-4 ${
                          isGlass
                            ? 'border-white/10 bg-white/5'
                            : 'border-[#c7dfbd] bg-[#fffdf7]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-neutral-400">
                            #{i + 1} · {(() => {
                              const dateVal = ctx.timeAdded ?? ctx.addedDate;
                              if (dateVal === undefined) return '-';
                              return formatDateTime(dateVal);
                            })()}
                          </span>
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
                        </div>
                        <p className={`text-sm break-words ${themeStyles.textPrimary} mb-2`}>{ctx.context}</p>
                        {contextTranslations[i] && (
                          <p className="text-sm text-indigo-650 dark:text-indigo-400 break-words">{contextTranslations[i]}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
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
                      </div>
                    ))}
                  </div>
                )}
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
