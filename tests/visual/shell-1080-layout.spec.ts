import { expect, test } from '@playwright/test';

const modernPages = [
  '/src/pages/projectile.html',
  '/src/pages/chase-meet.html',
  '/src/pages/field-lines.html',
  '/src/pages/electrification.html',
  '/src/pages/emf-analogy.html',
  '/src/pages/vt-integral.html?renderer=experimental'
] as const;

const legacyBridgePages = [
  '/src/pages/vt-integral.html',
  '/src/pages/chase-meet.html?renderer=legacy',
  '/src/pages/field-lines.html?renderer=legacy',
  '/src/pages/electrification.html?renderer=legacy',
  '/src/pages/emf-analogy.html?renderer=legacy'
] as const;

test.use({ viewport: { width: 1920, height: 1080 } });

test('1080p layout keeps full content in viewport for all modern pages', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);
    await expect(page.locator('.teaching-demo')).toBeVisible();

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: doc.scrollWidth,
        scrollHeight: doc.scrollHeight
      };
    });

    expect(
      metrics.scrollHeight - metrics.innerHeight,
      `${path} has vertical overflow: ${metrics.scrollHeight}px > ${metrics.innerHeight}px`
    ).toBeLessThanOrEqual(1);
    expect(
      metrics.scrollWidth - metrics.innerWidth,
      `${path} has horizontal overflow: ${metrics.scrollWidth}px > ${metrics.innerWidth}px`
    ).toBeLessThanOrEqual(1);
  }
});

test('mode and theme toggles are rendered in the stage corner toolbar', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');
  const toolbar = page.locator('.stage-toolbar');
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator('.mode-toggle')).toBeVisible();
  await expect(toolbar.locator('.shell-theme-toggle')).toBeVisible();
  await expect(toolbar.locator('.shell-theme-toggle')).toHaveText('春日');
  await expect(page.locator('.teaching-sidebar .mode-toggle')).toHaveCount(0);
  await expect(page.locator('.teaching-sidebar .shell-theme-toggle')).toHaveCount(0);
});


test('desktop layout avoids duplicate sidebar toggle affordances', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);
    const visibleSidebarToggles = await page.locator('.sidebar-toggle').evaluateAll((nodes) => {
      return nodes.filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return !node.hidden && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      }).length;
    });
    expect(visibleSidebarToggles, `${path} should expose exactly one sidebar toggle on desktop`).toBe(1);
  }
});



test('desktop readout defaults collapsed and expands into compact layout for all modern pages', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);

    const readout = page.locator('.stage-readout');
    const desktopToggle = page.locator('.readout-desktop-toggle');
    const dragHandle = page.locator('.readout-drag-handle');

    await expect(desktopToggle, `${path} should expose desktop readout toggle`).toBeVisible();
    await expect(readout, `${path} should default desktop readout to collapsed`).toHaveClass(/is-collapsed/);

    await desktopToggle.click();

    await expect(readout, `${path} should expand after desktop toggle`).not.toHaveClass(/is-collapsed/);
    await expect(dragHandle, `${path} should allow dragging once expanded`).toBeVisible();
    await expect(readout.locator('.readout-item--half').first(), `${path} should render compact half-width items`).toBeVisible();
  }
});

test('stage toolbar is separated from stage frame content', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);
    const geometry = await page.evaluate(() => {
      const topbar = document.querySelector('.stage-topbar');
      const frame = document.querySelector('.stage-frame');
      if (!(topbar instanceof HTMLElement) || !(frame instanceof HTMLElement)) {
        return { valid: false, topbarBottom: 0, frameTop: 0 };
      }
      const topbarRect = topbar.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      return {
        valid: true,
        topbarBottom: topbarRect.bottom,
        frameTop: frameRect.top
      };
    });
    expect(geometry.valid, `${path} missing topbar/frame geometry`).toBeTruthy();
    expect(geometry.topbarBottom, `${path} toolbar should not overlap stage frame`).toBeLessThanOrEqual(geometry.frameTop + 1);
  }
});

test('collapsed desktop sidebar removes hidden controls from tab order', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);

    const floatToggle = page.locator('.stage-topbar .sidebar-toggle-float');
    await expect(floatToggle, `${path} should expose desktop collapse toggle`).toBeVisible();
    await floatToggle.click();

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });

    let focusedHiddenSidebarControl = false;
    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press('Tab');
      const inSidebar = await page.evaluate(() => {
        const active = document.activeElement;
        return active instanceof HTMLElement && Boolean(active.closest('.teaching-sidebar'));
      });
      if (inSidebar) {
        focusedHiddenSidebarControl = true;
        break;
      }
    }

    expect(focusedHiddenSidebarControl, `${path} should not tab into collapsed sidebar controls`).toBe(false);
  }
});

test('desktop resizer keeps range sliders usable at minimum sidebar width', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);

    const tierToggle = page.locator('.control-tier-toggle');
    if (await tierToggle.count()) {
      await tierToggle.click();
    }

    const resizer = page.locator('.sidebar-resizer');
    const box = await resizer.boundingBox();
    expect(box, `${path} should expose desktop sidebar resizer`).not.toBeNull();
    if (!box) continue;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 260, box.y + box.height / 2, { steps: 20 });
    await page.mouse.up();

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
    expect(metrics.minWidth, `${path} range sliders should stay usable after sidebar resize`).toBeGreaterThanOrEqual(96);
  }
});

test('desktop sidebar resizer is keyboard focusable and responds to arrow keys', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');

  const resizer = page.locator('.sidebar-resizer');
  const sidebar = page.locator('.teaching-sidebar');

  await expect(resizer).toBeVisible();
  await resizer.focus();
  await expect(resizer).toBeFocused();

  const before = await sidebar.evaluate((node) => Math.round(node.getBoundingClientRect().width));
  await page.keyboard.press('ArrowRight');
  const afterGrow = await sidebar.evaluate((node) => Math.round(node.getBoundingClientRect().width));
  await page.keyboard.press('ArrowLeft');
  const afterShrink = await sidebar.evaluate((node) => Math.round(node.getBoundingClientRect().width));

  expect(afterGrow, 'ArrowRight should widen the sidebar').toBeGreaterThan(before);
  expect(afterShrink, 'ArrowLeft should shrink the sidebar after widening').toBeLessThan(afterGrow);
});

test('desktop readout keyboard toggles keep focus on visible controls', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');

  const desktopToggle = page.locator('.readout-desktop-toggle');
  const inlineToggle = page.locator('.readout-inline-toggle');

  await desktopToggle.focus();
  await expect(desktopToggle).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(inlineToggle).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(desktopToggle).toBeFocused();
});

test('desktop tabbing from collapsed readout toggle returns to sidebar controls', async ({ page }) => {
  for (const path of modernPages) {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(path);

    const desktopToggle = page.locator('.readout-desktop-toggle');
    await desktopToggle.focus();
    await expect(desktopToggle).toBeFocused();

    await page.keyboard.press('Tab');

    const focusState = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        tag: active instanceof HTMLElement ? active.tagName.toLowerCase() : '',
        inSidebar: active instanceof HTMLElement && Boolean(active.closest('.teaching-sidebar'))
      };
    });

    expect(focusState.tag, `${path} should not drop focus onto body after the collapsed readout toggle`).not.toBe('body');
    expect(focusState.inSidebar, `${path} should wrap Tab from the collapsed readout toggle back to sidebar controls`).toBe(true);
  }
});

test('desktop tabbing from expanded readout header returns to the first control', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);

    const desktopToggle = page.locator('.readout-desktop-toggle');
    const inlineToggle = page.locator('.readout-inline-toggle');

    await desktopToggle.click();
    await inlineToggle.focus();
    await expect(inlineToggle).toBeFocused();

    await page.keyboard.press('Tab');

    const focusState = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        tag: active instanceof HTMLElement ? active.tagName.toLowerCase() : '',
        inSidebar: active instanceof HTMLElement && Boolean(active.closest('.teaching-sidebar'))
      };
    });

    expect(focusState.tag, `${path} should not drop focus onto body after the expanded readout header`).not.toBe('body');
    expect(focusState.inSidebar, `${path} should wrap Tab from the expanded readout header back to sidebar controls`).toBe(true);
  }
});

test('collapsed desktop shell wraps Tab from readout header back to the restore toggle', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);

    const desktopToggle = page.locator('.readout-desktop-toggle');
    const inlineToggle = page.locator('.readout-inline-toggle');
    const floatToggle = page.locator('.sidebar-toggle-float');

    await desktopToggle.click();
    await floatToggle.click();
    await inlineToggle.focus();
    await expect(inlineToggle).toBeFocused();

    await page.keyboard.press('Tab');

    await expect(floatToggle, `${path} should wrap Tab from the last visible control back to the restore toggle`).toBeFocused();
  }
});

test('desktop shell preserves sidebar and readout state across compact breakpoint roundtrip', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);

    const shell = page.locator('.teaching-demo');
    const desktopToggle = page.locator('.readout-desktop-toggle');
    const inlineToggle = page.locator('.readout-inline-toggle');
    const drawerToggle = page.locator('.readout-drawer-toggle');
    const floatToggle = page.locator('.sidebar-toggle-float');
    const readout = page.locator('.stage-readout');

    await desktopToggle.click();
    await floatToggle.click();

    await expect(shell, `${path} should begin the roundtrip with a collapsed desktop sidebar`).toHaveClass(/is-sidebar-collapsed/);
    await expect(readout, `${path} should begin the roundtrip with desktop readout expanded`).not.toHaveClass(/is-collapsed/);
    await expect(inlineToggle, `${path} should show inline readout controls before resizing`).toBeVisible();

    await page.setViewportSize({ width: 1000, height: 900 });
    await expect(shell, `${path} should switch into compact layout at 1000px`).toHaveClass(/is-compact-viewport/);
    await expect(drawerToggle, `${path} should expose compact readout drawer at 1000px`).toBeVisible();

    await page.setViewportSize({ width: 1030, height: 900 });

    await expect(shell, `${path} should return to desktop layout after widening back to 1030px`).toHaveClass(/is-sidebar-collapsed/);
    await expect(shell, `${path} should leave compact layout after widening back to 1030px`).not.toHaveClass(/is-compact-viewport/);
    await expect(floatToggle, `${path} should keep the restore affordance after the roundtrip`).toHaveText('显示控制面板');
    await expect(readout, `${path} should restore the expanded desktop readout after the roundtrip`).not.toHaveClass(/is-collapsed/);
    await expect(inlineToggle, `${path} should restore the inline desktop readout control after the roundtrip`).toBeVisible();
    await expect(desktopToggle, `${path} should keep the collapsed-desktop readout toggle hidden after the roundtrip`).toBeHidden();
    await expect(drawerToggle, `${path} should hide the compact drawer toggle after returning to desktop`).toBeHidden();
  }
});

test('resize keeps readout focus on visible replacement controls', async ({ page }) => {
  for (const path of modernPages) {
    await page.goto(path);

    const desktopToggle = page.locator('.readout-desktop-toggle');
    const inlineToggle = page.locator('.readout-inline-toggle');
    const drawerToggle = page.locator('.readout-drawer-toggle');

    await desktopToggle.focus();
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect(drawerToggle, `${path} should hand focus from the desktop readout toggle to the compact drawer toggle`).toBeFocused();

    await page.setViewportSize({ width: 1030, height: 900 });
    await expect(desktopToggle, `${path} should hand focus back from the compact drawer toggle to the collapsed desktop readout toggle`).toBeFocused();

    await desktopToggle.click();
    await inlineToggle.focus();
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect(drawerToggle, `${path} should hand focus from the expanded desktop readout header to the compact drawer toggle`).toBeFocused();

    await page.setViewportSize({ width: 1030, height: 900 });
    await expect(inlineToggle, `${path} should restore focus to the expanded desktop readout header after widening back`).toBeFocused();
  }
});

test('resize keeps sidebar control focus on visible replacement controls', async ({ page }) => {
  for (const path of modernPages) {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(path);

    const floatToggle = page.locator('.sidebar-toggle-float');
    const inlineToggle = page.locator('.sidebar-toggle-inline');
    const resizer = page.locator('.sidebar-resizer');

    await floatToggle.focus();
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect(inlineToggle, `${path} should hand focus from the desktop stage toggle to the compact sidebar toggle`).toBeFocused();

    await page.setViewportSize({ width: 1030, height: 900 });
    await expect(floatToggle, `${path} should hand focus back from the compact sidebar toggle to the desktop stage toggle`).toBeFocused();

    await resizer.focus();
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect(inlineToggle, `${path} should hand focus from the desktop resizer to the compact sidebar toggle`).toBeFocused();
  }
});

test('legacy bridge iframe stays keyboard reachable', async ({ page }) => {
  for (const path of legacyBridgePages) {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(path);

    let iframeFocused = false;
    for (let index = 0; index < 16; index += 1) {
      await page.keyboard.press('Tab');
      iframeFocused = await page.evaluate(() => document.activeElement === document.querySelector('.stage-iframe'));
      if (iframeFocused) break;
    }

    expect(iframeFocused, `${path} should keep the legacy stage iframe in the desktop keyboard order`).toBe(true);
  }
});

test('legacy bridge iframe advances to the next shell control with a single Tab', async ({ page }) => {
  for (const path of legacyBridgePages) {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(path);

    await page.locator('.stage-iframe').focus();
    await page.keyboard.press('Tab');

    const advancedInSingleTab = await page.evaluate(() => {
      const root = document.querySelector('.teaching-demo');
      const iframe = document.querySelector('.stage-iframe');
      if (!(root instanceof HTMLElement) || !(iframe instanceof HTMLIFrameElement)) return false;

      const selector = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'iframe',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');

      const isVisibleFocusable = (node: Element): node is HTMLElement => {
        if (!(node instanceof HTMLElement)) return false;
        if (node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
        if (node.closest('[inert], [aria-hidden="true"]')) return false;
        if (node instanceof HTMLInputElement && node.type === 'hidden') return false;
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && node.tabIndex >= 0;
      };

      const elements = Array.from(root.querySelectorAll(selector)).filter(isVisibleFocusable);
      return elements[0] instanceof HTMLElement && document.activeElement === elements[0] && document.activeElement !== iframe;
    });

    expect(advancedInSingleTab, `${path} should leave the legacy stage iframe after a single forward Tab`).toBe(true);
  }
});

test('legacy mobile readout Shift+Tab returns to the drawer toggle', async ({ page }) => {
  const compactLegacyPages = [
    '/src/pages/vt-integral.html',
    '/src/pages/chase-meet.html?renderer=legacy',
    '/src/pages/field-lines.html?renderer=legacy',
    '/src/pages/electrification.html?renderer=legacy',
    '/src/pages/emf-analogy.html?renderer=legacy'
  ] as const;

  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of compactLegacyPages) {
    await page.goto(path);

    const drawerToggle = page.locator('.readout-drawer-toggle');
    const readout = page.locator('.stage-readout');

    await drawerToggle.focus();
    await page.keyboard.press('Enter');
    await expect(readout, `${path} should move focus into the compact readout when keyboard-opening the drawer`).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(drawerToggle, `${path} should return reverse Tab focus from the readout to the drawer toggle`).toBeFocused();
  }
});

test('desktop readout drag handle is skipped in tab order', async ({ page }) => {
  await page.goto('/src/pages/projectile.html');

  const desktopToggle = page.locator('.readout-desktop-toggle');
  const inlineToggle = page.locator('.readout-inline-toggle');
  const dragHandle = page.locator('.readout-drag-handle');

  await desktopToggle.focus();
  await page.keyboard.press('Enter');
  await expect(inlineToggle).toBeFocused();
  await expect(dragHandle).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(dragHandle).not.toBeFocused();
});

