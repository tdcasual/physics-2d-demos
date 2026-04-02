import { test, expect } from '@playwright/test';

test('final mobile screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/src/pages/projectile.html');
  await page.waitForTimeout(3000);
  
  // 1. 初始状态
  await page.screenshot({ path: '/tmp/final-mobile-initial.png' });
  
  // 2. 隐藏控制面板
  await page.click('.sidebar-toggle-float');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/final-mobile-canvas.png' });
  
  // 3. 展开数据区
  await page.click('.readout-header');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/final-mobile-data.png' });
});
