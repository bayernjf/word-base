import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react';
import { AppLanguage, MoveWordsResult, Word, VocabularyBook } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getFrequency, formatDateTime } from '../shared/helpers';

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
}

interface VocabularyNotification {
  message: string;
  highlight?: string;
}

export const VocabularyListView: React.FC<VocabularyProps> = ({ 
  themeStyles, language, onNavigate, words, books, onSelectWord, onAddWord,
  initialSelectedBookId = 'biz-eng', onBookChange, onDeleteWords, onMoveWords
}) => {
  const [selectedBookId, setSelectedBookId] = useState(initialSelectedBookId);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMoveConfirmModal, setShowMoveConfirmModal] = useState(false);
  const [targetBookId, setTargetBookId] = useState<string | null>(null);
  const [notification, setNotification] = useState<VocabularyNotification | null>(null);
  const t = createTranslator(language);

  // Update local state if initial prop changes
  useEffect(() => {
    setSelectedBookId(initialSelectedBookId);
    setCurrentPage(1); // 切换单词本时回到第一页
    setSelectedWordIds([]); // 切换单词本时清空选择
  }, [initialSelectedBookId]);

  // 当搜索或每页条数变化时回到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

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

  // 计算进度条颜色（从浅绿→橙黄→酒红）
  const getProgressColor = (percent: number) => {
    // 1%: 浅绿色 (light green) - #90EE90
    // 50%: 橙黄色 (orange-yellow) - #FFB600
    // 100%: 酒红色 (wine red) - #722F37
    
    const r1 = 144, g1 = 238, b1 = 144; // 浅绿
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

  // 计算分页
  const totalPages = Math.ceil(filteredWords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWords = filteredWords.slice(startIndex, endIndex);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(filteredWords.length / itemsPerPage));
    if (currentPage > nextTotalPages) {
      setCurrentPage(nextTotalPages);
    }
  }, [filteredWords.length, itemsPerPage, currentPage]);

  useEffect(() => {
    const availableWordIds = new Set(filteredWords.map((word) => word.id));
    setSelectedWordIds((prev) => prev.filter((id) => availableWordIds.has(id)));
  }, [filteredWords]);

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedWordIds.length === paginatedWords.length) {
      setSelectedWordIds([]);
    } else {
      setSelectedWordIds(paginatedWords.map(w => w.id));
    }
  };

  // 切换单个选择
  const toggleSelectWord = (wordId: string) => {
    setSelectedWordIds(prev => 
      prev.includes(wordId) 
        ? prev.filter(id => id !== wordId) 
        : [...prev, wordId]
    );
  };

  // 取消选择
  const clearSelection = () => {
    setSelectedWordIds([]);
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Book switcher dropdown */}
          <div className="relative">
            <select 
              value={selectedBookId}
              onChange={(e) => handleBookChange(e.target.value)}
              className="px-3 py-2 bg-slate-100 dark:bg-white/10 border border-neutral-300 dark:border-white/15 rounded-xl text-xs pr-8 font-medium focus:outline-hidden text-neutral-800 dark:text-neutral-100 cursor-pointer appearance-none"
            >
              {books.map(b => (
                <option key={b.id} value={b.id} className="text-black bg-stone-100">{b.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center space-x-2 bg-slate-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 px-3 py-2 rounded-xl">
        <Search className="w-4 h-4 text-neutral-400" />
        <input 
          type="text" 
          placeholder={t('vocab.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-0 text-xs focus:ring-0 focus:outline-hidden"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-neutral-400 hover:text-indigo-650">{t('vocab.clear')}</button>
        )}
      </div>

      {/* 操作栏 */}
      {selectedWordIds.length > 0 && (
        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3 rounded-xl">
          <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            {t('vocab.selected', { count: selectedWordIds.length })}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowMoveModal(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-300 dark:border-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30`}
            >
              {t('vocab.move')}
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-600 text-red-600 dark:text-red-400 dark:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              {t('vocab.delete')}
            </button>
            <button 
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-white/15 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10"
            >
              {t('vocab.cancelSelection')}
            </button>
          </div>
        </div>
      )}

      {notification && (
        <div className="px-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-sm text-indigo-700 dark:text-indigo-300">
          <span>{notification.message}</span>
          {notification.highlight && (
            <span className="ml-1 inline-flex items-center rounded-md bg-indigo-600/10 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-500/20">
              {notification.highlight}
            </span>
          )}
        </div>
      )}

      {/* Table Card */}
      <div className={`${themeStyles.card} overflow-hidden`}>
        {/* 表格容器添加滚动 */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-inherit">
              <tr className="border-b border-neutral-200 dark:border-white/10 text-neutral-400 font-mono uppercase tracking-widest text-[10px]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={paginatedWords.length > 0 && selectedWordIds.length === paginatedWords.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5"
                  />
                </th>
                <th className="py-3 px-4">{t('vocab.word')}</th>
                <th className="py-3 px-4">{t('vocab.frequency')}</th>
                <th className="py-3 px-4">{t('vocab.translation')}</th>
                <th className="py-3 px-4">{t('vocab.timeAdded')}</th>
                <th className="py-3 px-4 text-right">{t('vocab.action')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWords.length > 0 ? (
                paginatedWords.map(w => (
                  <tr key={w.id} className="border-b border-neutral-100 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedWordIds.includes(w.id)}
                        onChange={() => toggleSelectWord(w.id)}
                        className="w-3.5 h-3.5"
                      />
                    </td>
                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => { onSelectWord(w.id); onNavigate('worddetail'); }}>
                      <button 
                        className={`font-semibold text-sm text-left hover:underline block ${themeStyles.accentText}`}
                      >
                        {w.word}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div 
                        className="flex items-center space-x-2 cursor-help" 
                        title={t('vocab.addedTimes', { count: getFrequency(w) })}
                      >
                        <div className="w-16 bg-slate-200 dark:bg-white/10 h-2 rounded-xs overflow-hidden">
                          <div 
                            className="h-full"
                            style={{ 
                              width: `${getProgressPercent(w)}%`,
                              backgroundColor: getProgressColor(getProgressPercent(w))
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px]">{getFrequency(w)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className={`font-medium ${themeStyles.textPrimary}`}>{w.translation || w.chineseTranslation}</div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500">
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
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-100 dark:bg-white/10 border border-neutral-300 dark:border-white/15 rounded-lg text-xs cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-neutral-500">{t('vocab.items')}</span>
              </div>

              {/* 页码导航 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('vocab.previous')}
                </button>
                
                <div className="flex items-center gap-1">
                  {/* 第1页 */}
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`px-2 py-1 text-xs rounded-lg border ${
                      currentPage === 1
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10'
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
                        className={`px-2 py-1 text-xs rounded-lg border ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10'
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
                      className={`px-2 py-1 text-xs rounded-lg border ${
                        currentPage === totalPages
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {totalPages}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
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
