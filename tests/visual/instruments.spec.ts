import { expect, test } from '@playwright/test';

const PORT = 5177;

test('instrument library loads and can switch to an instrument preview', async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/src/pages/instruments.html`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForTimeout(1500);

  await expect(page.locator('text=仪器组件库').first()).toBeVisible();

  const entryButton = page.getByRole('button', { name: '高精度干涉测微仪' });
  await expect(entryButton).toBeVisible();
  await entryButton.click();

  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return (
      canvas instanceof HTMLCanvasElement &&
      canvas.width > 200 &&
      canvas.height > 120
    );
  });

  const canvasMetrics = await page
    .locator('canvas')
    .first()
    .evaluate((node) => {
      const canvas = node as HTMLCanvasElement;
      const preview = canvas.parentElement;
      return {
        previewHeight: preview?.clientHeight ?? 0,
        previewWidth: preview?.clientWidth ?? 0,
        height: canvas.height,
        width: canvas.width
      };
    });

  expect(canvasMetrics.previewWidth).toBeGreaterThan(200);
  expect(canvasMetrics.previewHeight).toBeGreaterThan(120);
  expect(canvasMetrics.width).toBeGreaterThan(200);
  expect(canvasMetrics.height).toBeGreaterThan(120);
  await expect(page.locator('text=参数调节').first()).toBeVisible();
  await expect(page.locator('text=名称').first()).toBeVisible();
});
