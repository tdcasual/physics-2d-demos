import { expect, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

function cropTopLeft(source: PNG, width: number, height: number): PNG {
  const target = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const srcStart = (y * source.width) << 2;
    const dstStart = (y * width) << 2;
    source.data.copy(target.data, dstStart, srcStart, srcStart + (width << 2));
  }
  return target;
}

async function captureStageFrame(
  page: import('@playwright/test').Page,
  pagePath: string
): Promise<Buffer> {
  await page.goto(pagePath);
  await expect(
    page.getByRole('heading', { name: '电路水流类比' })
  ).toBeVisible();
  const stage = page.locator('.stage-frame');
  await expect(stage).toBeVisible();
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return canvas !== null && (canvas as HTMLCanvasElement).width > 0;
  });
  return stage.screenshot({
    animations: 'disabled',
    scale: 'css'
  });
}

test('emf-analogy modern-lab should stay visually aligned with legacy right stage', async ({
  page
}, testInfo) => {
  const legacyPng = await captureStageFrame(
    page,
    '/src/pages/emf-analogy.html?renderer=legacy'
  );
  const modernLabPng = await captureStageFrame(
    page,
    '/src/pages/emf-analogy.html?renderer=modern-lab'
  );

  const legacy = PNG.sync.read(legacyPng);
  const modernLab = PNG.sync.read(modernLabPng);

  const width = Math.min(legacy.width, modernLab.width);
  const height = Math.min(legacy.height, modernLab.height);
  const normalizedLegacy =
    legacy.width === width && legacy.height === height
      ? legacy
      : cropTopLeft(legacy, width, height);
  const normalizedModernLab =
    modernLab.width === width && modernLab.height === height
      ? modernLab
      : cropTopLeft(modernLab, width, height);

  const strictDiff = new PNG({ width, height });
  const strictPixels = pixelmatch(
    normalizedLegacy.data,
    normalizedModernLab.data,
    strictDiff.data,
    width,
    height,
    { threshold: 0, includeAA: true }
  );

  const visualDiff = new PNG({ width, height });
  const visualPixels = pixelmatch(
    normalizedLegacy.data,
    normalizedModernLab.data,
    visualDiff.data,
    width,
    height,
    { threshold: 0.1, includeAA: true }
  );

  await testInfo.attach('emf-analogy-legacy-stage', {
    body: legacyPng,
    contentType: 'image/png'
  });
  await testInfo.attach('emf-analogy-modern-lab-stage', {
    body: modernLabPng,
    contentType: 'image/png'
  });
  await testInfo.attach('emf-analogy-diff-threshold0', {
    body: PNG.sync.write(strictDiff),
    contentType: 'image/png'
  });
  await testInfo.attach('emf-analogy-diff-threshold01', {
    body: PNG.sync.write(visualDiff),
    contentType: 'image/png'
  });

  const strictRatio = strictPixels / (width * height);
  const visualRatio = visualPixels / (width * height);

  expect(strictRatio).toBeLessThanOrEqual(0.31);
  expect(visualRatio).toBeLessThanOrEqual(0.14);
});
