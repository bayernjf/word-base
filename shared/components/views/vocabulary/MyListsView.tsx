import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, CheckCircle2 } from 'lucide-react';
import { AppLanguage, VocabularyBook } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface MyListsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  books: VocabularyBook[];
  onCreateBook: (book: { name: string; description?: string; icon?: string; isSync: boolean }) => void;
  onSetSyncBook: (bookId: string) => Promise<boolean>;
  onDeleteBooks: (bookIds: string[]) => void;
  onUpdateBook: (bookId: string, updates: { name?: string; description?: string; icon?: string }) => Promise<boolean>;
}

export const MyListsView: React.FC<MyListsProps> = ({ themeStyles, language, onNavigate, books, onCreateBook, onSetSyncBook, onDeleteBooks, onUpdateBook }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const t = createTranslator(language);

  // 检查单词本名称是否已存在（忽略大小写）
  const isNameExists = name.trim().length > 0 && 
    books.some(book => book.name.toLowerCase() === name.trim().toLowerCase());

  // 检查编辑中的名称是否已存在
  const isEditNameExists = (currentBookId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName.length === 0) return false;
    return books.some(
      book => book.id !== currentBookId && 
      book.name.toLowerCase() === trimmedName.toLowerCase()
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateBook({
      name,
      description: '',
      icon: 'BookOpen',
      isSync: false
    });
    setName('');
    setShowCreate(false);
  };

  const handleToggleSync = async (bookId: string, currentIsSync: boolean) => {
    if (currentIsSync) {
      // 尝试关闭当前同步单词本
      if (books.length === 1) {
        // 只有一个单词本，不能关闭
        setNotification(t('myLists.mustHaveSync'));
        setTimeout(() => setNotification(null), 3000);
      } else {
        // 有多个单词本，不能直接关闭，什么也不做
        setNotification(t('myLists.chooseAnotherSync'));
        setTimeout(() => setNotification(null), 3000);
      }
    } else {
      // 开启这个单词本的同步
      const ok = await onSetSyncBook(bookId);
      const book = books.find(b => b.id === bookId);
      if (ok && book) {
        setNotification(t('myLists.syncSet', { name: book.name }));
      } else if (!ok) {
        setNotification(t('myLists.syncSwitchFailed'));
      }
      if (ok || !ok) {
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  const handleToggleDeleteSelect = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (selectedBookIds.includes(bookId)) {
      setSelectedBookIds(prev => prev.filter(id => id !== bookId));
    } else {
      // 不能选择同步的单词本
      if (book?.isSync) {
        return;
      }
      setSelectedBookIds(prev => [...prev, bookId]);
    }
  };

  const handleDeleteClick = () => {
    if (deleteMode) {
      if (selectedBookIds.length > 0) {
        setShowConfirmModal(true);
      }
    } else {
      setDeleteMode(true);
      setSelectedBookIds([]);
    }
  };

  const handleCancelDelete = () => {
    setDeleteMode(false);
    setSelectedBookIds([]);
  };

  const handleConfirmDelete = () => {
    onDeleteBooks(selectedBookIds);
    setShowConfirmModal(false);
    setDeleteMode(false);
    setSelectedBookIds([]);
  };

  // 编辑单词本名称
  const handleStartEdit = (bookId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteMode) return;
    setEditingBookId(bookId);
    setEditingName(currentName);
    setEditError(null);
  };

  const handleSaveEdit = async (bookId: string) => {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setEditError(t('myLists.emptyName'));
      return;
    }
    if (isEditNameExists(bookId, trimmedName)) {
      setEditError(t('myLists.bookExists'));
      return;
    }
    try {
      const success = await onUpdateBook(bookId, { name: trimmedName });
      if (success) {
        setEditingBookId(null);
        setEditError(null);
      } else {
        setEditError(t('myLists.updateFailed'));
      }
    } catch {
      setEditError(t('myLists.updateFailed'));
    }
  };

  const handleCancelEdit = () => {
    setEditingBookId(null);
    setEditError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, bookId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(bookId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Switch component
  const Switch = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`${themeStyles.card} bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800`}>
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>{t('myLists.title')}</h2>
          <p className="text-xs text-neutral-400">{t('myLists.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {!deleteMode && (
            <button 
              onClick={() => setShowCreate(!showCreate)} 
              className={`${themeStyles.btnPrimary} flex items-center space-x-1.5 py-2 text-xs font-semibold`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('myLists.newWordbook')}</span>
            </button>
          )}
          <button 
            onClick={handleDeleteClick} 
            className={`${deleteMode ? 'bg-red-600 hover:bg-red-700 text-white' : themeStyles.btnSecondary} flex items-center space-x-1.5 py-2 text-xs font-semibold px-4 rounded-xl`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{deleteMode ? t('myLists.confirmDelete') : t('myLists.deleteWordbook')}</span>
          </button>
          {deleteMode && (
            <button 
              onClick={handleCancelDelete} 
              className={`${themeStyles.btnSecondary} py-2 text-xs font-semibold`}
            >
              {t('myLists.cancel')}
            </button>
          )}
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className={`${themeStyles.card} space-y-4 max-w-xl`}>
          <h3 className="font-bold text-sm">{t('myLists.createTitle')}</h3>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{t('myLists.nameLabel')}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('myLists.namePlaceholder')}
              className={`w-full px-3 py-2 bg-black/5 dark:bg-white/5 border rounded-xl text-xs ${
                isNameExists 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-neutral-300 dark:border-white/10'
              }`}
              required
            />
            {isNameExists && (
              <p className="text-xs text-red-500 mt-1">{t('myLists.bookExists')}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              type="submit" 
              className={`${themeStyles.btnPrimary} py-2 text-xs font-bold flex-1 ${
                isNameExists ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isNameExists}
            >
              {t('myLists.create')}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className={`${themeStyles.btnSecondary} py-2 text-xs flex-1`}>
              {t('myLists.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Wordbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {books.map(b => {
          const isSelected = selectedBookIds.includes(b.id);
          const isSyncBook = b.isSync;
          const isDisabled = isSyncBook;
          return (
            <div key={b.id} className="space-y-2">
              <div 
                className={`${themeStyles.card} hover:scale-[1.01] transition-transform ${deleteMode ? 'cursor-default' : 'cursor-pointer'} relative`}
                onClick={() => {
                  if (deleteMode) {
                    if (!isDisabled) {
                      handleToggleDeleteSelect(b.id);
                    }
                  } else {
                    onNavigate(`vocabulary-${b.id}`);
                  }
                }}
              >
                {deleteMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (!isDisabled) {
                          handleToggleDeleteSelect(b.id);
                        }
                      }}
                      disabled={isDisabled}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex-shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div className="ml-3 flex-1 min-w-0">
                      {editingBookId === b.id ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => {
                              setEditingName(e.target.value);
                              setEditError(null);
                            }}
                            onBlur={() => handleSaveEdit(b.id)}
                            onKeyDown={(e) => handleKeyDown(e, b.id)}
                            autoFocus
                            className={`w-full px-2 py-1 bg-black/5 dark:bg-white/5 border rounded text-xs ${
                              editError
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-neutral-300 dark:border-white/10'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {editError && (
                            <p className="text-xs text-red-500">{editError}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <h3
                            className={`font-bold text-sm ${themeStyles.textPrimary} cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors`}
                            onClick={(e) => handleStartEdit(b.id, b.name, e)}
                            title={t('myLists.clickToEdit')}
                          >
                            {b.name}
                          </h3>
                          <p className={`text-xs ${themeStyles.textSecondary}`}>{t('myLists.wordsCount', { count: b.wordCount })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {!deleteMode && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Switch 
                        checked={b.isSync} 
                        onChange={() => handleToggleSync(b.id, b.isSync)}
                      />
                    </div>
                  )}
                </div>
                {b.isSync && (
                  <div className="mt-2 flex items-center space-x-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t('myLists.syncWordbook')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Delete Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{t('myLists.deleteModalTitle')}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              {t('myLists.deleteModalDesc', { count: selectedBookIds.length })}
            </p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {t('myLists.cancel')}
              </button>
              <button 
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700"
              >
                {t('myLists.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
