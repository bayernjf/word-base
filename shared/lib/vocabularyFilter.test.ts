import { describe, it, expect } from 'vitest';
import type { Word } from '../types';
import { filterWords, getAvailableLanguages } from './vocabularyFilter';

const BOOK_A = 'book-a';
const BOOK_B = 'book-b';

function makeWord(overrides: Partial<Word> & { word: string; bookId: string }): Word {
  return {
    id: overrides.word,
    ...overrides,
  } as Word;
}

const sampleWords: Word[] = [
  makeWord({ word: 'hello', bookId: BOOK_A, sourceLanguage: 'en', translation: '你好', definition: 'a greeting' }),
  makeWord({ word: 'world', bookId: BOOK_A, sourceLanguage: 'en', translation: '世界' }),
  makeWord({ word: 'ありがとう', bookId: BOOK_A, sourceLanguage: 'ja', translation: '谢谢' }),
  makeWord({ word: 'Schmetterling', bookId: BOOK_A, sourceLanguage: 'de', translation: '蝴蝶' }),
  makeWord({ word: 'bonjour', bookId: BOOK_B, sourceLanguage: 'fr', translation: '你好' }),
  // 缺失 sourceLanguage 的词本应被忽略（不计入可用语言）
  makeWord({ word: 'unknown', bookId: BOOK_A, translation: '未知' }),
];

describe('filterWords - 语言筛选', () => {
  it('不传语言筛选时返回该词本全部单词（含无 sourceLanguage 的）', () => {
    const result = filterWords(sampleWords, { selectedBookId: BOOK_A });
    expect(result.map((w) => w.word).sort()).toEqual(
      ['Schmetterling', 'hello', 'unknown', 'world', 'ありがとう'].sort(),
    );
  });

  it('按 sourceLanguage 精确筛选，只返回匹配语言的词', () => {
    const result = filterWords(sampleWords, { selectedBookId: BOOK_A, languageFilter: 'ja' });
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('ありがとう');
  });

  it('筛选到其他语言（de）同样隔离正确', () => {
    const result = filterWords(sampleWords, { selectedBookId: BOOK_A, languageFilter: 'de' });
    expect(result.map((w) => w.word)).toEqual(['Schmetterling']);
  });

  it('语言筛选与词本筛选协同：只在该词本内按语言过滤', () => {
    // BOOK_B 有 fr 词，BOOK_A 没有，确认不会串词本
    const result = filterWords(sampleWords, { selectedBookId: BOOK_B, languageFilter: 'fr' });
    expect(result.map((w) => w.word)).toEqual(['bonjour']);
  });

  it('不存在的语言筛选返回空列表', () => {
    const result = filterWords(sampleWords, { selectedBookId: BOOK_A, languageFilter: 'ko' });
    expect(result).toHaveLength(0);
  });

  it('无 sourceLanguage 的词不会被任何具体语言筛选命中', () => {
    const result = filterWords(sampleWords, { selectedBookId: BOOK_A, languageFilter: 'en' });
    expect(result.map((w) => w.word).sort()).toEqual(['hello', 'world']);
    expect(result.find((w) => w.word === 'unknown')).toBeUndefined();
  });
});

describe('filterWords - 语言 + 搜索组合', () => {
  it('在语言子集内再做关键字搜索', () => {
    const enWords = filterWords(sampleWords, {
      selectedBookId: BOOK_A,
      languageFilter: 'en',
      searchQuery: 'world',
    });
    expect(enWords.map((w) => w.word)).toEqual(['world']);
  });

  it('语言筛选后搜索无命中返回空', () => {
    const result = filterWords(sampleWords, {
      selectedBookId: BOOK_A,
      languageFilter: 'ja',
      searchQuery: 'hello',
    });
    expect(result).toHaveLength(0);
  });

  it('搜索可命中中文翻译，但仍受语言限制', () => {
    // '你好' 在 en 的 hello 和 fr 的 bonjour 都出现，但 fr 不在 BOOK_A
    const result = filterWords(sampleWords, {
      selectedBookId: BOOK_A,
      languageFilter: 'en',
      searchQuery: '你好',
    });
    expect(result.map((w) => w.word)).toEqual(['hello']);
  });
});

describe('getAvailableLanguages', () => {
  it('返回当前词本出现过的去重且排序的语言，不含空值', () => {
    const result = getAvailableLanguages(sampleWords, BOOK_A);
    expect(result).toEqual(['de', 'en', 'ja']);
  });

  it('只统计指定词本的语言', () => {
    expect(getAvailableLanguages(sampleWords, BOOK_B)).toEqual(['fr']);
  });

  it('词本无语言标注词时返回空数组', () => {
    const onlyUnknown: Word[] = [
      makeWord({ word: 'x', bookId: BOOK_A, translation: 'x' }),
    ];
    expect(getAvailableLanguages(onlyUnknown, BOOK_A)).toEqual([]);
  });

  it('语言列表已排序（de < en < ja）', () => {
    const unsorted: Word[] = [
      makeWord({ word: 'a', bookId: BOOK_A, sourceLanguage: 'ja' }),
      makeWord({ word: 'b', bookId: BOOK_A, sourceLanguage: 'en' }),
      makeWord({ word: 'c', bookId: BOOK_A, sourceLanguage: 'de' }),
    ];
    expect(getAvailableLanguages(unsorted, BOOK_A)).toEqual(['de', 'en', 'ja']);
  });
});
