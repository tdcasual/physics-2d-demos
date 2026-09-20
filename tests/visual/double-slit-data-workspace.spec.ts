import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { waitForFirstFrame } from '../helpers/wait-first-frame';
import { scenePage } from './scene-pages';

const SHOT_DIR = join(process.cwd(), 'artifacts', 'data-workspace');

test.describe('double-slit data workspace screenshots', () => {
  test.beforeAll(() => {
    mkdirSync(SHOT_DIR, { recursive: true });
  });

  test('desktop stage stays apparatus-only', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(scenePage('double-slit', '?step=6'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 1000 });
    await page.waitForSelector('.microscope-root');
    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('.data-workspace-table')).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    const stage = page
      .locator('.teaching-stage-slot, .mobile-stage-slot, .lab-stage-slot')
      .first();
    await stage.screenshot({
      path: join(SHOT_DIR, 'desktop-stage.png')
    });
    await page.locator('.teaching-stage-canvas').screenshot({
      path: join(SHOT_DIR, 'desktop-stage-canvas-visual.png')
    });
    await page.locator('[data-slot="data-workspace"]').screenshot({
      path: join(SHOT_DIR, 'desktop-table.png')
    });
    await page.screenshot({
      path: join(SHOT_DIR, 'desktop-instrument-only.png'),
      fullPage: true
    });
    await page.locator('.data-workspace-add').click();
    await page.locator('.data-workspace-add').click();
    await expect(page.locator('.data-workspace-table tbody tr')).toHaveCount(3);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    await page.screenshot({
      path: join(SHOT_DIR, 'desktop-multi-row.png'),
      fullPage: true
    });
  });

  test('desktop micrometer instrument-only', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(
      scenePage('double-slit', '?step=6&activeInstrument=micrometer'),
      { waitUntil: 'domcontentloaded' }
    );
    await waitForFirstFrame(page, { remainderMs: 1000 });
    await page.waitForSelector('.micrometer-root');
    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('.data-workspace-table')).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    await page.screenshot({
      path: join(SHOT_DIR, 'desktop-micrometer.png'),
      fullPage: true
    });
  });

  test('mobile workspace is stacked and readable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(scenePage('double-slit', '?step=6'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 1000 });
    await page.waitForSelector('.microscope-root');
    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('.data-workspace-table')).toBeVisible();
    const stage = page
      .locator('.mobile-stage-slot, .teaching-stage-slot')
      .first();
    await stage.screenshot({
      path: join(SHOT_DIR, 'mobile-instrument-initial-visual.png')
    });
    await page.screenshot({
      path: join(SHOT_DIR, 'mobile-full.png'),
      fullPage: true
    });
    await page.screenshot({
      path: join(SHOT_DIR, 'mobile-instrument-only.png'),
      fullPage: true
    });
    await page.screenshot({
      path: join(SHOT_DIR, 'mobile-caliper.png'),
      fullPage: true
    });
    const scroller = page
      .locator('[data-instrument-scroll="true"]')
      .filter({ visible: true });
    await scroller.evaluate((el) => {
      el.scrollLeft = Math.min(120, el.scrollWidth - el.clientWidth);
    });
    await stage.screenshot({
      path: join(SHOT_DIR, 'mobile-instrument-reachable-visual.png')
    });
  });

  test('mobile micrometer instrument-only', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(
      scenePage('double-slit', '?step=6&activeInstrument=micrometer'),
      { waitUntil: 'domcontentloaded' }
    );
    await waitForFirstFrame(page, { remainderMs: 1000 });
    await page.waitForSelector('.micrometer-root');
    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('.data-workspace-table')).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    const viewportOverlap = (
      box: { x: number; y: number; width: number; height: number } | null
    ) => {
      if (!box) return { width: 0, height: 0 };
      return {
        width: Math.max(
          0,
          Math.min(box.x + box.width, 375) - Math.max(box.x, 0)
        ),
        height: Math.max(0, box.height)
      };
    };
    let access = {
      housing: { width: 0, height: 0 },
      fringe: { width: 0, height: 0 },
      reading: { width: 0, height: 0 }
    };
    await expect
      .poll(async () => {
        access = {
          housing: viewportOverlap(
            await page.locator('.micrometer-root .case').boundingBox()
          ),
          fringe: viewportOverlap(
            await page.locator('.micrometer-root .lens-view').boundingBox()
          ),
          reading: viewportOverlap(
            await page.locator('.micrometer-root .thimble-group').boundingBox()
          )
        };
        return access.housing.width;
      })
      .toBeGreaterThan(48);
    expect(access.housing.width).toBeGreaterThan(48);
    expect(access.fringe.width).toBeGreaterThan(20);
    expect(access.reading.width).toBeGreaterThan(24);
    const stage = page.locator('[data-double-slit-instruments="true"]');
    await stage.screenshot({
      path: join(SHOT_DIR, 'mobile-micrometer-stage.png')
    });
    await page.screenshot({
      path: join(SHOT_DIR, 'mobile-micrometer.png'),
      fullPage: true
    });
    const scroller = page
      .locator('[data-instrument-scroll="true"]')
      .filter({ visible: true });
    await scroller.evaluate((el) => {
      el.scrollLeft = Math.min(160, el.scrollWidth - el.clientWidth);
    });
    await stage.screenshot({
      path: join(SHOT_DIR, 'mobile-micrometer-reachable.png')
    });
  });

  test('tablet-narrow micrometer stays on stage', async ({ page }) => {
    await page.setViewportSize({ width: 639, height: 765 });
    await page.goto(
      scenePage('double-slit', '?step=6&activeInstrument=micrometer'),
      { waitUntil: 'domcontentloaded' }
    );
    await waitForFirstFrame(page, { remainderMs: 1000 });
    await page.waitForSelector('.micrometer-root');
    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('.data-workspace-table')).toBeVisible();
    await expect
      .poll(async () => {
        const box = await page
          .locator('[data-double-slit-instruments="true"]')
          .boundingBox();
        return box?.height ?? 0;
      })
      .toBeGreaterThan(80);
    const viewportOverlap = (
      box: { x: number; y: number; width: number; height: number } | null
    ) => {
      if (!box) return { width: 0, height: 0 };
      return {
        width: Math.max(
          0,
          Math.min(box.x + box.width, 639) - Math.max(box.x, 0)
        ),
        height: Math.max(0, box.height)
      };
    };
    let access = {
      housing: { width: 0, height: 0 },
      fringe: { width: 0, height: 0 },
      reading: { width: 0, height: 0 }
    };
    await expect
      .poll(async () => {
        access = {
          housing: viewportOverlap(
            await page.locator('.micrometer-root .case').boundingBox()
          ),
          fringe: viewportOverlap(
            await page.locator('.micrometer-root .lens-view').boundingBox()
          ),
          reading: viewportOverlap(
            await page.locator('.micrometer-root .thimble-group').boundingBox()
          )
        };
        return access.housing.width;
      })
      .toBeGreaterThan(48);
    expect(access.housing.width).toBeGreaterThan(48);
    expect(access.fringe.width).toBeGreaterThan(20);
    expect(access.reading.width).toBeGreaterThan(24);
    await page.screenshot({
      path: join(SHOT_DIR, 'tablet-micrometer.png'),
      fullPage: true
    });
  });
});
