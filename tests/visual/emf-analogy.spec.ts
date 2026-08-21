import { expect, test } from '@playwright/test';

test('emf-analogy desktop readout defaults collapsed and supports drag', async ({
  page
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/src/pages/emf-analogy.html');

  const readout = page.locator('.readout-panel');
  const toggle = page.locator('.readout-toggle');

  await expect(toggle).toBeVisible();
  await expect(readout).toHaveClass(/is-collapsed/);
  await toggle.click();
  await expect(readout).not.toHaveClass(/is-collapsed/);
});
