import { expect, test } from '@playwright/test';
import { registerAllLayouts } from '../../src/app/layouts/auto-register';
import { layoutRegistry } from '../../src/app/layouts/registry';
import { satisfiesConstraints } from '../../src/app/layouts/layout-constraints';
import { sceneIds, scenePage } from './scene-pages';

registerAllLayouts();

const layouts = layoutRegistry
  .getAllMetadata()
  .filter((metadata) => metadata.layoutTestProfile);

const GRAPH_SURFACE_SELECTOR =
  '.graph-slot canvas, [class*="graph-slot"] canvas, .graph-cell canvas, [class*="graph-grid"] canvas, .chase-modern-card--graphs canvas';

test.describe.configure({ mode: 'serial' });

for (const layout of layouts) {
  const profile = layout.layoutTestProfile!;
  for (const viewport of profile.viewports) {
    const orientation =
      viewport.width >= viewport.height ? 'landscape' : 'portrait';
    if (!satisfiesConstraints(layout, viewport, orientation)) continue;

    for (const scene of sceneIds) {
      test(`${scene} / ${layout.id} / ${viewport.width}x${viewport.height}`, async ({
        page
      }) => {
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) =>
          errors.push(`[pageerror] ${error.message}`)
        );

        await page.setViewportSize(viewport);
        await page.goto(scenePage(scene, `?layout=${layout.id}`), {
          waitUntil: 'domcontentloaded',
          timeout: 30_000
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
                (!canvas.closest('.mobile-tab-panel') ||
                  canvas
                    .closest('.mobile-tab-panel')
                    ?.classList.contains('active')) &&
                // graphInitiallyHidden 等场景：隐藏 section 内的 canvas 是
                // 工作区收养锚点，display:none 尺寸为 0 属设计如此
                !canvas.closest('[hidden]')
            );
            const inspectCanvas = (canvas: HTMLCanvasElement) => {
              const rect = canvas.getBoundingClientRect();
              const slot = canvas.closest(
                '.animation-slot, .graph-slot, .mobile-stage-slot, .mobile-graph-slot, [class*="stage-slot"], [class*="graph-slot"], [class*="graph-grid"]'
              );
              const slotRect = slot?.getBoundingClientRect();
              let pixelColors = 0;
              try {
                const sample = document.createElement('canvas');
                sample.width = 48;
                sample.height = 36;
                const context = sample.getContext('2d', {
                  willReadFrequently: true
                });
                context?.drawImage(canvas, 0, 0, sample.width, sample.height);
                const pixels = context?.getImageData(
                  0,
                  0,
                  sample.width,
                  sample.height
                ).data;
                if (pixels) {
                  const colors = new Set<string>();
                  for (let index = 0; index < pixels.length; index += 4) {
                    colors.add(
                      `${pixels[index] >> 4},${pixels[index + 1] >> 4},${pixels[index + 2] >> 4},${pixels[index + 3] >> 4}`
                    );
                    if (colors.size >= 3) break;
                  }
                  pixelColors = colors.size;
                }
              } catch {
                pixelColors = 0;
              }
              return {
                width: rect.width,
                height: rect.height,
                pixelColors,
                containedHorizontally:
                  !slotRect ||
                  (rect.left >= slotRect.left - 2 &&
                    rect.right <= slotRect.right + 2),
                responsiveScale: canvas.dataset.responsiveScale
                  ? Number(canvas.dataset.responsiveScale)
                  : null,
                isGraph:
                  Boolean(canvas.closest('.graph-slot')) ||
                  Boolean(canvas.closest('.graph-cell')) ||
                  Boolean(canvas.closest('[class*="graph-slot"]')) ||
                  Boolean(canvas.closest('[class*="graph-grid"]')) ||
                  Boolean(canvas.closest('.chase-modern-card--graphs')),
                className: canvas.className,
                parentClass: canvas.parentElement?.className ?? ''
              };
            };
            return {
              overflow:
                document.documentElement.scrollWidth - window.innerWidth,
              shellWidth: shell?.getBoundingClientRect().width ?? 0,
              shellHeight: shell?.getBoundingClientRect().height ?? 0,
              canvases: activeCanvases.map(inspectCanvas)
            };
          });

        await expect
          .poll(async () => (await readDimensions()).canvases.length, {
            timeout: 10_000,
            intervals: [100, 250, 500]
          })
          .toBeGreaterThan(0);
        await expect
          .poll(
            async () =>
              (await readDimensions()).canvases.every(
                (canvas) => canvas.pixelColors >= 2
              ),
            {
              message: `${scene}/${layout.id}: active canvas stayed blank`,
              timeout: 10_000,
              intervals: [100, 250, 500]
            }
          )
          .toBe(true);
        const dimensions = await readDimensions();
        const label = `${scene}/${layout.id}/${viewport.width}x${viewport.height}`;

        expect(
          dimensions.shellWidth,
          `${label}: shell has no width`
        ).toBeGreaterThan(0);
        expect(
          dimensions.shellHeight,
          `${label}: shell has no height`
        ).toBeGreaterThan(0);
        expect(
          dimensions.overflow,
          `${label}: horizontal overflow`
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
          `${label}: active canvas is too small ${JSON.stringify(dimensions.canvases)}`
        ).toBe(true);
        expect(
          dimensions.canvases.every((canvas) => canvas.containedHorizontally),
          `${label}: canvas escapes its layout slot ${JSON.stringify(dimensions.canvases)}`
        ).toBe(true);
        expect(
          dimensions.canvases.every(
            (canvas) =>
              canvas.responsiveScale !== null &&
              canvas.responsiveScale >= 0.3 &&
              canvas.responsiveScale <= 1.5
          ),
          `${label}: active canvas is missing a valid responsiveScale ${JSON.stringify(dimensions.canvases)}`
        ).toBe(true);

        if (profile.interactionModel === 'tabs') {
          const tabs = page.locator('[role="tab"]');
          const count = await tabs.count();
          expect(count, `${label}: no tabs found`).toBeGreaterThan(0);
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
        // graphInitiallyHidden / floatGraph:false：图表 slot 仅作工作区
        // 收养锚点，默认隐藏属设计如此，跳过"图表可见"断言
        const graphHiddenByDesign = await page
          .locator('[data-graph-initially-hidden="true"]')
          .count();
        if (hasGraph > 0 && graphHiddenByDesign === 0) {
          const graphTab = page.locator('[role="tab"][data-tab="graph"]');
          if (profile.requiresGraphActivation) {
            if (await graphTab.count()) {
              await graphTab.click();
            } else if (profile.adapter === 'collapsible-floats') {
              const graphDisclosure = page.locator(
                '#lab-panel-graph .lab-float-fold'
              );
              if (
                (await graphDisclosure.getAttribute('aria-expanded')) !== 'true'
              ) {
                await graphDisclosure.click();
              }
            }
          }
          const graphSurface = page.locator(GRAPH_SURFACE_SELECTOR);
          await expect(
            graphSurface.first(),
            `${label}: graph surface missing`
          ).toBeVisible();
          await expect
            .poll(() => graphSurface.count(), { timeout: 10_000 })
            .toBeGreaterThan(0);
          await expect
            .poll(
              async () => {
                const current = await readDimensions();
                const graphs = current.canvases.filter(
                  (canvas) => canvas.isGraph
                );
                return (
                  graphs.length > 0 &&
                  graphs.every(
                    (canvas) =>
                      canvas.width >= (profile.minGraphWidth ?? 50) &&
                      canvas.height >= (profile.minGraphHeight ?? 40) &&
                      canvas.responsiveScale !== null &&
                      canvas.responsiveScale >= 0.3 &&
                      canvas.responsiveScale <= 1.5 &&
                      canvas.pixelColors >= 2 &&
                      canvas.containedHorizontally
                  )
                );
              },
              {
                message: `${label}: activated graph canvas is too small or missing responsiveScale`,
                timeout: 10_000,
                intervals: [100, 250, 500]
              }
            )
            .toBe(true);
        }

        expect(errors, `${label}: browser errors`).toEqual([]);
      });
    }
  }
}
