import { test, expect } from '@playwright/test';

test('spring-oscillator renders correctly', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/src/pages/spring-oscillator.html');
  await page.waitForTimeout(3000);

  // 截图整体布局
  await page.screenshot({ path: '/tmp/spring-oscillator-desktop.png' });

  // 验证图表区标题
  const graphTitle = await page.locator('.graph-section .section-title');
  await expect(graphTitle).toHaveText('图表');

  // 验证图表区 Canvas 存在
  const graphCanvas = await page.locator('.graph-slot canvas');
  await expect(graphCanvas).toBeVisible();

  // 验证舞台 Canvas 存在
  const stageCanvas = await page.locator('.stage-canvas');
  await expect(stageCanvas).toBeVisible();

  // 验证控制区存在
  const controlSlot = await page.locator('.control-slot');
  await expect(controlSlot).toBeVisible();

  // 验证控制区标题
  const controlTitle = await page.locator('.control-section .section-title');
  await expect(controlTitle).toHaveText('控制区');
});

test('spring-oscillator mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5177/src/pages/spring-oscillator.html');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '/tmp/spring-oscillator-mobile.png' });
});
