import { test } from '@playwright/test';

test('projectile dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5177/src/pages/projectile.html');
  await page.waitForTimeout(2000);

  // Click theme toggle to switch dark mode
  await page.click('.shell-theme-toggle');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/tmp/projectile-dark.png' });
});
