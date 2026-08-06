import { describe, it, expect } from 'vitest';
import type { Word } from '../../shared/types';
import { filterWords, getAvailableLanguages } from '../../shared/lib/vocabularyFilter';
import {
  getLanguageLabel,
  getLanguageFlag,
  getLanguageDisplay,
  SUPPORTED_LANGUAGES,
} from '../../shared/lib/language';

/**
 * 集成测试：模拟 VocabularyListView 实际使用筛选功能的完整链路
 * —— 从数据库/store 形状的单词数据出发，经过 getAvailableLanguages 计算下拉
 * 选项，再经 filterWords 应用语言筛选，最后用 language 辅助函数渲染标志/标签。
 * 验证这三个模块组合后的端到端正确性（无需渲染 DOM）。
 */

const BOOK_EN = 'book-english';
const BOOK_MIXED = 'book-mixed';

// 模拟 store 返回的单词列表（含新增的 sourceLanguage 字段）
const storeWords: Word[] = [
  { id: 'w1', word: 'hello', bookId: BOOK_EN, sourceLanguage: 'en', translation: '你好' },
  { id: 'w2', word: 'world', bookId: BOOK_EN, sourceLanguage: 'en', translation: '世界' },
  { id: 'w3', word: 'serendipity', bookId: BOOK_EN, sourceLanguage: 'en', translation: '机缘巧合' },

  { id: 'w4', word: 'ありがとう', bookId: BOOK_MIXED, sourceLanguage: 'ja', translation: '谢谢' },
  { id: 'w5', word: 'こんにちは', bookId: BOOK_MIXED, sourceLanguage: 'ja', translation: '你好' },
  { id: 'w6', word: 'Schmetterling', bookId: BOOK_MIXED, sourceLanguage: 'de', translation: '蝴蝶' },
  { id: 'w7', word: 'bonjour', bookId: BOOK_MIXED, sourceLanguage: 'fr', translation: '你好' },
  // 无 sourceLanguage 的词：参与展示但不作为可选项
  { id: 'w8', word: 'mystery', bookId: BOOK_MIXED, translation: '谜' },
];

describe('筛选功能集成：语言下拉选项', () => {
  it('下拉选项来自 getAvailableLanguages，且能被 language 辅助函数渲染为可读标签', () => {
    const options = getAvailableLanguages(storeWords, BOOK_MIXED);
    expect(options).toEqual(['de', 'fr', 'ja']);

    // 每个选项都能映射到下拉里展示的 flag + label（组件渲染所用）
    const rendered = options.map((code) => ({
      code,
      label: getLanguageLabel(code),
      flag: getLanguageFlag(code),
      display: getLanguageDisplay(code),
    }));
    expect(rendered).toContainEqual({ code: 'ja', label: '日本語', flag: '🇯🇵', display: '🇯🇵 日本語' });
    expect(rendered).toContainEqual({ code: 'de', label: 'Deutsch', flag: '🇩🇪', display: '🇩🇪 Deutsch' });
    expect(rendered).toContainEqual({ code: 'fr', label: 'Français', flag: '🇫🇷', display: '🇫🇷 Français' });

    // 所有选项都应是受支持的语言
    for (const code of options) {
      expect(SUPPORTED_LANGUAGES).toContain(code);
    }
  });

  it('空 sourceLanguage 的词不会成为下拉选项，但仍在全部视图中显示', () => {
    const options = getAvailableLanguages(storeWords, BOOK_MIXED);
    expect(options).not.toContain(undefined);
    expect(options).toEqual(['de', 'fr', 'ja']);

    const all = filterWords(storeWords, { selectedBookId: BOOK_MIXED });
    expect(all.map((w) => w.word)).toContain('mystery');
  });
});

describe('筛选功能集成：选择语言后的结果集', () => {
  it('选择 ja → 仅返回该词本内日语词，与外部分页/渲染遍历一致', () => {
    const jaWords = filterWords(storeWords, { selectedBookId: BOOK_MIXED, languageFilter: 'ja' });
    expect(jaWords.map((w) => w.id).sort()).toEqual(['w4', 'w5']);

    // 渲染时每行展示的语言标志应正确
    for (const w of jaWords) {
      expect(getLanguageFlag(w.sourceLanguage!)).toBe('🇯🇵');
    }
  });

  it('选择 de / fr 分别隔离正确，互不串扰', () => {
    expect(filterWords(storeWords, { selectedBookId: BOOK_MIXED, languageFilter: 'de' }).map((w) => w.id)).toEqual(['w6']);
    expect(filterWords(storeWords, { selectedBookId: BOOK_MIXED, languageFilter: 'fr' }).map((w) => w.id)).toEqual(['w7']);
  });

  it('清空语言筛选（空字符串）回到该词本全部单词', () => {
    const all = filterWords(storeWords, { selectedBookId: BOOK_MIXED, languageFilter: '' });
    expect(all.map((w) => w.id).sort()).toEqual(['w4', 'w5', 'w6', 'w7', 'w8']);
  });
});

describe('筛选功能集成：语言筛选与搜索组合', () => {
  it('在日语子集内搜索中文翻译“你好”只命中日语词', () => {
    const result = filterWords(storeWords, {
      selectedBookId: BOOK_MIXED,
      languageFilter: 'ja',
      searchQuery: '你好',
    });
    expect(result.map((w) => w.id).sort()).toEqual(['w5']);
  });

  it('切换语言筛选后同一搜索词命中集合随之变化（en 词本也有“你好”）', () => {
    const jaHits = filterWords(storeWords, {
      selectedBookId: BOOK_MIXED,
      languageFilter: 'ja',
      searchQuery: '你好',
    }).map((w) => w.word);

    const enBookHits = filterWords(storeWords, {
      selectedBookId: BOOK_EN,
      languageFilter: 'en',
      searchQuery: '你好',
    }).map((w) => w.word);

    expect(jaHits).toEqual(['こんにちは']);
    expect(enBookHits).toEqual(['hello']); // “hello” 翻译为“你好”
  });

  it('语言筛选与搜索无交集时返回空，下拉选项不受影响', () => {
    const result = filterWords(storeWords, {
      selectedBookId: BOOK_MIXED,
      languageFilter: 'de',
      searchQuery: '谢谢',
    });
    expect(result).toHaveLength(0);
    // 下拉选项仍是完整的三语言，不应因搜索而缩水
    expect(getAvailableLanguages(storeWords, BOOK_MIXED)).toEqual(['de', 'fr', 'ja']);
  });
});

describe('筛选功能集成：跨词本隔离', () => {
  it('不同词本各自拥有独立的可用语言与结果集', () => {
    const enOptions = getAvailableLanguages(storeWords, BOOK_EN);
    const mixedOptions = getAvailableLanguages(storeWords, BOOK_MIXED);
    expect(enOptions).toEqual(['en']);
    expect(mixedOptions).toEqual(['de', 'fr', 'ja']);

    expect(filterWords(storeWords, { selectedBookId: BOOK_EN }).map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);
    expect(filterWords(storeWords, { selectedBookId: BOOK_MIXED, languageFilter: 'en' })).toHaveLength(0);
  });
});
