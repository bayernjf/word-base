import { describe, it, expect, vi } from 'vitest';

// 评审 P2-2 回归测试：/api/v1/session/bootstrap 匿名会话发放必须有
// IP 级 + 全局限流，超过阈值返回 429 而不是继续调 signInAnonymously。
// mock context 模块避免真实 Supabase 连接，驱动真实 Hono 路由。

const mocks = vi.hoisted(() => ({
  signInAnonymously: vi.fn(async () => ({
    data: { session: { access_token: 'anon-token' } },
    error: null,
  })),
}));

vi.mock('../../packages/api/src/context', () => ({
  supabase: { auth: { signInAnonymously: mocks.signInAnonymously } },
  getRequestContext: vi.fn(async () => ({ token: '', user: null, db: null })),
}));

import { Hono } from 'hono';
import { registerSessionRoutes } from '../../packages/api/src/routes/session';
import {
  SESSION_BOOTSTRAP_IP_MAX_PER_WINDOW,
} from '../../packages/api/src/utils/rateLimit';

function buildApp() {
  const app = new Hono();
  registerSessionRoutes(app);
  return app;
}

function bootstrap(app: Hono, ip?: string) {
  return app.request('/api/v1/session/bootstrap', {
    method: 'POST',
    headers: ip ? { 'x-forwarded-for': ip } : {},
  });
}

describe('POST /api/v1/session/bootstrap 限流（评审 P2-2）', () => {
  it('同一 IP 超过窗口上限后返回 429 且不再调用 signInAnonymously', async () => {
    const app = buildApp();
    const ip = '203.0.113.10';
    mocks.signInAnonymously.mockClear();

    for (let i = 0; i < SESSION_BOOTSTRAP_IP_MAX_PER_WINDOW; i++) {
      const res = await bootstrap(app, ip);
      expect(res.status).toBe(200);
    }
    const callsBefore = mocks.signInAnonymously.mock.calls.length;

    const blocked = await bootstrap(app, ip);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe('rate_limited');
    expect(body.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    // 被限流的请求不再创建匿名用户
    expect(mocks.signInAnonymously.mock.calls.length).toBe(callsBefore);
  });

  it('不同 IP 的配额互相独立', async () => {
    const app = buildApp();
    const res = await bootstrap(app, '198.51.100.7');
    expect(res.status).toBe(200);
  });

  it('缺失 x-forwarded-for 时归入 unknown 桶，同样受限流约束', async () => {
    const app = buildApp();
    // unknown 桶在首个用例的全局计数中未被占满，连续打满 IP 上限后应 429
    let lastStatus = 0;
    for (let i = 0; i < SESSION_BOOTSTRAP_IP_MAX_PER_WINDOW + 1; i++) {
      const res = await bootstrap(app);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
