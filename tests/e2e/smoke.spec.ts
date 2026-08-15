import { test, expect } from '@playwright/test';

/**
 * E2E 冒烟测试 — 验证 Web 前端静态页面可正常加载。
 *
 * 不依赖 /api、不依赖 Supabase 账号，仅检查 Vite dev server
 * 产出的静态 HTML + JS 是否能正确渲染。
 */

test('landing page 正常加载并展示品牌标题', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/WordBase/);
  // 验证页面核心内容已渲染（React 挂载后）
  await expect(page.locator('#root')).toBeVisible();
});

test('/app 路由可访问', async ({ page }) => {
  await page.goto('/app');
  // /app 是 app.html，至少应返回 200 并渲染 root
  await expect(page.locator('#root')).toBeVisible();
});

test('/privacy 路由可访问', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page).toHaveTitle(/WordBase/);
});

test('/terms 路由可访问', async ({ page }) => {
  await page.goto('/terms');
  await expect(page).toHaveTitle(/WordBase/);
});
