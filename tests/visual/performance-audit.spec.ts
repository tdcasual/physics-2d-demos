import { test, expect } from '@playwright/test';

const PORT = 5183;

/**
 * 性能审计
 *
 * 验证动画场景在播放时维持合理的 FPS。
 */
test('projectile maintains FPS above 25 during animation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/src/pages/projectile.html`, {
    waitUntil: 'networkidle'
  });
  await page.waitForTimeout(1500);

  // 点击播放按钮开始动画
  const playBtn = page
    .locator('.play-pause, .mobile-control-btn.play-pause')
    .first();
  if (await playBtn.isVisible().catch(() => false)) {
    await playBtn.click();
  }

  // 等待 3 秒让动画稳定运行
  await page.waitForTimeout(3000);

  // 读取性能监控数据
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

  expect(metrics, 'Performance monitor should be active').not.toBeNull();
  if (metrics) {
    console.log('Projectile performance:', JSON.stringify(metrics));
    expect(
      metrics.fps,
      `FPS too low: ${metrics.fps.toFixed(1)}`
    ).toBeGreaterThan(25);
    expect(
      metrics.frameTime,
      `Frame time too high: ${metrics.frameTime.toFixed(1)}ms`
    ).toBeLessThan(40);
  }
});

test('chase-meet maintains FPS above 25 during animation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/src/pages/chase-meet.html`, {
    waitUntil: 'networkidle'
  });
  await page.waitForTimeout(1500);

  const playBtn = page
    .locator('.play-pause, .mobile-control-btn.play-pause')
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

  expect(metrics, 'Performance monitor should be active').not.toBeNull();
  if (metrics) {
    console.log('Chase-meet performance:', JSON.stringify(metrics));
    expect(
      metrics.fps,
      `FPS too low: ${metrics.fps.toFixed(1)}`
    ).toBeGreaterThan(25);
  }
});
