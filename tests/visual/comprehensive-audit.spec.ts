import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

const PORT = 5177;
const SCENES = sceneIds.map((id) => ({ id, hasTheme: true, hasPlay: true }));

// ========== DESKTOP AUDIT ==========
for (const scene of SCENES) {
  test(`desktop ${scene.id} full audit`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

    await page.goto(`http://127.0.0.1:${PORT}${scenePage(scene.id)}`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);

    // 1. Layout integrity
    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
        hOverflow: doc.scrollWidth - doc.clientWidth,
        vOverflow: doc.scrollHeight - doc.clientHeight
      };
    });
    expect(layout.hOverflow).toBeLessThanOrEqual(2);

    // 2. Canvas check
    const canvasInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).map((c) => ({
        w: c.clientWidth,
        h: c.clientHeight,
        pixelW: c.width,
        pixelH: c.height,
        visible: c.clientWidth > 50 && c.clientHeight > 50
      }));
    });
    expect(canvasInfo.length).toBeGreaterThan(0);
    for (const c of canvasInfo) {
      expect(c.visible, `Canvas too small: ${c.w}x${c.h}`).toBe(true);
    }

    // 3. Controls check
    const controlCount = await page
      .locator(
        '.control-slot button, .mobile-control-slot button, .schema-control'
      )
      .count();
    expect(controlCount).toBeGreaterThan(0);

    // 4. Theme toggle
    const themeBtn = page.locator('.shell-theme-toggle');
    if (await themeBtn.isVisible().catch(() => false)) {
      await themeBtn.click();
      await page.waitForTimeout(800);
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );
      expect(theme).toBe('dark');
      await themeBtn.click();
      await page.waitForTimeout(800);
    }

    // 5. Play/pause if available
    if (scene.hasPlay) {
      const playBtn = page
        .locator('.play-pause, .mobile-control-btn.play-pause')
        .first();
      if (await playBtn.isVisible().catch(() => false)) {
        await playBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    expect(errors).toEqual([]);
  });
}

// ========== MOBILE AUDIT ==========
for (const scene of SCENES) {
  test(`mobile ${scene.id} full audit`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene.id}.html`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);

    // 1. No horizontal overflow
    const hOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(hOverflow).toBeLessThanOrEqual(2);

    // 2. Canvas visible
    // Canvases inside inactive mobile tab panels are display:none by design
    // (e.g. chase-meet graph canvases behind the graph tab), so exclude them.
    const canvasInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases)
        .filter((c) => {
          const panel = c.closest('.mobile-tab-panel');
          return !panel || panel.classList.contains('active');
        })
        .map((c) => ({
          w: c.clientWidth,
          h: c.clientHeight,
          visible: c.clientWidth > 100 && c.clientHeight > 80
        }));
    });
    expect(canvasInfo.length).toBeGreaterThan(0);
    for (const c of canvasInfo) {
      expect(c.visible, `Mobile canvas too small: ${c.w}x${c.h}`).toBe(true);
    }

    // 3. Control section visible
    const controlVisible = await page
      .locator('.mobile-control-section, .control-slot')
      .isVisible()
      .catch(() => false);
    expect(controlVisible).toBe(true);

    // 4. Font sizes readable
    const fontInfo = await page.evaluate(() => {
      const controls = document.querySelector(
        '.mobile-control-section, .control-slot'
      );
      if (!controls) return null;
      const textEls = controls.querySelectorAll('button, label, span, div');
      const sizes = Array.from(textEls)
        .map((el) => {
          const style = window.getComputedStyle(el);
          return parseFloat(style.fontSize);
        })
        .filter((s) => s > 0);
      return {
        min: Math.min(...sizes),
        max: Math.max(...sizes),
        count: sizes.length
      };
    });
    if (fontInfo) {
      expect(fontInfo.min).toBeGreaterThanOrEqual(10);
    }

    // 5. Resize stability
    await page.setViewportSize({ width: 375, height: 813 });
    await page.waitForTimeout(500);
    const afterResize = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases)
        .filter((c) => {
          const panel = c.closest('.mobile-tab-panel');
          return !panel || panel.classList.contains('active');
        })
        .map((c) => ({
          w: c.clientWidth,
          h: c.clientHeight
        }));
    });
    for (const c of afterResize) {
      expect(c.w).toBeGreaterThan(100);
      expect(c.h).toBeGreaterThan(80);
    }

    expect(errors).toEqual([]);
  });
}

// ========== SCENE-SPECIFIC TESTS ==========
test('vt-integral scene switching', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/src/pages/vt-integral.html`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForTimeout(2000);

  const scenes = ['scene2', 'scene3', 'scene4', 'scene5'];
  for (const s of scenes) {
    const btn = page
      .locator(`button[data-value="${s}"], [data-scene="${s}"]`)
      .first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(800);
      const canvasBox = await page.locator('canvas').first().boundingBox();
      expect(canvasBox?.width).toBeGreaterThan(500);
      expect(canvasBox?.height).toBeGreaterThan(300);
    }
  }
});

test('field-lines touch interaction', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`http://127.0.0.1:${PORT}/src/pages/field-lines.html`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForTimeout(2000);

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  // Simulate touch on canvas via click
  await canvas.click({
    position: { x: (box?.width ?? 200) / 2, y: (box?.height ?? 200) / 2 }
  });
  await page.waitForTimeout(500);

  // Canvas should still be visible after touch
  const afterBox = await canvas.boundingBox();
  expect(afterBox?.width).toBeGreaterThan(100);
});

test('chase-meet mobile graphs visible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`http://127.0.0.1:${PORT}/src/pages/chase-meet.html`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForTimeout(2500);

  const canvases = await page.locator('canvas').all();
  expect(canvases.length).toBeGreaterThanOrEqual(3);

  // Graph canvases live behind the graph tab (inactive tab panels are
  // display:none), so switch to it before measuring.
  await page.locator('.mobile-tab', { hasText: '图表' }).click();
  await page.waitForTimeout(600);

  const visibleCanvases = await page
    .locator('.mobile-stage-slot canvas, #mobile-panel-graph canvas')
    .all();
  expect(visibleCanvases.length).toBeGreaterThanOrEqual(3);

  for (const c of visibleCanvases) {
    const box = await c.boundingBox();
    expect(box?.width).toBeGreaterThan(100);
    expect(box?.height).toBeGreaterThan(50);
  }
});
