import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createLogger } from '../lib/logger';
import { useSupabase } from '../context/SupabaseContext';
import { mergeEncounterFamiliarity } from '../lib/srs';
import type { MoveWordsResult, Word, WordContext, VocabularyBook } from '../types';

const logger = createLogger('useVocabulary');

const WORD_SELECT_COLUMNS =
  'id, user_id, word, frequency, translation, time_added, time_updated, contexts, phonetic, part_of_speech, definition, chinese_translation, synonyms, examples, usage_history, memory_tip, deep_explanation, sense_groups, level, familiarity, next_review_at, review_count, ease_factor, interval_days, book_id, meta, created_at, updated_at';

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
  memory_tip: string | null;
  deep_explanation: {
    contextInsights: Array<{ context: string; insight: string }>;
    synonymComparison: string;
    memoryHook: string;
    generatedAt?: number;
  } | null;
  sense_groups: Word['senseGroups'] | null;
  level: Word['level'] | null;
  familiarity: number | null;
  next_review_at: string | null;
  review_count: number | null;
  ease_factor: number | null;
  interval_days: number | null;
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
    partOfSpeech: normalizePartOfSpeech(row.part_of_speech || ''),
    definition: row.definition || '',
    chineseTranslation: row.chinese_translation || translation,
    synonyms: Array.isArray(row.synonyms) ? row.synonyms : [],
    examples,
    usageHistory: Array.isArray(row.usage_history) ? row.usage_history : [],
    memoryTip: row.memory_tip || undefined,
    deepExplanation: row.deep_explanation || undefined,
    senseGroups: row.sense_groups || undefined,
    level: row.level || 'B2',
    // 读取时兜底：旧数据或未经合并计算的词，按遇见历史补算被动熟悉度基线
    familiarity: mergeEncounterFamiliarity(row.familiarity ?? 0, contexts),
    nextReviewAt: toTimestamp(row.next_review_at || row.created_at),
    reviewCount: row.review_count ?? 0,
    easeFactor: row.ease_factor ?? 2.5,
    intervalDays: row.interval_days ?? 0,
    bookId: row.book_id,
    meta: {
      ...(row.meta || {}),
      createdAt: row.meta?.createdAt ?? timeAdded,
    },
  };
}

function normalizePartOfSpeech(value: string): string {
  const map: Record<string, string> = {
    a: 'adj.',
    'a.': 'adj.',
    adjective: 'adj.',
    adj: 'adj.',
    n: 'n.',
    'n.': 'n.',
    noun: 'n.',
    v: 'v.',
    'v.': 'v.',
    verb: 'v.',
    adv: 'adv.',
    'adv.': 'adv.',
    adverb: 'adv.',
    pron: 'pron.',
    'pron.': 'pron.',
    pronoun: 'pron.',
    prep: 'prep.',
    'prep.': 'prep.',
    preposition: 'prep.',
    conj: 'conj.',
    'conj.': 'conj.',
    conjunction: 'conj.',
    int: 'int.',
    'int.': 'int.',
    interjection: 'int.',
    art: 'art.',
    'art.': 'art.',
    article: 'art.',
    num: 'num.',
    'num.': 'num.',
    numeral: 'num.',
    det: 'det.',
    'det.': 'det.',
    determiner: 'det.',
    aux: 'aux.',
    'aux.': 'aux.',
    'auxiliary verb': 'aux.',
    modal: 'modal.',
    'modal.': 'modal.',
    'modal verb': 'modal.',
    phr: 'phr.',
    'phr.': 'phr.',
    phrase: 'phr.',
    abbr: 'abbr.',
    'abbr.': 'abbr.',
    abbreviation: 'abbr.',
  };
  const key = String(value || '').trim().toLowerCase();
  return map[key] || value;
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
    definition: word.definition || '',
    chinese_translation: word.chineseTranslation || translation,
    synonyms: word.synonyms || [],
    examples: word.examples || [],
    usage_history: word.usageHistory || [],
    memory_tip: word.memoryTip || '',
    deep_explanation: word.deepExplanation || null,
    sense_groups: word.senseGroups || null,
    level: word.level || 'B2',
    familiarity: word.familiarity ?? 0,
    next_review_at: new Date(word.nextReviewAt ?? timeAdded).toISOString(),
    review_count: word.reviewCount ?? 0,
    ease_factor: word.easeFactor ?? 2.5,
    interval_days: word.intervalDays ?? 0,
    book_id: word.bookId,
    meta: word.meta || {},
  };
}

function normalizeSourceLink(link: string | undefined): string {
  const raw = String(link || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    return url.toString();
  } catch {
    const hashIndex = raw.indexOf('#');
    return hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  }
}

function mergeContexts(existingContexts: WordContext[], nextContexts: WordContext[]) {
  const mergedContexts: WordContext[] = [...existingContexts];

  nextContexts.forEach((context) => {
    const contextNormalized = String(context.context || '').trim();
    const sourceLinkNormalized = normalizeSourceLink(context.sourceLink);
    const duplicated = mergedContexts.some(
      (item) =>
        String(item.context || '').trim() === contextNormalized &&
        normalizeSourceLink(item.sourceLink) === sourceLinkNormalized
    );
    if (!duplicated) {
      mergedContexts.push(context);
    }
  });

  return mergedContexts;
}

export function useVocabularyBooks() {
  const { user } = useSupabase();
  const [books, setBooks] = useState<VocabularyBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBooks = useCallback(async () => {
    logger.debug('loadBooks started');
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
      logger.info(`loadBooks success, count=${(bookRows || []).length}`);
    } catch (error) {
      logger.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const applySetSyncBook = useCallback(
    async (bookId: string) => {
      if (!user) return false;
      logger.debug('applySetSyncBook', { bookId });

      const fallbackSetSyncBook = async () => {
        const now = new Date().toISOString();

        const clearRes = await supabase
          .from('vocabulary_books')
          .update({ is_sync: false, updated_at: now })
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .eq('is_sync', true);

        if (clearRes.error) {
          throw clearRes.error;
        }

        const setRes = await supabase
          .from('vocabulary_books')
          .update({ is_sync: true, updated_at: now })
          .eq('id', bookId)
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .select('id')
          .maybeSingle();

        if (setRes.error) {
          throw setRes.error;
        }

        if (!setRes.data?.id) {
          throw new Error('set_sync_book_target_not_found');
        }
      };

      try {
        const { error } = await supabase.rpc('set_sync_book', {
          p_book_id: bookId,
        });

        if (error) {
          throw error;
        }

        return true;
      } catch (error) {
        logger.warn('applySetSyncBook RPC failed, trying fallback', { bookId, error: String(error) });
        try {
          await fallbackSetSyncBook();
          logger.info('applySetSyncBook fallback success', { bookId });
          return true;
        } catch (fallbackError) {
          if (!isMissingSetSyncBookRpc(error)) {
            logger.error('RPC set_sync_book failed, fallback also failed:', error, fallbackError);
            throw fallbackError;
          }

          throw fallbackError;
        }
      }
    },
    [user]
  );

  const createBook = useCallback(
    async (book: Omit<VocabularyBook, 'id' | 'userId' | 'wordCount' | 'createdAt' | 'updatedAt'>) => {
      if (!user) return null;
      logger.debug('createBook', { name: book.name, isSync: book.isSync });

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
        logger.info('createBook success', { id: mapped.id, name: mapped.name });
        return mapped;
      } catch (error) {
        logger.error('Error creating book:', error);
        return null;
      }
    },
    [user, loadBooks, applySetSyncBook]
  );

  const updateBook = useCallback(
    async (bookId: string, updates: { name?: string; description?: string; icon?: string }) => {
      if (!user) return null;
      logger.debug('updateBook', { bookId, fields: Object.keys(updates) });

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
        logger.info('updateBook success', { id: mapped.id });
        return mapped;
      } catch (error) {
        logger.error('Error updating book:', error);
        return null;
      }
    },
    [user]
  );

  const deleteBook = useCallback(
    async (bookId: string) => {
      if (!user) return false;
      logger.debug('deleteBook', { bookId });

      try {
        const now = new Date().toISOString();

        // 先更新 book，再更新 words，失败时回滚
        const { error: bookError } = await supabase
          .from('vocabulary_books')
          .update({ is_deleted: true, is_sync: false, updated_at: now })
          .eq('id', bookId)
          .eq('user_id', user.id);

        if (bookError) {
          logger.error('deleteBook failed at book update:', bookError);
          return false;
        }

        const { error: wordsError } = await supabase
          .from('words')
          .update({ is_deleted: true, updated_at: now })
          .eq('book_id', bookId)
          .eq('user_id', user.id);

        if (wordsError) {
          // 回滚：恢复 book 状态
          await supabase
            .from('vocabulary_books')
            .update({ is_deleted: false, updated_at: now })
            .eq('id', bookId)
            .eq('user_id', user.id);
          logger.error('deleteBook failed at words update, rolled back book:', wordsError);
          return false;
        }

        setBooks((prev) => {
          const remaining = prev.filter((book) => book.id !== bookId);
          return remaining;
        });
        logger.info('deleteBook success', { bookId });
        return true;
      } catch (error) {
        logger.error('Error deleting book:', error);
        return false;
      }
    },
    [user]
  );

  const setSyncBook = useCallback(
    async (bookId: string) => {
      if (!user) return false;
      logger.debug('setSyncBook', { bookId });

      try {
        await applySetSyncBook(bookId);
        await loadBooks();
        logger.info('setSyncBook success', { bookId });
        return true;
      } catch (error) {
        logger.error('Error setting sync book:', error);
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
    logger.debug('loadWords started', { bookId });
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
          WORD_SELECT_COLUMNS
        )
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      if (bookId) {
        query = query.eq('book_id', bookId);
      }

      const { data, error } = await query.order('time_added', { ascending: false });

      if (error) throw error;
      setWords(((data || []) as SupabaseWordRow[]).map(mapWordRow));
      logger.info(`loadWords success, count=${(data || []).length}`);
    } catch (error) {
      logger.error('Error loading words:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, bookId]);

  const addWord = useCallback(
    async (word: Omit<Word, 'id'>) => {
      if (!user) return null;
      logger.debug('addWord', { word: word.word, bookId: word.bookId });

      try {
        const payload = toWordPayload(word);

        const { data: existing, error: existingError } = await supabase
          .from('words')
          .select(
            WORD_SELECT_COLUMNS
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
          const mergedContexts = mergeContexts(existingContexts, nextContexts);
          // 被动遇见抬升熟悉度：取「已有熟悉度」与「遇见基线」的较大值，主动复习高分不被拉低
          const mergedFamiliarity = mergeEncounterFamiliarity(existingWord.familiarity, mergedContexts);

          const { data: updated, error: updateError } = await supabase
            .from('words')
            .update({
              ...payload,
              contexts: mergedContexts,
              familiarity: mergedFamiliarity,
              frequency: Math.max(mergedContexts.length, payload.frequency || 1),
              time_updated: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .eq('user_id', user.id)
            .select(
              WORD_SELECT_COLUMNS
            )
            .single();

          if (updateError) throw updateError;

          const mapped = mapWordRow(updated as SupabaseWordRow);
          setWords((prev) => {
            const filtered = prev.filter((item) => item.id !== mapped.id);
            return [mapped, ...filtered];
          });
          logger.info('addWord merged duplicate', { id: mapped.id, word: mapped.word });
          return mapped;
        }

        const { data, error } = await supabase
          .from('words')
          .insert({
            ...payload,
            // 首次添加即一次遇见，给出被动熟悉度基线
            familiarity: mergeEncounterFamiliarity(payload.familiarity, payload.contexts),
            user_id: user.id,
            sync_version: 1,
            is_deleted: false,
          })
          .select(
            WORD_SELECT_COLUMNS
          )
          .single();

        if (error) throw error;

        const mapped = mapWordRow(data as SupabaseWordRow);
        setWords((prev) => [mapped, ...prev]);
        logger.info('addWord created', { id: mapped.id, word: mapped.word });
        return mapped;
      } catch (error) {
        logger.error('Error adding word:', error);
        return null;
      }
    },
    [user]
  );

  const deleteWord = useCallback(
    async (wordId: string) => {
      if (!user) return false;
      logger.debug('deleteWord', { wordId });

      try {
        const { error } = await supabase
          .from('words')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('id', wordId)
          .eq('user_id', user.id);

        if (error) throw error;

        setWords((prev) => prev.filter((word) => word.id !== wordId));
        logger.info('deleteWord success', { wordId });
        return true;
      } catch (error) {
        logger.error('Error deleting word:', error);
        return false;
      }
    },
    [user]
  );

  const deleteWords = useCallback(
    async (wordIds: string[]) => {
      if (!user || wordIds.length === 0) return false;
      logger.debug('deleteWords', { count: wordIds.length });

      try {
        const { error } = await supabase
          .from('words')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('id', wordIds);

        if (error) throw error;

        setWords((prev) => prev.filter((word) => !wordIds.includes(word.id)));
        logger.info('deleteWords success', { count: wordIds.length });
        return true;
      } catch (error) {
        logger.error('Error deleting words:', error);
        return false;
      }
    },
    [user]
  );

  const moveWords = useCallback(
    async (wordIds: string[], targetBookId: string) => {
      if (!user || wordIds.length === 0) {
        return {
          success: false,
          movedCount: 0,
          duplicateCount: 0,
        } satisfies MoveWordsResult;
      }
      logger.debug('moveWords', { count: wordIds.length, targetBookId });

      // 提升到 try 块外部，供 catch 块访问
      const processedSourceIds: string[] = [];

      try {
        const { data: sourceRows, error: sourceError } = await supabase
          .from('words')
          .select(
            WORD_SELECT_COLUMNS
          )
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .in('id', wordIds);

        if (sourceError) throw sourceError;

        const movingRows = (sourceRows || []) as SupabaseWordRow[];
        if (movingRows.length === 0) {
          return {
            success: false,
            movedCount: 0,
            duplicateCount: 0,
          } satisfies MoveWordsResult;
        }

        const movingWords = movingRows.map(mapWordRow);
        const candidateWords = Array.from(new Set(movingRows.map((row) => row.word)));

        const { data: targetRows, error: targetError } = await supabase
          .from('words')
          .select(
            WORD_SELECT_COLUMNS
          )
          .eq('user_id', user.id)
          .eq('book_id', targetBookId)
          .eq('is_deleted', false)
          .in('word', candidateWords);

        if (targetError) throw targetError;

        const targetWordMap = new Map(
          ((targetRows || []) as SupabaseWordRow[]).map((row) => [row.word, row] as const)
        );

        const now = new Date().toISOString();
        let movedCount = 0;
        let duplicateCount = 0;
        // 记录已移动的单词，用于失败时回滚
        const movedWordMap = new Map<string, string>(); // sourceId -> existingTargetRowId (如果是合并操作)

        for (const sourceWord of movingWords) {
          const existingTargetRow = targetWordMap.get(sourceWord.word);

          if (!existingTargetRow) {
            const { error: moveError } = await supabase
              .from('words')
              .update({
                book_id: targetBookId,
                updated_at: now,
                time_updated: now,
              })
              .eq('id', sourceWord.id)
              .eq('user_id', user.id)
              .eq('is_deleted', false);

            if (moveError) throw moveError;

            movedCount += 1;
            processedSourceIds.push(sourceWord.id);
            movedWordMap.set(sourceWord.id, ''); // 空字符串表示纯移动，无需回滚
            continue;
          }

          duplicateCount += 1;

          const existingTargetWord = mapWordRow(existingTargetRow);
          const payload = toWordPayload({ ...sourceWord, bookId: targetBookId });
          const existingContexts = existingTargetWord.contexts || [];
          const nextContexts = payload.contexts || [];
          const mergedContexts = mergeContexts(existingContexts, nextContexts);

          const { error: updateExistingError } = await supabase
            .from('words')
            .update({
              ...payload,
              contexts: mergedContexts,
              frequency: Math.max(mergedContexts.length, payload.frequency || 1),
              time_updated: now,
              updated_at: now,
            })
            .eq('id', existingTargetRow.id)
            .eq('user_id', user.id)
            .eq('is_deleted', false);

          if (updateExistingError) throw updateExistingError;

          // 记录合并操作的目标单词 ID，用于回滚
          movedWordMap.set(sourceWord.id, existingTargetRow.id);
        }

        setWords((prev) => prev.filter((word) => !processedSourceIds.includes(word.id)));
        logger.info('moveWords success', { movedCount, duplicateCount });
        return {
          success: true,
          movedCount,
          duplicateCount,
        } satisfies MoveWordsResult;
      } catch (error) {
        logger.error('Error moving words, attempting rollback:', error);
        
        // 回滚已移动的单词
        if (processedSourceIds.length > 0) {
          try {
            const { data: sourceRows } = await supabase
              .from('words')
              .select('id, book_id')
              .eq('user_id', user.id)
              .in('id', processedSourceIds);
            
            if (sourceRows) {
              const rollbackUpdates = sourceRows.map(row => ({
                id: row.id,
                book_id: row.book_id, // 恢复原来的 book_id
              }));
              
              await supabase
                .from('words')
                .upsert(rollbackUpdates, {
                  onConflict: 'id,user_id',
                });
              logger.info('moveWords rollback completed', { rollbackCount: rollbackUpdates.length });
            }
          } catch (rollbackError) {
            logger.error('moveWords rollback failed:', rollbackError);
          }
        }
        
        return {
          success: false,
          movedCount: 0,
          duplicateCount: 0,
        } satisfies MoveWordsResult;
      }
    },
    [user]
  );

  const updateWord = useCallback(
    async (wordId: string, updates: Partial<Word>) => {
      if (!user) return null;
      logger.debug('updateWord', { wordId, fields: Object.keys(updates) });

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
        if (updates.memoryTip !== undefined) payload.memory_tip = updates.memoryTip;
        if (updates.deepExplanation !== undefined) payload.deep_explanation = updates.deepExplanation;
        if (updates.senseGroups !== undefined) payload.sense_groups = updates.senseGroups;
        if (updates.level !== undefined) payload.level = updates.level;
        if (updates.familiarity !== undefined) payload.familiarity = updates.familiarity;
        if (updates.nextReviewAt !== undefined) payload.next_review_at = new Date(updates.nextReviewAt).toISOString();
        if (updates.reviewCount !== undefined) payload.review_count = updates.reviewCount;
        if (updates.easeFactor !== undefined) payload.ease_factor = updates.easeFactor;
        if (updates.intervalDays !== undefined) payload.interval_days = updates.intervalDays;
        if (updates.bookId !== undefined) payload.book_id = updates.bookId;
        if (updates.meta !== undefined) payload.meta = updates.meta;

        const { data, error } = await supabase
          .from('words')
          .update(payload)
          .eq('id', wordId)
          .eq('user_id', user.id)
          .select(
            WORD_SELECT_COLUMNS
          )
          .single();

        if (error) throw error;

        const mapped = mapWordRow(data as SupabaseWordRow);
        setWords((prev) => prev.map((word) => (word.id === wordId ? mapped : word)));
        logger.info('updateWord success', { wordId });
        return mapped;
      } catch (error) {
        logger.error('Error updating word:', error);
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
