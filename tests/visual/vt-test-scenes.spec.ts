import { test, expect } from '@playwright/test';

test('vt-integral test all scenes', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/src/pages/vt-integral.html');

  // scene-selector 渲染为 role="radio" 的按钮组
  const radios = page.getByRole('radio');
  await expect(radios).toHaveCount(3);
  await expect(radios.first()).toHaveAttribute('aria-checked', 'true');
  const canvas = page.locator('canvas.stage-canvas');
  await expect(canvas).toBeVisible();

  const scene2 = page.getByRole('radio', { name: '化曲为直' });
  await scene2.click();
  await expect(scene2).toHaveAttribute('aria-checked', 'true');

  const scene3 = page.getByRole('radio', { name: '割圆术' });
  await scene3.click();
  await expect(scene3).toHaveAttribute('aria-checked', 'true');

  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(500);
  expect(box?.height).toBeGreaterThan(300);
});
