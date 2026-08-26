import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

/**
 * Pixel snapshots cover every discovered scene. Baselines are per-platform
 * files: *-linux.png is maintained in the CI-parity container
 * (scripts/visual-linux-container.sh), *-darwin.png on Mac.
 */
const SNAPSHOT_SCENE_IDS = [
  'chase-meet',
  'doppler-effect',
  'double-slit',
  'electrification',
  'emf-analogy',
  'field-lines',
  'ganshe',
  'interference-formula',
  'mechanical-wave',
  'micrometer',
  'projectile',
  'spring-oscillator',
  'thin-film',
  'vernier-caliper',
  'vt-integral',
  'wedge'
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
  // emf-analogy 有粒子动画（相位推进）、double-slit 默认 autoPlay，
  // 截图时动画可能仍在推进，diff 阈值需要更高
  const isDynamic = scene.id === 'emf-analogy' || scene.id === 'double-slit';

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
