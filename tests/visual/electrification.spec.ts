import { expect, test } from '@playwright/test';

test('electrification modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/electrification.html');
  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('electrification modern-lab route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/electrification.html?renderer=modern-lab');
  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('electrification experimental route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/electrification.html?renderer=experimental');
  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});
