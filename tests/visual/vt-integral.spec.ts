import { expect, test } from '@playwright/test';

test('vt-integral modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/vt-integral.html');
  await expect(page.getByRole('heading', { name: '微元法交互式动画（2D）' })).toBeVisible();
  await expect(page.locator('.legacy-field-scenes .legacy-scene-btn')).toHaveCount(5);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});
