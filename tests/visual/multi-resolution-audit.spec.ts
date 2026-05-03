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

/**
 * 多分辨率布局审计
 *
 * 验证所有场景在常见设备尺寸下的布局完整性。
 * 覆盖手机、大屏手机、平板的竖屏模式。
 */
const VIEWPORTS = [
  { name: 'iPhone-SE', width: 375, height: 667 },
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPhone-14-Pro-Max', width: 430, height: 932 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'iPad-Pro-11', width: 834, height: 1194 }
] as const;

for (const vp of VIEWPORTS) {
  test(`layout audit ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

    for (const scene of SCENES) {
      await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene}.html`, {
        waitUntil: 'networkidle'
      });
      await page.waitForTimeout(1500);

      // 1. 无水平溢出
      const hOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(
        hOverflow,
        `${scene} on ${vp.name}: horizontal overflow ${hOverflow}px`
      ).toBeLessThanOrEqual(2);

      // 2. Canvas 可见且尺寸合理
      const canvasInfo = await page.evaluate(() => {
        const canvases = document.querySelectorAll('canvas');
        return Array.from(canvases).map((c) => ({
          w: c.clientWidth,
          h: c.clientHeight,
          hasScale: c.dataset.responsiveScale !== undefined,
          scale: c.dataset.responsiveScale
            ? parseFloat(c.dataset.responsiveScale)
            : null
        }));
      });

      expect(
        canvasInfo.length,
        `${scene} on ${vp.name}: no canvas found`
      ).toBeGreaterThan(0);

      for (const c of canvasInfo) {
        expect(
          c.w > 50 && c.h > 50,
          `${scene} on ${vp.name}: canvas too small (${c.w}x${c.h})`
        ).toBe(true);
        expect(
          c.hasScale,
          `${scene} on ${vp.name}: canvas missing responsiveScale`
        ).toBe(true);
        if (c.scale !== null) {
          expect(c.scale).toBeGreaterThanOrEqual(0.3);
          expect(c.scale).toBeLessThanOrEqual(1.5);
        }
      }

      // 3. 控制面板存在
      const controlVisible = await page
        .locator('.mobile-control-section, .control-slot')
        .isVisible()
        .catch(() => false);
      expect(
        controlVisible,
        `${scene} on ${vp.name}: control section not visible`
      ).toBe(true);
    }

    expect(errors).toEqual([]);
  });
}
