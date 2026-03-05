import { expect, test } from '@playwright/test';

test('emf-analogy modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html');
  await expect(page.getByRole('heading', { name: '电路水流类比模型（2D）' })).toBeVisible();
  await expect(page.locator('[data-role="system-toggle"]')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toBeVisible();
});

test('emf-analogy modern-lab route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html?renderer=modern-lab');
  await expect(page.getByRole('heading', { name: '电路水流类比模型（2D）' })).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('emf-analogy experimental route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html?renderer=experimental');
  await expect(page.getByRole('heading', { name: '电路水流类比模型（2D）' })).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});
