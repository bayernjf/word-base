import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// apiBase 在模块加载时探测平台，因此每个用例都通过 resetModules + 动态 import 重新加载
const loadApiBase = () => import('./apiBase');

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete (globalThis as any).__APP_ENV__;
});

describe('apiBase 平台探测与 base URL 解析', () => {
  it('Node/web 环境下 base 为空串，apiUrl 返回相对路径', async () => {
    const { getApiBaseUrl, apiUrl, API_PLATFORM } = await loadApiBase();
    expect(API_PLATFORM).toBe('web');
    expect(getApiBaseUrl()).toBe('');
    expect(apiUrl('/api/v1/health')).toBe('/api/v1/health');
  });

  it('apiUrl 自动补全缺失的前导斜杠', async () => {
    const { apiUrl } = await loadApiBase();
    expect(apiUrl('api/v1/health')).toBe('/api/v1/health');
  });

  it('web 平台即使配置了 API base 也返回空串（走同源反代）', async () => {
    (globalThis as any).__APP_ENV__ = { NEXT_PUBLIC_API_BASE_URL: 'https://example.com' };
    const { getApiBaseUrl } = await loadApiBase();
    expect(getApiBaseUrl()).toBe('');
  });

  it('desktop（Tauri）平台读取 DESKTOP base 并去掉尾部斜杠', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    (globalThis as any).__APP_ENV__ = {
      NEXT_PUBLIC_DESKTOP_API_BASE_URL: 'http://localhost:3001/',
    };
    const { getApiBaseUrl, apiUrl, API_PLATFORM } = await loadApiBase();
    expect(API_PLATFORM).toBe('desktop');
    expect(getApiBaseUrl()).toBe('http://localhost:3001');
    expect(apiUrl('/api/v1/health')).toBe('http://localhost:3001/api/v1/health');
  });

  it('通用 NEXT_PUBLIC_API_BASE_URL 优先于平台专属变量', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    (globalThis as any).__APP_ENV__ = {
      NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com',
      NEXT_PUBLIC_DESKTOP_API_BASE_URL: 'http://localhost:3001',
    };
    const { getApiBaseUrl } = await loadApiBase();
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('desktop 平台支持 VITE_ 前缀变量互跨 fallback', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    vi.stubEnv('VITE_DESKTOP_API_BASE_URL', 'http://localhost:3001');
    const { getApiBaseUrl } = await loadApiBase();
    expect(getApiBaseUrl()).toBe('http://localhost:3001');
  });

  it('android（RN）平台在 ANDROID base 未配置时回退到 MOBILE base', async () => {
    vi.stubGlobal('window', { ReactNative: {}, Platform: { OS: 'android' } });
    (globalThis as any).__APP_ENV__ = {
      // 显式置空，隔离宿主环境里真实的 ANDROID 配置
      NEXT_PUBLIC_ANDROID_API_BASE_URL: '',
      NEXT_PUBLIC_MOBILE_API_BASE_URL: 'https://mobile.example.com',
    };
    const { getApiBaseUrl, API_PLATFORM } = await loadApiBase();
    expect(API_PLATFORM).toBe('android');
    expect(getApiBaseUrl()).toBe('https://mobile.example.com');
  });

  it('ios（webkit bridge）平台优先读取 IOS base', async () => {
    vi.stubGlobal('window', { webkit: { messageHandlers: { bridge: {} } } });
    (globalThis as any).__APP_ENV__ = {
      NEXT_PUBLIC_IOS_API_BASE_URL: 'https://ios.example.com',
      NEXT_PUBLIC_MOBILE_API_BASE_URL: 'https://mobile.example.com',
    };
    const { getApiBaseUrl, API_PLATFORM } = await loadApiBase();
    expect(API_PLATFORM).toBe('ios');
    expect(getApiBaseUrl()).toBe('https://ios.example.com');
  });

  it('__APP_ENV__ 注入优先于 process.env', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    vi.stubEnv('NEXT_PUBLIC_DESKTOP_API_BASE_URL', 'http://from-process-env');
    (globalThis as any).__APP_ENV__ = {
      NEXT_PUBLIC_DESKTOP_API_BASE_URL: 'http://from-app-env',
    };
    const { getApiBaseUrl } = await loadApiBase();
    expect(getApiBaseUrl()).toBe('http://from-app-env');
  });
});
