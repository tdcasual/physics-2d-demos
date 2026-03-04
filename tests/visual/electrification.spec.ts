import { expect, test } from '@playwright/test';

test('electrification modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/electrification.html');
  await expect(page.getByRole('heading', { name: '交互式静电起电演示（2D）' })).toBeVisible();
  await expect(page.locator('.legacy-field-scenes .legacy-scene-btn')).toHaveCount(3);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});
