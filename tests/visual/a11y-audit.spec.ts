import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { sceneIds, scenePage } from './scene-pages';

const PORT = 5177;

const PAGE_PATHS = ['/', '/src/pages/instruments.html'];

for (const scene of sceneIds) {
  test(`keyboard navigation: ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}${scenePage(scene)}`, {
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-layout-id]')).toBeVisible();

    // 收集所有可聚焦元素
    const focusable = await page.evaluate(() => {
      const selector =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
          );
        })
        .map((el, index) => {
          el.dataset.focusAuditId = String(index);
          return { id: String(index) };
        });
    });

    expect(
      focusable.length,
      `${scene}: should have focusable controls`
    ).toBeGreaterThan(0);

    const focused = new Set<string>();
    const missingIndicators: string[] = [];
    for (let i = 0; i < Math.min(focusable.length, 12); i++) {
      await page.keyboard.press('Tab');
      const active = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        const style = getComputedStyle(element);
        return {
          id: element.dataset.focusAuditId ?? element.tagName,
          hasIndicator:
            (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') ||
            style.boxShadow !== 'none'
        };
      });
      if (active) {
        focused.add(active.id);
        if (!active.hasIndicator) missingIndicators.push(active.id);
      }
    }
    expect(
      focused.size,
      `${scene}: Tab should reach multiple unique controls`
    ).toBeGreaterThanOrEqual(Math.min(3, focusable.length));
    expect(
      missingIndicators,
      `${scene}: keyboard-focused controls need a visible focus indicator`
    ).toEqual([]);
  });

  test(`aria labels: ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene}.html`, {
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-layout-id]')).toBeVisible();

    // 检查 canvas 是否有 aria-label 或 role
    const canvasA11y = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).map((c) => ({
        hasLabel: c.getAttribute('aria-label') !== null,
        hasTitle: c.getAttribute('title') !== null
      }));
    });

    for (const c of canvasA11y) {
      expect(
        c.hasLabel || c.hasTitle,
        `${scene}: canvas should have an accessible name`
      ).toBe(true);
    }
  });
}

for (const path of PAGE_PATHS) {
  test(`critical accessibility violations: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Audit the stable reduced-motion state. Sampling the homepage during its
    // opacity animation makes Axe measure a transient blended text color.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${PORT}${path}`, {
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('body')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const severe = results.violations.filter(
      (violation) =>
        violation.impact === 'critical' || violation.impact === 'serious'
    );

    expect(
      severe,
      `${path} should have no critical or serious WCAG violations`
    ).toEqual([]);
  });
}
