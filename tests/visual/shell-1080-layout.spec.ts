import { expect, test } from '@playwright/test';

const modernPages = [
  '/src/pages/projectile.html',
  '/src/pages/chase-meet.html',
  '/src/pages/field-lines.html',
  '/src/pages/electrification.html',
  '/src/pages/emf-analogy.html',
  '/src/pages/vt-integral.html?renderer=experimental'
] as const;

test.use({ viewport: { width: 1920, height: 1080 } });

test('1080p layout keeps full content in viewport for all modern pages', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);
    await expect(page.locator('.teaching-demo')).toBeVisible();

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: doc.scrollWidth,
        scrollHeight: doc.scrollHeight
      };
    });

    expect(
      metrics.scrollHeight - metrics.innerHeight,
      `${path} has vertical overflow: ${metrics.scrollHeight}px > ${metrics.innerHeight}px`
    ).toBeLessThanOrEqual(1);
    expect(
      metrics.scrollWidth - metrics.innerWidth,
      `${path} has horizontal overflow: ${metrics.scrollWidth}px > ${metrics.innerWidth}px`
    ).toBeLessThanOrEqual(1);
  }
});

test('mode and theme toggles are rendered in the stage corner toolbar', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');
  const toolbar = page.locator('.stage-toolbar');
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator('.mode-toggle')).toBeVisible();
  await expect(toolbar.locator('.shell-theme-toggle')).toBeVisible();
  await expect(page.locator('.teaching-sidebar .mode-toggle')).toHaveCount(0);
  await expect(page.locator('.teaching-sidebar .shell-theme-toggle')).toHaveCount(0);
});
