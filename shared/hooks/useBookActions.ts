import { useCallback } from 'react';
import { getPlatform } from '../platform';
import { createLogger } from '../lib/logger';
import type { Word, VocabularyBook, MoveWordsResult } from '../types';

const logger = createLogger('useBookActions');

function persistSelectedBookId(bookId: string) {
  void getPlatform().kv.set('wordbase-selected-book', bookId);
}

function clearPersistedSelectedBookId() {
  void getPlatform().kv.remove('wordbase-selected-book');
}

/**
 * 书本 / 单词操作 wrapper hook。
 * 在 useVocabularyBooks / useWords 的原子操作上封装业务逻辑（刷新列表、联动选中态、持久化）。
 */
export function useBookActions(
  books: VocabularyBook[],
  selectedBookId: string,
  setSelectedBookId: (id: string) => void,
  setActiveView: (view: string) => void,
  setSelectedWordId: (id: string) => void,
  loadBooks: () => Promise<void>,
  addWord: (word: Omit<Word, 'id'>) => Promise<Word | null>,
  deleteWords: (wordIds: string[]) => Promise<boolean>,
  moveWords: (wordIds: string[], targetBookId: string) => Promise<MoveWordsResult>,
  createBook: (book: Omit<VocabularyBook, 'id' | 'userId' | 'wordCount' | 'createdAt' | 'updatedAt'>) => Promise<VocabularyBook | null>,
  deleteBook: (bookId: string) => Promise<boolean>,
  updateBook: (bookId: string, updates: { name?: string; description?: string; icon?: string }) => Promise<VocabularyBook | null>,
  setSyncBook: (bookId: string) => Promise<boolean>,
) {
  const handleAddWord = useCallback(async (wordData: Parameters<typeof addWord>[0]) => {
    logger.debug('handleAddWord', { word: wordData.word, bookId: wordData.bookId });
    const saved = await addWord(wordData);
    if (saved) {
      setSelectedWordId(saved.id);
      await loadBooks();
      logger.info('handleAddWord success', { id: saved.id });
    }
  }, [addWord, loadBooks, setSelectedWordId]);

  const handleDeleteWords = useCallback(async (wordIds: string[]) => {
    await deleteWords(wordIds);
    await loadBooks();
  }, [deleteWords, loadBooks]);

  const handleMoveWords = useCallback(async (wordIds: string[], targetBookId: string) => {
    const result = await moveWords(wordIds, targetBookId);
    if (result.success) {
      await loadBooks();
    }
    return result;
  }, [moveWords, loadBooks]);

  const handleCreateBook = useCallback(async (bookData: Parameters<typeof createBook>[0]) => {
    const created = await createBook(bookData);
    if (created) {
      setSelectedBookId(created.id);
      void getPlatform().kv.set('wordbase-selected-book', created.id);
    }
  }, [createBook, setSelectedBookId]);

  const handleDeleteBooks = useCallback(async (bookIds: string[]) => {
    const deletingSyncBook = books.find((b) => bookIds.includes(b.id) && b.isSync);
    const remaining = books.filter((b) => !bookIds.includes(b.id));

    await Promise.all(bookIds.map((bookId) => deleteBook(bookId)));

    if (deletingSyncBook && remaining.length > 0) {
      await setSyncBook(remaining[0].id);
    }

    await loadBooks();
    if (bookIds.includes(selectedBookId)) {
      setSelectedBookId('');
      setActiveView('mylists');
    }
  }, [books, selectedBookId, deleteBook, setSyncBook, loadBooks, setSelectedBookId, setActiveView]);

  const handleUpdateBook = useCallback(async (bookId: string, updates: { name?: string; description?: string; icon?: string }) => {
    const updated = await updateBook(bookId, updates);
    if (updated) {
      await loadBooks();
      return true;
    }
    return false;
  }, [updateBook, loadBooks]);

  const handleSetSyncBook = useCallback(async (bookId: string) => {
    const previousBookId = selectedBookId;
    setSelectedBookId(bookId);
    persistSelectedBookId(bookId);

    const ok = await setSyncBook(bookId);
    if (!ok) {
      if (previousBookId) {
        setSelectedBookId(previousBookId);
        persistSelectedBookId(previousBookId);
      } else {
        setSelectedBookId('');
        clearPersistedSelectedBookId();
      }
    }

    return ok;
  }, [selectedBookId, setSelectedBookId, setSyncBook]);

  return {
    handleAddWord,
    handleDeleteWords,
    handleMoveWords,
    handleCreateBook,
    handleDeleteBooks,
    handleUpdateBook,
    handleSetSyncBook,
  };
}
