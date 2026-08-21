import { expect, test } from '@playwright/test';

test('chase-meet mobile graphs render inside the graph tab', async ({
  page
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/src/pages/chase-meet.html');

  const graphTab = page.locator('.mobile-tab', { hasText: '图表' });
  await expect(graphTab).toBeVisible();
  await expect(page.locator('.mobile-tab')).toHaveCount(3);
  await expect(
    page.locator('.mobile-graph-slot > .chase-modern-card--graphs')
  ).toHaveCount(1);
  await expect(
    page.locator('.mobile-stage-slot .chase-modern-card--graphs')
  ).toHaveCount(0);

  await graphTab.click();

  const panel = page.locator('#mobile-panel-graph');
  const xCanvas = panel.locator('.chase-modern-x-canvas');
  const vCanvas = panel.locator('.chase-modern-v-canvas');
  await expect(panel).toBeVisible();
  await expect(xCanvas).toBeVisible();
  await expect(vCanvas).toBeVisible();

  const [panelBox, xBox, vBox] = await Promise.all([
    panel.boundingBox(),
    xCanvas.boundingBox(),
    vCanvas.boundingBox()
  ]);
  expect(panelBox).not.toBeNull();
  expect(xBox).not.toBeNull();
  expect(vBox).not.toBeNull();
  expect(xBox!.y).toBeGreaterThanOrEqual(panelBox!.y);
  expect(vBox!.y + vBox!.height).toBeLessThanOrEqual(
    panelBox!.y + panelBox!.height
  );
  expect(xBox!.width).toBeGreaterThan(300);
  expect(vBox!.width).toBeGreaterThan(300);
});
