import { devices, expect, test } from '@playwright/test';

const iPhone12Use = {
  viewport: devices['iPhone 12'].viewport,
  userAgent: devices['iPhone 12'].userAgent,
  deviceScaleFactor: devices['iPhone 12'].deviceScaleFactor,
  isMobile: devices['iPhone 12'].isMobile,
  hasTouch: devices['iPhone 12'].hasTouch
} as const;

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

test('empty search state remains keyboard reachable', async ({ page }) => {
  await page.goto('/');

  await page.locator('#searchInput').fill('zzzz-not-found');

  const emptyState = page.locator('#emptyState');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toHaveAttribute('role', 'status');

  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press('Tab');
  }

  await expect(emptyState).toBeFocused();
});

test.describe('navigation mobile usability', () => {
  test.use(iPhone12Use);

  test('filter chips meet 44px tap target', async ({ page }) => {
    await page.goto('/');
    const minTarget = await page.locator('.filter-chip').evaluateAll((nodes) => {
      let min = Number.POSITIVE_INFINITY;
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        min = Math.min(min, Math.min(rect.width, rect.height));
      }
      return Number.isFinite(min) ? min : 0;
    });

    expect(minTarget).toBeGreaterThanOrEqual(44);
  });
});
