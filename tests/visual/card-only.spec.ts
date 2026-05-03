import { test, expect } from '@playwright/test';

test('capture vt-integral card only', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/');
  await page.waitForLoadState('networkidle');

  // 点击"方法"筛选
  await page.click('button:has-text("方法")');
  await page.waitForTimeout(500);

  // 找到微元法卡片并截图
  const card = page
    .locator('.experiment-card')
    .filter({ hasText: '微元法' });
  await expect(card).toBeVisible();

  // 只截取卡片
  await card.screenshot({ path: '/tmp/card-only.png' });

  // 同时截取包含卡片的区域
  await page
    .locator('.experiments-grid')
    .screenshot({ path: '/tmp/grid-only.png' });
});
