import { describe, it, expect } from 'vitest';
import { createWordBodySchema, batchWordsBodySchema } from '../../packages/api/src/utils/validation';

// 验证 words API 的校验层正确接收并透传 source_language（多语言拾取链路的后端入口）。
// 拾取的单词由扩展端 detectWordLanguage 标注 sourceLang，经 source_language 字段入库，
// word-base 据此做语言筛选 / 导出 / AI 规则。这里确认校验层不会丢弃或错置该字段。

describe('source_language round-trip in words API', () => {
  it('createWord accepts and preserves source_language', () => {
    const parsed = createWordBodySchema.safeParse({
      word: 'Schön',
      book_id: 'b1',
      source_language: 'de',
      translation: '漂亮',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.source_language).toBe('de');
  });

  it('createWord accepts every supported language code', () => {
    for (const lang of ['en', 'fr', 'es', 'de', 'ko', 'ja']) {
      const parsed = createWordBodySchema.safeParse({
        word: `word-${lang}`,
        book_id: 'b1',
        source_language: lang,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.source_language).toBe(lang);
    }
  });

  it('createWord defaults source_language to en when omitted', () => {
    const parsed = createWordBodySchema.safeParse({ word: 'hello', book_id: 'b1' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.source_language).toBe('en');
  });

  it('batchWords preserves source_language per word (passthrough)', () => {
    const parsed = batchWordsBodySchema.safeParse({
      words: [
        { word: 'こんにちは', book_id: 'b1', source_language: 'ja' },
        { word: '안녕하세요', book_id: 'b1', source_language: 'ko' },
        { word: 'Schön', book_id: 'b1', source_language: 'de' },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.words[0].source_language).toBe('ja');
      expect(parsed.data.words[1].source_language).toBe('ko');
      expect(parsed.data.words[2].source_language).toBe('de');
    }
  });
});
