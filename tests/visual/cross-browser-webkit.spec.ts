import { test, expect } from '@playwright/test';

test.use({ browserName: 'webkit' });

const PORT = 5177;
const SCENES = [
  'chase-meet',
  'projectile',
  'emf-analogy',
  'field-lines',
  'electrification',
  'vt-integral'
];

for (const scene of SCENES) {
  test(`webkit loads ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

    await page.goto(`http://127.0.0.1:${PORT}/src/pages/${scene}.html`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);

    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}
