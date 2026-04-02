import { test, expect } from '@playwright/test';

test('spring-oscillator V2 layout', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/src/pages/spring-oscillator.html');
  await page.waitForTimeout(3000);
  
  // 截图整体布局
  await page.screenshot({ path: '/tmp/spring-v2-desktop.png' });
  
  // 验证四个区域都存在
  const leftPanel = await page.locator('.teaching-left-panel');
  const rightPanel = await page.locator('.teaching-right-panel');
  const resizer = await page.locator('.panel-resizer');
  const readoutPanel = await page.locator('.readout-panel');
  
  await expect(leftPanel).toBeVisible();
  await expect(rightPanel).toBeVisible();
  await expect(resizer).toBeVisible();
  await expect(readoutPanel).toBeVisible();
  
  // 验证图表区存在
  const graphSection = await page.locator('.graph-section');
  await expect(graphSection).toBeVisible();
  
  // 验证图表区有 Canvas
  const graphCanvas = await page.locator('.graph-slot canvas');
  await expect(graphCanvas).toBeVisible();
  
  // 验证动画区 Canvas
  const stageCanvas = await page.locator('.stage-canvas');
  await expect(stageCanvas).toBeVisible();
  
  // 获取动画区尺寸，验证它足够大
  const stageBox = await stageCanvas.boundingBox();
  console.log('Stage canvas size:', stageBox);
  expect(stageBox?.width).toBeGreaterThan(600);
  expect(stageBox?.height).toBeGreaterThan(500);
});

test('spring-oscillator V2 mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5177/src/pages/spring-oscillator.html');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/tmp/spring-v2-mobile.png' });
});
