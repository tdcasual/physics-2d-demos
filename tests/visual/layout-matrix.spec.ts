import { expect, test } from '@playwright/test';
import { registerAllLayouts } from '../../src/app/layouts/auto-register';
import { layoutRegistry } from '../../src/app/layouts/registry';
import { satisfiesConstraints } from '../../src/app/layouts/layout-constraints';
import { sceneIds, scenePage } from './scene-pages';

registerAllLayouts();

const layouts = layoutRegistry
  .getAllMetadata()
  .filter((metadata) => metadata.autoSelectable && metadata.layoutTestProfile);

const GRAPH_SURFACE_SELECTOR =
  '.graph-slot canvas, [class*="graph-slot"] canvas, .graph-cell canvas, [class*="graph-grid"] canvas, .chase-modern-card--graphs canvas';

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
      for (const scene of sceneIds) {
        errors.length = 0;
        await page.goto(scenePage(scene, `?layout=${layout.id}`), {
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

        const readDimensions = () =>
          page.evaluate(() => {
            const shell = document.querySelector('[data-layout-id]');
            const activeCanvases = Array.from(
              document.querySelectorAll('canvas')
            ).filter(
              (canvas) =>
                !canvas.closest('.mobile-tab-panel') ||
                canvas
                  .closest('.mobile-tab-panel')
                  ?.classList.contains('active')
            );
            return {
              overflow:
                document.documentElement.scrollWidth - window.innerWidth,
              shellWidth: shell?.getBoundingClientRect().width ?? 0,
              shellHeight: shell?.getBoundingClientRect().height ?? 0,
              canvases: activeCanvases.map((canvas) => ({
                width: canvas.getBoundingClientRect().width,
                height: canvas.getBoundingClientRect().height,
                isGraph:
                  Boolean(canvas.closest('.graph-slot')) ||
                  Boolean(canvas.closest('.graph-cell')) ||
                  Boolean(canvas.closest('[class*="graph-slot"]')) ||
                  Boolean(canvas.closest('[class*="graph-grid"]')) ||
                  Boolean(canvas.closest('.chase-modern-card--graphs')),
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

        await expect
          .poll(async () => (await readDimensions()).canvases.length, {
            timeout: 10_000,
            intervals: [100, 250, 500]
          })
          .toBeGreaterThan(0);
        const dimensions = await readDimensions();

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
              canvas.width >=
                (canvas.isGraph
                  ? (profile.minGraphWidth ?? 50)
                  : (profile.minStageWidth ?? 50)) &&
              canvas.height >=
                (canvas.isGraph
                  ? (profile.minGraphHeight ?? 40)
                  : (profile.minStageHeight ?? 50))
          ),
          `${scene}/${layout.id}/${viewport.width}x${viewport.height}: active canvas is too small ${JSON.stringify(dimensions.canvases)}`
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

        const hasGraph = await page
          .locator('[data-scene-has-graph="true"]')
          .count();
        if (hasGraph > 0) {
          const graphTab = page.locator('[role="tab"][data-tab="graph"]');
          if (profile.requiresGraphActivation && (await graphTab.count()) > 0) {
            await graphTab.click();
          }
          const graphSurface = page.locator(GRAPH_SURFACE_SELECTOR);
          await expect(
            graphSurface.first(),
            `${scene}/${layout.id}/${viewport.width}x${viewport.height}: graph surface missing`
          ).toBeVisible();
          await expect
            .poll(() => graphSurface.count(), { timeout: 10_000 })
            .toBeGreaterThan(0);
        }

        expect(errors, `${scene}/${layout.id}: browser errors`).toEqual([]);
      }
    }
  }
});
