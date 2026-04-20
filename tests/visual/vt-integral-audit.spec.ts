import { test, expect } from '@playwright/test';

test('vt-integral layout audit', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/src/pages/vt-integral.html');
  await page.waitForTimeout(2000);

  // 截图整体布局
  await page.screenshot({ path: '/tmp/vt-layout-full.png' });

  // 检查左侧栏高度和内容
  const sidebar = await page.locator('.teaching-left-panel');
  const sidebarBox = await sidebar.boundingBox();
  console.log('Sidebar height:', sidebarBox?.height);

  // 检查右侧stage区域
  const stage = await page.locator('.teaching-right-panel');
  const stageBox = await stage.boundingBox();
  console.log('Stage dimensions:', stageBox);

  // 检查canvas容器
  const canvas = await page.locator('.stage-canvas');
  const canvasBox = await canvas.boundingBox();
  console.log('Canvas dimensions:', canvasBox);

  // 基本验证：canvas 应该有合理尺寸
  expect(canvasBox?.width).toBeGreaterThan(500);
  expect(canvasBox?.height).toBeGreaterThan(300);
});
