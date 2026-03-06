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

async function horizontalOverflowPx(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

async function controlCardMetrics(page: Page): Promise<{
  cardClientHeight: number;
  cardScrollHeight: number;
  sidebarClientHeight: number;
  sidebarScrollHeight: number;
}> {
  return page.evaluate(() => {
    const card = document.querySelector('.control-card');
    const sidebar = document.querySelector('.teaching-sidebar');
    if (!(card instanceof HTMLElement) || !(sidebar instanceof HTMLElement)) {
      return {
        cardClientHeight: 0,
        cardScrollHeight: 0,
        sidebarClientHeight: 0,
        sidebarScrollHeight: 0
      };
    }
    return {
      cardClientHeight: card.clientHeight,
      cardScrollHeight: card.scrollHeight,
      sidebarClientHeight: sidebar.clientHeight,
      sidebarScrollHeight: sidebar.scrollHeight
    };
  });
}

test.describe('responsive overflow guardrails', () => {
  test.describe('iPhone 12', () => {
    test.use(iPhone12Use);

    test('all modern pages avoid horizontal overflow', async ({ page }) => {
      for (const path of modernPages) {
        await page.goto(path);
        const overflow = await horizontalOverflowPx(page);
        expect(overflow, `${path} should not overflow horizontally on iPhone`).toBeLessThanOrEqual(1);
      }
    });

    test('control area stays usable in compact sidebar', async ({ page }) => {
      for (const path of modernPages) {
        await page.goto(path);
        const metrics = await controlCardMetrics(page);
        expect(metrics.cardClientHeight, `${path} control card collapsed on iPhone`).toBeGreaterThanOrEqual(120);
        expect(metrics.sidebarScrollHeight, `${path} sidebar should remain scrollable on iPhone`).toBeGreaterThanOrEqual(
          metrics.sidebarClientHeight
        );
      }
    });
  });

  test.describe('iPad Pro 11', () => {
    test.use(iPadPro11Use);

    test('all modern pages avoid horizontal overflow', async ({ page }) => {
      for (const path of modernPages) {
        await page.goto(path);
        const overflow = await horizontalOverflowPx(page);
        expect(overflow, `${path} should not overflow horizontally on iPad`).toBeLessThanOrEqual(1);
      }
    });
  });
});

test('stage toolbar touch targets meet 44px minimum', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);
    const minTarget = await page.locator('.stage-toolbar button').evaluateAll((nodes) => {
      let min = Number.POSITIVE_INFINITY;
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        min = Math.min(min, Math.min(rect.width, rect.height));
      }
      return Number.isFinite(min) ? min : 0;
    });
    expect(minTarget, `${path} toolbar buttons should be touch-safe`).toBeGreaterThanOrEqual(44);
  }
});

test.describe('mobile usability semantics', () => {
  test.use(iPhone12Use);

  test('readout is exposed as a collapsible drawer on mobile', async ({ page }) => {
    await page.goto('/src/pages/projectile.html');
    const drawerToggle = page.locator('.readout-drawer-toggle');
    const readout = page.locator('.stage-readout');

    await expect(drawerToggle).toBeVisible();
    await expect(readout).toHaveClass(/is-collapsed/);
    await drawerToggle.click();
    await expect(readout).not.toHaveClass(/is-collapsed/);
  });

  test('compact sidebar can be restored after collapsing', async ({ page }) => {
    await page.goto('/src/pages/projectile.html');

    const shell = page.locator('.teaching-demo');
    const inlineToggle = page.locator('.sidebar-toggle-inline');
    const floatToggle = page.locator('.sidebar-toggle-float');

    await expect(inlineToggle).toBeVisible();
    await inlineToggle.click();
    await expect(shell).toHaveClass(/is-sidebar-collapsed/);

    await expect(floatToggle).toBeVisible();
    await expect(floatToggle).toHaveText('显示控制面板');
    await floatToggle.click();

    await expect(shell).not.toHaveClass(/is-sidebar-collapsed/);
    await expect(page.locator('.teaching-sidebar')).toBeVisible();
  });
});

test('classroom control tier defaults to simple mode', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');

  const tierToggle = page.locator('.control-tier-toggle');
  await expect(tierToggle).toBeVisible();
  expect(await page.locator('.scene-advanced:visible').count()).toBe(0);

  await tierToggle.click();
  expect(await page.locator('.scene-advanced:visible').count()).toBeGreaterThan(0);
});

test('status card exposes structured state levels', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');
  const statusCard = page.locator('.status-card');
  const statusPill = statusCard.locator('.status-pill');

  await expect(statusPill).toBeVisible();
  await expect(statusCard).toHaveAttribute('data-status-level', 'ready');

  await page.locator('[data-role="play"]').dispatchEvent('click');
  await expect(statusCard).toHaveAttribute('data-status-level', 'running');

  await page.locator('[data-role="pause"]').dispatchEvent('click');
  await expect(statusCard).toHaveAttribute('data-status-level', 'paused');

  await page.locator('[data-role="step"]').dispatchEvent('click');
  await expect(statusCard).toHaveAttribute('data-status-level', 'success');
});

test('touch interaction policy prioritizes drag scenes', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');
  const projectileTouchAction = await page.locator('canvas.stage-canvas').evaluate((node) => getComputedStyle(node).touchAction);
  expect(projectileTouchAction).toContain('manipulation');

  await page.goto('/src/pages/field-lines.html');
  const fieldLinesTouchAction = await page.locator('canvas.stage-canvas').evaluate((node) => getComputedStyle(node).touchAction);
  expect(fieldLinesTouchAction).toBe('none');
});
