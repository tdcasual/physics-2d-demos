import { expect, test } from '@playwright/test';

test('field-lines modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/field-lines.html');
  await expect(page.getByRole('heading', { name: '电场矢量到电场线的演化（2D）' })).toBeVisible();
  await expect(page.locator('.scene-switch-grid .scene-tab-btn')).toHaveCount(4);
  await expect(page.locator('iframe.stage-iframe')).toBeVisible();
});

test('field-lines modern-lab route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/field-lines.html?renderer=modern-lab');
  await expect(page.getByRole('heading', { name: '电场矢量到电场线的演化（2D）' })).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('field-lines experimental route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/field-lines.html?renderer=experimental');
  await expect(page.getByRole('heading', { name: '电场矢量到电场线的演化（2D）' })).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});
