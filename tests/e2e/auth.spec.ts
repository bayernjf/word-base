import { test, expect, type Page } from '@playwright/test';

/**
 * E2E 认证流程测试 — 验证登录、页面导航、登出完整链路。
 *
 * 需要真实的 Supabase 账号和运行中的 API 后端。
 * 通过环境变量传入凭据，避免硬编码：
 *   E2E_EMAIL=xxx E2E_PASSWORD=xxx npx playwright test tests/e2e/auth.spec.ts
 */

const TEST_EMAIL = process.env.E2E_EMAIL || '';
const TEST_PASSWORD = process.env.E2E_PASSWORD || '';

test.describe.configure({ timeout: 60_000, mode: 'serial' });

/** 关闭可能遮挡点击的分析同意横幅 */
async function dismissConsentBanner(page: Page) {
  const declineBtn = page.locator('button:has-text("拒绝")');
  if (await declineBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await declineBtn.click();
  }
}

/** 关闭登录后可能出现的公告弹窗 */
async function dismissAnnouncementModal(page: Page) {
  // 按 Escape 关闭公告弹窗（如果存在）
  await page.keyboard.press('Escape');
  // 或者点击"我知道了"按钮
  const gotItBtn = page.locator('button:has-text("我知道了")');
  if (await gotItBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await gotItBtn.click();
  }
}

/** 关闭所有可能遮挡的 overlay */
async function dismissOverlays(page: Page) {
  await dismissAnnouncementModal(page);
  await dismissConsentBanner(page);
}

/** 封装登录操作 */
async function doLogin(page: Page, email: string, password: string) {
  await page.goto('/app');
  await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
  await dismissConsentBanner(page);

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // 等待 Dashboard 欢迎语出现
  await page.waitForSelector('text=欢迎回来', { timeout: 20_000 });
  // 关闭登录后可能出现的弹窗和横幅
  await dismissOverlays(page);
}

test.describe('认证流程', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, '跳过：未设置 E2E_EMAIL / E2E_PASSWORD 环境变量');

  test('登录成功后展示 Dashboard', async ({ page }) => {
    await doLogin(page, TEST_EMAIL, TEST_PASSWORD);

    const welcome = page.locator('text=欢迎回来');
    await expect(welcome).toBeVisible();
    expect(page.url()).toContain('/app');
  });

  test('登录后可以导航到单词表', async ({ page }) => {
    await doLogin(page, TEST_EMAIL, TEST_PASSWORD);

    const vocabLink = page.locator('text=单词表').first();
    await vocabLink.click();

    // 单词表页面应包含搜索框
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('登录后可以导航到设置页', async ({ page }) => {
    await doLogin(page, TEST_EMAIL, TEST_PASSWORD);

    const settingsLink = page.locator('text=设置').first();
    await settingsLink.click();

    await page.waitForSelector('text=设置中心', { timeout: 10_000 });
    const heading = page.locator('text=设置中心');
    await expect(heading).toBeVisible();
  });

  test('错误密码登录显示错误提示', async ({ page }) => {
    await page.goto('/app');
    await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
    await dismissConsentBanner(page);

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill('wrong_password_12345');
    await page.locator('button[type="submit"]').click();

    // 登录失败后会出现错误提示
    await page.waitForTimeout(3_000);
    const hasError = await page.locator('.bg-red-100').isVisible().catch(() => false)
      || await page.locator('text=Invalid').isVisible().catch(() => false)
      || await page.locator('text=错误').isVisible().catch(() => false)
      || await page.locator('text=invalid').isVisible().catch(() => false);
    expect(hasError).toBeTruthy();
  });

  test('登出后回到登录页', async ({ page }) => {
    await doLogin(page, TEST_EMAIL, TEST_PASSWORD);

    // 点击用户头像按钮打开下拉菜单
    const avatarBtn = page.locator('button:has(svg.lucide-user), button:has(svg.lucide-chevron-down)').first();
    // 更可靠：找到包含用户邮箱前缀或 fallback 文本的按钮
    const userBtn = page.locator('button', { hasText: /2467055074|用户/ }).first();
    const targetBtn = (await userBtn.isVisible().catch(() => false)) ? userBtn : avatarBtn;
    await targetBtn.click();

    // 在下拉菜单中点击"退出登录"
    const logoutBtn = page.locator('button:has-text("退出登录")');
    await expect(logoutBtn).toBeVisible({ timeout: 5_000 });
    await logoutBtn.click();

    // 登出后应回到登录表单
    await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });
});
