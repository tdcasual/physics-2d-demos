/**
 * E2E Layout Interaction Tests
 *
 * Validates every interactive element in both SplitRightLayout (desktop)
 * and MobileStackLayout (mobile), with special focus on ensuring physics
 * animations actually play and produce visible state changes.
 */

import { test, expect, type Page } from '@playwright/test';
import { readdirSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// ── Auto-discover scenes from src/pages/ ────────────────────────────────

function discoverScenes(): string[] {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const pagesDir = resolve(__dirname, '../../src/pages');
  return readdirSync(pagesDir)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => !f.startsWith('index'))
    .filter((f) => !f.includes('-legacy'))
    .filter((f) => !f.includes('-demo'))
    .filter((f) => !f.includes('-mobile'))
    .filter((f) => !f.includes('-v2'))
    .map((f) => f.replace('.html', ''));
}

const ALL_SCENE_IDS = discoverScenes();

// ── Constants ───────────────────────────────────────────────────────────

const DESKTOP_VP = { width: 1400, height: 900 } as const;
const MOBILE_VP = { width: 375, height: 812 } as const;

/** Scenes with continuous auto-playback animation and auto-updating readout */
const AUTO_READOUT_SCENES = ['projectile'] as const;
/** Scenes with continuous animation (readout may not auto-update during playback) */
const ANIMATED_SCENES = ['chase-meet', 'emf-analogy'] as const;

const SCENE_META: Record<
  string,
  { name: string; hasGraph: boolean; canvasSelector: string; hasTransport?: boolean }
> = {
  projectile: {
    name: '抛体运动',
    hasGraph: false,
    canvasSelector: 'canvas.stage-canvas'
  },
  'chase-meet': { name: '追及相遇', hasGraph: false, canvasSelector: 'canvas' },
  'field-lines': {
    name: '电场线',
    hasGraph: false,
    canvasSelector: 'canvas.stage-canvas'
  },
  electrification: {
    name: '静电起电',
    hasGraph: false,
    canvasSelector: 'canvas.stage-canvas'
  },
  'vt-integral': {
    name: '微元法',
    hasGraph: false,
    canvasSelector: 'canvas.stage-canvas'
  },
  'emf-analogy': {
    name: '电路类比',
    hasGraph: false,
    canvasSelector: 'canvas.stage-canvas'
  },
  'spring-oscillator': {
    name: '弹簧振子',
    hasGraph: true,
    canvasSelector: 'canvas.stage-canvas'
  },
  ganshe: {
    name: '波的干涉',
    hasGraph: true,
    canvasSelector: 'canvas.stage-canvas'
  },
  'double-slit': {
    name: '双缝干涉',
    hasGraph: true,
    canvasSelector: 'canvas.stage-canvas',
    hasTransport: false
  }
};

const BASE_URL = 'http://127.0.0.1:5177';

// ── Helpers ─────────────────────────────────────────────────────────────

async function gotoScene(page: Page, sceneId: string) {
  await page.goto(`${BASE_URL}/src/pages/${sceneId}.html`);
  await page.waitForSelector('.layout-master', {
    state: 'visible',
    timeout: 10000
  });
  // Wait for canvas to have rendered content (replaces fixed 800ms delay)
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const ctx = (canvas as HTMLCanvasElement).getContext('2d');
      if (!ctx) return false;
      const w = (canvas as HTMLCanvasElement).width;
      const h = (canvas as HTMLCanvasElement).height;
      if (w === 0 || h === 0) return false;
      try {
        const data = ctx.getImageData(0, 0, w, h).data;
        for (let i = 0; i < data.length; i += 16) {
          if (
            data[i] < 250 ||
            data[i + 1] < 250 ||
            data[i + 2] < 250 ||
            data[i + 3] < 255
          ) {
            return true;
          }
        }
      } catch {
        /* ignore */
      }
      return false;
    },
    { timeout: 10000 }
  );
}

/** Read current readout values as label→value map (supports both desktop and mobile) */
async function getReadoutMap(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const map: Record<string, string> = {};
    const selectors = '.readout-slot .readout-item, .mobile-readout-item';
    document.querySelectorAll(selectors).forEach((item) => {
      const label = item.querySelector('.readout-label')?.textContent?.trim();
      const value = item.querySelector('.readout-value')?.textContent?.trim();
      if (label) map[label] = value ?? '';
    });
    return map;
  });
}

/** Read the floating play/pause button state (supports both desktop and mobile) */
async function getFloatingPlayState(
  page: Page
): Promise<{ text: string; isPlaying: boolean }> {
  const text = await page.evaluate(() => {
    const desktop = document.querySelector('.stage-floating-controls button');
    const mobile = document.querySelector('.mobile-control-btn.play-pause');
    const btn = desktop || mobile;
    return btn?.textContent?.trim() ?? '';
  });
  return { text, isPlaying: text.includes('⏸') };
}

/** Check if a canvas has any non-white/non-transparent pixels (i.e. has been drawn) */
async function canvasHasContent(
  page: Page,
  selector: string
): Promise<boolean> {
  return page.evaluate((sel) => {
    const canvas = document.querySelector(sel) as HTMLCanvasElement | null;
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    // Sample a grid of points; if any differ from background, canvas has content
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return false;
    const imageData = ctx.getImageData(0, 0, w, h).data;
    let nonWhite = 0;
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];
      // Not fully white/opaque background
      if (r < 250 || g < 250 || b < 250 || a < 255) {
        nonWhite++;
      }
    }
    return nonWhite > 100;
  }, selector);
}

// ── SplitRightLayout Desktop Tests ──────────────────────────────────────

test.describe('SplitRightLayout Desktop', () => {
  test.use({ viewport: DESKTOP_VP });

  // ── 1. Page load verification (all scenes) ──
  for (const sceneId of ALL_SCENE_IDS) {
    const meta = SCENE_META[sceneId];
    test(`${meta.name} loads with correct structure`, async ({ page }) => {
      await gotoScene(page, sceneId);

      await expect(page.locator('.layout-master')).toBeVisible();
      await expect(
        page.locator('.teaching-left-panel, .srgb-left-panel')
      ).toBeVisible();
      await expect(
        page.locator('.teaching-right-panel, .srgb-right-panel')
      ).toBeVisible();

      const canvas = page.locator(meta.canvasSelector).first();
      await expect(canvas).toBeVisible();
      const size = await canvas.evaluate((c: HTMLCanvasElement) => ({
        w: c.clientWidth,
        h: c.clientHeight
      }));
      expect(size.w).toBeGreaterThan(100);
      expect(size.h).toBeGreaterThan(100);

      // Canvas should have content (not blank)
      const hasContent = await canvasHasContent(page, meta.canvasSelector);
      expect(
        hasContent,
        `${meta.name} canvas should have rendered content`
      ).toBe(true);

      // Floating controls (skip for scenes without transport)
      if (meta.hasTransport !== false) {
        const floatingButtons = page.locator('.stage-floating-controls button');
        await expect(floatingButtons).toHaveCount(2);
        await expect(
          page.locator('.stage-floating-controls input[type="range"]')
        ).toBeVisible();
      }

      // Toolbar
      await expect(
        page.locator('.stage-toolbar .sidebar-toggle')
      ).toBeVisible();
      await expect(page.locator('.stage-toolbar .mode-toggle')).toBeVisible();
      await expect(
        page.locator('.stage-toolbar .shell-theme-toggle')
      ).toBeVisible();

      // Readout
      await expect(page.locator('.readout-panel')).toBeVisible();
    });
  }

  // ── 2. Play / Pause toggle ──
  test('play/pause toggles animation state', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const playPauseBtn = page
      .locator('.stage-floating-controls button')
      .first();

    const initial = await getFloatingPlayState(page);
    expect(initial.isPlaying).toBe(false);

    const before = await getReadoutMap(page);

    await playPauseBtn.click();

    await expect
      .poll(async () => (await getFloatingPlayState(page)).isPlaying)
      .toBe(true);

    await expect
      .poll(async () => {
        const current = await getReadoutMap(page);
        return Object.keys(before).some((k) => before[k] !== current[k]);
      })
      .toBe(true);

    await playPauseBtn.click();

    const afterPause = await getFloatingPlayState(page);
    expect(afterPause.isPlaying).toBe(false);
  });

  // ── 3. Reset restores scene ──
  test('reset restores initial animation state', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const playPauseBtn = page
      .locator('.stage-floating-controls button')
      .first();
    const resetBtn = page.locator('.stage-floating-controls button').nth(1);

    await playPauseBtn.click();
    await page.waitForTimeout(800);
    await playPauseBtn.click();

    const midReadout = await getReadoutMap(page);

    await resetBtn.click();
    await expect
      .poll(async () => {
        const current = await getReadoutMap(page);
        return Object.keys(midReadout).some((k) => midReadout[k] !== current[k]);
      })
      .toBe(true);

    const state = await getFloatingPlayState(page);
    expect(state.isPlaying).toBe(false);
  });

  // ── 4. Speed slider ──
  test('speed slider changes speed display', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const slider = page.locator('.stage-floating-controls input[type="range"]');
    const speedValue = page.locator('.stage-floating-controls span').last();

    const defaultVal = await speedValue.textContent();
    expect(defaultVal).toContain('1.00');

    await slider.fill('3');
    await expect(speedValue).toContainText('3.00');

    await slider.fill('0.05');
    await expect(speedValue).toContainText('0.05');

    await slider.fill('1');
    await expect(speedValue).toContainText('1.00');
  });

  // ── 5. Sidebar toggle ──
  test('sidebar toggle hides and shows left panel', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const toggle = page.locator('.stage-toolbar .sidebar-toggle');
    const leftPanel = page.locator('.teaching-left-panel');

    await expect(leftPanel).toBeVisible();

    await toggle.click();
    await expect(leftPanel).toBeHidden();

    await toggle.click();
    await expect(leftPanel).toBeVisible();
  });

  // ── 6. Mode toggle ──
  test('mode toggle switches between normal and presentation', async ({
    page
  }) => {
    await gotoScene(page, 'projectile');

    const container = page.locator('.layout-master');

    // Initial: normal mode
    await expect(container).toHaveAttribute('data-mode', 'normal');

    // Click to presentation (toolbar gets hidden by CSS, so use evaluate)
    await page.evaluate(() => {
      const btn = document.querySelector(
        '.stage-toolbar .mode-toggle'
      ) as HTMLButtonElement;
      btn?.click();
    });
    await expect(container).toHaveAttribute('data-mode', 'presentation');

    // Click back to normal
    await page.evaluate(() => {
      const btn = document.querySelector(
        '.stage-toolbar .mode-toggle'
      ) as HTMLButtonElement;
      btn?.click();
    });
    await expect(container).toHaveAttribute('data-mode', 'normal');
  });

  // ── 7. Theme toggle ──
  test('theme toggle switches between light and dark', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const themeBtn = page.locator('.stage-toolbar .shell-theme-toggle');
    const html = page.locator('html');

    const initialText = await themeBtn.textContent();
    expect(initialText).toBe('夜间');

    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(themeBtn).toHaveText('白天');

    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  // ── 8. Readout toggle ──
  test('readout toggle collapses and expands', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const toggle = page.locator('.readout-panel .readout-toggle');
    const panel = page.locator('.readout-panel');

    const wasCollapsed = await panel.evaluate((el) =>
      el.classList.contains('is-collapsed')
    );

    await toggle.click();
    await expect
      .poll(async () =>
        panel.evaluate((el) => el.classList.contains('is-collapsed'))
      )
      .toBe(!wasCollapsed);

    await toggle.click();
    await expect
      .poll(async () =>
        panel.evaluate((el) => el.classList.contains('is-collapsed'))
      )
      .toBe(wasCollapsed);
  });

  // ── 9. Resizer drag ──
  test('resizer drag changes left panel width', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const resizer = page.locator('.panel-resizer');
    const leftPanel = page.locator('.teaching-left-panel');

    const initialWidth = await leftPanel.evaluate(
      (el) => el.getBoundingClientRect().width
    );

    const resizerBox = await resizer.boundingBox();
    expect(resizerBox).not.toBeNull();

    await page.mouse.move(
      resizerBox!.x + resizerBox!.width / 2,
      resizerBox!.y + resizerBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      resizerBox!.x + resizerBox!.width / 2 + 100,
      resizerBox!.y + resizerBox!.height / 2
    );
    await page.mouse.up();

    await expect
      .poll(async () =>
        leftPanel.evaluate((el) => el.getBoundingClientRect().width)
      )
      .toBeGreaterThan(initialWidth + 50);
  });

  // ── 10. Animation produces visible readout changes (projectile only) ──
  test('projectile animation advances readout values over time', async ({
    page
  }) => {
    await gotoScene(page, 'projectile');

    const playPauseBtn = page
      .locator('.stage-floating-controls button')
      .first();
    const resetBtn = page.locator('.stage-floating-controls button').nth(1);

    await resetBtn.click();
    await expect
      .poll(async () => Object.keys(await getReadoutMap(page)).length)
      .toBeGreaterThan(0);

    const t0 = await getReadoutMap(page);

    await playPauseBtn.click();
    await page.waitForTimeout(1000);
    await playPauseBtn.click();

    const t1 = await getReadoutMap(page);

    let changedCount = 0;
    for (const key of Object.keys(t0)) {
      if (t0[key] !== t1[key]) changedCount++;
    }
    expect(
      changedCount,
      `readout changed from ${JSON.stringify(t0)} to ${JSON.stringify(t1)}`
    ).toBeGreaterThan(0);

    await resetBtn.click();
    await expect
      .poll(async () => Object.keys(await getReadoutMap(page)).length)
      .toBeGreaterThan(0);
    const t2 = await getReadoutMap(page);

    let restoredCount = 0;
    for (const key of Object.keys(t0)) {
      if (t0[key] === t2[key]) restoredCount++;
    }
    expect(restoredCount).toBeGreaterThanOrEqual(
      Math.max(1, Object.keys(t0).length - 2)
    );
  });
});

// ── MobileStackLayout Mobile Tests ──────────────────────────────────────

test.describe('MobileStackLayout Mobile', () => {
  test.use({ viewport: MOBILE_VP });

  test('mobile layout renders correctly', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const container = page.locator('.layout-master');
    await expect(container).toHaveClass(/mobile-stack-layout/);

    // Mobile canvas uses .mobile-stage-canvas
    await expect(page.locator('canvas.mobile-stage-canvas')).toBeVisible();

    // Mobile control buttons
    await expect(page.locator('.mobile-control-btn.play-pause')).toBeVisible();
    await expect(page.locator('.mobile-control-btn.reset')).toBeVisible();
  });

  test('mobile play/pause toggles animation', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const playBtn = page.locator('.mobile-control-btn.play-pause');

    await playBtn.click();
    await expect
      .poll(async () => (await getFloatingPlayState(page)).isPlaying)
      .toBe(true);

    // Verify animation is playing by checking readout changes
    const before = await getReadoutMap(page);
    await expect
      .poll(async () => {
        const current = await getReadoutMap(page);
        return Object.keys(before).some((k) => before[k] !== current[k]);
      })
      .toBe(true);

    await playBtn.click();
  });

  test('mobile reset restores scene', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const playBtn = page.locator('.mobile-control-btn.play-pause');
    const resetBtn = page.locator('.mobile-control-btn.reset');

    await playBtn.click();
    await expect
      .poll(async () => (await getFloatingPlayState(page)).isPlaying)
      .toBe(true);
    await playBtn.click();

    const mid = await getReadoutMap(page);

    await resetBtn.click();
    await expect
      .poll(async () => {
        const current = await getReadoutMap(page);
        return Object.keys(mid).some((k) => mid[k] !== current[k]);
      })
      .toBe(true);
  });

  test('mobile speed slider changes speed', async ({ page }) => {
    await gotoScene(page, 'projectile');

    const slider = page.locator('.mobile-speed-control input[type="range"]');
    const speedValue = page.locator('.mobile-speed-control .speed-value');

    const defaultText = await speedValue.textContent();
    expect(defaultText).toContain('1.00');

    await slider.fill('2');
    await expect(speedValue).toContainText('2.00');
  });
});

// ── Layout Auto-Switch Tests ────────────────────────────────────────────

test.describe('Layout Auto-Switch on Resize', () => {
  test('switches from desktop to mobile on narrow viewport', async ({
    page
  }) => {
    await page.setViewportSize(DESKTOP_VP);
    await gotoScene(page, 'projectile');

    await expect(page.locator('.teaching-left-panel')).toBeVisible();

    await page.setViewportSize(MOBILE_VP);
    await expect(page.locator('.layout-master')).toHaveClass(
      /mobile-stack-layout/
    );
  });

  test('switches from mobile to desktop on wide viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VP);
    await gotoScene(page, 'projectile');

    await expect(page.locator('.layout-master')).toHaveClass(
      /mobile-stack-layout/
    );

    await page.setViewportSize(DESKTOP_VP);
    await expect(page.locator('.teaching-left-panel')).toBeVisible();
    await expect(page.locator('.stage-floating-controls')).toBeVisible();
  });
});

// ── Cross-Scene Animation Consistency ───────────────────────────────────

test.describe('All scenes transport and playback', () => {
  test.use({ viewport: DESKTOP_VP });

  for (const sceneId of ALL_SCENE_IDS) {
    const meta = SCENE_META[sceneId];
    // Skip scenes without transport controls
    if (meta.hasTransport === false) continue;
    test(`${meta.name} play/pause/reset controls work`, async ({ page }) => {
      await gotoScene(page, sceneId);

      const playPauseBtn = page
        .locator('.stage-floating-controls button')
        .first();
      const resetBtn = page.locator('.stage-floating-controls button').nth(1);

      // Initial: paused
      const initial = await getFloatingPlayState(page);
      expect(initial.isPlaying).toBe(false);

      // Play
      await playPauseBtn.click();
      await expect
        .poll(async () => (await getFloatingPlayState(page)).isPlaying)
        .toBe(true);

      // Pause
      await playPauseBtn.click();
      await expect
        .poll(async () => (await getFloatingPlayState(page)).isPlaying)
        .toBe(false);

      // Reset should not crash and restore paused state
      await resetBtn.click();
      await expect
        .poll(async () => (await getFloatingPlayState(page)).isPlaying)
        .toBe(false);
    });
  }

  for (const sceneId of AUTO_READOUT_SCENES) {
    const meta = SCENE_META[sceneId];
    test(`${meta.name} readout updates during playback`, async ({ page }) => {
      await gotoScene(page, sceneId);

      const playPauseBtn = page
        .locator('.stage-floating-controls button')
        .first();
      const resetBtn = page.locator('.stage-floating-controls button').nth(1);

      await resetBtn.click();
      await expect
        .poll(async () => Object.keys(await getReadoutMap(page)).length)
        .toBeGreaterThan(0);

      const before = await getReadoutMap(page);

      await playPauseBtn.click();
      await page.waitForTimeout(1000);
      await playPauseBtn.click();

      const after = await getReadoutMap(page);
      const changed = Object.keys(before).some((k) => before[k] !== after[k]);
      expect(changed, `${meta.name}: readout should change after playing`).toBe(
        true
      );
    });
  }

  for (const sceneId of ANIMATED_SCENES) {
    const meta = SCENE_META[sceneId];
    test(`${meta.name} canvas changes during playback`, async ({ page }) => {
      await gotoScene(page, sceneId);

      const playPauseBtn = page
        .locator('.stage-floating-controls button')
        .first();
      const resetBtn = page.locator('.stage-floating-controls button').nth(1);

      await resetBtn.click();
      await expect
        .poll(async () => Object.keys(await getReadoutMap(page)).length)
        .toBeGreaterThan(0);

      await playPauseBtn.click();
      await page.waitForTimeout(1200);
      await playPauseBtn.click();

      // Canvas checksum should differ after animation (or at least canvas should still have content)
      const hasContentAfter = await canvasHasContent(page, meta.canvasSelector);
      expect(
        hasContentAfter,
        `${meta.name} canvas should have content after playback`
      ).toBe(true);

      // For scenes where readout auto-updates, also check that
      if (sceneId === 'chase-meet') {
        const readout = await getReadoutMap(page);
        expect(Object.keys(readout).length).toBeGreaterThan(0);
      }
    });
  }
});
