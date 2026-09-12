import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1920, height: 1080 } });

async function enterPresentation(page: import('@playwright/test').Page) {
  await expect(page.locator('.layout-master')).toBeVisible();
  const modeButton = page.locator('.mode-toggle').first();
  await expect(modeButton).toBeVisible();
  if ((await modeButton.textContent())?.trim() === '演示') {
    await modeButton.click();
  }
  await expect(page.locator('.layout-master')).toHaveAttribute(
    'data-mode',
    'presentation'
  );
}

test.describe('presentation 1920x1080 geometry', () => {
  test('projectile lecture: compact left, overlay readout', async ({
    page
  }) => {
    await page.goto('/src/pages/projectile.html');
    await enterPresentation(page);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(1400);
    const readout = page.locator('.readout-panel');
    await expect(readout).toHaveClass(/is-overlay/);
    const rb = await readout.boundingBox();
    expect(rb?.height ?? 0).toBeLessThan(500);
  });

  test('chase-meet process: sidebar gone, readout at bottom', async ({
    page
  }) => {
    await page.goto('/src/pages/chase-meet.html');
    await enterPresentation(page);
    await expect(page.locator('.teaching-left-panel')).toBeHidden();
    const readout = page.locator('.readout-panel');
    await expect(readout).toHaveClass(/is-docked-bottom/);
    const rb = await readout.boundingBox();
    expect(rb?.y ?? 0).toBeGreaterThan(800);
    expect(rb?.height ?? 0).toBeLessThanOrEqual(280);
  });

  test('ticker-tape instrument: stage fills, lab extras hidden', async ({
    page
  }) => {
    await page.goto('/src/pages/ticker-tape.html');
    await enterPresentation(page);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(1400);
    await expect(page.locator('[data-control-key="noise"]')).toBeHidden();
    await expect(page.locator('[data-control-key="preset"]')).toBeVisible();
  });

  test('wedge keeps graph in the left column and reports fringe in mm', async ({
    page
  }) => {
    await page.goto('/src/pages/wedge.html');
    await enterPresentation(page);
    const graphInLeft = await page.evaluate(() => {
      const graph = document.querySelector('.graph-section');
      return Boolean(graph?.closest('.layout-left-panel'));
    });
    expect(graphInLeft).toBe(true);
    const fringe = page.locator('.readout-panel').getByText(/条纹间距/);
    await expect(fringe).toBeVisible();
    const text = (await page.locator('.readout-panel').innerText()) ?? '';
    expect(text).toMatch(/0\.372\s*mm/);
    expect(text).not.toMatch(/\b372\.\d+\s*mm/);
  });

  test('chase-meet process chips keep inner preset buttons', async ({
    page
  }) => {
    await page.goto('/src/pages/chase-meet.html');
    await enterPresentation(page);
    await expect(page.getByRole('button', { name: /匀速追赶/ })).toBeVisible();
  });

  test('vt-integral lecture keeps scene/preset/n', async ({ page }) => {
    await page.goto('/src/pages/vt-integral.html');
    await enterPresentation(page);
    await expect(page.locator('[data-control-key="scene"]')).toBeVisible();
    await expect(page.locator('[data-control-key="n"]')).toBeVisible();
    const readout = page.locator('.readout-panel');
    await expect(readout).toHaveClass(/is-overlay/);
  });

  test('spring-oscillator process chips keep phase presets', async ({
    page
  }) => {
    await page.goto('/src/pages/spring-oscillator.html');
    await enterPresentation(page);
    await expect(page.getByRole('button', { name: /同相/ })).toBeVisible();
  });

  test('field-lines lecture hides the transport bar', async ({ page }) => {
    await page.goto('/src/pages/field-lines.html');
    await enterPresentation(page);
    const bar = page.locator('.stage-floating-controls');
    await expect(bar).toBeHidden();
  });

  test('micrometer HUD does not leak the millimetre answer', async ({
    page
  }) => {
    await page.goto('/src/pages/micrometer.html');
    await enterPresentation(page);
    const text = (await page.locator('.readout-panel').innerText()) ?? '';
    expect(text).not.toMatch(/4\.593/);
  });

  test('chase-meet motion band is about 60% of the stage', async ({ page }) => {
    await page.goto('/src/pages/chase-meet.html');
    await enterPresentation(page);
    const ratio = await page.evaluate(() => {
      const motion = document.querySelector(
        'canvas.chase-modern-motion-canvas'
      );
      const stage = document.querySelector('.chase-modern-stage');
      if (!motion || !stage) return 0;
      const m = motion.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      return s.height > 0 ? m.height / s.height : 0;
    });
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.72);
  });

  test('electrification chips show all three scenes without descriptions', async ({
    page
  }) => {
    await page.goto('/src/pages/electrification.html');
    await enterPresentation(page);
    await expect(page.getByRole('radio', { name: /摩擦起电/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /接触起电/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /感应起电/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /执行步骤/ })).toBeVisible();
    const chips = (await page.locator('.demo-chip-slot').innerText()) ?? '';
    expect(chips).not.toMatch(/电子转移/);
  });

  test('chase-meet graphs sit above the docked readout', async ({ page }) => {
    await page.goto('/src/pages/chase-meet.html');
    await enterPresentation(page);
    const gap = await page.evaluate(() => {
      const graphs = document.querySelector('.chase-modern-card--graphs');
      const readout = document.querySelector('.readout-panel');
      if (!graphs || !readout) return -1;
      return (
        readout.getBoundingClientRect().y -
        graphs.getBoundingClientRect().bottom
      );
    });
    expect(gap).toBeGreaterThanOrEqual(-2);
  });
});
