import { expect, test } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

test.use({ viewport: { width: 1920, height: 1080 } });

for (const scene of sceneIds) {
  test(`1080p layout keeps ${scene} in the viewport`, async ({ page }) => {
    const path = scenePage(scene);
    await page.goto(path);
    await expect(page.locator('[data-layout-id]')).toBeVisible();

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
  });
}

test('mode and theme toggles are rendered in the stage corner toolbar', async ({
  page
}) => {
  await page.goto('/src/pages/projectile.html');
  const toolbar = page.locator('.stage-toolbar');
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator('.mode-toggle')).toBeVisible();
  await expect(toolbar.locator('.shell-theme-toggle')).toBeVisible();
  await expect(toolbar.locator('.shell-theme-toggle')).toHaveText('夜间');
  await expect(page.locator('.teaching-sidebar .mode-toggle')).toHaveCount(0);
  await expect(
    page.locator('.teaching-sidebar .shell-theme-toggle')
  ).toHaveCount(0);
});

for (const scene of sceneIds) {
  test(`${scene} avoids duplicate desktop sidebar toggles`, async ({
    page
  }) => {
    const path = scenePage(scene);
    await page.goto(path);
    const visibleSidebarToggles = await page
      .locator('.sidebar-toggle')
      .evaluateAll((nodes) => {
        return nodes.filter((node) => {
          if (!(node instanceof HTMLElement)) return false;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return (
            !node.hidden &&
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden'
          );
        }).length;
      });
    expect(
      visibleSidebarToggles,
      `${path} should expose exactly one sidebar toggle on desktop`
    ).toBe(1);
  });
}
