import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';
import { waitForFirstFrame } from '../helpers/wait-first-frame';

/**
 * Pixel snapshots cover every discovered scene. Baselines are per-platform
 * files: *-linux.png is maintained only by scripts/visual-linux-container.sh
 * (CI invokes the same script), *-darwin.png on Mac.
 *
 * 覆盖清单 = 自动发现（tests/visual/scene-pages.ts 的 sceneIds，
 * 即 src/pages/*.html 减去工具页）− 下方 SNAPSHOT_OPT_OUT。
 * 新场景默认纳入像素覆盖；首次补充基线用
 * scripts/visual-linux-container.sh update（linux）或
 * pnpm test:visual:update（darwin，仅在 macOS 上）。
 *
 * 禁止在 Linux 宿主机 --update-snapshots：会用错误光栅覆盖 *-linux.png。
 */

// 显式 opt-out 清单，每个条目必须带理由注释。当前为空：所有场景均有基线。
const SNAPSHOT_OPT_OUT: readonly string[] = [];

const SNAPSHOT_SCENE_IDS = sceneIds.filter(
  (id) => !SNAPSHOT_OPT_OUT.includes(id)
);

const SCENES = SNAPSHOT_SCENE_IDS.map((id) => ({ id, name: id }));

function linuxScreenshotsAuthorized(): boolean {
  return process.env.VISUAL_LINUX_AUTHORITY === '1';
}

test('linux PNG authority env is fail-closed in the container', () => {
  if (process.platform !== 'linux') return;
  if (existsSync('/.dockerenv')) {
    expect(process.env.VISUAL_LINUX_AUTHORITY).toBe('1');
  }
});

test('snapshot opt-out list only references discovered scenes', () => {
  const unknown = SNAPSHOT_OPT_OUT.filter((id) => !sceneIds.includes(id));
  expect(unknown, 'snapshot opt-out list contains unknown scene ids').toEqual(
    []
  );
});

test.describe('scene screenshots', () => {
  test.skip(
    () => process.platform === 'linux' && !linuxScreenshotsAuthorized(),
    'Linux PNG SoT is scripts/visual-linux-container.sh (CI invokes the same script)'
  );

  for (const scene of SCENES) {
    // emf-analogy 有粒子动画（相位推进）、double-slit 默认 autoPlay，
    // 截图时动画可能仍在推进，diff 阈值需要更高
    const isDynamic = scene.id === 'emf-analogy' || scene.id === 'double-slit';

    test(`desktop ${scene.id}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(scenePage(scene.id), {
        waitUntil: 'domcontentloaded'
      });
      await waitForFirstFrame(page, {
        remainderMs: isDynamic || scene.id === 'chase-meet' ? 1200 : 800
      });
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
      await waitForFirstFrame(page, {
        remainderMs: isDynamic || scene.id === 'chase-meet' ? 1200 : 800
      });
      await expect(page).toHaveScreenshot(`${scene.id}-mobile.png`, {
        maxDiffPixels: isDynamic ? 3000 : 800,
        threshold: isDynamic ? 0.3 : 0.2
      });
    });
  }
});
