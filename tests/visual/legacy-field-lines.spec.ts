import { expect, test } from '@playwright/test';

test('legacy field-lines uses shell controls and animation-only iframe', async ({ page }) => {
  await page.goto('/src/pages/legacy-2d.html?scene=legacy-field-lines');

  await expect(page.locator('.legacy-field-controls')).toBeVisible();
  await expect(page.locator('.teaching-card').filter({ hasText: '控制区' })).toBeVisible();

  const iframe = page.frameLocator('iframe.legacy-iframe');
  await expect(iframe.locator('.control-panel')).toBeHidden();

  await expect(page).toHaveScreenshot('legacy-field-lines-page.png', { fullPage: true });
});
