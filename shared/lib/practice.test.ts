import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  requestPracticeGenerate,
  requestPracticeEvaluate,
  fetchPracticeContent,
  clearPracticeCache,
} from './practice';
import type { PracticeGenerateRequest } from './practice';

const okJson = (payload: unknown) =>
  ({ ok: true, json: async () => payload }) as unknown as Response;
const errJson = (payload: unknown) =>
  ({ ok: false, json: async () => payload }) as unknown as Response;

const baseInput: PracticeGenerateRequest = {
  type: 'reading',
  words: ['apple', 'banana'],
  difficulty: 'B2',
};

describe('requestPracticeGenerate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POST 请求携带 Authorization 头并返回解析后的响应', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ reading: { article: {} }, remaining: 19 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestPracticeGenerate(baseInput, 'token-123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/ai/practice/generate');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer token-123');
    expect(JSON.parse(init.body)).toEqual(baseInput);
    expect(result.remaining).toBe(19);
  });

  it('非 2xx 响应时抛出后端错误码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errJson({ error: 'daily_quota_exceeded' })));
    await expect(requestPracticeGenerate(baseInput, 't')).rejects.toThrow('daily_quota_exceeded');
  });

  it('响应体不是 JSON 时抛出兜底错误码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('bad json'); },
    } as unknown as Response));
    await expect(requestPracticeGenerate(baseInput, 't')).rejects.toThrow('practice_generate_failed');
  });
});

describe('requestPracticeEvaluate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('失败时抛出兜底错误码 practice_evaluate_failed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errJson({})));
    await expect(
      requestPracticeEvaluate({ type: 'writing', userText: 'hello' }, 't')
    ).rejects.toThrow('practice_evaluate_failed');
  });
});

describe('fetchPracticeContent 缓存', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearPracticeCache();
    vi.useFakeTimers();
    fetchMock = vi.fn().mockResolvedValue(okJson({ reading: { article: { title: 'T' } } }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearPracticeCache();
  });

  it('相同参数 5 分钟内命中缓存，只发一次请求', async () => {
    await fetchPracticeContent(baseInput, 't');
    await fetchPracticeContent(baseInput, 't');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('缓存键与 words 顺序无关', async () => {
    await fetchPracticeContent({ ...baseInput, words: ['banana', 'apple'] }, 't');
    await fetchPracticeContent({ ...baseInput, words: ['apple', 'banana'] }, 't');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('difficulty 不同时不共用缓存', async () => {
    await fetchPracticeContent({ ...baseInput, difficulty: 'B2' }, 't');
    await fetchPracticeContent({ ...baseInput, difficulty: 'C1' }, 't');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('difficulty 缺省时按 B2 归一（与显式 B2 共用缓存）', async () => {
    await fetchPracticeContent({ type: 'reading', words: ['apple', 'banana'] }, 't');
    await fetchPracticeContent(baseInput, 't');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('超过 5 分钟 TTL 后重新请求', async () => {
    await fetchPracticeContent(baseInput, 't');
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await fetchPracticeContent(baseInput, 't');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clearPracticeCache 后强制重新请求', async () => {
    await fetchPracticeContent(baseInput, 't');
    clearPracticeCache();
    await fetchPracticeContent(baseInput, 't');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('请求失败不会写入缓存，下次仍会重试', async () => {
    fetchMock.mockResolvedValueOnce(errJson({ error: 'internal_server_error' }));
    await expect(fetchPracticeContent(baseInput, 't')).rejects.toThrow('internal_server_error');
    await fetchPracticeContent(baseInput, 't');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
