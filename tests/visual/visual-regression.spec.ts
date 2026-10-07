import { existsSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
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

async function resetDynamicScene(page: Page): Promise<void> {
  const master = page.locator('.layout-master');
  await expect(master).toHaveAttribute('data-first-frame', 'ready');

  // Reset via the document-level shortcut so every layout reaches the same
  // initial frame, including scenes without a visible transport toolbar.
  await page.evaluate(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'r',
        bubbles: true,
        cancelable: true
      })
    );
  });
  await expect(master).toHaveAttribute('data-scene-playing', 'false');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
}

function linuxScreenshotsAuthorized(): boolean {
  return process.env.VISUAL_LINUX_AUTHORITY === '1';
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
  expect(debtIds).toHaveLength(0);
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
    // chase-meet 舞台内多画布，remainder 需要更长才能排完。
    const extraWait = scene.id === 'chase-meet';

    test(`desktop ${scene.id}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(scenePage(scene.id), {
        waitUntil: 'domcontentloaded'
      });
      await waitForFirstFrame(page, {
        remainderMs: extraWait ? 1200 : 800
      });
      // Let auto-play and initial layout settle before resetting. Resetting
      // while the first frame is still being attached can race the startup
      // play call and leave a blank canvas snapshot.
      if (DYNAMIC.has(scene.id)) await resetDynamicScene(page);
      await expect(page).toHaveScreenshot(`${scene.id}-desktop.png`, {
        maxDiffPixels: 800,
        threshold: 0.2
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
      if (DYNAMIC.has(scene.id)) await resetDynamicScene(page);
      await expect(page).toHaveScreenshot(`${scene.id}-mobile.png`, {
        maxDiffPixels: 800,
        threshold: 0.2
      });
    });
  }
});
