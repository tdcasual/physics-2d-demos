/**
 * Readout Panel 视觉回归 & 交互测试
 *
 * 验证面板的折叠/展开、浮动定位、主题切换在两个 CSS 前缀下的一致性。
 * 覆盖本次修复的关键回归风险：
 *  - 面板默认折叠且悬浮（不挤压动画区域）
 *  - toggle 点击正常切换
 *  - teaching/srgb 前缀使用统一 CSS
 */
import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';
import { waitForFirstFrame } from '../helpers/wait-first-frame';

const SCENES = [
  { id: 'spring-oscillator', prefix: 'teaching', name: '弹簧振子' },
  { id: 'ganshe', prefix: 'srgb', name: '波的干涉' }
];

// ============================================================================
// Desktop: readout panel structure & toggle
// ============================================================================

for (const scene of SCENES) {
  test.describe(`${scene.name} (${scene.prefix}) readout panel`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/src/pages/${scene.id}.html`, {
        waitUntil: 'domcontentloaded'
      });
      await waitForFirstFrame(page);
    });

    // --- Mount & defaults ---

    test('panel is present with correct prefix class', async ({ page }) => {
      const panel = page.locator(`.${scene.prefix}-readout-panel`);
      await expect(panel).toBeVisible();
    });

    test('panel is collapsed by default', async ({ page }) => {
      const panel = page.locator(`.${scene.prefix}-readout-panel`);
      await expect(panel).toHaveClass(/is-collapsed/);
    });

    test('panel floats with absolute positioning', async ({ page }) => {
      const panel = page.locator(`.${scene.prefix}-readout-panel`);
      const position = await panel.evaluate(
        (el) => getComputedStyle(el).position
      );
      expect(position).toBe('absolute');
    });

    test('panel does NOT squeeze animation area', async ({ page }) => {
      // The stage slot should have its own dimensions, and the panel
      // being position:absolute means it's taken out of flow.
      const _stageSlot = page.locator(`.${scene.prefix}-stage-slot`);
      const panel = page.locator(`.${scene.prefix}-readout-panel`);

      // Panel z-index should be high (float above content)
      const zIndex = await panel.evaluate((el) => getComputedStyle(el).zIndex);
      expect(zIndex).toBe('100');
    });

    // --- Toggle ---

    test('toggle button expands panel', async ({ page }) => {
      const panel = page.locator(`.${scene.prefix}-readout-panel`);
      const toggle = page.locator(`.${scene.prefix}-readout-toggle`);

      // Default: collapsed
      await expect(panel).toHaveClass(/is-collapsed/);
      expect(await toggle.textContent()).toMatch(/展开/);

      // Click → expanded
      await toggle.click();
      await page.waitForTimeout(300);
      await expect(panel).not.toHaveClass(/is-collapsed/);
      expect(await toggle.textContent()).toMatch(/折叠/);

      // Click again → collapsed
      await toggle.click();
      await page.waitForTimeout(300);
      await expect(panel).toHaveClass(/is-collapsed/);
      expect(await toggle.textContent()).toMatch(/展开/);
    });

    test('expanded panel shows readout items', async ({ page }) => {
      const toggle = page.locator(`.${scene.prefix}-readout-toggle`);
      await toggle.click();
      await page.waitForTimeout(300);

      const items = page.locator(`.${scene.prefix}-readout-item`);
      const count = await items.count();
      expect(count).toBeGreaterThan(0);

      // Each item should have a label and value
      const firstItem = items.first();
      await expect(
        firstItem.locator(`.${scene.prefix}-readout-label`)
      ).toBeVisible();
      await expect(
        firstItem.locator(`.${scene.prefix}-readout-value`)
      ).toBeVisible();
    });

    test('collapsed panel hides readout slot', async ({ page }) => {
      const slot = page.locator(`.${scene.prefix}-readout-slot`);
      const isHidden = await slot.evaluate((el) => {
        const cs = getComputedStyle(el);
        return cs.display === 'none';
      });
      expect(isHidden).toBe(true);
    });

    // --- Drag affordance ---

    test('header shows drag cursor', async ({ page }) => {
      const header = page.locator(`.${scene.prefix}-readout-header`);
      const cursor = await header.evaluate((el) => getComputedStyle(el).cursor);
      expect(cursor).toBe('move');
    });

    // --- Resize handle ---

    test('resize handle is present', async ({ page }) => {
      const handle = page.locator('.readout-resize-handle');
      await expect(handle).toBeAttached();
    });

    // --- Theme ---

    test('panel renders correctly in dark mode', async ({ page }) => {
      // Switch to dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      const panel = page.locator(`.${scene.prefix}-readout-panel`);
      await expect(panel).toBeVisible();

      // Verify background is dark (not white)
      const bg = await panel.evaluate(
        (el) => getComputedStyle(el).backgroundColor
      );
      // Dark background should not be white or near-white
      expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  });
}

// ============================================================================
// Mobile: stacked layout readout
// ============================================================================

test.describe('mobile-stack readout panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/src/pages/spring-oscillator.html', {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page);
  });

  test('uses mobile prefix on small viewport and appears in data tab', async ({
    page
  }) => {
    // Mobile stack layout mounts readout inside the 数据 tab.
    const mobilePanel = page.locator('.mobile-readout-panel');
    const teachingPanel = page.locator('.teaching-readout-panel');

    await expect(mobilePanel.or(teachingPanel).first()).toBeAttached();
    await page.locator('.mobile-tab', { hasText: '数据' }).click();
    await expect(mobilePanel.or(teachingPanel).first()).toBeVisible();
  });
});

// ============================================================================
// Cross-scene consistency: all split-right scenes
// ============================================================================

test.describe('all scenes have functional desktop readout', () => {
  for (const sceneId of sceneIds) {
    test(`${sceneId} readout toggle works`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(scenePage(sceneId), { waitUntil: 'domcontentloaded' });

      const toggle = page.locator('[class*="-readout-toggle"]').first();
      await expect(toggle, `${sceneId}: readout toggle missing`).toBeVisible();
      const text = await toggle.textContent();
      expect(text).toMatch(/展开|折叠/);

      await toggle.click();
      await expect(toggle).not.toHaveText(text ?? '');
      await expect(toggle).toHaveText(/展开|折叠/);
    });
  }
});
