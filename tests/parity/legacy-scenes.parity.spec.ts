import { expect, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

type SceneCase = {
  name: string;
  pagePath: string;
  heading: string;
};

const LEGACY_SCENES: SceneCase[] = [
  {
    name: 'field-lines',
    pagePath: '/src/pages/field-lines.html',
    heading: '电场线演化'
  },
  {
    name: 'emf-analogy',
    pagePath: '/src/pages/emf-analogy.html',
    heading: '电路水流类比'
  },
  {
    name: 'electrification',
    pagePath: '/src/pages/electrification.html',
    heading: '静电起电演示'
  },
  {
    name: 'vt-integral',
    pagePath: '/src/pages/vt-integral.html',
    heading: '微元法演示'
  }
];

const STRICT_PIXEL_TOLERANCE: Record<SceneCase['name'], number> = {
  'field-lines': 40,
  'emf-analogy': 25,
  electrification: 200,
  'vt-integral': 50
};

async function installDeterministicRuntime(
  page: import('@playwright/test').Page
): Promise<void> {
  await page.addInitScript(() => {
    let seed = 0x1a2b3c4d;
    let now = 1_700_000_000_000;
    let rafId = 1;
    const rafQueue = new Map<number, FrameRequestCallback>();

    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };

    Date.now = () => now;
    if (window.performance && typeof window.performance.now === 'function') {
      // Keep performance time deterministic for readout throttling and timeline labels.
      window.performance.now = () => now;
    }

    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      const id = rafId++;
      rafQueue.set(id, callback);
      return id;
    };
    window.cancelAnimationFrame = (id: number): void => {
      rafQueue.delete(id);
    };

    (
      window as Window & { __codexFlushRaf?: (steps?: number) => void }
    ).__codexFlushRaf = (steps = 1) => {
      for (let i = 0; i < steps; i += 1) {
        const callbacks = [...rafQueue.values()];
        rafQueue.clear();
        now += 16;
        for (const callback of callbacks) {
          callback(now);
        }
      }
    };
  });
}

async function captureStage(
  page: import('@playwright/test').Page,
  scene: SceneCase,
  renderer: 'legacy' | 'modern'
): Promise<Buffer> {
  if (scene.name === 'emf-analogy') {
    await installDeterministicRuntime(page);
  }
  await page.goto(`${scene.pagePath}?renderer=${renderer}`);
  await expect(
    page.getByRole('heading', { name: scene.heading })
  ).toBeVisible();
  const stage = page.locator('.stage-frame');
  await expect(stage).toBeVisible();

  if (scene.name === 'emf-analogy') {
    await page.evaluate(() => {
      const flush = (
        window as Window & { __codexFlushRaf?: (steps?: number) => void }
      ).__codexFlushRaf;
      if (typeof flush === 'function') {
        flush(8);
      }
    });
  } else {
    await page.waitForFunction(() => {
      const canvas = document.querySelector('canvas');
      return canvas !== null && (canvas as HTMLCanvasElement).width > 0;
    });
  }

  return stage.screenshot({
    animations: 'disabled',
    scale: 'css'
  });
}

for (const scene of LEGACY_SCENES) {
  test(`${scene.name} right stage should be pixel-identical (legacy vs modern)`, async ({
    page
  }, testInfo) => {
    const legacyPng = await captureStage(page, scene, 'legacy');
    const modernPng = await captureStage(page, scene, 'modern');

    const legacy = PNG.sync.read(legacyPng);
    const modern = PNG.sync.read(modernPng);

    expect(legacy.width).toBe(modern.width);
    expect(legacy.height).toBe(modern.height);

    const diff = new PNG({ width: legacy.width, height: legacy.height });
    const diffPixels = pixelmatch(
      legacy.data,
      modern.data,
      diff.data,
      legacy.width,
      legacy.height,
      { threshold: 0, includeAA: true }
    );

    await testInfo.attach(`${scene.name}-legacy-stage`, {
      body: legacyPng,
      contentType: 'image/png'
    });
    await testInfo.attach(`${scene.name}-modern-stage`, {
      body: modernPng,
      contentType: 'image/png'
    });
    await testInfo.attach(`${scene.name}-diff-stage`, {
      body: PNG.sync.write(diff),
      contentType: 'image/png'
    });

    expect(diffPixels).toBeLessThanOrEqual(STRICT_PIXEL_TOLERANCE[scene.name]);
  });
}
