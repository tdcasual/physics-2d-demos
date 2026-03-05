import { expect, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

async function captureStageFrame(page: import('@playwright/test').Page, pagePath: string): Promise<Buffer> {
  await page.goto(pagePath);
  await expect(page.getByRole('heading', { name: '追及相遇演示动画（2D）' })).toBeVisible();
  const stage = page.locator('.stage-frame');
  await expect(stage).toBeVisible();
  await page.waitForTimeout(400);
  return stage.screenshot({
    animations: 'disabled',
    scale: 'css'
  });
}

function diffPixels(
  legacy: PNG,
  modern: PNG,
  threshold: number
): { pixels: number; diffImage: Buffer } {
  const diff = new PNG({ width: legacy.width, height: legacy.height });
  const pixels = pixelmatch(legacy.data, modern.data, diff.data, legacy.width, legacy.height, {
    threshold,
    includeAA: true
  });
  return { pixels, diffImage: PNG.sync.write(diff) };
}

test('chase-meet default route should be pixel-identical with renderer=modern', async ({ page }, testInfo) => {
  const legacyPng = await captureStageFrame(page, '/src/pages/chase-meet.html');
  const modernPng = await captureStageFrame(page, '/src/pages/chase-meet.html?renderer=modern');

  const legacy = PNG.sync.read(legacyPng);
  const modern = PNG.sync.read(modernPng);

  expect(legacy.width).toBe(modern.width);
  expect(legacy.height).toBe(modern.height);

  const result = diffPixels(legacy, modern, 0);

  await testInfo.attach('legacy-stage', { body: legacyPng, contentType: 'image/png' });
  await testInfo.attach('modern-stage', { body: modernPng, contentType: 'image/png' });
  await testInfo.attach('diff-stage', { body: result.diffImage, contentType: 'image/png' });

  expect(result.pixels).toBe(0);
});

test('chase-meet right stage should be visually identical (legacy vs modern-lab)', async ({ page }, testInfo) => {
  const legacyPng = await captureStageFrame(page, '/src/pages/chase-meet.html?renderer=legacy');
  const modernLabPng = await captureStageFrame(page, '/src/pages/chase-meet.html?renderer=modern-lab');

  const legacy = PNG.sync.read(legacyPng);
  const modernLab = PNG.sync.read(modernLabPng);

  expect(legacy.width).toBe(modernLab.width);
  expect(legacy.height).toBe(modernLab.height);

  const strictResult = diffPixels(legacy, modernLab, 0);
  const visualResult = diffPixels(legacy, modernLab, 0.1);

  await testInfo.attach('legacy-stage-lab', { body: legacyPng, contentType: 'image/png' });
  await testInfo.attach('modern-lab-stage', { body: modernLabPng, contentType: 'image/png' });
  await testInfo.attach('diff-stage-lab-threshold0', { body: strictResult.diffImage, contentType: 'image/png' });
  await testInfo.attach('diff-stage-lab-threshold01', { body: visualResult.diffImage, contentType: 'image/png' });

  expect(visualResult.pixels).toBe(0);
});
