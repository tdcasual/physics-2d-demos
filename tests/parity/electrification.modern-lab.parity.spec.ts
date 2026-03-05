import { expect, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

async function captureStageFrame(page: import('@playwright/test').Page, pagePath: string): Promise<Buffer> {
  await page.goto(pagePath);
  await expect(page.getByRole('heading', { name: '交互式静电起电演示（2D）' })).toBeVisible();
  const stage = page.locator('.stage-frame');
  await expect(stage).toBeVisible();
  await page.waitForTimeout(500);
  return stage.screenshot({
    animations: 'disabled',
    scale: 'css'
  });
}

test('electrification modern-lab should stay visually aligned with legacy right stage', async ({ page }, testInfo) => {
  const legacyPng = await captureStageFrame(page, '/src/pages/electrification.html?renderer=legacy');
  const modernLabPng = await captureStageFrame(page, '/src/pages/electrification.html?renderer=modern-lab');

  const legacy = PNG.sync.read(legacyPng);
  const modernLab = PNG.sync.read(modernLabPng);

  expect(legacy.width).toBe(modernLab.width);
  expect(legacy.height).toBe(modernLab.height);

  const strictDiff = new PNG({ width: legacy.width, height: legacy.height });
  const strictPixels = pixelmatch(
    legacy.data,
    modernLab.data,
    strictDiff.data,
    legacy.width,
    legacy.height,
    { threshold: 0, includeAA: true }
  );

  const visualDiff = new PNG({ width: legacy.width, height: legacy.height });
  const visualPixels = pixelmatch(
    legacy.data,
    modernLab.data,
    visualDiff.data,
    legacy.width,
    legacy.height,
    { threshold: 0.1, includeAA: true }
  );

  await testInfo.attach('electrification-legacy-stage', { body: legacyPng, contentType: 'image/png' });
  await testInfo.attach('electrification-modern-lab-stage', { body: modernLabPng, contentType: 'image/png' });
  await testInfo.attach('electrification-diff-threshold0', {
    body: PNG.sync.write(strictDiff),
    contentType: 'image/png'
  });
  await testInfo.attach('electrification-diff-threshold01', {
    body: PNG.sync.write(visualDiff),
    contentType: 'image/png'
  });

  const strictRatio = strictPixels / (legacy.width * legacy.height);
  const visualRatio = visualPixels / (legacy.width * legacy.height);

  expect(strictRatio).toBeLessThanOrEqual(0.016);
  expect(visualRatio).toBeLessThanOrEqual(0.01);
});
