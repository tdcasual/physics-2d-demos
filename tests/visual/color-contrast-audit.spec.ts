import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { sceneIds, scenePage } from './scene-pages';

const PORT = 5177;

/**
 * 颜色对比度审计（WCAG 2.1 AA）
 *
 * 使用 axe-core 自动检测文本/背景对比度不足的问题。
 */
for (const scene of sceneIds) {
  test(`color contrast (light theme): ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}${scenePage(scene)}`, {
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-layout-id]')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    const severeViolations = accessibilityScanResults.violations.filter(
      (violation) =>
        violation.impact === 'critical' || violation.impact === 'serious'
    );

    if (contrastViolations.length > 0) {
      console.log(
        `${scene} light contrast issues:`,
        JSON.stringify(
          contrastViolations.map((v) => ({
            description: v.description,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              failureSummary: n.failureSummary
            }))
          })),
          null,
          2
        )
      );
    }

    expect(
      contrastViolations.length,
      `${scene} (light): should have 0 color-contrast violations`
    ).toBe(0);
    expect(
      severeViolations,
      `${scene} (light): should have no serious or critical WCAG violations`
    ).toEqual([]);
  });

  test(`color contrast (dark theme): ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(
      `http://127.0.0.1:${PORT}${scenePage(scene, '?theme=dark')}`,
      { waitUntil: 'domcontentloaded' }
    );
    await expect(page.locator('[data-layout-id]')).toBeVisible();

    // 确保 dark theme 已生效
    const htmlTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    if (htmlTheme !== 'dark') {
      // 尝试通过按键切换
      await page.keyboard.press('t');
      await page.waitForTimeout(300);
    }

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    const severeViolations = accessibilityScanResults.violations.filter(
      (violation) =>
        violation.impact === 'critical' || violation.impact === 'serious'
    );

    if (contrastViolations.length > 0) {
      console.log(
        `${scene} dark contrast issues:`,
        JSON.stringify(
          contrastViolations.map((v) => ({
            description: v.description,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              failureSummary: n.failureSummary
            }))
          })),
          null,
          2
        )
      );
    }

    expect(
      contrastViolations.length,
      `${scene} (dark): should have 0 color-contrast violations`
    ).toBe(0);
    expect(
      severeViolations,
      `${scene} (dark): should have no serious or critical WCAG violations`
    ).toEqual([]);
  });
}

// 移动视口（375×667）浅色主题对比度覆盖：首页 + 2 个代表场景。
// chase-meet 在 mobile-stack 下带图表 tab，需先切换 tab 再跑 axe。
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const MOBILE_PAGES: { id: string; path: string; graphTab: boolean }[] = [
  { id: 'home', path: '/', graphTab: false },
  { id: 'projectile', path: scenePage('projectile'), graphTab: false },
  { id: 'chase-meet', path: scenePage('chase-meet'), graphTab: true }
];

for (const target of MOBILE_PAGES) {
  test(`color contrast mobile 375x667 (light theme): ${target.id}`, async ({
    page
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${PORT}${target.path}`, {
      waitUntil: 'domcontentloaded'
    });

    if (target.id === 'home') {
      await expect(page.locator('body')).toBeVisible();
    } else {
      await expect(page.locator('[data-layout-id]')).toBeVisible();
      await expect(page.locator('.mobile-tab-bar')).toBeVisible();
    }

    if (target.graphTab) {
      const graphTab = page.locator('.mobile-tab', { hasText: '图表' });
      await expect(graphTab).toBeVisible();
      await graphTab.click();
      await expect(page.locator('#mobile-panel-graph')).toBeVisible();
    }

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    if (contrastViolations.length > 0) {
      console.log(
        `${target.id} mobile light contrast issues:`,
        JSON.stringify(
          contrastViolations.map((v) => ({
            description: v.description,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              failureSummary: n.failureSummary
            }))
          })),
          null,
          2
        )
      );
    }

    expect(
      contrastViolations.length,
      `${target.id} (mobile, light): should have 0 color-contrast violations`
    ).toBe(0);
  });
}
