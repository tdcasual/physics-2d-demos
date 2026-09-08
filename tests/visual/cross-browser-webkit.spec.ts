import { test, expect } from '@playwright/test';
import { sceneIds, scenePage } from './scene-pages';
import { waitForFirstFrame } from '../helpers/wait-first-frame';

test.use({ browserName: 'webkit', launchOptions: {} });

const PORT = 5177;

for (const scene of sceneIds) {
  test(`webkit loads ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

    await page.goto(`http://127.0.0.1:${PORT}${scenePage(scene)}`, {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, {
      remainderMs:
        scene === 'chase-meet' ||
        scene === 'emf-analogy' ||
        scene === 'double-slit'
          ? 400
          : 150
    });

    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}
