import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

const PORT = 5177;

for (const scene of sceneIds) {
  test(`touch policy on ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://127.0.0.1:${PORT}${scenePage(scene)}`, {
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

    // 移动端非激活 tab 面板内的 canvas 是 display:none（设计如此，
    // 例如 chase-meet 的图表 canvas 位于图表 tab），不计入检查。
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
