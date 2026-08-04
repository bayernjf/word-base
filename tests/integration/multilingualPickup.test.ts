import { describe, it, expect } from 'vitest';
// 直接复用 word-picker 真实的载荷构造逻辑（已抽到纯模块，无浏览器依赖）
import { mapLocalWordToServer, type SyncWordInput } from '../../../word-picker/lib/syncPayload';
// 直接复用 word-base 真实的请求校验 schema
import {
  batchWordsBodySchema,
  createWordBodySchema,
} from '../../packages/api/src/utils/validation';

/**
 * 跨仓库集成测试：word-picker 采集到的多语言单词，经 mapLocalWordToServer 构造的
 * 载荷，能否被 word-base 后端真实的校验 schema 接受，且 source_language 不丢失。
 * 这验证了「采集端 → 后端」契约在两端真实代码下成立（无需启动数据库）。
 */

function pickedWord(sourceLang: string, word = 'ありがとう', translation = '谢谢'): SyncWordInput {
  return {
    word,
    frequency: 1,
    translation,
    timeAdded: Date.now(),
    timeUpdated: Date.now(),
    contexts: [{ context: '感謝の気持ちを表す言葉。', timeAdded: Date.now(), sourceLink: 'https://example.com#:~:text=ありがとう', translation: '' }],
    bookId: 'book-123',
    sourceLang,
    _legacy: {
      sourceUrl: 'https://example.com',
      sourceTitle: 'Example',
      createdAt: Date.now(),
    },
  };
}

describe('跨仓库契约：多语言采集 → word-base 批量接口', () => {
  it('日语单词经 picker 构造后，批量 schema 保留 source_language=ja', () => {
    const payload = mapLocalWordToServer(pickedWord('ja'));
    expect(payload.source_language).toBe('ja');

    const parsed = batchWordsBodySchema.safeParse({ words: [payload] });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.words[0].source_language).toBe('ja');
      expect(parsed.data.words[0].word).toBe('ありがとう');
      expect(parsed.data.words[0].book_id).toBe('book-123');
    }
  });

  it('德语/法语等多语言在单个批量请求中均被正确保留', () => {
    const batch = {
      words: [
        mapLocalWordToServer(pickedWord('de', 'Schmetterling', '蝴蝶')),
        mapLocalWordToServer(pickedWord('fr', 'bonjour', '你好')),
        mapLocalWordToServer(pickedWord('en', 'hello', '你好')),
      ],
    };
    const parsed = batchWordsBodySchema.safeParse(batch);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.words.map((w) => w.source_language)).toEqual(['de', 'fr', 'en']);
    }
  });

  it('picker 未带 sourceLang 时回落为 en，批量 schema 仍接受', () => {
    const payload = mapLocalWordToServer(pickedWord('ja').sourceLang === 'ja' ? { ...pickedWord('ja'), sourceLang: undefined } : pickedWord('ja'));
    expect(payload.source_language).toBe('en');

    const parsed = batchWordsBodySchema.safeParse({ words: [payload] });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.words[0].source_language).toBe('en');
    }
  });

  it('批量 schema 对过长的 source_language 拒绝（与单字接口一致）', () => {
    const bad = mapLocalWordToServer(pickedWord('ja'));
    const parsed = batchWordsBodySchema.safeParse({
      words: [{ ...bad, source_language: 'zzzzzzzzzzzzzzzzzz' }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('跨仓库契约：多语言采集 → word-base 单字接口', () => {
  it('单字接口接受带 source_language 的日语单词', () => {
    const payload = mapLocalWordToServer(pickedWord('ja'));
    const parsed = createWordBodySchema.safeParse({
      word: payload.word,
      book_id: payload.book_id!,
      source_language: payload.source_language,
      translation: payload.translation,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.source_language).toBe('ja');
    }
  });

  it('单字接口缺省 source_language 时回落 en', () => {
    const payload = mapLocalWordToServer(pickedWord('ja'));
    const parsed = createWordBodySchema.safeParse({
      word: payload.word,
      book_id: payload.book_id!,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.source_language).toBe('en');
    }
  });
});
