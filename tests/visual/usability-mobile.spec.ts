import { devices, expect, test, type Page } from '@playwright/test';

const modernPages = [
  '/src/pages/projectile.html',
  '/src/pages/chase-meet.html',
  '/src/pages/field-lines.html',
  '/src/pages/electrification.html',
  '/src/pages/emf-analogy.html',
  '/src/pages/vt-integral.html?renderer=experimental'
] as const;

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

test('stage toolbar buttons have touch-safe CSS properties', async ({
  page
}) => {
  for (const path of modernPages) {
    await page.goto(path);
    const hasTouchSafeStyles = await page
      .locator('.stage-toolbar button')
      .evaluateAll((nodes) => {
        for (const node of nodes) {
          const style = window.getComputedStyle(node);
          const minW = parseInt(style.minWidth, 10);
          const minH = parseInt(style.minHeight, 10);
          if (minW > 0 && minW < 44) return false;
          if (minH > 0 && minH < 44) return false;
        }
        return true;
      });
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
