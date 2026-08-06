import { describe, it, expect, vi, afterEach } from 'vitest';
import { requestGetSettings, requestSaveSettings } from './settings';

const okJson = (payload: unknown) =>
  ({ ok: true, json: async () => payload }) as unknown as Response;
const errJson = (payload: unknown) =>
  ({ ok: false, json: async () => payload }) as unknown as Response;

describe('requestGetSettings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET 请求携带 Authorization 头并返回 settings', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({ settings: { theme: 'dark', lang: 'zh' }, updatedAt: '2026-07-30T00:00:00Z' })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestGetSettings('token-123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/settings');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer token-123');
    expect(result.settings).toEqual({ theme: 'dark', lang: 'zh' });
    expect(result.updatedAt).toBe('2026-07-30T00:00:00Z');
  });

  it('未设置过时返回 settings: null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ settings: null })));

    const result = await requestGetSettings('t');
    expect(result.settings).toBeNull();
  });

  it('非 2xx 响应时抛出后端错误码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errJson({ error: 'internal_server_error' })));
    await expect(requestGetSettings('t')).rejects.toThrow('internal_server_error');
  });

  it('响应体不是 JSON 时抛出兜底错误码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('bad json'); },
    } as unknown as Response));
    await expect(requestGetSettings('t')).rejects.toThrow('settings_fetch_failed');
  });
});

describe('requestSaveSettings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('PUT 请求携带 Authorization 头 + JSON body 并返回保存结果', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({ settings: { theme: 'light' }, updatedAt: '2026-07-30T00:00:00Z' })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestSaveSettings({ theme: 'light' }, 'token-456');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/settings');
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toBe('Bearer token-456');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ settings: { theme: 'light' } });
    expect(result.settings).toEqual({ theme: 'light' });
    expect(result.updatedAt).toBe('2026-07-30T00:00:00Z');
  });

  it('非 2xx 响应时抛出后端错误码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errJson({ error: 'settings_required' })));
    await expect(requestSaveSettings({}, 't')).rejects.toThrow('settings_required');
  });

  it('响应体不是 JSON 时抛出兜底错误码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('bad json'); },
    } as unknown as Response));
    await expect(requestSaveSettings({ a: 1 }, 't')).rejects.toThrow('settings_save_failed');
  });
});
