import { expect, test } from '@playwright/test';

test('field-lines modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/field-lines.html');
  await expect(page.getByRole('heading', { name: '电场矢量到电场线的演化（2D）' })).toBeVisible();
  await expect(page.locator('.legacy-field-scenes .legacy-scene-btn')).toHaveCount(4);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});
