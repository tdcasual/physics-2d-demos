import { test, expect } from '@playwright/test';

const PORT = 5177;
const SCENES = [
  'chase-meet',
  'projectile',
  'emf-analogy',
  'field-lines',
  'electrification',
  'vt-integral'
];

for (const scene of SCENES) {
  test(`touch policy on ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene}.html`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(1500);

    // 验证 canvas 有正确的 touch-action
    const touchActions = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).map(
        (c) => window.getComputedStyle(c).touchAction
      );
    });

    for (const ta of touchActions) {
      expect(
        ta !== '' && ta !== 'auto',
        `${scene}: canvas touch-action should be explicit, got "${ta}"`
      ).toBe(true);
    }
  });

  test(`viewport resilience on ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene}.html`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(1500);

    // 模拟软键盘弹出（视口高度减少）
    await page.setViewportSize({ width: 375, height: 500 });
    await page.waitForTimeout(800);

    const canvasInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).map((c) => ({
        w: c.clientWidth,
        h: c.clientHeight,
        visible: c.clientWidth > 50 && c.clientHeight > 50
      }));
    });

    for (const c of canvasInfo) {
      expect(
        c.visible,
        `${scene}: canvas should remain visible after viewport shrink`
      ).toBe(true);
    }

    // 恢复视口
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
  });
}
