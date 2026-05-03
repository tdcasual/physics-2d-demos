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
  test(`keyboard navigation: ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene}.html`, {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(1500);

    // 收集所有可聚焦元素
    const focusable = await page.evaluate(() => {
      const selector =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(document.querySelectorAll(selector)).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 30) || '',
        ariaLabel: el.getAttribute('aria-label') || ''
      }));
    });

    expect(
      focusable.length,
      `${scene}: should have focusable controls`
    ).toBeGreaterThan(0);

    // Tab 遍历前 N 个元素，验证 focus 移动
    let focusedCount = 0;
    for (let i = 0; i < Math.min(focusable.length, 6); i++) {
      await page.keyboard.press('Tab');
      const active = await page.evaluate(() => document.activeElement?.tagName);
      if (active && active !== 'BODY') {
        focusedCount++;
      }
    }
    expect(
      focusedCount,
      `${scene}: Tab should move focus through controls`
    ).toBeGreaterThan(0);
  });

  test(`aria labels: ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene}.html`, {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(1500);

    // 检查 canvas 是否有 aria-label 或 role
    const canvasA11y = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).map((c) => ({
        hasLabel: c.getAttribute('aria-label') !== null,
        hasRole: c.getAttribute('role') !== null,
        hasTitle: c.getAttribute('title') !== null
      }));
    });

    for (const c of canvasA11y) {
      expect(
        c.hasLabel || c.hasRole || c.hasTitle,
        `${scene}: canvas should have aria-label, role, or title`
      ).toBe(true);
    }
  });
}
