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
 * Canvas 响应式缩放审计
 *
 * 验证所有场景在移动端是否正确设置了 responsiveScale，
 * 防止新场景使用裸数字导致元素过大。
 */
for (const scene of SCENES) {
  test(`canvas responsive scale audit: ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene}.html`, {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);

    const audit = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).map((c) => {
        const scale = c.dataset.responsiveScale;
        return {
          className: c.className.substring(0, 40),
          width: c.clientWidth,
          height: c.clientHeight,
          hasResponsiveScale: scale !== undefined,
          responsiveScale: scale ? parseFloat(scale) : null,
          pixelCount: c.width * c.height
        };
      });
    });

    // 每个 canvas 都必须有 responsiveScale（使用标准工具的标记）
    for (const c of audit) {
      expect(
        c.hasResponsiveScale,
        `${scene}: canvas "${c.className}" 未设置 data-responsive-scale。` +
          `请使用 sizeCanvasToFill/sizeCanvasToFit 或手动设置 canvas.dataset.responsiveScale。` +
          `详见 AGENTS.md "Canvas 响应式渲染规范"。`
      ).toBe(true);
    }

    // responsiveScale 值必须在合理范围内
    for (const c of audit) {
      if (c.responsiveScale !== null) {
        expect(
          c.responsiveScale,
          `${scene}: canvas "${c.className}" 的 responsiveScale 应在 [0.3, 1.5] 范围内`
        ).toBeGreaterThanOrEqual(0.3);
        expect(
          c.responsiveScale,
          `${scene}: canvas "${c.className}" 的 responsiveScale 应在 [0.3, 1.5] 范围内`
        ).toBeLessThanOrEqual(1.5);
      }
    }

    // 移动端 canvas 尺寸检查：至少有一个可见的 canvas
    const visibleCanvases = audit.filter((c) => c.width > 100 && c.height > 80);
    expect(
      visibleCanvases.length,
      `${scene}: 移动端应至少有一个可见 canvas (w>100, h>80)`
    ).toBeGreaterThan(0);

    // 截图保存供人工审查
    await page.screenshot({
      path: `/tmp/audit-scale-${scene}-mobile.png`,
      fullPage: false
    });
  });
}
