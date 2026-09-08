/**
 * 验证 resizer 拖拽 + controlColumns 多列布局
 */
import { test, expect } from '@playwright/test';
import { waitForFirstFrame } from '../helpers/wait-first-frame';

test.describe('resizer drag fix', () => {
  test('spring-oscillator grid-template-columns updated during drag', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/src/pages/spring-oscillator.html', {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page);

    const container = page.locator('[data-testid="split-right-layout"]');
    const initialGrid = await container.evaluate(
      (el) => (el as HTMLElement).style.gridTemplateColumns
    );

    // Simulate drag on resizer
    const resizer = container.locator('.teaching-panel-resizer');
    const box = await resizer.boundingBox();
    expect(box, 'spring-oscillator resizer must be visible').not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 100, box!.y + box!.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect
      .poll(async () => {
        const newGrid = await container.evaluate(
          (el) => (el as HTMLElement).style.gridTemplateColumns
        );
        return newGrid;
      })
      .not.toBe(initialGrid);
  });

  test('ganshe grid-template-columns updated during drag', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/src/pages/ganshe.html', {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page);

    const container = page.locator(
      '[data-testid="split-right-graph-bottom-layout"]'
    );
    const initialGrid = await container.evaluate(
      (el) => (el as HTMLElement).style.gridTemplateColumns
    );

    const resizer = container.locator('.srgb-resizer-v');
    const box = await resizer.boundingBox();
    expect(box, 'ganshe resizer must be visible').not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 100, box!.y + box!.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect
      .poll(async () => {
        const newGrid = await container.evaluate(
          (el) => (el as HTMLElement).style.gridTemplateColumns
        );
        return newGrid;
      })
      .not.toBe(initialGrid);
  });
});

test.describe('controlColumns', () => {
  test('ganshe control slot has data-control-columns attribute', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/src/pages/ganshe.html', {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page);

    const controlSlot = page.locator('.srgb-control-slot');
    const attr = await controlSlot.getAttribute('data-control-columns');
    expect(attr).toBe('auto');
  });

  test('ganshe control cards display in grid layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/src/pages/ganshe.html', {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page);

    const controlSlot = page.locator('.srgb-control-slot');
    const display = await controlSlot.evaluate(
      (el) => getComputedStyle(el).display
    );
    // Should be 'grid' not 'flex'
    expect(display).toBe('grid');
  });
});
