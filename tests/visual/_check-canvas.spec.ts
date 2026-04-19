import { test, expect } from '@playwright/test';

test('check projectile canvas size', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');
  await page.waitForTimeout(1000);
  
  const size = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.stage-canvas') as HTMLCanvasElement;
    if (!canvas) return null;
    return {
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      width: canvas.width,
      height: canvas.height,
    };
  });
  
  console.log('CANVAS SIZE:', JSON.stringify(size, null, 2));
  expect(size).not.toBeNull();
  expect(size!.clientWidth).toBeGreaterThan(0);
  expect(size!.clientHeight).toBeGreaterThan(0);
});
