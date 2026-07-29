import { describe, it, expect } from 'vitest';
import {
  parseBody,
  loginBodySchema,
  aiEnrichBodySchema,
  aiTranslateBodySchema,
  practiceGenerateBodySchema,
  practiceEvaluateBodySchema,
  createBookBodySchema,
  updateBookBodySchema,
  createWordBodySchema,
  batchWordsBodySchema,
  batchDeleteBodySchema,
  aiProviderBodySchema,
  aiProviderPatchBodySchema,
} from '../../packages/api/src/utils/validation';

// 构造 parseBody 需要的最小 Hono context
const fakeCtx = (payload: unknown, throws = false) => ({
  req: {
    json: async () => {
      if (throws) throw new Error('invalid json');
      return payload;
    },
  },
});

describe('parseBody 统一解析入口', () => {
  it('合法请求体返回 ok=true 和解析后的数据', async () => {
    const result = await parseBody(fakeCtx({ email: '  User@Example.COM ', password: 'pw' }), loginBodySchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe('user@example.com'); // trim + lowercase
    }
  });

  it('请求体不是 JSON 时返回 fallback 错误码', async () => {
    const result = await parseBody(fakeCtx(null, true), loginBodySchema, { fallback: 'email_and_password_required' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('email_and_password_required');
    }
  });

  it('fieldErrors 按首个出错字段映射旧错误码', async () => {
    const result = await parseBody(
      fakeCtx({ type: 'grammar', words: ['apple'] }),
      practiceGenerateBodySchema,
      { fieldErrors: { type: 'invalid_practice_type', words: 'words_required' } }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('invalid_practice_type');
      expect(result.details.length).toBeGreaterThan(0);
    }
  });
});

describe('practiceGenerateBodySchema', () => {
  it('words 过滤空白项并截断到 10 个', async () => {
    const words = ['  apple  ', '', '   ', ...Array.from({ length: 15 }, (_, i) => `w${i}`)];
    const parsed = practiceGenerateBodySchema.parse({ type: 'reading', words });
    expect(parsed.words[0]).toBe('apple');
    expect(parsed.words).toHaveLength(10);
    expect(parsed.difficulty).toBe('B2'); // 缺省默认
  });

  it('全部为空白词时校验失败且落在 words 字段', () => {
    const result = practiceGenerateBodySchema.safeParse({ type: 'reading', words: ['', '  '] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('words');
    }
  });

  it('拒绝超长单词（防止滥用 AI 配额）', () => {
    const result = practiceGenerateBodySchema.safeParse({ type: 'reading', words: ['x'.repeat(101)] });
    expect(result.success).toBe(false);
  });
});

describe('practiceEvaluateBodySchema', () => {
  it('writing 缺少 userText 时错误落在 userText 字段', () => {
    const result = practiceEvaluateBodySchema.safeParse({ type: 'writing' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('userText');
    }
  });

  it('speaking 缺少 transcription 时错误落在 transcription 字段', () => {
    const result = practiceEvaluateBodySchema.safeParse({ type: 'speaking' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('transcription');
    }
  });

  it('非法 type 时错误落在 type 字段（映射 invalid_evaluate_type）', () => {
    const result = practiceEvaluateBodySchema.safeParse({ type: 'reading', userText: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('type');
    }
  });

  it('writing 合法载荷解析成功且 prompt 默认空串', () => {
    const parsed = practiceEvaluateBodySchema.parse({ type: 'writing', userText: 'My essay.' });
    expect(parsed.type).toBe('writing');
    if (parsed.type === 'writing') {
      expect(parsed.prompt).toBe('');
    }
  });
});

describe('AI 端点 schema', () => {
  it('enrich 的 contexts 缺省为 []，word 必填', () => {
    const parsed = aiEnrichBodySchema.parse({ word: ' serendipity ' });
    expect(parsed.word).toBe('serendipity');
    expect(parsed.contexts).toEqual([]);
    expect(aiEnrichBodySchema.safeParse({}).success).toBe(false);
  });

  it('enrich 的 contexts 允许多余字段（宽松对象）', () => {
    const parsed = aiEnrichBodySchema.parse({
      word: 'apple',
      contexts: [{ context: 'I ate an apple.', sourceLink: 'https://x.com' }],
    });
    expect(parsed.contexts).toHaveLength(1);
  });

  it('translate 拒绝超过 5000 字符的文本，targetLanguage 默认 zh', () => {
    expect(aiTranslateBodySchema.safeParse({ text: 'x'.repeat(5001) }).success).toBe(false);
    const parsed = aiTranslateBodySchema.parse({ text: 'hello' });
    expect(parsed.targetLanguage).toBe('zh');
  });
});

describe('Books schema', () => {
  it('createBook 合法载荷解析成功，默认值正确', () => {
    const parsed = createBookBodySchema.parse({ name: ' My Book ' });
    expect(parsed.name).toBe('My Book');
    expect(parsed.description).toBe('');
    expect(parsed.icon).toBe('BookOpen');
    expect(parsed.is_sync).toBe(false);
    expect(parsed.word_count).toBe(0);
  });

  it('createBook 拒绝空 name', () => {
    expect(createBookBodySchema.safeParse({ name: '' }).success).toBe(false);
    expect(createBookBodySchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('createBook 拒绝超长 name', () => {
    expect(createBookBodySchema.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
  });

  it('updateBook 允许部分更新', () => {
    const parsed = updateBookBodySchema.parse({ name: 'Renamed' });
    expect(parsed.name).toBe('Renamed');
    expect(parsed.description).toBeUndefined();
  });

  it('updateBook 空对象合法（全部 optional）', () => {
    const parsed = updateBookBodySchema.parse({});
    expect(parsed).toEqual({});
  });
});

describe('Words schema', () => {
  it('createWord 合法载荷解析成功', () => {
    const parsed = createWordBodySchema.parse({ word: ' apple ', book_id: 'abc-123' });
    expect(parsed.word).toBe('apple');
    expect(parsed.book_id).toBe('abc-123');
    expect(parsed.frequency).toBe(1);
    expect(parsed.translation).toBe('');
    expect(parsed.part_of_speech).toBe('noun');
    expect(parsed.level).toBe('B2');
  });

  it('createWord 拒绝空 word', () => {
    expect(createWordBodySchema.safeParse({ word: '', book_id: 'abc' }).success).toBe(false);
  });

  it('createWord 拒绝超长 word', () => {
    expect(createWordBodySchema.safeParse({ word: 'x'.repeat(101), book_id: 'abc' }).success).toBe(false);
  });

  it('createWord 拒绝缺少 book_id', () => {
    expect(createWordBodySchema.safeParse({ word: 'apple' }).success).toBe(false);
  });

  it('batchWords 至少需要一个单词', () => {
    expect(batchWordsBodySchema.safeParse({ words: [] }).success).toBe(false);
  });

  it('batchWords 拒绝超过 200 个单词', () => {
    const words = Array.from({ length: 201 }, (_, i) => ({ word: `w${i}`, book_id: 'b' }));
    expect(batchWordsBodySchema.safeParse({ words }).success).toBe(false);
  });

  it('batchWords 合法载荷解析成功', () => {
    const parsed = batchWordsBodySchema.parse({ words: [{ word: 'apple', book_id: 'b1' }] });
    expect(parsed.words).toHaveLength(1);
  });

  it('batchDelete 至少需要一个 ID', () => {
    expect(batchDeleteBodySchema.safeParse({ wordIds: [] }).success).toBe(false);
  });

  it('batchDelete 拒绝超过 200 个 ID', () => {
    const wordIds = Array.from({ length: 201 }, (_, i) => `id-${i}`);
    expect(batchDeleteBodySchema.safeParse({ wordIds }).success).toBe(false);
  });

  it('batchDelete 合法载荷解析成功', () => {
    const parsed = batchDeleteBodySchema.parse({ wordIds: ['id-1', 'id-2'] });
    expect(parsed.wordIds).toHaveLength(2);
  });
});

describe('AI Provider schema', () => {
  it('create 合法载荷解析成功', () => {
    const parsed = aiProviderBodySchema.parse({
      provider: 'openai',
      apiKey: 'sk-test',
      name: 'My GPT',
    });
    expect(parsed.provider).toBe('openai');
    expect(parsed.apiKey).toBe('sk-test');
    expect(parsed.isActive).toBe(false);
  });

  it('create 拒绝非法 provider', () => {
    expect(aiProviderBodySchema.safeParse({ provider: 'invalid', apiKey: 'sk' }).success).toBe(false);
  });

  it('create 拒绝空 apiKey', () => {
    expect(aiProviderBodySchema.safeParse({ provider: 'openai', apiKey: '' }).success).toBe(false);
  });

  it('create 拒绝超长 apiKey', () => {
    expect(aiProviderBodySchema.safeParse({ provider: 'openai', apiKey: 'x'.repeat(2049) }).success).toBe(false);
  });

  it('create 拒绝超长 endpoint', () => {
    expect(aiProviderBodySchema.safeParse({
      provider: 'openai-compatible',
      apiKey: 'sk',
      endpoint: 'http://x'.padEnd(501, 'a'),
    }).success).toBe(false);
  });

  it('patch 全部字段 optional', () => {
    const parsed = aiProviderPatchBodySchema.parse({});
    expect(parsed).toEqual({});
  });

  it('patch 拒绝非法 provider', () => {
    expect(aiProviderPatchBodySchema.safeParse({ provider: 'bad' }).success).toBe(false);
  });
});
