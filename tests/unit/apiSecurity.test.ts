import { describe, it, expect } from 'vitest';
import { parseAllowedOrigins, isOriginAllowed } from '../../packages/api/src/utils/cors';
import {
  FixedWindowCounter,
  AI_USER_MAX_PER_WINDOW,
  AI_USER_WINDOW_MS,
} from '../../packages/api/src/utils/rateLimit';

describe('CORS 来源白名单', () => {
  const allowed = parseAllowedOrigins();

  it('放行生产与 dev 预览域名', () => {
    expect(isOriginAllowed('https://word-base.pages.dev', allowed)).toBe(true);
    expect(isOriginAllowed('https://dev.word-base.pages.dev', allowed)).toBe(true);
    expect(isOriginAllowed('https://word-base-six.vercel.app', allowed)).toBe(true);
    expect(isOriginAllowed('https://dev-word-base.vercel.app', allowed)).toBe(true);
  });

  it('放行 Tauri 桌面端 WebView 来源', () => {
    expect(isOriginAllowed('tauri://localhost', allowed)).toBe(true);
    expect(isOriginAllowed('http://tauri.localhost', allowed)).toBe(true);
  });

  it('放行本地开发与真机调试来源（任意端口）', () => {
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:3002', allowed)).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:8080', allowed)).toBe(true);
    expect(isOriginAllowed('http://10.0.2.2:3001', allowed)).toBe(true);
    expect(isOriginAllowed('http://192.168.1.100:3001', allowed)).toBe(true);
  });

  it('放行浏览器插件来源（word-picker）', () => {
    expect(isOriginAllowed('chrome-extension://abcdefghijklmnop', allowed)).toBe(true);
    expect(isOriginAllowed('moz-extension://uuid-here', allowed)).toBe(true);
  });

  it('拒绝未知来源与伪装域名', () => {
    expect(isOriginAllowed('https://evil.com', allowed)).toBe(false);
    expect(isOriginAllowed('https://word-base.pages.dev.evil.com', allowed)).toBe(false);
    expect(isOriginAllowed('http://localhost.evil.com', allowed)).toBe(false);
    expect(isOriginAllowed('https://192.168.1.1.evil.com', allowed)).toBe(false);
  });

  it('空 Origin 视为不允许（由中间件层直接放行非浏览器请求）', () => {
    expect(isOriginAllowed(undefined, allowed)).toBe(false);
    expect(isOriginAllowed('', allowed)).toBe(false);
  });

  it('ALLOWED_ORIGINS 环境变量可追加来源（含尾斜杠归一）', () => {
    const custom = parseAllowedOrigins('https://my-domain.com/, https://staging.my-domain.com');
    expect(isOriginAllowed('https://my-domain.com', custom)).toBe(true);
    expect(isOriginAllowed('https://staging.my-domain.com', custom)).toBe(true);
    // 默认白名单仍然生效
    expect(isOriginAllowed('https://word-base.pages.dev', custom)).toBe(true);
  });
});

describe('FixedWindowCounter 固定窗口限流', () => {
  it('窗口内未超限时放行并计数', () => {
    const counter = new FixedWindowCounter(60_000, 3);
    const now = 1_000_000;
    expect(counter.hit('u1', now).allowed).toBe(true);
    expect(counter.hit('u1', now + 1).allowed).toBe(true);
    expect(counter.hit('u1', now + 2).allowed).toBe(true);
  });

  it('超过窗口上限后拒绝并给出重试秒数', () => {
    const counter = new FixedWindowCounter(60_000, 2);
    const now = 1_000_000;
    counter.hit('u1', now);
    counter.hit('u1', now + 1);
    const result = counter.hit('u1', now + 30_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(30);
  });

  it('窗口过期后重新计数', () => {
    const counter = new FixedWindowCounter(60_000, 1);
    const now = 1_000_000;
    expect(counter.hit('u1', now).allowed).toBe(true);
    expect(counter.hit('u1', now + 1).allowed).toBe(false);
    expect(counter.hit('u1', now + 60_000).allowed).toBe(true);
  });

  it('不同 key 独立计数（每用户互不影响）', () => {
    const counter = new FixedWindowCounter(60_000, 1);
    const now = 1_000_000;
    expect(counter.hit('u1', now).allowed).toBe(true);
    expect(counter.hit('u2', now).allowed).toBe(true);
    expect(counter.hit('u1', now + 1).allowed).toBe(false);
    expect(counter.hit('u2', now + 1).allowed).toBe(false);
  });

  it('AI 每用户限流参数达到上限后返回 429 语义', () => {
    const counter = new FixedWindowCounter(AI_USER_WINDOW_MS, AI_USER_MAX_PER_WINDOW);
    const now = 1_000_000;
    for (let i = 0; i < AI_USER_MAX_PER_WINDOW; i++) {
      expect(counter.hit('u1', now + i).allowed).toBe(true);
    }
    expect(counter.hit('u1', now + AI_USER_MAX_PER_WINDOW).allowed).toBe(false);
  });
});
