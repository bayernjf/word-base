import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  requestAiEnrichment,
  requestDeepExplanation,
  requestSenseClusters,
} from '../../shared/lib/aiEnrich';
import {
  aiEnrichBodySchema,
  aiExplainBodySchema,
  aiSenseClusterBodySchema,
} from '../../packages/api/src/utils/validation';

/**
 * 客户端 → 服务端契约测试：AI 词汇端点的请求体必须携带蛇形 source_language，
 * 才能命中后端的语言感知 prompt 规则。此前客户端只发驼峰 sourceLanguage，
 * 被 Zod 剥离后静默回落为 'en'，导致非英语单词的 AI 释义按英语规则生成。
 */

const enrichResponse = {
  enrichment: {
    definition: 'a Japanese thanks',
    translation: '谢谢',
    synonyms: [],
    examples: [],
    usageHistory: [],
  },
};

const explainResponse = {
  deepExplanation: {
    contextInsights: [],
    synonymComparison: '',
    memoryHook: '',
  },
};

const senseClusterResponse = {
  senseGroups: { groups: [] },
};

function captureRequestBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse(init.body);
}

describe('AI 端点请求体的 source_language 契约', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enrich：sourceLanguage 映射为 source_language 并通过服务端 schema', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => enrichResponse });
    await requestAiEnrichment(
      { word: 'ありがとう', translation: '谢谢', sourceLanguage: 'ja' },
      'token'
    );

    const body = captureRequestBody(fetchMock);
    expect(body.sourceLanguage).toBeUndefined();

    const parsed = aiEnrichBodySchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.source_language).toBe('ja');
  });

  it('enrich：未提供 sourceLanguage 时回落为 en', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => enrichResponse });
    await requestAiEnrichment({ word: 'hello' }, 'token');

    const parsed = aiEnrichBodySchema.safeParse(captureRequestBody(fetchMock));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.source_language).toBe('en');
  });

  it('explain：德语单词的 source_language 不被服务端 schema 丢弃', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => explainResponse });
    await requestDeepExplanation(
      { word: 'Schmetterling', sourceLanguage: 'de', contexts: [{ context: 'Ein Schmetterling fliegt.', translation: '', timeAdded: 1 }] },
      'token'
    );

    const parsed = aiExplainBodySchema.safeParse(captureRequestBody(fetchMock));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.source_language).toBe('de');
      expect(parsed.data.contexts).toHaveLength(1);
    }
  });

  it('sense-cluster：韩语单词的 source_language 通过服务端 schema', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => senseClusterResponse });
    await requestSenseClusters(
      { word: '안녕하세요', sourceLanguage: 'ko' },
      'token'
    );

    const parsed = aiSenseClusterBodySchema.safeParse(captureRequestBody(fetchMock));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.source_language).toBe('ko');
  });
});
