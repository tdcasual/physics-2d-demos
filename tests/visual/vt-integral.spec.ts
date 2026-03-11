import { expect, test } from '@playwright/test';

test('vt-integral modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/vt-integral.html');
  await expect(page.getByRole('heading', { name: '微元法演示' })).toBeVisible();
  await expect(page.locator('.scene-switch-grid .scene-tab-btn')).toHaveCount(5);
  await expect(page.locator('iframe.stage-iframe')).toBeVisible();
});

test('vt-integral legacy 3d scenes handle missing WebGL without runtime errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto('/src/pages/vt-integral.html');
  await page.locator('.stage-iframe').waitFor({ state: 'attached' });

  for (const [buttonText, containerSelector] of [
    ['场景四', '#surface-canvas-container'],
    ['场景五', '#volume-canvas-container']
  ] as const) {
    await page.locator('.scene-tab-btn', { hasText: buttonText }).click();
    await page.waitForTimeout(1500);

    const sceneReady = await page.evaluate((selector) => {
      const iframe = document.querySelector('.stage-iframe') as HTMLIFrameElement | null;
      const doc = iframe?.contentDocument;
      const container = doc?.querySelector(selector);
      if (!container) return false;
      return !!container.querySelector('canvas, .webgl-fallback-note');
    }, containerSelector);

    expect(sceneReady, `${buttonText} should render either a WebGL canvas or a graceful fallback note`).toBe(true);
  }

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
