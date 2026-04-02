import { test, expect } from '@playwright/test';

test('projectile V2 layout without graph', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/src/pages/projectile.html');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/tmp/projectile-v2-desktop.png' });
  
  // 验证没有图表区
  const graphSection = await page.locator('.graph-section');
  await expect(graphSection).toHaveCount(0);
  
  // 验证四个主要区域
  const leftPanel = await page.locator('.teaching-left-panel');
  const rightPanel = await page.locator('.teaching-right-panel');
  const resizer = await page.locator('.panel-resizer');
  
  await expect(leftPanel).toBeVisible();
  await expect(rightPanel).toBeVisible();
  await expect(resizer).toBeVisible();
  
  // 验证动画区足够大
  const stageCanvas = await page.locator('.stage-canvas');
  const stageBox = await stageCanvas.boundingBox();
  console.log('Stage canvas size:', stageBox);
  expect(stageBox?.width).toBeGreaterThan(800);
  expect(stageBox?.height).toBeGreaterThan(700);
});
