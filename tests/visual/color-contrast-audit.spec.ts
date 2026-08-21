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
    await page.waitForTimeout(1500);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
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
  });

  test(`color contrast (dark theme): ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(
      `http://127.0.0.1:${PORT}${scenePage(scene, '?theme=dark')}`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForTimeout(1500);

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
  });
}
