import { test, expect } from '@playwright/test';

test('vt-integral layout after fix', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/src/pages/vt-integral.html');
  await page.waitForTimeout(3000);
  
  // 截图整体布局
  await page.screenshot({ path: '/tmp/vt-fixed-layout.png' });
  
  // 检查iframe是否存在且尺寸正确
  const iframe = await page.locator('.stage-iframe');
  const iframeBox = await iframe.boundingBox();
  console.log('Iframe dimensions:', iframeBox);
  
  // 验证iframe宽度应该接近舞台宽度
  expect(iframeBox?.width).toBeGreaterThan(800);
  expect(iframeBox?.height).toBeGreaterThan(500);
  
  // 检查状态卡片是否隐藏
  const statusCard = await page.locator('.status-card');
  const statusVisible = await statusCard.isVisible().catch(() => false);
  console.log('Status card visible:', statusVisible);
  
  // 检查header是否隐藏
  const headerTitle = await page.locator('.teaching-header h1');
  const headerVisible = await headerTitle.isVisible().catch(() => false);
  console.log('Header visible:', headerVisible);
});
