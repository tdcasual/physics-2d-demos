import { expect, test, type Page } from '@playwright/test';
import { scenePage } from '../visual/scene-pages';
import { waitForFirstFrame } from '../helpers/wait-first-frame';

async function enterNativeFullscreen(page: Page): Promise<void> {
  const already = await page.evaluate(() =>
    Boolean(document.fullscreenElement)
  );
  if (already) return;

  await page.locator('.layout-master').click({ position: { x: 12, y: 12 } });
  const fromApi = await page.evaluate(async () => {
    try {
      await document.documentElement.requestFullscreen();
      return Boolean(document.fullscreenElement);
    } catch {
      return false;
    }
  });
  if (!fromApi) {
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.id = 'e2e-request-fs';
      btn.type = 'button';
      btn.textContent = 'fs';
      btn.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647';
      btn.addEventListener('click', () => {
        document.documentElement.requestFullscreen().catch(() => {});
      });
      document.body.appendChild(btn);
    });
    await page.locator('#e2e-request-fs').click();
  }

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Boolean(document.fullscreenElement) &&
          document
            .querySelector('.layout-master')
            ?.classList.contains('is-native-fullscreen') === true
      )
    )
    .toBe(true);
}

async function exitNativeFullscreen(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !document.fullscreenElement &&
          document
            .querySelector('.layout-master')
            ?.classList.contains('is-native-fullscreen') !== true
      )
    )
    .toBe(true);
}

test.describe('native fullscreen chrome', () => {
  test('lab-stage hides toolbar and keeps transport', async ({ page }) => {
    await page.goto(scenePage('ticker-tape', '?preset=ua'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 400 });

    const toolbar = page.locator('.lab-stage-toolbar');
    const transport = page.locator('.stage-floating-controls').first();
    await expect(toolbar).toBeVisible();
    await expect(transport).toBeVisible();

    await enterNativeFullscreen(page);
    await expect(page.locator('.layout-master')).toHaveClass(
      /is-native-fullscreen/
    );
    await expect(toolbar).toBeHidden();
    await expect(transport).toBeVisible();

    await exitNativeFullscreen(page);
    await expect(page.locator('.layout-master')).not.toHaveClass(
      /is-native-fullscreen/
    );
    await expect(toolbar).toBeVisible();
    await expect(transport).toBeVisible();
  });

  test('split-right hides toolbar and keeps transport', async ({ page }) => {
    await page.goto(scenePage('projectile'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 400 });

    const toolbar = page.locator('.teaching-stage-toolbar');
    const transport = page.locator('.stage-floating-controls').first();
    await expect(toolbar).toBeVisible();
    await expect(transport).toBeVisible();

    await enterNativeFullscreen(page);
    await expect(toolbar).toBeHidden();
    await expect(transport).toBeVisible();

    await exitNativeFullscreen(page);
    await expect(toolbar).toBeVisible();
    await expect(transport).toBeVisible();
  });

  test('mobile-stack hides toggles and keeps transport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(scenePage('ticker-tape', '?layout=mobile-stack'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 400 });

    const toggles = page.locator('.mobile-transport-toggles');
    const transport = page.locator('.mobile-transport-controls');
    await expect(toggles).toBeVisible();
    await expect(transport).toBeVisible();

    await enterNativeFullscreen(page);
    await expect(toggles).toBeHidden();
    await expect(transport).toBeVisible();

    await exitNativeFullscreen(page);
    await expect(toggles).toBeVisible();
    await expect(transport).toBeVisible();
  });
});
