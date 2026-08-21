import { devices, expect, test, type Page } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';

const modernPages = sceneIds.map((id) => scenePage(id));

const iPhone12Use = {
  viewport: devices['iPhone 12'].viewport,
  userAgent: devices['iPhone 12'].userAgent,
  deviceScaleFactor: devices['iPhone 12'].deviceScaleFactor,
  isMobile: devices['iPhone 12'].isMobile,
  hasTouch: devices['iPhone 12'].hasTouch
} as const;

const iPadPro11Use = {
  viewport: devices['iPad Pro 11'].viewport,
  userAgent: devices['iPad Pro 11'].userAgent,
  deviceScaleFactor: devices['iPad Pro 11'].deviceScaleFactor,
  isMobile: devices['iPad Pro 11'].isMobile,
  hasTouch: devices['iPad Pro 11'].hasTouch
} as const;

const iPhoneSEUse = {
  viewport: { width: 375, height: 667 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
} as const;

async function horizontalOverflowPx(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
}

test.describe('responsive overflow guardrails', () => {
  test.describe('iPhone 12', () => {
    test.use(iPhone12Use);

    test('all modern pages avoid horizontal overflow', async ({ page }) => {
      for (const path of modernPages) {
        await page.goto(path);
        const overflow = await horizontalOverflowPx(page);
        expect(
          overflow,
          `${path} should not overflow horizontally on iPhone`
        ).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('iPad Pro 11', () => {
    test.use(iPadPro11Use);

    test('all modern pages avoid horizontal overflow', async ({ page }) => {
      for (const path of modernPages) {
        await page.goto(path);
        const overflow = await horizontalOverflowPx(page);
        expect(
          overflow,
          `${path} should not overflow horizontally on iPad`
        ).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('iPhone SE', () => {
    test.use(iPhoneSEUse);

    test('all modern pages avoid horizontal overflow', async ({ page }) => {
      for (const path of modernPages) {
        await page.goto(path);
        const overflow = await horizontalOverflowPx(page);
        expect(
          overflow,
          `${path} should not overflow horizontally on iPhone SE`
        ).toBeLessThanOrEqual(1);
      }
    });
  });
});

test('all scenes keep mobile canvases contained and graph tabs populated', async ({
  page
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 568 });

  for (const scene of sceneIds) {
    const path = scenePage(scene);
    await page.goto(path, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000
    });
    await expect(page.locator('.mobile-animation-section')).toBeVisible();

    const stageCanvasesContained = await page
      .locator('.mobile-stage-slot canvas')
      .evaluateAll((canvases) => {
        const stage = document.querySelector('.mobile-animation-section');
        if (!stage) return false;
        const bounds = stage.getBoundingClientRect();
        return canvases.every((canvas) => {
          const rect = canvas.getBoundingClientRect();
          return (
            rect.x >= bounds.x - 1 &&
            rect.y >= bounds.y - 1 &&
            rect.right <= bounds.right + 1 &&
            rect.bottom <= bounds.bottom + 1
          );
        });
      });
    expect(
      stageCanvasesContained,
      `${path} stage canvases should stay inside the mobile animation surface`
    ).toBe(true);

    const graphTab = page.locator('.mobile-tab', { hasText: '图表' });
    const hasGraph =
      (await page.locator('[data-scene-has-graph="true"]').count()) > 0;
    if (!hasGraph) {
      await expect(graphTab).toHaveCount(0);
      continue;
    }

    await expect(graphTab).toBeVisible();
    await graphTab.click();
    const graphSlot = page.locator('.mobile-graph-slot');
    await expect(graphSlot.locator(':scope > *').first()).toBeVisible();

    const graphCanvases = graphSlot.locator('canvas');
    const canvasCount = await graphCanvases.count();
    expect(
      canvasCount,
      `${path} graph tab should render a canvas`
    ).toBeGreaterThan(0);
    await expect(graphCanvases.first()).toBeVisible();

    const graphCanvasesContained = await graphCanvases.evaluateAll(
      (canvases) => {
        const panel = document.querySelector('#mobile-panel-graph');
        if (!panel || canvases.length === 0) return false;
        const bounds = panel.getBoundingClientRect();
        return canvases.every((canvas) => {
          const rect = canvas.getBoundingClientRect();
          return (
            rect.width > 50 &&
            rect.height > 50 &&
            rect.x >= bounds.x - 1 &&
            rect.right <= bounds.right + 1 &&
            rect.y >= bounds.y - 1 &&
            rect.bottom <= bounds.bottom + 1
          );
        });
      }
    );
    expect(
      graphCanvasesContained,
      `${path} graph canvases should stay visible inside the graph panel`
    ).toBe(true);
  }
});

test('interactive buttons have touch-safe rendered dimensions', async ({
  page
}) => {
  for (const path of modernPages) {
    await page.goto(path);
    const hasTouchSafeStyles = await page
      .locator(
        '.stage-toolbar button, .mobile-control-bar button, .mobile-tab-bar button'
      )
      .evaluateAll((nodes) =>
        nodes.every((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        })
      );
    expect(
      hasTouchSafeStyles,
      `${path} toolbar buttons should have touch-safe min dimensions`
    ).toBe(true);
  }
});

test('classroom control tier defaults to simple mode', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');

  const tierToggle = page.locator('.control-tier-toggle');
  const toggleCount = await tierToggle.count();

  // Skip if the scene has no advanced controls tier
  if (toggleCount === 0) {
    expect(await page.locator('.scene-advanced').count()).toBe(0);
    return;
  }

  await expect(tierToggle).toBeVisible();
  expect(await page.locator('.scene-advanced:visible').count()).toBe(0);

  await tierToggle.click();
  expect(await page.locator('.scene-advanced:visible').count()).toBeGreaterThan(
    0
  );
});

test('touch interaction policy is configured on canvas', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');
  const projectileTouchAction = await page
    .locator('canvas.stage-canvas')
    .evaluate((node) => getComputedStyle(node).touchAction);
  // Canvas should have explicit touch-action (manipulation preferred for drag scenes)
  expect(projectileTouchAction).not.toBe('');

  await page.goto('/src/pages/field-lines.html');
  const fieldLinesTouchAction = await page
    .locator('canvas.stage-canvas')
    .evaluate((node) => getComputedStyle(node).touchAction);
  expect(fieldLinesTouchAction).not.toBe('');
});

test.describe('mobile home navigation', () => {
  test.use(iPhone12Use);

  test('keeps the instrument library reachable', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '打开导航菜单' }).click();
    await expect(page.getByRole('link', { name: '组件库' })).toBeVisible();
  });
});

test('production debug overlay is opt-in', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');
  await expect(page.getByText(/^FPS:/)).toHaveCount(0);

  await page.goto('/src/pages/projectile.html?debug=1');
  await expect(page.getByText(/^FPS:/)).toBeVisible();
});
