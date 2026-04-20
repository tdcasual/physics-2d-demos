import { test } from '@playwright/test';

test('vt-integral desktop screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/src/pages/vt-integral.html');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/vt-integral-main.png' });
});

test('vt-integral scene2', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(
    'http://localhost:5177/src/pages/vt-integral.html?scene=scene2'
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/vt-integral-scene2.png' });
});

test('vt-integral scene3', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(
    'http://localhost:5177/src/pages/vt-integral.html?scene=scene3'
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/vt-integral-scene3.png' });
});

test('vt-integral mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5177/src/pages/vt-integral.html');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/vt-integral-mobile.png' });
});
