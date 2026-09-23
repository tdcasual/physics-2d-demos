import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { scenePage } from '../visual/scene-pages';
import { waitForFirstFrame } from '../helpers/wait-first-frame';
import {
  expectCanvasLayoutNotInflated,
  expectCanvasNotBlank,
  readStageZoomMetrics,
  readViewportZoom,
  waitForBoost
} from '../helpers/stage-zoom-metrics';

const STAGE_CANVAS = '.lab-stage-slot canvas';
const STAGE_SLOT = '.lab-stage-slot';
const ZOOM3_EVIDENCE = join(
  process.cwd(),
  'artifacts',
  'data-workspace',
  'ticker-tape-zoom3-metrics.json'
);

test.describe('ticker-tape data workspace', () => {
  test('default page hides lab float graph and data on desktop', async ({
    page
  }) => {
    await page.goto(scenePage('ticker-tape', '?preset=ua'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 400 });
    await expect(page.locator('.lab-float-graph')).toBeHidden();
    await expect(page.locator('.lab-float-data')).toBeHidden();
    await expect(page.locator('#lab-panel-graph')).toHaveAttribute(
      'hidden',
      ''
    );
    // plotBar 插入隐藏的 graph panel 内，不得漏出
    await expect(page.locator('.lab-plot-toolbar')).toBeHidden();
  });

  test('experiment page: dragging the ruler slides it over a static tape', async ({
    page
  }) => {
    await page.goto(scenePage('ticker-tape', '?preset=ua'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 400 });

    const canvas = page.locator(STAGE_CANVAS);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const geom = async () => {
      const d = await canvas.evaluate((el) => (el as HTMLElement).dataset);
      return {
        originTick: Number(d.originTickIndex),
        originPx: Number(d.originPx),
        rulerMidY: Number(d.rulerMidY),
        tapeBandY: Number(d.tapeBandY),
        tapeBandH: Number(d.tapeBandH)
      };
    };
    const before = await geom();
    expect(before.originTick).toBe(10);

    // 纸带静止断言：裁 O 线左侧的纸带条区域，拖动前后像素应完全一致
    const clip = {
      x: box!.x,
      y: box!.y + before.tapeBandY,
      width: Math.max(10, before.originPx - 20),
      height: before.tapeBandH
    };
    const tapeBefore = await page.screenshot({ clip });

    // 抓尺身（零刻度右侧 40 px）向右拖 150 px：尺随手滑动并吸附到更远计数点
    const grabX = box!.x + before.originPx + 40;
    const grabY = box!.y + before.rulerMidY;
    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 150, grabY, { steps: 10 });
    await page.mouse.up();

    const after = await geom();
    expect(after.originTick).toBeGreaterThan(before.originTick);
    expect(after.originPx).toBeGreaterThan(before.originPx);
    const tapeAfter = await page.screenshot({ clip });
    expect(tapeAfter.equals(tapeBefore)).toBe(true);

    // 拖过右边界：钳到 per-kind 上限（ua = 16），尺停住不抖动
    const dragBeyond = async () => {
      const g = await geom();
      const x = box!.x + g.originPx + 40;
      await page.mouse.move(x, grabY);
      await page.mouse.down();
      await page.mouse.move(x + 800, grabY, { steps: 6 });
      await page.mouse.move(x + 1600, grabY, { steps: 6 });
      await page.mouse.up();
    };
    await dragBeyond();
    const clamped = await geom();
    expect(clamped.originTick).toBe(16);
    await dragBeyond();
    const clamped2 = await geom();
    expect(clamped2.originTick).toBe(16);
    expect(clamped2.originPx).toBeCloseTo(clamped.originPx, 0);
  });

  test('default page hides lab float graph and data on mobile', async ({
    page
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(scenePage('ticker-tape', '?preset=ua'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 400 });
    await expect(page.locator('.lab-float-graph')).toBeHidden();
    await expect(page.locator('.lab-float-data')).toBeHidden();
  });

  test('two-step workspace: lock stage, transpose table, adopt graph, restore', async ({
    page
  }) => {
    await page.goto(scenePage('ticker-tape', '?preset=ua'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 500 });

    await expect(page.locator('#lab-panel-data')).toBeHidden();
    await expect(page.locator('#lab-panel-graph')).toBeHidden();

    const entry = page.locator('.data-workspace-entry');
    await expect(entry).toHaveText('数据处理');
    await expect(entry).toBeEnabled();
    await entry.click();
    await expect(page.locator('.data-workspace-panel')).toBeVisible();
    await expect(page.locator('.layout-master')).toHaveClass(
      /is-data-workspace-stage-lock/
    );
    const stageCanvas = page.locator('.lab-stage-slot canvas');
    await expect(stageCanvas).toHaveCSS('pointer-events', 'none');
    await expect(
      page.locator('.data-workspace-chart .lab-float-graph')
    ).toHaveCount(0);

    const table = page.locator('.data-workspace-table').first();
    await expect(table).toHaveAttribute('data-orientation', 'fields');
    await expect(table.locator('thead th')).toHaveText([
      '',
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      ''
    ]);
    await expect(
      page.locator('.data-workspace-na[data-field="deltaX"][data-trial="0"]')
    ).toHaveText('—');
    await expect(
      page.locator('.data-workspace-na[data-field="v"][data-trial="0"]')
    ).toHaveText('—');
    await expect(
      page.locator('.data-workspace-na[data-field="v"][data-trial="6"]')
    ).toHaveText('—');

    const x = (i: number) => {
      const t = 0.2 + i * 0.1;
      return 20 * (t * t - 0.2 * 0.2);
    };
    const v = (i: number) => (x(i + 1) - x(i - 1)) / 100 / 0.2;
    const input = (field: string, row: number) =>
      page.locator(
        `.data-workspace-input[data-field="${field}"][data-trial="${row}"]`
      );
    const fieldStatus = (field: string, row: number) =>
      page.locator(
        `.data-workspace-field:has(.data-workspace-input[data-field="${field}"][data-trial="${row}"]) .data-workspace-status`
      );
    const check = async (field: string, row: number, value: string) => {
      const el = input(field, row);
      await el.fill(value);
      await el.press('Enter');
    };

    await check('x', 0, x(0).toFixed(2));
    await expect(fieldStatus('x', 0)).toHaveClass(/is-ok/);

    const box = await stageCanvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(
      box!.x + box!.width * 0.28,
      box!.y + box!.height * 0.42
    );
    await page.mouse.down();
    await page.mouse.move(
      box!.x + box!.width * 0.72,
      box!.y + box!.height * 0.42,
      { steps: 8 }
    );
    await page.mouse.up();
    await expect(fieldStatus('x', 0)).toHaveClass(/is-ok/);
    await expect(fieldStatus('x', 0)).not.toHaveClass(/is-stale/);

    const chartTab = page.locator('[role="tab"][data-step="chartAnalysis"]');
    await expect(chartTab).toHaveAttribute('aria-disabled', 'true');
    await chartTab.click({ force: true });
    const stepAlert = page.locator('.data-workspace-step-alert');
    await expect(stepAlert).toBeVisible();
    await expect(stepAlert).toContainText('请先完成数据处理');
    await expect(page.locator('.data-workspace-hint')).toContainText(
      'x 单位 cm'
    );
    await expect(
      page.locator('[role="tab"][data-step="data"]')
    ).toHaveAttribute('aria-selected', 'true');

    for (let i = 1; i < 7; i += 1) await check('x', i, x(i).toFixed(2));
    for (let i = 1; i < 7; i += 1) {
      await expect(input('deltaX', i)).toBeEnabled();
      await input('deltaX', i).fill((x(i) - x(i - 1)).toFixed(2));
    }
    await page.locator('[aria-label="校对Δx"]').click();
    await expect(fieldStatus('deltaX', 1)).toHaveClass(/is-ok/);
    for (let i = 1; i <= 5; i += 1) {
      await expect(input('v', i)).toBeEnabled();
      // v 按 3 位有效数字判分（默认设置），0.12 须写作 0.120。
      await input('v', i).fill(v(i).toFixed(3));
    }
    await page.locator('[aria-label="校对v"]').click();
    await expect(fieldStatus('v', 1)).toHaveClass(/is-ok/);

    const aDiff = page.locator('.data-workspace-input[data-field="aDiff"]');
    await expect(aDiff).toBeEnabled();
    await aDiff.fill('0.4');
    await aDiff.press('Enter');
    await expect(
      page.locator(
        '.data-workspace-summary-row[data-step="data"] .data-workspace-status.is-ok'
      )
    ).toBeVisible();

    await page.locator('[role="tab"][data-step="chartAnalysis"]').click();
    await expect(
      page.locator('[role="tab"][data-step="chartAnalysis"]')
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.data-workspace-review')).toBeVisible();
    const adoptedGraph = page.locator('.data-workspace-chart .lab-float-graph');
    await expect(adoptedGraph).toBeVisible();
    await expect(page.locator('.data-workspace-chart canvas')).toBeVisible();
    await expect(page.locator('.layout-master')).toHaveClass(
      /is-data-workspace-chart/
    );
    await expect(adoptedGraph).toHaveCSS('position', 'static');
    await expect(adoptedGraph).toHaveCSS('top', 'auto');
    await expect(adoptedGraph).toHaveCSS('left', 'auto');
    await expect(
      page.locator('.data-workspace-chart .lab-float-header')
    ).toBeHidden();
    await expect(
      page.locator('.data-workspace-chart .lab-float-resize')
    ).toHaveCount(0);
    await expect(
      page.locator('.data-workspace-chart .lab-plot-toolbar')
    ).toBeVisible();

    const recap = page.locator(
      '.data-workspace-panel .data-workspace-review-table'
    );
    await expect(recap).toBeVisible();
    const recapBox = await recap.boundingBox();
    const graphBox = await adoptedGraph.boundingBox();
    const chartBox = await page.locator('.data-workspace-chart').boundingBox();
    expect(recapBox).not.toBeNull();
    expect(graphBox).not.toBeNull();
    expect(chartBox).not.toBeNull();
    expect(
      graphBox!.x < recapBox!.x + recapBox!.width &&
        graphBox!.x + graphBox!.width > recapBox!.x &&
        graphBox!.y < recapBox!.y + recapBox!.height &&
        graphBox!.y + graphBox!.height > recapBox!.y
    ).toBe(false);
    expect(graphBox!.y).toBeGreaterThanOrEqual(
      recapBox!.y + recapBox!.height - 1
    );
    expect(graphBox!.width).toBeGreaterThan(chartBox!.width * 0.9);

    await page
      .locator('.lab-plot-toolbar button', { hasText: '描点' })
      .evaluate((button) =>
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      );
    await expect(
      page.locator('.lab-plot-toolbar button', { hasText: '拟合' })
    ).toBeEnabled();
    await page
      .locator('.lab-plot-toolbar button', { hasText: '拟合' })
      .evaluate((button) =>
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      );

    const aFit = page.locator('.data-workspace-input[data-field="aFit"]');
    await expect(aFit).toBeVisible();
    await aFit.fill('0.4');
    await aFit.press('Enter');
    await expect(page.locator('.data-workspace-result')).toContainText(
      'v–t 图像斜率 a'
    );

    await expect(page.locator('.data-workspace-entry')).toHaveText('返回实验');
    await entry.click();
    await expect(page.locator('.data-workspace-panel')).toHaveCount(0);
    await expect(page.locator('#lab-panel-graph')).toBeHidden();
    await expect(page.locator('#lab-panel-data')).toBeHidden();
    await expect(page.locator('.layout-master')).not.toHaveClass(
      /is-data-workspace-stage-lock/
    );
    await expect(page.locator('.layout-master')).not.toHaveClass(
      /is-data-workspace-chart/
    );
  });

  test('workspace pan/zoom scales the stage without moving the origin', async ({
    page
  }) => {
    await page.goto(scenePage('ticker-tape', '?preset=ua'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 500 });

    const entry = page.locator('.data-workspace-entry');
    await entry.click();
    const viewport = page.locator('.stage-viewport');
    await expect(viewport).toBeVisible();
    await expect(page.locator('.data-workspace-panel')).toBeVisible();
    await expect(page.getByRole('button', { name: '放大' })).toBeVisible();

    const canvas = page.locator(STAGE_CANVAS);
    const originBefore = await canvas.getAttribute('data-origin-tick-index');
    expect(originBefore).toBeTruthy();

    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    const baseline = await readStageZoomMetrics(page, STAGE_CANVAS, STAGE_SLOT);
    expect(baseline.boost).toBe(1);
    expectCanvasLayoutNotInflated(baseline);

    const box = await page.locator(STAGE_SLOT).boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(
      box!.x + box!.width * 0.5,
      box!.y + box!.height * 0.5
    );
    await page.mouse.wheel(0, -240);
    await expect
      .poll(async () => {
        const transform = await viewport.evaluate(
          (el) => (el as HTMLElement).style.transform
        );
        const match = transform.match(/scale\(([^)]+)\)/);
        return match ? Number(match[1]) : 0;
      })
      .toBeGreaterThan(1);

    await page.mouse.move(
      box!.x + box!.width * 0.28,
      box!.y + box!.height * 0.42
    );
    await page.mouse.down();
    await page.mouse.move(
      box!.x + box!.width * 0.72,
      box!.y + box!.height * 0.42,
      { steps: 8 }
    );
    await page.mouse.up();
    await expect(canvas).toHaveAttribute(
      'data-origin-tick-index',
      originBefore as string
    );

    await waitForBoost(page, STAGE_CANVAS);
    const afterWheel = await readStageZoomMetrics(
      page,
      STAGE_CANVAS,
      STAGE_SLOT
    );
    expectCanvasLayoutNotInflated(afterWheel);
    expectCanvasNotBlank(afterWheel);

    const zoomIn = page.getByRole('button', { name: '放大' });
    for (let i = 0; i < 6; i += 1) {
      const z = await readViewportZoom(page);
      if (z >= 2.99) break;
      await zoomIn.click();
    }
    await expect
      .poll(async () => readViewportZoom(page))
      .toBeGreaterThanOrEqual(2.99);
    await waitForBoost(page, STAGE_CANVAS, 2.99);

    const zoom3 = await readStageZoomMetrics(page, STAGE_CANVAS, STAGE_SLOT);
    mkdirSync(join(process.cwd(), 'artifacts', 'data-workspace'), {
      recursive: true
    });
    writeFileSync(ZOOM3_EVIDENCE, `${JSON.stringify(zoom3, null, 2)}\n`);
    expect(zoom3.zoom).toBeGreaterThanOrEqual(2.99);
    expect(zoom3.boost).toBeGreaterThanOrEqual(2.99);
    expectCanvasLayoutNotInflated(zoom3);
    expectCanvasNotBlank(zoom3);
    const expectedBacking = Math.round(
      Math.max(1, Math.floor(zoom3.canvasCssWidth)) *
        Math.min(2, zoom3.dpr) *
        zoom3.boost
    );
    expect(zoom3.canvasWidth).toBeLessThanOrEqual(expectedBacking + 2);
    expect(zoom3.canvasWidth).toBeGreaterThan(zoom3.canvasCssWidth * 2);
    expect(zoom3.canvasWidth).toBeLessThan(
      zoom3.slotOffsetWidth *
        Math.min(2, zoom3.dpr) *
        zoom3.boost *
        zoom3.boost +
        2
    );

    const widthAtZoom3 = zoom3.canvasWidth;
    await page.getByRole('button', { name: '复位视图' }).click();
    await expect.poll(async () => readViewportZoom(page)).toBeCloseTo(1, 2);
    await expect(canvas).not.toHaveAttribute('data-render-boost');
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    const afterReset = await readStageZoomMetrics(
      page,
      STAGE_CANVAS,
      STAGE_SLOT
    );
    expect(afterReset.boost).toBe(1);
    expect(afterReset.zoom).toBeCloseTo(1, 2);
    expect(afterReset.canvasWidth).toBeLessThan(widthAtZoom3);
    const boost1Backing = Math.round(
      Math.max(1, Math.floor(afterReset.canvasCssWidth)) *
        Math.min(2, afterReset.dpr)
    );
    expect(afterReset.canvasWidth).toBe(boost1Backing);
    expect(
      Math.abs(afterReset.canvasWidth - baseline.canvasWidth)
    ).toBeLessThanOrEqual(4);
    expect(afterReset.canvasCssWidth).toBeCloseTo(
      afterReset.slotOffsetWidth,
      0
    );

    await entry.click();
    await expect(page.locator('.stage-viewport')).toHaveCount(0);
    await expect(canvas).not.toHaveAttribute('data-render-boost');
  });
});
