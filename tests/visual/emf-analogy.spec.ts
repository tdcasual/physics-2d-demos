import { expect, test } from '@playwright/test';

test('emf-analogy modern page renders controls and canvas', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html');
  await expect(page.getByRole('heading', { name: '电路水流类比' })).toBeVisible();
  await expect(page.locator('[data-role="system-toggle"]')).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('emf-analogy modern-lab route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html?renderer=modern-lab');
  await expect(page.getByRole('heading', { name: '电路水流类比' })).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('emf-analogy experimental route uses modern canvas renderer', async ({ page }) => {
  await page.goto('/src/pages/emf-analogy.html?renderer=experimental');
  await expect(page.getByRole('heading', { name: '电路水流类比' })).toBeVisible();
  await expect(page.locator('iframe.stage-iframe')).toHaveCount(0);
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('emf-analogy desktop readout defaults collapsed and supports drag', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/src/pages/emf-analogy.html');

  const readout = page.locator('.stage-readout');
  const desktopToggle = page.locator('.readout-desktop-toggle');
  const dragHandle = page.locator('.readout-drag-handle');

  await expect(desktopToggle).toBeVisible();
  await expect(readout).toHaveClass(/is-collapsed/);
  await desktopToggle.click();
  await expect(readout).not.toHaveClass(/is-collapsed/);
  await expect(dragHandle).toBeVisible();

  const before = await readout.boundingBox();
  expect(before).not.toBeNull();
  if (!before) return;

  const dragPoint = await dragHandle.boundingBox();
  expect(dragPoint).not.toBeNull();
  if (!dragPoint) return;

  await page.mouse.move(dragPoint.x + dragPoint.width / 2, dragPoint.y + dragPoint.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragPoint.x + dragPoint.width / 2 + 120, dragPoint.y + dragPoint.height / 2 - 80, {
    steps: 12
  });
  await page.mouse.up();

  const after = await readout.boundingBox();
  expect(after).not.toBeNull();
  if (!after) return;

  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(10);
});
