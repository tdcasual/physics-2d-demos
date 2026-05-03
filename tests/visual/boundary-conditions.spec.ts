import { test, expect } from '@playwright/test';

const PORT = 5177;

/**
 * 边界条件测试：通过 JS 直接设置 slider 的极端值，
 * 验证 canvas 仍能正常渲染且无 console 错误。
 */
test('projectile extreme parameters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  await page.goto(`http://127.0.0.1:${PORT}/src/pages/projectile.html`, {
    waitUntil: 'networkidle'
  });
  await page.waitForTimeout(1500);

  // 通过 JS 设置极端值
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="range"]');
    inputs.forEach((input) => {
      const el = input as HTMLInputElement;
      el.value = el.min || '0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="range"]');
    inputs.forEach((input) => {
      const el = input as HTMLInputElement;
      el.value = el.max || '100';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.waitForTimeout(500);

  expect(await page.locator('canvas').count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('chase-meet extreme parameters', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  await page.goto(`http://127.0.0.1:${PORT}/src/pages/chase-meet.html`, {
    waitUntil: 'networkidle'
  });
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="range"]');
    inputs.forEach((input) => {
      const el = input as HTMLInputElement;
      el.value = el.min || '0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.waitForTimeout(500);

  expect(await page.locator('canvas').count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('vt-integral extreme parameters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  await page.goto(`http://127.0.0.1:${PORT}/src/pages/vt-integral.html`, {
    waitUntil: 'networkidle'
  });
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="range"]');
    inputs.forEach((input) => {
      const el = input as HTMLInputElement;
      el.value = el.min || '0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.waitForTimeout(500);

  expect(await page.locator('canvas').count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
