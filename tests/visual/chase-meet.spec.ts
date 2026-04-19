import { expect, test } from '@playwright/test';

test('chase-meet modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/chase-meet.html');

  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('.stage-floating-controls button')).toHaveCount(2);
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('.chase-modern-stage')).toBeVisible();
});

test('chase-meet modern-lab route uses modern stage renderer', async ({ page }) => {
  await page.goto('/src/pages/chase-meet.html?renderer=modern-lab');

  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('.chase-modern-stage')).toBeVisible();
});

test('chase-meet experimental route uses modern stage renderer', async ({ page }) => {
  await page.goto('/src/pages/chase-meet.html?renderer=experimental');

  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('.chase-modern-stage')).toBeVisible();
});
