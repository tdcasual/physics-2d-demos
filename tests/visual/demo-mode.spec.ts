import { expect, test } from '@playwright/test';

test.describe('demo mode (presentation)', () => {
  test('chase-meet switches to demo mode and hides sidebar', async ({ page }) => {
    await page.goto('/src/pages/chase-meet.html');
    await expect(page.locator('.layout-master')).toBeVisible();

    // Standard mode: left panel is visible
    const leftPanel = page.locator('.teaching-left-panel');
    await expect(leftPanel).toBeVisible();

    // Click demo mode button
    const modeButton = page.locator('.mode-toggle');
    await expect(modeButton).toHaveText('演示');
    await modeButton.click();

    // Presentation mode: left panel is hidden
    await expect(leftPanel).toBeHidden();

    // Readout panel should be docked to bottom
    const readoutPanel = page.locator('.readout-panel');
    await expect(readoutPanel).toHaveClass(/is-docked-bottom/);

    // Button text should flip to '标准'
    await expect(modeButton).toHaveText('标准');

    // Click back to standard mode
    await modeButton.click();
    await expect(leftPanel).toBeVisible();
    await expect(modeButton).toHaveText('演示');
  });

  test('field-lines switches to demo mode with minimal controls', async ({ page }) => {
    await page.goto('/src/pages/field-lines.html');
    await expect(page.locator('.layout-master')).toBeVisible();

    const leftPanel = page.locator('.teaching-left-panel');
    await expect(leftPanel).toBeVisible();

    const modeButton = page.locator('.mode-toggle');
    await modeButton.click();

    // field-lines demo profile uses 'minimal' controlPanel,
    // so left panel stays visible but graph section is collapsed
    await expect(leftPanel).toBeVisible();

    // Readout panel should be in overlay mode
    const readoutPanel = page.locator('.readout-panel');
    await expect(readoutPanel).toHaveClass(/is-overlay/);

    await modeButton.click();
    await expect(readoutPanel).not.toHaveClass(/is-overlay/);
  });

  test('demo mode adds touch optimization class', async ({ page }) => {
    await page.goto('/src/pages/chase-meet.html');
    await expect(page.locator('.layout-master')).toBeVisible();

    const layoutMaster = page.locator('.layout-master');
    await expect(layoutMaster).not.toHaveClass(/demo-touch-optimized/);

    await page.locator('.mode-toggle').click();
    await expect(layoutMaster).toHaveClass(/demo-touch-optimized/);

    await page.locator('.mode-toggle').click();
    await expect(layoutMaster).not.toHaveClass(/demo-touch-optimized/);
  });
});
