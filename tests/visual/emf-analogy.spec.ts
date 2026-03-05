import { expect, test } from '@playwright/test';

test('emf-analogy modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html');
  await expect(page.getByRole('heading', { name: '电路水流类比模型（2D）' })).toBeVisible();
  await expect(page.locator('[data-role="system-toggle"]')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toBeVisible();
});
