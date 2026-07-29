import { describe, it, expect } from 'vitest';
import {
  parseBody,
  loginBodySchema,
  aiEnrichBodySchema,
  aiTranslateBodySchema,
  practiceGenerateBodySchema,
  practiceEvaluateBodySchema,
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
