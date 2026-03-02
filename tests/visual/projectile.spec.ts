import { expect, test } from '@playwright/test';

test('projectile page renders shell controls', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');
  await expect(page.getByRole('heading', { name: '抛体运动（2D）' })).toBeVisible();
  await expect(page.locator('.transport-controls button')).toHaveCount(4);
  await expect(page).toHaveScreenshot('projectile-page.png', { fullPage: true });
});
