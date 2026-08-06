import type { Word } from '../types';

export interface FilterWordsOptions {
  selectedBookId: string;
  languageFilter?: string;
  searchQuery?: string;
}

/**
 * Filter words belonging to the selected book by optional source language and
 * free-text search. Pure function so it can be unit-tested without rendering.
 */
export function filterWords(
  words: Word[],
  { selectedBookId, languageFilter = '', searchQuery = '' }: FilterWordsOptions,
): Word[] {
  const searchLower = searchQuery.toLowerCase();
  return words.filter((w) => {
    // 按词本过滤
    if (w.bookId !== selectedBookId) return false;
    // 按语言过滤
    if (languageFilter && w.sourceLanguage !== languageFilter) return false;
    // 搜索过滤：搜索为空时显示全部；搜索时只要任一匹配字段命中即通过
    if (!searchQuery) return true;
    const matchesWord = w.word.toLowerCase().includes(searchLower);
    const matchesTranslation = !!w.translation && w.translation.toLowerCase().includes(searchLower);
    const matchesDefinition = !!w.definition && w.definition.toLowerCase().includes(searchLower);
    const matchesChineseTranslation = !!w.chineseTranslation && w.chineseTranslation.includes(searchQuery);
    return matchesWord || matchesTranslation || matchesDefinition || matchesChineseTranslation;
  });
}

/**
 * Distinct source languages present in the selected book, sorted ascending.
 */
export function getAvailableLanguages(words: Word[], selectedBookId: string): string[] {
  const langs = new Set<string>();
  for (const w of words) {
    if (w.bookId === selectedBookId && w.sourceLanguage) {
      langs.add(w.sourceLanguage);
    }
  }
  return Array.from(langs).sort();
}
