import { expect, test } from '@playwright/test';

test('vt-integral modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/vt-integral.html?renderer=experimental');
  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});
