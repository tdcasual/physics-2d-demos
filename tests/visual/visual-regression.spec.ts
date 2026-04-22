import { test, expect } from '@playwright/test';

const PORT = 5183;
const SCENES = [
  { id: 'chase-meet', name: '追击相遇' },
  { id: 'projectile', name: '抛体运动' },
  { id: 'emf-analogy', name: '电路水流类比' },
  { id: 'field-lines', name: '电场线' },
  { id: 'electrification', name: '摩擦起电' },
  { id: 'vt-integral', name: 'v-t积分' }
];

for (const scene of SCENES) {
  // emf-analogy 有粒子动画，diff 阈值需要更高
  const isDynamic = scene.id === 'emf-analogy';

  test(`desktop ${scene.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene.id}.html`, {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot(`${scene.id}-desktop.png`, {
      maxDiffPixels: isDynamic ? 3000 : 800,
      threshold: isDynamic ? 0.3 : 0.2
    });
  });

  test(`mobile ${scene.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene.id}.html`, {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot(`${scene.id}-mobile.png`, {
      maxDiffPixels: isDynamic ? 3000 : 800,
      threshold: isDynamic ? 0.3 : 0.2
    });
  });
}
