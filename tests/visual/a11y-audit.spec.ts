import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { sceneIds, scenePage } from './scene-pages';

const PORT = 5177;

const PAGE_PATHS = ['/', '/src/pages/instruments.html'];

// axe 的 wcag2a 规则集包含 label / button-name 等命名规则，
// 场景页此前只有键盘与对比度断言，label 缺失不会被任何测试抓到。
const AXE_TAGS = ['wcag2a', 'wcag2aa'];

function severeViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations.filter(
    (violation) =>
      violation.impact === 'critical' || violation.impact === 'serious'
  );
}

for (const scene of sceneIds) {
  test(`axe critical/serious violations: ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${PORT}${scenePage(scene)}`, {
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-layout-id]')).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(
      severeViolations(results),
      `${scene} should have no critical or serious WCAG violations`
    ).toEqual([]);
  });
}

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

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    const severe = severeViolations(results);

    expect(
      severe,
      `${path} should have no critical or serious WCAG violations`
    ).toEqual([]);
  });
}

// 移动视口（375×667）覆盖：首页 + 2 个代表场景。
// chase-meet 在 mobile-stack 下带图表 tab，图表位于非激活面板，
// 需先切换 tab 再跑 axe（display:none 面板会被 axe 跳过）。
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const MOBILE_PAGES: { id: string; path: string; graphTab: boolean }[] = [
  { id: 'home', path: '/', graphTab: false },
  { id: 'projectile', path: scenePage('projectile'), graphTab: false },
  { id: 'chase-meet', path: scenePage('chase-meet'), graphTab: true }
];

for (const target of MOBILE_PAGES) {
  test(`axe mobile 375x667: ${target.id}`, async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${PORT}${target.path}`, {
      waitUntil: 'domcontentloaded'
    });

    if (target.id === 'home') {
      await expect(page.locator('body')).toBeVisible();
    } else {
      await expect(page.locator('[data-layout-id]')).toBeVisible();
      // 确认已进入 mobile-stack 布局（tab 栏出现）
      await expect(page.locator('.mobile-tab-bar')).toBeVisible();
    }

    if (target.graphTab) {
      const graphTab = page.locator('.mobile-tab', { hasText: '图表' });
      await expect(graphTab).toBeVisible();
      await graphTab.click();
      await expect(page.locator('#mobile-panel-graph')).toBeVisible();
    }

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(
      severeViolations(results),
      `${target.id} (mobile) should have no critical or serious WCAG violations`
    ).toEqual([]);
  });
}
