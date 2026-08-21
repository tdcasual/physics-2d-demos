import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

/**
 * Pixel snapshots are deliberately limited to reviewed representative scenes.
 * Every discovered scene is still covered by layout-matrix and the structural
 * audits; adding a scene here requires reviewed Darwin and Linux baselines.
 */
const SNAPSHOT_SCENE_IDS = [
  'chase-meet',
  'electrification',
  'emf-analogy',
  'field-lines',
  'projectile',
  'vt-integral'
] as const;

const SCENES = SNAPSHOT_SCENE_IDS.map((id) => ({ id, name: id }));

test('snapshot allowlist only references discovered scenes', () => {
  const unknown = SNAPSHOT_SCENE_IDS.filter((id) => !sceneIds.includes(id));
  expect(
    unknown,
    'snapshot scene allowlist contains unknown scene ids'
  ).toEqual([]);
});

for (const scene of SCENES) {
  // emf-analogy 有粒子动画，diff 阈值需要更高
  const isDynamic = scene.id === 'emf-analogy';

  test(`desktop ${scene.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(scenePage(scene.id), {
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
    await page.goto(scenePage(scene.id), {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot(`${scene.id}-mobile.png`, {
      maxDiffPixels: isDynamic ? 3000 : 800,
      threshold: isDynamic ? 0.3 : 0.2
    });
  });
}
