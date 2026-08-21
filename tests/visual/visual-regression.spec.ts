import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

const PORT = 5177;
const SCENES = sceneIds.map((id) => ({ id, name: id }));

for (const scene of SCENES) {
  // emf-analogy 有粒子动画，diff 阈值需要更高
  const isDynamic = scene.id === 'emf-analogy';

  test(`desktop ${scene.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}${scenePage(scene.id)}`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot(`${scene.id}-desktop.png`, {
      maxDiffPixels: isDynamic ? 3000 : 800,
      threshold: isDynamic ? 0.3 : 0.2
    });
  });

  test(`mobile ${scene.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://127.0.0.1:${PORT}${scenePage(scene.id)}`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot(`${scene.id}-mobile.png`, {
      maxDiffPixels: isDynamic ? 3000 : 800,
      threshold: isDynamic ? 0.3 : 0.2
    });
  });
}
