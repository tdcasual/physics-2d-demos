import { expect, test } from '@playwright/test';

test('navigation page renders exhibit-style placards with concept metadata', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '植物园课堂' })).toBeVisible();
  await expect(page.locator('.search-label')).toHaveText('搜索课堂展签');
  await expect(page.locator('.filter-chip')).toHaveCount(4);
  await expect(page.locator('.card').first()).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(6);
  await expect(page.locator('.card-subject').first()).toBeVisible();
  await expect(page.locator('.card-concept').first()).toContainText('｜');
  await expect(page.locator('.card-concept').first()).toContainText('·');
});
