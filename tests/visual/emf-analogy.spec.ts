import { expect, test } from '@playwright/test';

test('emf-analogy modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html');
  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('emf-analogy modern-lab route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html?renderer=modern-lab');
  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('emf-analogy experimental route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html?renderer=experimental');
  await expect(page.locator('.layout-master')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('emf-analogy desktop readout defaults collapsed and supports drag', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/src/pages/emf-analogy.html');

  const readout = page.locator('.readout-panel');
  const toggle = page.locator('.readout-toggle');

  await expect(toggle).toBeVisible();
  await expect(readout).toHaveClass(/is-collapsed/);
  await toggle.click();
  await expect(readout).not.toHaveClass(/is-collapsed/);
});
