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

const iPhoneSEUse = {
  viewport: devices['iPhone SE'].viewport,
  userAgent: devices['iPhone SE'].userAgent,
  deviceScaleFactor: devices['iPhone SE'].deviceScaleFactor,
  isMobile: devices['iPhone SE'].isMobile,
  hasTouch: devices['iPhone SE'].hasTouch
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


test('dark mobile stage panel avoids light toolbar strip', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');

  const panelTheme = await page.evaluate(() => {
    const panel = document.querySelector('.teaching-stage-panel');
    if (!(panel instanceof HTMLElement)) return null;
    const style = getComputedStyle(panel);
    return {
      backgroundImage: style.backgroundImage,
      backgroundColor: style.backgroundColor
    };
  });

  expect(panelTheme).not.toBeNull();
  expect(panelTheme?.backgroundImage.includes('248, 250, 244')).toBe(false);
  expect(panelTheme?.backgroundImage.includes('211, 225, 194')).toBe(false);
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


test('control-area action buttons meet 44px minimum', async ({ page }) => {
  const touchSelectors = '.control-tier-toggle, .scene-tab-btn, .scene-chip-btn, .scene-reset-btn, .transport-controls button';

  for (const path of modernPages) {
    await page.goto(path);
    const minTarget = await page.locator(touchSelectors).evaluateAll((nodes) => {
      let min = Number.POSITIVE_INFINITY;
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        if (node.hidden || style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
          continue;
        }
        min = Math.min(min, Math.min(rect.width, rect.height));
      }
      return Number.isFinite(min) ? min : 0;
    });
    expect(minTarget, `${path} control buttons should be touch-safe`).toBeGreaterThanOrEqual(44);
  }
});


test.describe('mobile control forms', () => {
  test.use(iPhone12Use);

  test('control-area form controls meet 44px minimum after expanding advanced controls', async ({ page }) => {
    const touchSelectors = '.scene-form-row input, .scene-form-row select, .scene-form-row textarea, .control-slot input[type="range"]';

    for (const path of modernPages) {
      await page.goto(path);

      const tierToggle = page.locator('.control-tier-toggle');
      if (await tierToggle.count()) {
        await tierToggle.click();
      }

      const metrics = await page.locator(touchSelectors).evaluateAll((nodes) => {
        let min = Number.POSITIVE_INFINITY;
        let count = 0;
        for (const node of nodes) {
          if (!(node instanceof HTMLElement)) continue;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          if (node.hidden || style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
            continue;
          }
          count += 1;
          min = Math.min(min, Math.min(rect.width, rect.height));
        }
        return {
          count,
          min: Number.isFinite(min) ? min : 0
        };
      });

      if (metrics.count === 0) continue;
      expect(metrics.min, `${path} form controls should be touch-safe`).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('compact readout keyboard flow', () => {
  test.use(iPhone12Use);

  test('keyboard opening the drawer moves focus into the readout region', async ({ page }) => {
    await page.goto('/src/pages/projectile.html');

    const drawerToggle = page.locator('.readout-drawer-toggle');
    const readout = page.locator('.stage-readout');

    await drawerToggle.focus();
    await page.keyboard.press('Enter');

    await expect(readout).not.toHaveClass(/is-collapsed/);
    await expect(readout).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(drawerToggle).toBeFocused();
  });
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
    await expect(readout.locator('.readout-item--half').first()).toBeVisible();
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

test.describe('narrow mobile collapse layout', () => {
  test.use(iPhoneSEUse);

  test('collapsed sidebar keeps the stage topbar in one compact row', async ({ page }) => {
    for (const path of modernPages) {
      await page.goto(path);
      await page.locator('.sidebar-toggle-inline').click();

      const geometry = await page.evaluate(() => {
        const topbar = document.querySelector('.stage-topbar');
        const floatToggle = document.querySelector('.sidebar-toggle-float');
        const toolbar = document.querySelector('.stage-toolbar');
        if (!(topbar instanceof HTMLElement) || !(floatToggle instanceof HTMLElement) || !(toolbar instanceof HTMLElement)) {
          return null;
        }

        const visibleChildTops = Array.from(topbar.children)
          .flatMap((node) => {
            if (!(node instanceof HTMLElement)) return [];
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            if (node.hidden || style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
              return [];
            }
            return [Math.round(rect.top)];
          });

        return {
          topbarHeight: Math.round(topbar.getBoundingClientRect().height),
          floatToggleHeight: Math.round(floatToggle.getBoundingClientRect().height),
          floatToggleWidth: Math.round(floatToggle.getBoundingClientRect().width),
          visibleChildTops: [...new Set(visibleChildTops)]
        };
      });

      expect(geometry, `${path} should expose collapsed-stage geometry`).not.toBeNull();
      expect(geometry?.visibleChildTops, `${path} should keep collapsed topbar children on one row`).toHaveLength(1);
      expect(geometry?.topbarHeight, `${path} should keep collapsed topbar compact on narrow phones`).toBeLessThanOrEqual(56);
      expect(geometry?.floatToggleHeight, `${path} should keep restore button compact on narrow phones`).toBeLessThanOrEqual(48);
      expect(geometry?.floatToggleWidth, `${path} should keep restore button readable on narrow phones`).toBeGreaterThan(88);
    }
  });

  test('range sliders keep usable track width on narrow phones', async ({ page }) => {
    for (const path of modernPages) {
      await page.goto(path);

      const tierToggle = page.locator('.control-tier-toggle');
      if (await tierToggle.count()) {
        await tierToggle.click();
      }

      const metrics = await page.locator('.scene-control-row input[type="range"]').evaluateAll((nodes) => {
        let minWidth = Number.POSITIVE_INFINITY;
        let count = 0;
        for (const node of nodes) {
          if (!(node instanceof HTMLElement)) continue;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          if (node.hidden || style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
            continue;
          }
          count += 1;
          minWidth = Math.min(minWidth, rect.width);
        }
        return {
          count,
          minWidth: Number.isFinite(minWidth) ? minWidth : 0
        };
      });

      if (metrics.count === 0) continue;
      expect(metrics.minWidth, `${path} range sliders should keep usable width on narrow phones`).toBeGreaterThanOrEqual(96);
    }
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
