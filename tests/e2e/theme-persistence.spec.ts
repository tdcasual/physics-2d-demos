/**
 * E2E 主题一致性冒烟测试
 *
 * 验证全站单一主题事实源（theme-store）：
 * - 首页切换暗色 → 进入场景页保持暗色（含防闪烁内联脚本）
 * - 场景页 `t` 快捷键切换主题 → 回到首页保持一致
 */

import { test, expect, type Page } from '@playwright/test';
import { scenePage } from '../visual/scene-pages';

const THEME_KEY = 'physics-lab-theme';

async function resetStorage(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
}

async function gotoScene(page: Page, sceneId: string) {
  await page.goto(scenePage(sceneId));
  await page.waitForSelector('.layout-master', {
    state: 'visible',
    timeout: 10000
  });
}

test.describe('theme persistence across pages', () => {
  test('homepage dark toggle persists when navigating to a scene page', async ({
    page
  }) => {
    await resetStorage(page);
    await page.reload();

    const toggle = page.locator('button.theme-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 首页写入统一 key
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      THEME_KEY
    );
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toMatchObject({ v: 1, theme: 'dark' });

    // 进入场景页：防闪烁脚本 + bootstrapper 都应解析为 dark
    await gotoScene(page, 'projectile');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('scene page keyboard theme toggle persists back to homepage', async ({
    page
  }) => {
    await resetStorage(page);

    await gotoScene(page, 'projectile');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // `t` 快捷键经 onToggleTheme → container.setTheme → theme:change → storeTheme
    await page.keyboard.press('t');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      THEME_KEY
    );
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toMatchObject({ v: 1, theme: 'dark' });

    // 回到首页保持暗色
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
