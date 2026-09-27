import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';
import { waitForFirstFrame } from '../helpers/wait-first-frame';
import {
  hasAuthoritativePair,
  legacyBaselineDebt,
  untrackedSceneIds,
  VISUAL_COVERED_SCENE_IDS,
  VISUAL_DYNAMIC_SCENE_IDS,
  VISUAL_LEGACY_DEBT_RECORD,
  VISUAL_LEGACY_DEBT_SCENE_IDS,
  VISUAL_SCREENSHOT_SPEC_COUNT
} from './baseline-coverage';

/**
 * Pixel snapshots cover the scenes listed in baseline-coverage.json that
 * have complete desktop+mobile goldens for both linux and darwin.
 * Uncovered scenes must be listed in frozen legacyDebtSceneIds (B11).
 *
 * *-linux.png is maintained only by scripts/visual-linux-container.sh
 * (CI invokes the same script), *-darwin.png on Mac.
 *
 * 禁止在 Linux 宿主机 --update-snapshots：会用错误光栅覆盖 *-linux.png。
 */

const COVERED = VISUAL_COVERED_SCENE_IDS;
const DYNAMIC = new Set(VISUAL_DYNAMIC_SCENE_IDS);
const SCENES = COVERED.map((id) => ({ id, name: id }));

function linuxScreenshotsAuthorized(): boolean {
  return process.env.VISUAL_LINUX_AUTHORITY === '1';
}

async function freezeDynamicCanvas(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const w = window as Window & { __visualCanvasFrozen?: boolean };
    if (w.__visualCanvasFrozen) return;
    w.__visualCanvasFrozen = true;
    window.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
  });
}

test('linux PNG authority env is fail-closed in the container', () => {
  if (process.platform !== 'linux') return;
  if (existsSync('/.dockerenv')) {
    expect(process.env.VISUAL_LINUX_AUTHORITY).toBe('1');
  }
});

test('visual baseline coverage accounts for every discovered scene', () => {
  const covered = [...COVERED].sort();
  const discovered = [...sceneIds].sort();
  const debt = legacyBaselineDebt();
  const debtIds = [...VISUAL_LEGACY_DEBT_SCENE_IDS].sort();
  const unknownCovered = covered.filter((id) => !discovered.includes(id));
  const unknownDebt = debtIds.filter((id) => !discovered.includes(id));
  const partial = covered.filter((id) => !hasAuthoritativePair(id));
  const untracked = untrackedSceneIds(discovered);
  const overlap = covered.filter((id) => debtIds.includes(id));

  expect(unknownCovered, 'covered list contains unknown scene ids').toEqual([]);
  expect(unknownDebt, 'debt list contains unknown scene ids').toEqual([]);
  expect(
    partial,
    'covered scenes missing a complete Linux+Darwin pair'
  ).toEqual([]);
  expect(untracked, 'discovered scenes missing from covered or debt').toEqual(
    []
  );
  expect(overlap, 'scene listed as both covered and debt').toEqual([]);
  expect(covered.length + debtIds.length).toBe(discovered.length);
  expect(COVERED.length * 2).toBe(VISUAL_SCREENSHOT_SPEC_COUNT);
  expect(debtIds).toHaveLength(101);
  expect(VISUAL_LEGACY_DEBT_RECORD).toBe('B11');
  expect(Object.keys(debt).sort()).toEqual(debtIds);
});

test('dynamic screenshot allowlist only contains discovered scenes', () => {
  const unknown = VISUAL_DYNAMIC_SCENE_IDS.filter(
    (id) => !sceneIds.includes(id)
  );
  expect(unknown, 'dynamic allowlist contains unknown scene ids').toEqual([]);
});

test.describe('scene screenshots', () => {
  test.skip(
    () => process.platform === 'linux' && !linuxScreenshotsAuthorized(),
    'Linux PNG SoT is scripts/visual-linux-container.sh (CI invokes the same script)'
  );

  for (const scene of SCENES) {
    // emf-analogy 有粒子动画（相位推进）、double-slit 默认 autoPlay，
    // 截图时动画可能仍在推进，diff 阈值需要更高。其余动态场景冻结 rAF，
    // 不抬高阈值。
    const highDiff = scene.id === 'emf-analogy' || scene.id === 'double-slit';
    const extraWait = highDiff || scene.id === 'chase-meet';

    test(`desktop ${scene.id}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(scenePage(scene.id), {
        waitUntil: 'domcontentloaded'
      });
      await waitForFirstFrame(page, {
        remainderMs: extraWait ? 1200 : 800
      });
      if (DYNAMIC.has(scene.id)) await freezeDynamicCanvas(page);
      await expect(page).toHaveScreenshot(`${scene.id}-desktop.png`, {
        maxDiffPixels: highDiff ? 3000 : 800,
        threshold: highDiff ? 0.3 : 0.2
      });
    });

    test(`mobile ${scene.id}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(scenePage(scene.id), {
        waitUntil: 'domcontentloaded'
      });
      await waitForFirstFrame(page, {
        remainderMs: extraWait ? 1200 : 800
      });
      if (DYNAMIC.has(scene.id)) await freezeDynamicCanvas(page);
      await expect(page).toHaveScreenshot(`${scene.id}-mobile.png`, {
        maxDiffPixels: highDiff ? 3000 : 800,
        threshold: highDiff ? 0.3 : 0.2
      });
    });
  }
});
