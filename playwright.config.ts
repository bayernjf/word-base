import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 冒烟配置。
 *
 * - 只覆盖 Web 端纯静态前端（Landing + /app 登录页），不依赖 /api，因此无需外部账号。
 * - testDir 锁定 tests/e2e，避免 Playwright 默认 testMatch 误吞 tests/unit 下的 vitest 用例。
 * - webServer 自动拉起 Vite dev server（无需先 build），本地复用已存在的 3000 端口服务，CI 中全新启动。
 */
const PORT = 3000;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -w @wordbase/web',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
