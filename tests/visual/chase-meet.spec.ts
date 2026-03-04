import { expect, test } from '@playwright/test';

test('chase-meet modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/chase-meet.html');

  await expect(page.getByRole('heading', { name: '追及相遇演示动画（2D）' })).toBeVisible();
  await expect(page.locator('.transport-controls button')).toHaveCount(4);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});
