import { test, expect, type Page } from '@playwright/test';

const PORT = 5177;

async function assertFps(
  page: Page,
  path: string,
  label: string
): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}${path}`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForTimeout(1500);

  const playBtn = page
    .locator(
      '.stage-floating-controls button, .play-pause, .mobile-control-btn.play-pause'
    )
    .first();
  if (await playBtn.isVisible().catch(() => false)) {
    await playBtn.click();
  }

  await page.waitForTimeout(3000);

  const metrics = await page.evaluate(() => {
    const monitor = (window as unknown as Record<string, unknown>)
      .__perfMonitor as
      | {
          getMetrics?: () => {
            fps: number;
            frameTime: number;
            memoryMB?: number;
          };
        }
      | undefined;
    return monitor?.getMetrics?.() ?? null;
  });

  expect(
    metrics,
    `${label}: performance monitor should be active`
  ).not.toBeNull();
  if (metrics) {
    console.log(`${label} performance:`, JSON.stringify(metrics));
    expect(
      metrics.fps,
      `FPS too low: ${metrics.fps.toFixed(1)}`
    ).toBeGreaterThan(25);
    expect(
      metrics.frameTime,
      `Frame time too high: ${metrics.frameTime.toFixed(1)}ms`
    ).toBeLessThan(40);
  }
}

test('projectile maintains FPS above 25 during animation', async ({ page }) => {
  await assertFps(page, '/src/pages/projectile.html', 'Projectile');
});

test('chase-meet maintains FPS above 25 during animation', async ({ page }) => {
  await assertFps(page, '/src/pages/chase-meet.html', 'Chase-meet');
});

test('xt-graph maintains FPS above 25 during animation', async ({ page }) => {
  await assertFps(page, '/src/pages/xt-graph.html', 'xt-graph');
});

test('tortoise-hare maintains FPS above 25 during animation', async ({
  page
}) => {
  await assertFps(page, '/src/pages/tortoise-hare.html', 'tortoise-hare');
});
