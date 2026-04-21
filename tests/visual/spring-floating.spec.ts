import { test } from '@playwright/test';

test('emf-analogy floating controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5177/src/pages/emf-analogy.html');
  await page.waitForTimeout(3000);

  // Screenshot floating controls area
  const floatingControls = await page.locator('.stage-floating-controls');
  await floatingControls.screenshot({ path: '/tmp/floating-controls.png' });

  // Get styles
  const styles = await page.evaluate(() => {
    const el = document.querySelector(
      '.stage-floating-controls'
    ) as HTMLElement;
    if (!el) return null;
    const computed = getComputedStyle(el);
    return {
      background: computed.background,
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      position: computed.position,
      top: computed.top,
      left: computed.left
    };
  });

  console.log('Floating controls styles:', styles);
});
