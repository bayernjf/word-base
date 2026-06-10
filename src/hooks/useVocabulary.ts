import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../context/SupabaseContext';
import type { Word, WordContext, VocabularyBook } from '../types';

type SupabaseBookRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  word_count: number | null;
  icon: string | null;
  is_sync: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type SupabaseWordRow = {
  id: string;
  user_id: string;
  word: string;
  frequency: number | null;
  translation: string | null;
  time_added: string | null;
  time_updated: string | null;
  contexts: WordContext[] | null;
  phonetic: string | null;
  part_of_speech: string | null;
  definition: string | null;
  chinese_translation: string | null;
  synonyms: string[] | null;
  examples: Array<{ en: string; zh: string }> | null;
  usage_history: Array<{ context: string; translation: string; source: string }> | null;
  level: Word['level'] | null;
  familiarity: number | null;
  book_id: string;
  meta: Word['meta'] | null;
  created_at: string | null;
  updated_at: string | null;
};

function toTimestamp(value?: string | number | null): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function mapBookRow(row: SupabaseBookRow, wordCountMap: Record<string, number>): VocabularyBook {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || '',
    wordCount: wordCountMap[row.id] ?? row.word_count ?? 0,
    icon: row.icon || 'BookOpen',
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at),
    isSync: Boolean(row.is_sync),
  };
}

function mapWordRow(row: SupabaseWordRow): Word {
  const timeAdded = toTimestamp(row.time_added || row.created_at);
  const timeUpdated = toTimestamp(row.time_updated || row.updated_at);
  const translation = row.translation || row.chinese_translation || '';
  const examples = Array.isArray(row.examples) ? row.examples : [];
  const contexts = Array.isArray(row.contexts) ? row.contexts : [];

  return {
    id: row.id,
    word: row.word,
    frequency: row.frequency ?? Math.max(contexts.length, 1),
    translation,
    timeAdded,
    timeUpdated,
    dateAdded: timeAdded,
    dateUpdated: timeUpdated,
    contexts,
    phonetic: row.phonetic || '',
    partOfSpeech: row.part_of_speech || '',
    definition: row.definition || translation,
    chineseTranslation: row.chinese_translation || translation,
    synonyms: Array.isArray(row.synonyms) ? row.synonyms : [],
    examples,
    usageHistory: Array.isArray(row.usage_history) ? row.usage_history : [],
    level: row.level || 'B2',
    familiarity: row.familiarity ?? 0,
    bookId: row.book_id,
    meta: {
      ...(row.meta || {}),
      createdAt: row.meta?.createdAt ?? timeAdded,
    },
  };
}

function toBookInsert(book: {
  name: string;
  description?: string;
  icon?: string;
  isSync?: boolean;
}) {
  return {
    name: book.name,
    description: book.description || '',
    icon: book.icon || 'BookOpen',
    word_count: 0,
    is_sync: Boolean(book.isSync),
  };
}

function isMissingSetSyncBookRpc(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || error || '');
  const code = String((error as { code?: string })?.code || '');
  return code === 'PGRST202' || message.includes('set_sync_book') || message.includes('Could not find the function public.set_sync_book');
}

function toWordPayload(word: Omit<Word, 'id'>) {
  const timeAdded = word.timeAdded ?? word.dateAdded ?? Date.now();
  const timeUpdated = word.timeUpdated ?? word.dateUpdated ?? timeAdded;
  const translation = word.translation || word.chineseTranslation || '';
  const contexts: WordContext[] =
    word.contexts && word.contexts.length > 0
      ? word.contexts
      : (word.examples || [])
          .filter((example) => example.en || example.zh)
          .map((example) => ({
            context: example.en || '',
            translation: example.zh || '',
            timeAdded,
            sourceLink: undefined,
          }));

  return {
    word: word.word,
    frequency: word.frequency ?? Math.max(contexts.length, 1),
    translation,
    time_added: new Date(timeAdded).toISOString(),
    time_updated: new Date(timeUpdated).toISOString(),
    contexts,
    phonetic: word.phonetic || '',
    part_of_speech: word.partOfSpeech || '',
    definition: word.definition || translation,
    chinese_translation: word.chineseTranslation || translation,
    synonyms: word.synonyms || [],
    examples: word.examples || [],
    usage_history: word.usageHistory || [],
    level: word.level || 'B2',
    familiarity: word.familiarity ?? 0,
    book_id: word.bookId,
    meta: word.meta || {},
  };
}

export function useVocabularyBooks() {
  const { user } = useSupabase();
  const [books, setBooks] = useState<VocabularyBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBooks = useCallback(async () => {
    if (!user) {
      setBooks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [{ data: bookRows, error: booksError }, { data: wordRows, error: wordsError }] = await Promise.all([
        supabase
          .from('vocabulary_books')
          .select('id, user_id, name, description, word_count, icon, is_sync, created_at, updated_at')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .order('is_sync', { ascending: false })
          .order('created_at'),
        supabase
          .from('words')
          .select('book_id')
          .eq('user_id', user.id)
          .eq('is_deleted', false),
      ]);

      if (booksError) throw booksError;
      if (wordsError) throw wordsError;

      const wordCountMap = (wordRows || []).reduce<Record<string, number>>((acc, item) => {
        const key = item.book_id as string;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      setBooks(((bookRows || []) as SupabaseBookRow[]).map((row) => mapBookRow(row, wordCountMap)));
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const applySetSyncBook = useCallback(
    async (bookId: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase.rpc('set_sync_book', {
          p_book_id: bookId,
        });

        if (error) {
          throw error;
        }

        return true;
      } catch (error) {
        if (!isMissingSetSyncBookRpc(error)) {
          throw error;
        }

        // 兼容未执行 migration 的环境，先保证功能可用。
        const now = new Date().toISOString();
        const clearRes = await supabase
          .from('vocabulary_books')
          .update({ is_sync: false, updated_at: now })
          .eq('user_id', user.id)
          .eq('is_deleted', false);

        if (clearRes.error) {
          throw clearRes.error;
        }

        const setRes = await supabase
          .from('vocabulary_books')
          .update({ is_sync: true, updated_at: now })
          .eq('id', bookId)
          .eq('user_id', user.id)
          .eq('is_deleted', false);

        if (setRes.error) {
          throw setRes.error;
        }

        return true;
      }
    },
    [user]
  );

  const createBook = useCallback(
    async (book: Omit<VocabularyBook, 'id' | 'userId' | 'wordCount' | 'createdAt' | 'updatedAt'>) => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from('vocabulary_books')
          .insert({
            ...toBookInsert({ ...book, isSync: false }),
            user_id: user.id,
            sync_version: 1,
            is_deleted: false,
          })
          .select('id, user_id, name, description, word_count, icon, is_sync, created_at, updated_at')
          .single();

        if (error) throw error;

        const mapped = mapBookRow(data as SupabaseBookRow, {});
        if (book.isSync) {
          const syncOk = await applySetSyncBook(mapped.id);
          if (!syncOk) {
            throw new Error('set_sync_book_failed');
          }
          await loadBooks();
          return mapped;
        }

        await loadBooks();
        return mapped;
      } catch (error) {
        console.error('Error creating book:', error);
        return null;
      }
    },
    [user, loadBooks, applySetSyncBook]
  );

  const updateBook = useCallback(
    async (bookId: string, updates: { name?: string; description?: string; icon?: string }) => {
      if (!user) return null;

      try {
        const payload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.icon !== undefined) payload.icon = updates.icon;

        const { data, error } = await supabase
          .from('vocabulary_books')
          .update(payload)
          .eq('id', bookId)
          .eq('user_id', user.id)
          .select('id, user_id, name, description, word_count, icon, is_sync, created_at, updated_at')
          .single();

        if (error) throw error;

        const mapped = mapBookRow(data as SupabaseBookRow, {});
        setBooks((prev) => prev.map((book) => (book.id === bookId ? { ...book, ...mapped } : book)));
        return mapped;
      } catch (error) {
        console.error('Error updating book:', error);
        return null;
      }
    },
    [user]
  );

  const deleteBook = useCallback(
    async (bookId: string) => {
      if (!user) return false;

      try {
        const now = new Date().toISOString();

        await Promise.all([
          supabase
            .from('vocabulary_books')
            .update({ is_deleted: true, is_sync: false, updated_at: now })
            .eq('id', bookId)
            .eq('user_id', user.id),
          supabase
            .from('words')
            .update({ is_deleted: true, updated_at: now })
            .eq('book_id', bookId)
            .eq('user_id', user.id),
        ]);

        setBooks((prev) => {
          const remaining = prev.filter((book) => book.id !== bookId);
          return remaining;
        });
        return true;
      } catch (error) {
        console.error('Error deleting book:', error);
        return false;
      }
    },
    [user]
  );

  const setSyncBook = useCallback(
    async (bookId: string) => {
      if (!user) return false;

      try {
        await applySetSyncBook(bookId);
        await loadBooks();
        return true;
      } catch (error) {
        console.error('Error setting sync book:', error);
        return false;
      }
    },
    [user, loadBooks, applySetSyncBook]
  );

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  return {
    books,
    isLoading,
    loadBooks,
    createBook,
    updateBook,
    deleteBook,
    setSyncBook,
  };
}

export function useWords(bookId?: string) {
  const { user } = useSupabase();
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWords = useCallback(async () => {
    if (!user) {
      setWords([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let query = supabase
        .from('words')
        .select(
          'id, user_id, word, frequency, translation, time_added, time_updated, contexts, phonetic, part_of_speech, definition, chinese_translation, synonyms, examples, usage_history, level, familiarity, book_id, meta, created_at, updated_at'
        )
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      if (bookId) {
        query = query.eq('book_id', bookId);
      }

      const { data, error } = await query.order('time_added', { ascending: false });

      if (error) throw error;
      setWords(((data || []) as SupabaseWordRow[]).map(mapWordRow));
    } catch (error) {
      console.error('Error loading words:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, bookId]);

  const addWord = useCallback(
    async (word: Omit<Word, 'id'>) => {
      if (!user) return null;

      try {
        const payload = toWordPayload(word);

        const { data: existing, error: existingError } = await supabase
          .from('words')
          .select(
            'id, user_id, word, frequency, translation, time_added, time_updated, contexts, phonetic, part_of_speech, definition, chinese_translation, synonyms, examples, usage_history, level, familiarity, book_id, meta, created_at, updated_at'
          )
          .eq('user_id', user.id)
          .eq('book_id', payload.book_id)
          .eq('word', payload.word)
          .eq('is_deleted', false)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
          const existingWord = mapWordRow(existing as SupabaseWordRow);
          const existingContexts: WordContext[] = existingWord.contexts || [];
          const nextContexts: WordContext[] = payload.contexts || [];
          const mergedContexts: WordContext[] = [...existingContexts];

          nextContexts.forEach((context) => {
            const duplicated = mergedContexts.some(
              (item) => item.context === context.context && item.sourceLink === context.sourceLink
            );
            if (!duplicated) {
              mergedContexts.push(context);
            }
          });

          const { data: updated, error: updateError } = await supabase
            .from('words')
            .update({
              ...payload,
              contexts: mergedContexts,
              frequency: Math.max(mergedContexts.length, payload.frequency || 1),
              time_updated: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .eq('user_id', user.id)
            .select(
              'id, user_id, word, frequency, translation, time_added, time_updated, contexts, phonetic, part_of_speech, definition, chinese_translation, synonyms, examples, usage_history, level, familiarity, book_id, meta, created_at, updated_at'
            )
            .single();

          if (updateError) throw updateError;

          const mapped = mapWordRow(updated as SupabaseWordRow);
          setWords((prev) => {
            const filtered = prev.filter((item) => item.id !== mapped.id);
            return [mapped, ...filtered];
          });
          return mapped;
        }

        const { data, error } = await supabase
          .from('words')
          .insert({
            ...payload,
            user_id: user.id,
            sync_version: 1,
            is_deleted: false,
          })
          .select(
            'id, user_id, word, frequency, translation, time_added, time_updated, contexts, phonetic, part_of_speech, definition, chinese_translation, synonyms, examples, usage_history, level, familiarity, book_id, meta, created_at, updated_at'
          )
          .single();

        if (error) throw error;

        const mapped = mapWordRow(data as SupabaseWordRow);
        setWords((prev) => [mapped, ...prev]);
        return mapped;
      } catch (error) {
        console.error('Error adding word:', error);
        return null;
      }
    },
    [user]
  );

  const deleteWord = useCallback(
    async (wordId: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from('words')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('id', wordId)
          .eq('user_id', user.id);

        if (error) throw error;

        setWords((prev) => prev.filter((word) => word.id !== wordId));
        return true;
      } catch (error) {
        console.error('Error deleting word:', error);
        return false;
      }
    },
    [user]
  );

  const deleteWords = useCallback(
    async (wordIds: string[]) => {
      if (!user || wordIds.length === 0) return false;

      try {
        const { error } = await supabase
          .from('words')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('id', wordIds);

        if (error) throw error;

        setWords((prev) => prev.filter((word) => !wordIds.includes(word.id)));
        return true;
      } catch (error) {
        console.error('Error deleting words:', error);
        return false;
      }
    },
    [user]
  );

  const moveWords = useCallback(
    async (wordIds: string[], targetBookId: string) => {
      if (!user || wordIds.length === 0) return false;

      try {
        const { error } = await supabase
          .from('words')
          .update({
            book_id: targetBookId,
            updated_at: new Date().toISOString(),
            time_updated: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .in('id', wordIds);

        if (error) throw error;

        setWords((prev) =>
          prev.map((word) => (wordIds.includes(word.id) ? { ...word, bookId: targetBookId } : word))
        );
        return true;
      } catch (error) {
        console.error('Error moving words:', error);
        return false;
      }
    },
    [user]
  );

  const updateWord = useCallback(
    async (wordId: string, updates: Partial<Word>) => {
      if (!user) return null;

      try {
        const payload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
          time_updated: new Date().toISOString(),
        };

        if (updates.word !== undefined) payload.word = updates.word;
        if (updates.frequency !== undefined) payload.frequency = updates.frequency;
        if (updates.translation !== undefined) payload.translation = updates.translation;
        if (updates.timeAdded !== undefined) payload.time_added = new Date(updates.timeAdded).toISOString();
        if (updates.timeUpdated !== undefined) payload.time_updated = new Date(updates.timeUpdated).toISOString();
        if (updates.contexts !== undefined) payload.contexts = updates.contexts;
        if (updates.phonetic !== undefined) payload.phonetic = updates.phonetic;
        if (updates.partOfSpeech !== undefined) payload.part_of_speech = updates.partOfSpeech;
        if (updates.definition !== undefined) payload.definition = updates.definition;
        if (updates.chineseTranslation !== undefined) payload.chinese_translation = updates.chineseTranslation;
        if (updates.synonyms !== undefined) payload.synonyms = updates.synonyms;
        if (updates.examples !== undefined) payload.examples = updates.examples;
        if (updates.usageHistory !== undefined) payload.usage_history = updates.usageHistory;
        if (updates.level !== undefined) payload.level = updates.level;
        if (updates.familiarity !== undefined) payload.familiarity = updates.familiarity;
        if (updates.bookId !== undefined) payload.book_id = updates.bookId;
        if (updates.meta !== undefined) payload.meta = updates.meta;

        const { data, error } = await supabase
          .from('words')
          .update(payload)
          .eq('id', wordId)
          .eq('user_id', user.id)
          .select(
            'id, user_id, word, frequency, translation, time_added, time_updated, contexts, phonetic, part_of_speech, definition, chinese_translation, synonyms, examples, usage_history, level, familiarity, book_id, meta, created_at, updated_at'
          )
          .single();

        if (error) throw error;

        const mapped = mapWordRow(data as SupabaseWordRow);
        setWords((prev) => prev.map((word) => (word.id === wordId ? mapped : word)));
        return mapped;
      } catch (error) {
        console.error('Error updating word:', error);
        return null;
      }
    },
    [user]
  );

  useEffect(() => {
    void loadWords();
  }, [loadWords]);

  return {
    words,
    isLoading,
    loadWords,
    addWord,
    deleteWord,
    deleteWords,
    moveWords,
    updateWord,
  };
}
