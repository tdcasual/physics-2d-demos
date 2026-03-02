import { expect, test } from '@playwright/test';

test('navigation page renders cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.card').first()).toBeVisible();
  await expect(page).toHaveScreenshot('navigation-page.png', { fullPage: true });
});
