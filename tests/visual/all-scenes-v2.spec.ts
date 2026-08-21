import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

for (const scene of sceneIds) {
  test(`${scene} V2 layout`, async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(scenePage(scene));
    await page.waitForLoadState('domcontentloaded');

    await page.screenshot({
      path: `/tmp/v2-${scene}.png`,
      fullPage: false
    });

    await expect(page.locator('[data-scene-id]')).toHaveAttribute(
      'data-scene-id',
      scene
    );
    await expect(page.locator('[data-layout-id]')).toBeVisible();
    await expect(page.locator('.control-slot').first()).toBeAttached();
    await expect(page.locator('canvas, [role="img"]').first()).toBeAttached();
  });
}
