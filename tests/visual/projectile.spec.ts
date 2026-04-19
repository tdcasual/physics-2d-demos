import { expect, test } from '@playwright/test';

test('projectile page renders shell controls', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');
  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('.stage-floating-controls button')).toHaveCount(2);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});
