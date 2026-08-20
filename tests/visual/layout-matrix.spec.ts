import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { registerAllLayouts } from '../../src/app/layouts/auto-register';
import { layoutRegistry } from '../../src/app/layouts/registry';
import { satisfiesConstraints } from '../../src/app/layouts/layout-constraints';

registerAllLayouts();

const scenePages = readdirSync(join(process.cwd(), 'src/pages'))
  .filter((file) => file.endsWith('.html'))
  .map((file) => file.replace(/\.html$/, ''))
  .filter((id) => !['index-layout-test', 'instruments'].includes(id))
  .sort();

const layouts = layoutRegistry
  .getAllMetadata()
  .filter((metadata) => metadata.autoSelectable && metadata.layoutTestProfile);

test.describe.configure({ mode: 'serial' });

test('all discovered scenes render in every compatible registered layout', async ({
  page
}) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));

  for (const layout of layouts) {
    const profile = layout.layoutTestProfile!;
    for (const viewport of profile.viewports) {
      const orientation =
        viewport.width >= viewport.height ? 'landscape' : 'portrait';
      if (!satisfiesConstraints(layout, viewport, orientation)) continue;

      await page.setViewportSize(viewport);
      for (const scene of scenePages) {
        errors.length = 0;
        await page.goto(`/src/pages/${scene}.html?layout=${layout.id}`, {
          waitUntil: 'domcontentloaded'
        });
        await expect(page.locator('[data-layout-id]')).toHaveAttribute(
          'data-layout-id',
          layout.id,
          { timeout: 15_000 }
        );

        const shell = page.locator('[data-layout-id]').first();
        await expect(shell).toBeVisible();
        await expect(page.locator('.control-slot').first()).toBeAttached();
        await expect(page.locator('canvas').first()).toBeAttached();

        const dimensions = await page.evaluate(() => {
          const shell = document.querySelector('[data-layout-id]');
          const activeCanvases = Array.from(
            document.querySelectorAll('canvas')
          ).filter(
            (canvas) =>
              !canvas.closest('.mobile-tab-panel') ||
              canvas.closest('.mobile-tab-panel')?.classList.contains('active')
          );
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            shellWidth: shell?.getBoundingClientRect().width ?? 0,
            shellHeight: shell?.getBoundingClientRect().height ?? 0,
            canvases: activeCanvases.map((canvas) => ({
              width: canvas.getBoundingClientRect().width,
              height: canvas.getBoundingClientRect().height,
              className: canvas.className,
              parentClass: canvas.parentElement?.className ?? '',
              parentHeight:
                canvas.parentElement?.getBoundingClientRect().height ?? 0,
              grandparentHeight:
                canvas.parentElement?.parentElement?.getBoundingClientRect()
                  .height ?? 0
            }))
          };
        });

        expect(
          dimensions.shellWidth,
          `${scene}/${layout.id}: shell has no width`
        ).toBeGreaterThan(0);
        expect(
          dimensions.shellHeight,
          `${scene}/${layout.id}: shell has no height`
        ).toBeGreaterThan(0);
        expect(
          dimensions.overflow,
          `${scene}/${layout.id}: horizontal overflow`
        ).toBeLessThanOrEqual(2);
        expect(
          dimensions.canvases.every(
            (canvas) =>
              canvas.width >= (profile.minCanvasWidth ?? 50) &&
              canvas.height >= (profile.minCanvasHeight ?? 50)
          ),
          `${scene}/${layout.id}: active canvas is too small ${JSON.stringify(dimensions.canvases)}`
        ).toBe(true);

        if (profile.interactionModel === 'tabs') {
          const tabs = page.locator('[role="tab"]');
          const count = await tabs.count();
          expect(count, `${scene}/${layout.id}: no tabs found`).toBeGreaterThan(
            0
          );
          for (let index = 0; index < count; index += 1) {
            await tabs.nth(index).click();
            await expect(tabs.nth(index)).toHaveAttribute(
              'aria-selected',
              'true'
            );
          }
        }

        expect(errors, `${scene}/${layout.id}: browser errors`).toEqual([]);
      }
    }
  }
});
