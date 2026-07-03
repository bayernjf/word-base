import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { Search, ChevronRight, ChevronDown, CheckCircle2, ArrowUp, ArrowDown, ChevronsUpDown, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';
import { AppLanguage, MoveWordsResult, Word, VocabularyBook } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getFrequency, formatDateTime } from '../shared/helpers';
import { createLogger } from '../../../lib/logger';
import { useSupabase } from '../../../context/SupabaseContext';
import { getPlatform } from '../../../platform';
import {
  BATCH_AI_LIMIT,
  startBatchAi,
  subscribe as subscribeBatchAi,
  getSnapshot as getBatchAiSnapshot,
} from '../../../lib/batchAiStore';

const logger = createLogger('VocabularyListView');

interface VocabularyProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  words: Word[];
  books: VocabularyBook[];
  onSelectWord: (wordId: string) => void;
  onAddWord: (word: Omit<Word, 'id'>) => void;
  initialSelectedBookId?: string;
  onBookChange?: (bookId: string) => void;
  onDeleteWords?: (wordIds: string[]) => void;
  onMoveWords?: (wordIds: string[], targetBookId: string) => Promise<MoveWordsResult>;
  onUpdateWord?: (wordId: string, updates: Partial<Word>) => Promise<Word | null>;
  accessToken?: string | null;
}

interface VocabularyNotification {
  message: string;
  highlight?: string;
}

type SortField = 'word' | 'frequency' | 'timeAdded';
type SortDir = 'asc' | 'desc';

// 表格列定义：key 用于宽度 state，默认宽度按内容预估，min 防止拖到看不见
type ColumnKey = 'select' | 'word' | 'frequency' | 'translation' | 'timeAdded' | 'action';
const COLUMN_DEFS: Array<{ key: ColumnKey; defaultWidth: number; minWidth: number }> = [
  { key: 'select', defaultWidth: 48, minWidth: 48 },
  { key: 'word', defaultWidth: 150, minWidth: 90 },
  { key: 'frequency', defaultWidth: 130, minWidth: 100 },
  { key: 'translation', defaultWidth: 380, minWidth: 160 },
  { key: 'timeAdded', defaultWidth: 170, minWidth: 120 },
  { key: 'action', defaultWidth: 100, minWidth: 80 },
];
const COLUMN_WIDTH_STORAGE_KEY = 'wordbase_vocab_columnWidths';

function loadColumnWidths(): Record<ColumnKey, number> {
  const defaults = Object.fromEntries(
    COLUMN_DEFS.map((col) => [col.key, col.defaultWidth])
  ) as Record<ColumnKey, number>;
  try {
    const raw = getPlatform().kv.getSync(COLUMN_WIDTH_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, number>>;
    COLUMN_DEFS.forEach((col) => {
      const value = parsed[col.key];
      if (typeof value === 'number' && value >= col.minWidth) {
        defaults[col.key] = value;
      }
    });
    return defaults;
  } catch {
    return defaults;
  }
}

// 模块级存储：按单词本记录勾选的单词 id（不持久化到 localStorage，
// 仅在会话内保留，切换路由/单词本返回时恢复勾选状态）
const selectionMap = new Map<string, string[]>();

function getStoredSelection(bookId: string): string[] {
  return selectionMap.get(bookId) ?? [];
}

function setStoredSelection(bookId: string, wordIds: string[]) {
  if (wordIds.length === 0) {
    selectionMap.delete(bookId);
  } else {
    selectionMap.set(bookId, wordIds);
  }
}

export const VocabularyListView: React.FC<VocabularyProps> = ({ 
  themeStyles, language, onNavigate, words, books, onSelectWord, onAddWord,
  initialSelectedBookId = 'biz-eng', onBookChange, onDeleteWords, onMoveWords, onUpdateWord,
  accessToken: propAccessToken
}) => {
  const { session } = useSupabase();
  const accessToken = propAccessToken || session?.access_token;
  const [selectedBookId, setSelectedBookId] = useState(initialSelectedBookId);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>(() => getStoredSelection(initialSelectedBookId));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMoveConfirmModal, setShowMoveConfirmModal] = useState(false);
  const [targetBookId, setTargetBookId] = useState<string | null>(null);
  const [notification, setNotification] = useState<VocabularyNotification | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [bookDropdownOpen, setBookDropdownOpen] = useState(false);
  const [perPageDropdownOpen, setPerPageDropdownOpen] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(loadColumnWidths);
  const batchState = useSyncExternalStore(subscribeBatchAi, getBatchAiSnapshot);
  const batchAiLoading = batchState.runningType;
  // 自动分析进行中时也要禁用批量按钮，避免与自动队列冲突
  const aiBusy = !!batchAiLoading || batchState.autoRunning;
  const resizeStateRef = useRef<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';
  const searchPanelClass = isGlass
    ? 'bg-white/5 border-white/10'
    : 'bg-[#fffdf7] border-[#9fc89f] shadow-xs shadow-[#8fb998]/10';
  const searchInputClass = isGlass
    ? 'text-neutral-100 placeholder:text-white/40'
    : 'text-[#1d3a2b] placeholder:text-[#8a9c89]';
  const searchIconClass = isGlass ? 'text-neutral-400' : 'text-[#6f8b72]';
  const tableHeadBorder = isGlass ? 'border-white/10' : 'border-[#9fc89f]';
  const tableHeadText = isGlass ? 'text-neutral-400' : 'text-[#4f765d]';
  // glass 表头不加背景色（仅毛玻璃模糊）；natural 用与卡片一致的底色
  const tableHeadBg = isGlass ? 'backdrop-blur-md' : 'bg-[#fffdf7] backdrop-blur-md';
  const tableRowBorder = isGlass ? 'border-white/5' : 'border-[#c7dfbd]';
  const tableColDivider = isGlass ? 'border-r border-white/10' : 'border-r border-[#c7dfbd]';
  const tableRowHover = isGlass ? 'hover:bg-white/5' : 'hover:bg-[#f2faee]';
  const dropdownSelectClass = isGlass
    ? 'bg-white/5 border-white/15 text-neutral-100'
    : 'bg-[#fffdf7] border-[#9fc89f] text-[#1d3a2b] shadow-xs shadow-[#8fb998]/10';
  const dropdownChevronClass = isGlass ? 'text-neutral-400' : 'text-[#6f8b72]';
  const dropdownPanelClass = isGlass
    ? 'bg-slate-900/95 border-white/10'
    : 'bg-[#fffdf7] border-[#9fc89f] shadow-[#8fb998]/20';
  const dropdownOptionSelected = isGlass
    ? 'bg-white/10 text-white font-semibold'
    : 'bg-[#d9efd2] text-[#2f805d] font-semibold';
  const dropdownOptionIdle = isGlass
    ? 'text-neutral-200 hover:bg-white/5'
    : 'text-[#1d3a2b] hover:bg-[#e1f0db]';
  const batchBarBg = isGlass
    ? 'bg-indigo-500/10 border-indigo-500/30'
    : 'bg-[#e8f5e3] border-[#8fc483] shadow-xs shadow-[#8fb998]/10';
  const batchBarText = isGlass ? 'text-indigo-300' : 'text-[#2f805d]';
  const batchBtnMove = isGlass
    ? 'border-indigo-400 text-indigo-300 hover:bg-indigo-500/20'
    : 'border-[#5aa167] text-[#2f805d] hover:bg-[#d9efd2]';
  const batchBtnEnrich = isGlass
    ? 'border-amber-400/70 text-amber-300 hover:bg-amber-500/10'
    : 'border-[#ed9e37] text-[#c67a1e] hover:bg-[#fff4e0]';
  const batchBtnExplain = isGlass
    ? 'border-violet-400/70 text-violet-300 hover:bg-violet-500/10'
    : 'border-[#9c6ade] text-[#7c4dbb] hover:bg-[#f3ebff]';
  const wordLinkClass = isGlass ? 'text-indigo-400' : 'text-[#2f805d]';
  const progressTrackClass = isGlass ? 'bg-white/10' : 'bg-[#cfe3c6] border border-[#a9d4a4]';
  const tooltipClass = isGlass
    ? 'bg-slate-900/95 text-neutral-100 border border-white/10 shadow-lg'
    : 'bg-[#234235] text-[#f1f8ee] border border-[#1b3328] shadow-md shadow-[#8fb998]/20';
  // 分页按钮样式：上一页/下一页（普通按钮）、页码（选中/未选中）
  const pageNavBtnClass = isGlass
    ? 'border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10'
    : 'border-[#9fc89f] text-[#2f805d] hover:bg-[#e1f0db]';
  const pageNumActiveClass = isGlass
    ? 'bg-indigo-600 text-white border-indigo-600'
    : 'bg-[#5aa167] text-white border-[#5aa167] shadow-xs shadow-[#8fb998]/30';
  const pageNumIdleClass = isGlass
    ? 'border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10'
    : 'border-[#9fc89f] text-[#2f805d] hover:bg-[#e1f0db]';
  // Update local state if initial prop changes
  useEffect(() => {
    setSelectedBookId(initialSelectedBookId);
    setCurrentPage(1); // 切换单词本时回到第一页
    setSelectedWordIds(getStoredSelection(initialSelectedBookId)); // 恢复该单词本的勾选状态
    setSortField(null); // 切换单词本时重置排序
    setSortDir('asc');
  }, [initialSelectedBookId]);

  // 当搜索或每页条数变化时回到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // 列宽拖拽：mousedown 记录起点，全局 mousemove 改宽，mouseup 落库到 localStorage
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      const colDef = COLUMN_DEFS.find((col) => col.key === state.key);
      const minWidth = colDef?.minWidth ?? 60;
      const nextWidth = Math.max(minWidth, state.startWidth + (e.clientX - state.startX));
      setColumnWidths((prev) => ({ ...prev, [state.key]: nextWidth }));
    };

    const handleMouseUp = () => {
      if (!resizeStateRef.current) return;
      resizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setColumnWidths((current) => {
        try {
          void getPlatform().kv.set(COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(current));
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

  const startColumnResize = (key: ColumnKey) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStateRef.current = { key, startX: e.clientX, startWidth: columnWidths[key] };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // 表头与表体共用同一份列宽，保证两张表对齐
  const renderColgroup = () => (
    <colgroup>
      {COLUMN_DEFS.map((col) => (
        <col key={col.key} style={{ width: `${columnWidths[col.key]}px` }} />
      ))}
    </colgroup>
  );

  const tableMinWidth = COLUMN_DEFS.reduce((sum, col) => sum + columnWidths[col.key], 0);

  // 列宽拖拽手柄（放在 th 右缘）
  const renderResizeHandle = (key: ColumnKey) => (
    <span
      onMouseDown={startColumnResize(key)}
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-indigo-400/40 active:bg-indigo-400/60"
    />
  );

  const filteredWords = words
    .filter(w => w.bookId === selectedBookId)
    .filter(w => w.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 (w.translation && w.translation.toLowerCase().includes(searchQuery.toLowerCase())) ||
                 (w.definition && w.definition.toLowerCase().includes(searchQuery.toLowerCase())) ||
                 (w.chineseTranslation && w.chineseTranslation.includes(searchQuery)));

  // 计算当前单词本中最大context数量N
  const currentBookWords = words.filter(w => w.bookId === selectedBookId);
  const maxContextCount = currentBookWords.reduce((max, word) => {
    const count = getFrequency(word);
    return count > max ? count : max;
  }, 1); // 至少为1，避免除以0

  // 计算单词的进度百分比
  const getProgressPercent = (word: Word): number => {
    const count = getFrequency(word);
    if (count <= 1) return 1;
    const percent = (count / maxContextCount) * 100;
    return Math.min(Math.max(percent, 1), 100); // 限制在1-100之间
  };

  // 计算进度条颜色（从绿→橙黄→酒红）
  const getProgressColor = (percent: number) => {
    // 1%: 绿色 (green) - #56a978
    // 50%: 橙黄色 (orange-yellow) - #FFB600
    // 100%: 酒红色 (wine red) - #722F37
    
    const r1 = 86, g1 = 169, b1 = 120;   // 绿色
    const r2 = 255, g2 = 182, b2 = 0;    // 橙黄
    const r3 = 114, g3 = 47, b3 = 55;    // 酒红
    
    let r, g, b;
    
    if (percent <= 50) {
      // 从浅绿到橙黄
      const t = percent / 50;
      r = Math.round(r1 + (r2 - r1) * t);
      g = Math.round(g1 + (g2 - g1) * t);
      b = Math.round(b1 + (b2 - b1) * t);
    } else {
      // 从橙黄到酒红
      const t = (percent - 50) / 50;
      r = Math.round(r2 + (r3 - r2) * t);
      g = Math.round(g2 + (g3 - g2) * t);
      b = Math.round(b2 + (b3 - b2) * t);
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // 排序（无序时保持原顺序）
  const sortedWords = sortField === null
    ? filteredWords
    : [...filteredWords].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'word') {
          cmp = a.word.localeCompare(b.word);
        } else if (sortField === 'frequency') {
          cmp = getFrequency(a) - getFrequency(b);
        } else {
          const ta = Number(a.timeAdded ?? a.dateAdded ?? a.meta?.createdAt ?? 0);
          const tb = Number(b.timeAdded ?? b.dateAdded ?? b.meta?.createdAt ?? 0);
          cmp = ta - tb;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });

  // 计算分页
  const totalPages = Math.ceil(sortedWords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWords = sortedWords.slice(startIndex, endIndex);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(filteredWords.length / itemsPerPage));
    if (currentPage > nextTotalPages) {
      setCurrentPage(nextTotalPages);
    }
  }, [filteredWords.length, itemsPerPage, currentPage]);

  useEffect(() => {
    // 单词尚未加载完成时不修剪，避免清掉刚恢复的勾选
    if (filteredWords.length === 0) return;
    const availableWordIds = new Set(filteredWords.map((word) => word.id));
    setSelectedWordIds((prev) => {
      // 仅当存在失效的勾选 id 时才更新，避免每次都返回新数组导致无限渲染循环
      const next = prev.filter((id) => availableWordIds.has(id));
      if (next.length === prev.length) return prev;
      setStoredSelection(selectedBookId, next);
      return next;
    });
  }, [filteredWords, selectedBookId]);

  // 统一更新勾选：同时写 state 与模块级 Map（用当前 selectedBookId，避免书本/选择错配）
  const updateSelection = (
    updater: string[] | ((prev: string[]) => string[])
  ) => {
    setSelectedWordIds((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setStoredSelection(selectedBookId, next);
      return next;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedWordIds.length === paginatedWords.length) {
      updateSelection([]);
    } else {
      updateSelection(paginatedWords.map(w => w.id));
    }
  };

  // 切换单个选择
  const toggleSelectWord = (wordId: string) => {
    updateSelection(prev =>
      prev.includes(wordId)
        ? prev.filter(id => id !== wordId)
        : [...prev, wordId]
    );
  };

  // 取消选择
  const clearSelection = () => {
    updateSelection([]);
  };

  // 显示临时通知
  const showTempNotification = (msg: string, highlight?: string, duration = 3000) => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setNotification({ message: msg, highlight });
    notificationTimerRef.current = setTimeout(() => setNotification(null), duration);
  };

  // 批量AI处理：enrich=生成释义，explain=深入理解。
  // 实际执行委托给模块级 store，脱离组件生命周期，切换路由不中断、状态可恢复。
  const handleBatchAi = async (type: 'enrich' | 'explain') => {
    logger.info('handleBatchAi called', { type, selectedCount: selectedWordIds.length, batchAiLoading });
    if (selectedWordIds.length === 0 || aiBusy) {
      logger.warn('handleBatchAi early return', { selectedCount: selectedWordIds.length, batchAiLoading });
      return;
    }
    if (!accessToken) {
      showTempNotification(language === 'en' ? 'Please sign in first.' : '请先登录后再使用AI功能。');
      return;
    }
    if (!onUpdateWord) {
      logger.warn('handleBatchAi: onUpdateWord is missing');
      return;
    }

    const selectedWords = words.filter((w) => selectedWordIds.includes(w.id));

    await startBatchAi(type, {
      words: selectedWords,
      accessToken,
      onUpdateWord,
      onTruncate: (keptWordIds) => updateSelection(keptWordIds),
      messages: {
        limitHit: t('vocab.batchLimitHit', { limit: BATCH_AI_LIMIT }),
        selectedFirstN: t('vocab.selectedFirstN', { n: BATCH_AI_LIMIT }),
        progress: (current, total) =>
          type === 'enrich'
            ? t('vocab.batchEnriching', { current, total })
            : t('vocab.batchExplaining', { current, total }),
        complete: (success, fail) =>
          type === 'enrich'
            ? t('vocab.batchEnrichComplete', { success, fail })
            : t('vocab.batchExplainComplete', { success, fail }),
        allFailed: t('vocab.batchAllFailed'),
      },
    });
  };

  // 删除操作
  const handleDelete = () => {
    onDeleteWords?.(selectedWordIds);
    setShowDeleteModal(false);
    clearSelection();
  };

  // 移动操作
  const handleMove = async () => {
    if (targetBookId && onMoveWords) {
      const targetBookName = books.find((book) => book.id === targetBookId)?.name || t('vocab.targetBook');
      const result = await onMoveWords(selectedWordIds, targetBookId);

      if (result.success) {
        if (result.movedCount > 0 && result.duplicateCount > 0) {
          setNotification({
            message: t('vocab.movedMany', { count: result.movedCount }),
            highlight: `${targetBookName}${t('vocab.duplicateSuffix', { count: result.duplicateCount })}`,
          });
        } else if (result.duplicateCount > 0) {
          setNotification({
            message: result.duplicateCount === 1 ? t('vocab.duplicatesOne') : t('vocab.duplicatesMany', { count: result.duplicateCount }),
            highlight: targetBookName,
          });
        } else {
          setNotification({
            message: result.movedCount === 1 ? t('vocab.movedOne') : t('vocab.movedMany', { count: result.movedCount }),
            highlight: targetBookName,
          });
        }

        setShowMoveModal(false);
        setShowMoveConfirmModal(false);
        setTargetBookId(null);
        clearSelection();
      } else {
        setShowMoveConfirmModal(false);
        setNotification({ message: t('vocab.moveFailed') });
      }

      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleBookChange = (bookId: string) => {
    setSelectedBookId(bookId);
    onBookChange?.(bookId);
  };

  // 表头点击：无序 → 升序 → 降序 → 无序
  const handleSort = (field: SortField) => {
    setCurrentPage(1);
    if (sortField !== field) {
      setSortField(field);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortField(null);
      setSortDir('asc');
    }
  };

  // 表头排序图标
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    }
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  };

  // 通知：批量任务通知（来自 store）优先，其次本地移动/删除通知。
  // 用稳定的局部常量，避免在 JSX 中二次求值时因 store 异步清空导致读取 null。
  const displayNotification = batchState.notification || notification;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>
            {t('vocab.title')}
          </h2>
          <p className={`text-xs ${themeStyles.textSecondary}`}>
            {t('vocab.subtitle')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* 通知 - 放在按钮上方 */}
          {displayNotification && (
            <div className={`px-3 py-2 rounded-lg border text-xs font-medium shadow-sm ${isGlass
              ? 'bg-indigo-500/15 border-indigo-400/40 text-indigo-200'
              : 'bg-white border-[#5aa167] text-[#2f805d]'}`}>
              <span>{displayNotification.message}</span>
              {displayNotification.highlight && (
                <span className={`ml-1 inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold ring-1 ${isGlass
                  ? 'bg-indigo-400/20 text-indigo-100 ring-indigo-400/30'
                  : 'bg-[#d9efd2] text-[#1d6b3d] ring-[#5aa167]/30'}`}>
                  {displayNotification.highlight}
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {/* Batch AI buttons */}
            <button 
              onClick={() => handleBatchAi('enrich')}
              disabled={selectedWordIds.length === 0 || aiBusy}
              className={`inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border cursor-pointer ${batchBtnEnrich} disabled:opacity-40 disabled:cursor-not-allowed transition-all`}
            >
              {batchAiLoading === 'enrich' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {t('vocab.batchEnrich')}
            </button>
            <button 
              onClick={() => handleBatchAi('explain')}
              disabled={selectedWordIds.length === 0 || aiBusy}
              className={`inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border cursor-pointer ${batchBtnExplain} disabled:opacity-40 disabled:cursor-not-allowed transition-all`}
            >
              {batchAiLoading === 'explain' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
              {t('vocab.batchExplain')}
            </button>
            {/* Book switcher dropdown */}
            <div className="relative">
            <button
              type="button"
              onClick={() => setBookDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs pr-8 font-medium focus:outline-hidden cursor-pointer ${dropdownSelectClass}`}
            >
              <span>{books.find((b) => b.id === selectedBookId)?.name || ''}</span>
            </button>
            <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-3 pointer-events-none transition-transform ${bookDropdownOpen ? 'rotate-180' : ''} ${dropdownChevronClass}`} />
            {bookDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBookDropdownOpen(false)} />
                <div className={`absolute right-0 mt-2 w-44 max-h-64 overflow-y-auto rounded-xl shadow-xl border z-50 p-1.5 flex flex-col gap-1 ${dropdownPanelClass}`}>
                  {books.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { handleBookChange(b.id); setBookDropdownOpen(false); }}
                      className={`w-full px-3 py-2 rounded-lg text-xs text-left transition-colors ${b.id === selectedBookId ? dropdownOptionSelected : dropdownOptionIdle}`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className={`flex items-center space-x-2 border px-3 py-2 rounded-xl ${searchPanelClass}`}>
        <Search className={`w-4 h-4 ${searchIconClass}`} />
        <input 
          type="text" 
          placeholder={t('vocab.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full bg-transparent border-0 text-xs focus:ring-0 focus:outline-hidden ${searchInputClass}`}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className={`text-xs ${isGlass ? 'text-neutral-400 hover:text-indigo-400' : 'text-[#6f8b72] hover:text-[#2f805d]'}`}>{t('vocab.clear')}</button>
        )}
      </div>

      {/* 操作栏 */}
      {selectedWordIds.length > 0 && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${batchBarBg}`}>
          <span className={`text-xs font-medium ${batchBarText}`}>
            {t('vocab.selected', { count: selectedWordIds.length })}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowMoveModal(true)}
              disabled={aiBusy}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${batchBtnMove} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {t('vocab.move')}
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)}
              disabled={aiBusy}
              className={isGlass
                ? "px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/70 text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                : "px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e57373] text-[#d32f2f] hover:bg-[#ffebee] disabled:opacity-50 disabled:cursor-not-allowed"}
            >
              {t('vocab.delete')}
            </button>
            <button 
              onClick={clearSelection}
              disabled={aiBusy}
              className={isGlass
                ? "px-3 py-1.5 text-xs font-medium rounded-lg border border-white/15 text-neutral-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                : "px-3 py-1.5 text-xs font-medium rounded-lg border border-[#b0c9aa] text-[#5a7a5e] hover:bg-[#e1f0db] disabled:opacity-50 disabled:cursor-not-allowed"}
            >
              {t('vocab.cancelSelection')}
            </button>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className={`${themeStyles.card} overflow-hidden`}>
        {/* 单张表 + sticky 表头：保证表头表体列宽对齐、只有一套滚动条 */}
        <div className="overflow-x-auto overflow-y-auto max-h-[540px]">
          <table className="w-full table-fixed text-left text-xs border-collapse" style={{ minWidth: `${tableMinWidth}px` }}>
            {renderColgroup()}
            <thead>
              <tr className={`border-b ${tableHeadBorder} ${tableHeadText} font-mono uppercase tracking-widest text-[10px]`}>
                <th className={`sticky top-0 z-10 ${tableHeadBg} relative py-3 px-4 ${tableColDivider}`}>
                  <input
                    type="checkbox"
                    checked={paginatedWords.length > 0 && selectedWordIds.length === paginatedWords.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5"
                  />
                  {renderResizeHandle('select')}
                </th>
                <th className={`sticky top-0 z-10 ${tableHeadBg} relative py-3 px-4 ${tableColDivider}`}>
                  <button onClick={() => handleSort('word')} className="inline-flex items-center gap-1 uppercase tracking-widest font-mono cursor-pointer hover:opacity-80 select-none">
                    {t('vocab.word')}
                    {renderSortIcon('word')}
                  </button>
                  {renderResizeHandle('word')}
                </th>
                <th className={`sticky top-0 z-10 ${tableHeadBg} relative py-3 px-4 ${tableColDivider}`}>
                  <button onClick={() => handleSort('frequency')} className="inline-flex items-center gap-1 uppercase tracking-widest font-mono cursor-pointer hover:opacity-80 select-none">
                    {t('vocab.frequency')}
                    {renderSortIcon('frequency')}
                  </button>
                  {renderResizeHandle('frequency')}
                </th>
                <th className={`sticky top-0 z-10 ${tableHeadBg} relative py-3 px-4 ${tableColDivider}`}>
                  {t('vocab.translation')}
                  {renderResizeHandle('translation')}
                </th>
                <th className={`sticky top-0 z-10 ${tableHeadBg} relative py-3 px-4 ${tableColDivider}`}>
                  <button onClick={() => handleSort('timeAdded')} className="inline-flex items-center gap-1 uppercase tracking-widest font-mono cursor-pointer hover:opacity-80 select-none">
                    {t('vocab.timeAdded')}
                    {renderSortIcon('timeAdded')}
                  </button>
                  {renderResizeHandle('timeAdded')}
                </th>
                <th className={`sticky top-0 z-10 ${tableHeadBg} relative py-3 px-4 text-right`}>{t('vocab.action')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWords.length > 0 ? (
                paginatedWords.map(w => (
                  <tr key={w.id} className={`border-b ${tableRowBorder} ${tableRowHover} transition-colors`}>
                    <td className={`py-3.5 px-4 ${tableColDivider}`}>
                      <input
                        type="checkbox"
                        checked={selectedWordIds.includes(w.id)}
                        onChange={() => toggleSelectWord(w.id)}
                        className="w-3.5 h-3.5"
                      />
                    </td>
                    <td className={`py-3.5 px-4 cursor-pointer ${tableColDivider}`} onClick={() => { onSelectWord(w.id); onNavigate('worddetail'); }}>
                      <button
                        className={`font-semibold text-sm text-left hover:underline block ${wordLinkClass}`}
                      >
                        {w.word}
                      </button>
                    </td>
                    <td className={`py-3.5 px-4 ${tableColDivider}`}>
                      <div className="relative inline-flex items-center space-x-2 group">
                        <div className={`w-16 h-2 rounded-xs overflow-hidden ${progressTrackClass}`}>
                          <div 
                            className="h-full rounded-xs"
                            style={{ 
                              width: `${getProgressPercent(w)}%`,
                              minWidth: '6px',
                              backgroundColor: getProgressColor(getProgressPercent(w))
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px]">{getFrequency(w)}</span>
                        <span
                          role="tooltip"
                          className={`pointer-events-none absolute -top-8 left-0 z-30 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 ${tooltipClass}`}
                        >
                          {t('vocab.addedTimes', { count: getFrequency(w) })}
                        </span>
                      </div>
                    </td>
                    <td className={`py-3.5 px-4 ${tableColDivider}`}>
                      <div className={`font-medium ${themeStyles.textPrimary}`}>{w.translation || w.chineseTranslation}</div>
                    </td>
                    <td className={`py-3.5 px-4 text-neutral-500 ${tableColDivider}`}>
                      {(() => {
                        const dateVal = w.timeAdded ?? w.dateAdded ?? w.meta?.createdAt;
                        if (dateVal === undefined) return '-';
                        return formatDateTime(dateVal);
                      })()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => { onSelectWord(w.id); onNavigate('worddetail'); }}
                        className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline inline-flex items-center"
                      >
                        <span>{t('vocab.view')}</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-neutral-400">
                    {t('vocab.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控件 */}
        {filteredWords.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-white/10">
            {/* 显示统计信息 */}
            <div className="text-xs text-neutral-500">
              {t('vocab.showing', { start: startIndex + 1, end: Math.min(endIndex, filteredWords.length), total: filteredWords.length })}
            </div>

            <div className="flex items-center gap-4">
              {/* 每页显示条数选择 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">{t('vocab.show')}</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPerPageDropdownOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-2 py-1 border rounded-lg text-xs cursor-pointer ${dropdownSelectClass}`}
                  >
                    <span>{itemsPerPage}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${perPageDropdownOpen ? 'rotate-180' : ''} ${dropdownChevronClass}`} />
                  </button>
                  {perPageDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setPerPageDropdownOpen(false)} />
                      <div className={`absolute right-0 bottom-full mb-2 w-20 rounded-xl shadow-xl border z-50 p-1.5 flex flex-col gap-1 ${dropdownPanelClass}`}>
                        {[10, 20, 50, 100].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => { setItemsPerPage(size); setPerPageDropdownOpen(false); }}
                            className={`w-full px-3 py-1.5 rounded-lg text-xs text-left transition-colors ${size === itemsPerPage ? dropdownOptionSelected : dropdownOptionIdle}`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <span className="text-xs text-neutral-500">{t('vocab.items')}</span>
              </div>

              {/* 页码导航 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 text-xs rounded-lg border cursor-pointer ${pageNavBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {t('vocab.previous')}
                </button>
                
                <div className="flex items-center gap-1">
                  {/* 第1页 */}
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`px-2 py-1 text-xs rounded-lg border cursor-pointer ${
                      currentPage === 1 ? pageNumActiveClass : pageNumIdleClass
                    }`}
                  >
                    {1}
                  </button>
                  
                  {/* 左边省略号 */}
                  {totalPages > 7 && currentPage > 4 && (
                    <span className="text-xs text-neutral-400 px-1">...</span>
                  )}

                  {/* 中间页码 */}
                  {(() => {
                    // 计算要显示的中间页码
                    const pages = [];
                    
                    if (totalPages <= 7) {
                      // 页数少，直接显示所有
                      for (let i = 2; i < totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // 页数多，显示中间5个
                      let start = Math.max(2, currentPage - 2);
                      let end = Math.min(totalPages - 1, currentPage + 2);
                      
                      // 确保始终有5个中间页码
                      if (end - start + 1 < 5) {
                        if (currentPage <= 4) {
                          end = Math.min(totalPages - 1, 6);
                        } else if (currentPage >= totalPages - 3) {
                          start = Math.max(2, totalPages - 5);
                        }
                      }
                      
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                    }
                    
                    return pages.map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 py-1 text-xs rounded-lg border cursor-pointer ${
                          currentPage === page ? pageNumActiveClass : pageNumIdleClass
                        }`}
                      >
                        {page}
                      </button>
                    ));
                  })()}
                  
                  {/* 右边省略号 */}
                  {totalPages > 7 && currentPage < totalPages - 3 && (
                    <span className="text-xs text-neutral-400 px-1">...</span>
                  )}
                  
                  {/* 最后一页 */}
                  {totalPages > 1 && (
                    <button
                      key={totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className={`px-2 py-1 text-xs rounded-lg border cursor-pointer ${
                        currentPage === totalPages ? pageNumActiveClass : pageNumIdleClass
                      }`}
                    >
                      {totalPages}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 text-xs rounded-lg border cursor-pointer ${pageNavBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {t('vocab.next')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{t('vocab.deleteTitle')}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              {t('vocab.deleteDesc', { count: selectedWordIds.length })}
            </p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {t('vocab.cancel')}
              </button>
              <button 
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700"
              >
                {t('vocab.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移动单词 - 选择单词本弹窗 */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-md w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{t('vocab.selectTarget')}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
              {t('vocab.moveDesc', { count: selectedWordIds.length })}
            </p>
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {books.map(book => {
                const isCurrentBook = book.id === selectedBookId;
                const isSelected = targetBookId === book.id;
                return (
                  <button
                    key={book.id}
                    type="button"
                    disabled={isCurrentBook}
                    onClick={() => setTargetBookId(book.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      isCurrentBook 
                        ? 'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-400 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                          : 'hover:bg-neutral-100 dark:hover:bg-white/5 border-neutral-200 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{book.name}</div>
                        <div className="text-xs text-neutral-400">{t('vocab.wordsCount', { count: book.wordCount })}</div>
                      </div>
                      {isCurrentBook && <span className="text-xs">{t('vocab.current')}</span>}
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => {
                  setShowMoveModal(false);
                  setTargetBookId(null);
                }}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {t('vocab.cancel')}
              </button>
              <button 
                type="button"
                disabled={!targetBookId}
                onClick={() => {
                  setShowMoveModal(false);
                  setShowMoveConfirmModal(true);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-xl ${
                  targetBookId 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                }`}
              >
                {t('vocab.nextStep')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移动单词 - 确认弹窗 */}
      {showMoveConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{t('vocab.confirmMoveTitle')}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              {t('vocab.confirmMoveDescPrefix', { count: selectedWordIds.length })}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {' '}{books.find(b => b.id === targetBookId)?.name}
              </span>
              {t('vocab.confirmMoveDescSuffix')}
            </p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowMoveConfirmModal(false)}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {t('vocab.back')}
              </button>
              <button 
                type="button"
                onClick={handleMove}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
              >
                {t('vocab.confirmMove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
