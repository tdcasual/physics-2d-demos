import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { scenePage } from '../visual/scene-pages';
import { waitForFirstFrame } from '../helpers/wait-first-frame';
import {
  expectCanvasLayoutNotInflated,
  expectCanvasNotBlank,
  readStageZoomMetrics
} from '../helpers/stage-zoom-metrics';

/** 1280×720 is the Playwright default and the middle classroom tier. */
const TYPE_TARGETS = {
  title: '24px',
  knownLabel: '18px',
  knownValue: '20px',
  hint: '18px',
  table: '18px',
  review: '18px',
  input: '18px',
  button: '18px',
  status: '18px',
  result: '18px',
  resultValue: '20px'
} as const;
const SCREENSHOT_DIR = join(
  process.cwd(),
  'artifacts',
  'data-workspace',
  'screenshots'
);

function auditShot(name: string): string {
  return join(SCREENSHOT_DIR, `audit-20260924-dense5-${name}.png`);
}

function typeTargetsFor(viewport: { width: number; height: number }): {
  title: string;
  knownLabel: string;
  knownValue: string;
  hint: string;
  table: string;
  review: string;
  input: string;
  button: string;
  status: string;
  result: string;
  resultValue: string;
  canvasTitle: string;
  canvasTick: string;
  canvasAxis: string;
} {
  if (viewport.width >= 1600 && viewport.height >= 900) {
    return {
      title: '52px',
      knownLabel: '36px',
      knownValue: '42px',
      hint: '34px',
      table: '36px',
      review: '44px',
      input: '66px',
      button: '54px',
      status: '54px',
      result: '36px',
      resultValue: '42px',
      canvasTitle: '48',
      canvasTick: '40',
      canvasAxis: '44'
    };
  }
  if (viewport.width >= 1100 && viewport.height >= 640) {
    return {
      ...TYPE_TARGETS,
      canvasTitle: '20',
      canvasTick: '18',
      canvasAxis: '18'
    };
  }
  return {
    title: '20px',
    knownLabel: '16px',
    knownValue: '18px',
    hint: '16px',
    table: '16px',
    review: '16px',
    input: '16px',
    button: '16px',
    status: '16px',
    result: '16px',
    resultValue: '18px',
    canvasTitle: '18',
    canvasTick: '16',
    canvasAxis: '16'
  };
}

async function setWorkspaceTheme(
  page: Page,
  theme: 'light' | 'dark'
): Promise<void> {
  await page.evaluate((next) => {
    document.documentElement.setAttribute('data-theme', next);
    document.querySelector('.layout-master')?.setAttribute('data-theme', next);
  }, theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

async function readPlotGeometry(page: Page): Promise<{
  cols: string;
  rows: string;
  fill: string;
  boxW: number;
  boxH: number;
  cssW: number;
  cssH: number;
  clearance: number;
  hostClient: number;
  hostScroll: number;
  title: string;
  tick: string;
  axis: string;
}> {
  return page.locator('.data-workspace-chart canvas').evaluate((el) => {
    const node = el as HTMLCanvasElement;
    const host = node.closest('.data-workspace-chart');
    return {
      cols: node.dataset.graphCols ?? '',
      rows: node.dataset.graphRows ?? '',
      fill: node.dataset.graphFill ?? '',
      boxW: Number(node.dataset.graphBoxW),
      boxH: Number(node.dataset.graphBoxH),
      cssW: node.clientWidth,
      cssH: node.clientHeight,
      clearance: Number(node.dataset.graphTickClearance),
      hostClient: host instanceof HTMLElement ? host.clientHeight : 0,
      hostScroll: host instanceof HTMLElement ? host.scrollHeight : 0,
      title: node.dataset.graphTitlePx ?? '',
      tick: node.dataset.graphTickPx ?? '',
      axis: node.dataset.graphAxisPx ?? ''
    };
  });
}

function expectSideBySide(
  geo: Awaited<ReturnType<typeof readPlotGeometry>>
): void {
  expect(geo.cols).toBe('2');
  expect(geo.rows).toBe('1');
  expect(geo.fill).toBe('fill');
  expect(geo.clearance).toBeGreaterThanOrEqual(1);
  expect(geo.boxW).toBeGreaterThan(geo.cssW * 0.4);
  expect(geo.boxW).toBeLessThan(geo.cssW * 0.55);
  expect(geo.boxH).toBeGreaterThan(geo.cssH * 0.75);
  expect(geo.cssH).toBeLessThanOrEqual(geo.hostClient + 2);
  // The chart host can keep about one scrollbar of slack (gutter / subpixel)
  // while the canvas itself still fits the visible box checked above.
  expect(geo.hostScroll - geo.hostClient).toBeLessThanOrEqual(24);
}

async function chartStack(page: Page): Promise<{
  review: number;
  splitter: number;
  chart: number;
  summary: number | null;
  result: number | null;
}> {
  return page.evaluate(() => {
    const top = (selector: string): number | null => {
      const el = document.querySelector(selector);
      if (!(el instanceof HTMLElement) || el.hidden) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return null;
      return rect.top;
    };
    const review = top('.data-workspace-chart-stage > .data-workspace-review');
    const splitter = top(
      '.data-workspace-chart-stage > .data-workspace-splitter'
    );
    const chart = top('.data-workspace-chart-stage > .data-workspace-chart');
    if (review === null || splitter === null || chart === null) {
      throw new Error('chart stack is not visible');
    }
    return {
      review,
      splitter,
      chart,
      summary: top('.data-workspace-panel > .data-workspace-summary'),
      result: top('.data-workspace-panel > .data-workspace-result')
    };
  });
}

const STAGE_CANVAS = '.lab-stage-slot canvas';
const STAGE_SLOT = '.lab-stage-slot';
const ZOOM_EVIDENCE = join(
  process.cwd(),
  'artifacts',
  'data-workspace',
  'ticker-tape-zoom-metrics.json'
);

/** 场景自绘缩放的当前倍率（画布 data-view-zoom）。 */
async function readViewZoom(page: Page): Promise<number> {
  const raw = await page.locator(STAGE_CANVAS).getAttribute('data-view-zoom');
  return raw == null ? 1 : Number(raw);
}

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
    expect(clamped2.originPx).toBe(clamped.originPx);
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
    test.setTimeout(150_000);
    await page.goto(scenePage('ticker-tape', '?preset=ua'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 500 });

    await expect(page.locator('#lab-panel-data')).toBeHidden();
    await expect(page.locator('#lab-panel-graph')).toBeHidden();

    const entry = page.locator(
      '.data-workspace-entry:not(.graph-analysis-entry)'
    );
    await expect(entry).toHaveText('数据处理');
    await expect(entry).toBeEnabled();
    await entry.click();
    await expect(page.locator('.data-workspace-panel')).toBeVisible();
    // 读数缩放由画布自绘：舞台不锁指针，画布进入缩放视图（拖尺由视图停用）。
    await expect(page.locator('.layout-master')).not.toHaveClass(
      /is-data-workspace-stage-lock/
    );
    const stageCanvas = page.locator('.lab-stage-slot canvas');
    await expect(stageCanvas).toHaveAttribute('data-view-zoom', '1.000');
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
    await expect(fieldStatus('x', 0)).toHaveText('✓');
    await expect(fieldStatus('x', 0)).toHaveCSS(
      'font-size',
      TYPE_TARGETS.status
    );
    await expect(fieldStatus('x', 0)).toHaveCSS('font-weight', '600');
    await expect(fieldStatus('x', 0)).toHaveCSS('white-space', 'nowrap');
    const statusFit = await fieldStatus('x', 0).evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    }));
    expect(statusFit.scrollWidth).toBeLessThanOrEqual(
      statusFit.clientWidth + 1
    );

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

    // 图像分析不必等表填完。点进去看布局，再回到数据表继续填写。
    const chartEntry = page.locator('.graph-analysis-entry');
    await expect(chartEntry).toBeVisible();
    await expect(chartEntry).toBeEnabled();
    await expect(chartEntry).toHaveAttribute('title', '进入图像分析环节');
    await chartEntry.click();
    await expect(page.locator('.layout-master')).toHaveClass(
      /is-data-workspace-chart/
    );
    await expect(page.locator('.lab-stage-slot canvas')).toBeHidden();
    await expect(page.locator('.data-workspace-review')).toBeVisible();
    await expect(page.locator('.data-workspace-chart')).toBeVisible();
    await expect(
      page.locator('.lab-plot-toolbar button', { hasText: '描点' })
    ).toBeDisabled();
    await expect(page.locator('.data-workspace-chart canvas')).toHaveAttribute(
      'data-plot-hint',
      '数据校对完成后才能描点'
    );
    await expect(page.locator('.theme-toggle-btn:visible')).toBeEnabled();
    await chartEntry.click();
    await expect(chartEntry).toHaveText('图像分析');
    await expect(page.locator('.data-workspace-table').first()).toBeVisible();
    await expect(page.locator('[role="tab"][data-step]')).toHaveCount(0);
    await expect(page.locator('.data-workspace-hint')).toContainText(
      'x、Δx 保留 2 位小数'
    );
    await expect(
      page.locator('.data-workspace-panel > .data-workspace-knowns')
    ).toContainText('有效位数（v、a）');
    await expect(page.locator('.data-workspace-title')).toHaveCSS(
      'font-size',
      TYPE_TARGETS.title
    );
    await expect(page.locator('.data-workspace-title')).toHaveCSS(
      'font-weight',
      '600'
    );
    await expect(page.locator('.data-workspace-known-label').first()).toHaveCSS(
      'font-size',
      TYPE_TARGETS.knownLabel
    );
    await expect(page.locator('.data-workspace-known-value').first()).toHaveCSS(
      'font-size',
      TYPE_TARGETS.knownValue
    );
    await expect(page.locator('.data-workspace-hint')).toHaveCSS(
      'font-size',
      TYPE_TARGETS.hint
    );
    await expect(page.locator('.data-workspace-table').first()).toHaveCSS(
      'font-size',
      TYPE_TARGETS.table
    );
    await expect(page.locator('.data-workspace-input').first()).toHaveCSS(
      'font-size',
      TYPE_TARGETS.input
    );
    await expect(page.locator('.data-workspace-check').first()).toHaveCSS(
      'font-size',
      TYPE_TARGETS.button
    );
    await expect(page.locator('.data-workspace-check').first()).toHaveCSS(
      'font-weight',
      '600'
    );

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

    // An unsent raw x draft is harvested on the way into chart layout.
    // Plotting stays disabled, then the test returns to the data table.
    await expect(chartEntry).toBeEnabled();
    await input('x', 0).fill('9.99');
    await chartEntry.click();
    await expect(page.locator('.layout-master')).toHaveClass(
      /is-data-workspace-chart/
    );
    await expect(chartEntry).toHaveText('返回数据处理');
    await expect(
      page.locator('.lab-plot-toolbar button', { hasText: '描点' })
    ).toBeDisabled();
    await expect(input('x', 0)).toHaveValue('9.99');
    await chartEntry.click();
    await expect(chartEntry).toHaveText('图像分析');

    await check('x', 0, x(0).toFixed(2));
    await expect(fieldStatus('x', 0)).toHaveClass(/is-ok/);
    await check('deltaX', 1, (x(1) - x(0)).toFixed(2));
    await check('v', 1, v(1).toFixed(3));

    const aDiff = page.locator('.data-workspace-input[data-field="aDiff"]');
    await expect(aDiff).toBeEnabled();
    // aDiff 同样按 3 位有效数字判分。
    await aDiff.fill('0.400');
    await aDiff.press('Enter');
    await expect(chartEntry).toBeEnabled();
    await expect(
      page.locator(
        '.data-workspace-summary-row[data-step="data"] .data-workspace-status.is-ok'
      )
    ).toBeVisible();
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: auditShot('ticker-data-1280-light')
    });

    await chartEntry.click();
    await expect(chartEntry).toHaveAttribute('aria-pressed', 'true');
    await expect(chartEntry).toHaveText('返回数据处理');
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
    // 图像分析环节无动画区：舞台画布收起，悬浮工具条宿主保留。
    await expect(page.locator('.lab-stage-slot canvas')).toBeHidden();
    await expect(entry).toBeVisible();

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

    const panelBox = await page.locator('.data-workspace-panel').boundingBox();
    const viewport = page.viewportSize();
    expect(panelBox!.height).toBeGreaterThan(viewport!.height * 0.7);
    const review = page.locator(
      '.data-workspace-chart-stage > .data-workspace-review'
    );
    const splitter = page.locator('.data-workspace-splitter');
    const chartStage = page.locator('.data-workspace-chart-stage');
    const graphCanvas = page.locator('.data-workspace-chart canvas');
    await expect(chartStage).toHaveAttribute('data-split-mode', 'even');
    await expect(splitter).toHaveAttribute('aria-valuemin', '18');
    await expect(splitter).toHaveAttribute('aria-valuemax', '72');
    await expect(splitter).toHaveAttribute('aria-valuenow', '50');
    await expect(splitter).toHaveAttribute('aria-valuetext', '上下各半');
    const contentAria = Number(await splitter.getAttribute('aria-valuenow'));
    const contentMin = Number(await splitter.getAttribute('aria-valuemin'));
    const contentMax = Number(await splitter.getAttribute('aria-valuemax'));
    expect(contentAria).toBeGreaterThanOrEqual(contentMin);
    expect(contentAria).toBeLessThanOrEqual(contentMax);
    expect((await chartStage.getAttribute('style')) ?? '').not.toContain(
      '--dw-split'
    );
    expect(
      await page.evaluate(() =>
        localStorage.getItem('dw-split-fit-ticker-tape-vt')
      )
    ).toBeNull();
    const reviewArea = await review.boundingBox();
    const chartArea = await page.locator('.data-workspace-chart').boundingBox();
    expect(reviewArea).not.toBeNull();
    expect(chartArea).not.toBeNull();
    expect(
      Math.abs(reviewArea!.height - chartArea!.height)
    ).toBeLessThanOrEqual(8);
    await page.keyboard.press('Tab');
    await splitter.focus();
    const splitterHit = await splitter.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const line = getComputedStyle(el, '::before').height;
      const style = getComputedStyle(el);
      return {
        height: box.height,
        line: parseFloat(line),
        focusVisible: el.matches(':focus-visible'),
        outline: parseFloat(style.outlineWidth)
      };
    });
    expect(splitterHit.height).toBeGreaterThanOrEqual(32);
    expect(splitterHit.line).toBeLessThanOrEqual(2);
    expect(splitterHit.focusVisible).toBe(true);
    expect(splitterHit.outline).toBeGreaterThanOrEqual(2);
    const defaultStack = await chartStack(page);
    expect(defaultStack.review).toBeLessThan(defaultStack.splitter);
    expect(defaultStack.splitter).toBeLessThan(defaultStack.chart);
    expect(defaultStack.summary).not.toBeNull();
    expect(defaultStack.chart).toBeLessThan(defaultStack.summary!);

    await expect(page.locator('.data-workspace-review-table')).toHaveCSS(
      'font-size',
      TYPE_TARGETS.review
    );
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-cols'))
      .toBe('2');
    const fitted = await graphCanvas.evaluate((el) => {
      const node = el as HTMLCanvasElement;
      return {
        cols: node.dataset.graphCols,
        rows: node.dataset.graphRows,
        count: node.dataset.graphCount,
        fill: node.dataset.graphFill,
        boxW: Number(node.dataset.graphBoxW),
        boxH: Number(node.dataset.graphBoxH),
        title: Number(node.dataset.graphTitlePx),
        tick: Number(node.dataset.graphTickPx),
        axis: Number(node.dataset.graphAxisPx),
        cssW: node.clientWidth,
        cssH: node.clientHeight
      };
    });
    expect(fitted.count).toBe('2');
    expect(fitted.cols).toBe('2');
    expect(fitted.rows).toBe('1');
    expect(fitted.fill).toBe('fill');
    expect(fitted.boxW).toBeGreaterThan(fitted.cssW * 0.4);
    expect(fitted.boxW).toBeLessThan(fitted.cssW * 0.55);
    expect(fitted.boxH).toBeGreaterThan(fitted.cssH * 0.75);
    expect(fitted.title).toBe(20);
    expect(fitted.tick).toBe(18);
    expect(fitted.axis).toBe(18);
    expectSideBySide(await readPlotGeometry(page));
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
    await page.waitForTimeout(700);
    await page.screenshot({
      path: auditShot('ticker-chart-1280-light')
    });

    const xChip = page.locator('.lab-plot-chip', { hasText: 'x–t' });
    const vChip = page.locator('.lab-plot-chip', { hasText: 'v–t' });
    await expect(xChip).toHaveAttribute('aria-pressed', 'true');
    await expect(vChip).toHaveAttribute('aria-pressed', 'true');
    await vChip.click();
    await expect(vChip).toHaveAttribute('aria-pressed', 'false');
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-count'))
      .toBe('1');
    const single = await graphCanvas.evaluate((el) => {
      const node = el as HTMLCanvasElement;
      return {
        cols: node.dataset.graphCols,
        fill: node.dataset.graphFill,
        boxW: Number(node.dataset.graphBoxW),
        boxH: Number(node.dataset.graphBoxH),
        cssW: node.clientWidth,
        cssH: node.clientHeight
      };
    });
    expect(single.cols).toBe('1');
    expect(single.fill).toBe('fill');
    expect(single.boxW).toBeGreaterThan(single.cssW * 0.85);
    expect(single.boxH).toBeGreaterThan(single.cssH * 0.75);
    expect(single.boxW).toBeGreaterThan(fitted.boxW * 1.5);
    await vChip.click();
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-count'))
      .toBe('2');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.data-workspace-review-table')).toHaveCSS(
      'font-size',
      typeTargetsFor({ width: 1920, height: 1080 }).review
    );
    await page.screenshot({
      path: auditShot('ticker-chart-1920-light')
    });
    await page.setViewportSize({ width: 1280, height: 720 });

    await splitter.focus();
    await splitter.press('ArrowDown');
    await expect(chartStage).toHaveAttribute('data-split-mode', 'manual');
    const manualAria = Number(await splitter.getAttribute('aria-valuenow'));
    expect(manualAria).toBeGreaterThanOrEqual(18);
    expect(manualAria).toBeLessThanOrEqual(72);
    await expect(chartStage).toHaveAttribute('style', /--dw-split:/);
    await expect
      .poll(async () => {
        const stage = (await chartStage.boundingBox())!.height;
        const height = (await review.boundingBox())!.height;
        return Math.abs(height / stage - manualAria / 100);
      })
      .toBeLessThan(0.08);

    const handle = await splitter.boundingBox();
    expect(handle).not.toBeNull();
    const handleX = handle!.x + handle!.width / 2;
    const handleY = handle!.y + handle!.height / 2;
    await page.mouse.move(handleX, handleY);
    await page.mouse.down();
    await page.mouse.move(handleX, handleY + 90, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(async () => Number(await splitter.getAttribute('aria-valuenow')))
      .toBeGreaterThan(manualAria + 5);
    const adjustedAria = Number(await splitter.getAttribute('aria-valuenow'));
    expect(adjustedAria).toBeLessThanOrEqual(72);
    const reviewAfterDrag = (await review.boundingBox())!.height;
    expect(reviewAfterDrag).toBeGreaterThan(24);
    expect(
      await page.evaluate(() =>
        localStorage.getItem('dw-split-fit-ticker-tape-vt')
      )
    ).toBeTruthy();
    expect(
      await page.evaluate(() => localStorage.getItem('dw-split-ticker-tape-vt'))
    ).toBeNull();
    await page.screenshot({
      path: auditShot('ticker-chart-1280-adjusted-light')
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-cols'))
      .toBe('2');
    const projection = typeTargetsFor({ width: 1920, height: 1080 });
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-title-px'))
      .toBe(projection.canvasTitle);
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-tick-px'))
      .toBe(projection.canvasTick);
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-axis-px'))
      .toBe(projection.canvasAxis);
    await expect(page.locator('.data-workspace-title')).toHaveCSS(
      'font-size',
      projection.title
    );
    await expect(page.locator('.data-workspace-review-table')).toHaveCSS(
      'font-size',
      projection.review
    );
    await expect(page.locator('.data-workspace-review-table')).toHaveCSS(
      'font-weight',
      '700'
    );
    const reviewCell = page
      .locator('.data-workspace-review-table tbody td')
      .first();
    await expect(reviewCell).toHaveCSS('font-size', '44px');
    await expect(reviewCell).toHaveCSS('font-weight', '700');
    const reviewRowH = await page
      .locator('.data-workspace-review-table tbody tr')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(reviewRowH).toBeGreaterThanOrEqual(56);
    const projectionFit = await readPlotGeometry(page);
    expect(projectionFit.clearance).toBeGreaterThanOrEqual(1);
    expect(projectionFit.cols).toBe('2');
    expect(projectionFit.fill).toBe('fill');
    const projectionInput = page.locator(
      '.data-workspace-input[data-field="aFit"]'
    );
    await expect(projectionInput).toBeVisible();
    const projectionInputFit = await projectionInput.evaluate((el) => {
      const style = getComputedStyle(el);
      const font = Number.parseFloat(style.fontSize);
      const contentH =
        el.clientHeight -
        (Number.parseFloat(style.paddingTop) || 0) -
        (Number.parseFloat(style.paddingBottom) || 0);
      return {
        font,
        contentH,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      };
    });
    expect(projectionInputFit.contentH).toBeGreaterThanOrEqual(
      projectionInputFit.font
    );
    expect(projectionInputFit.scrollWidth).toBeLessThanOrEqual(
      projectionInputFit.clientWidth + 2
    );
    await page.screenshot({
      path: auditShot('ticker-chart-1920-manual-light')
    });
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(splitter).toHaveAttribute(
      'aria-valuenow',
      String(adjustedAria)
    );
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-cols'))
      .toBe('1');
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-rows'))
      .toBe('2');
    const mobileStack = await chartStack(page);
    expect(mobileStack.review).toBeLessThan(mobileStack.splitter);
    expect(mobileStack.splitter).toBeLessThan(mobileStack.chart);
    expect(mobileStack.summary).not.toBeNull();
    expect(mobileStack.chart).toBeLessThan(mobileStack.summary!);
    const mobileRatio = await page.evaluate(() => {
      const stage = document.querySelector('.data-workspace-chart-stage');
      const table = document.querySelector(
        '.data-workspace-chart-stage > .data-workspace-review'
      );
      if (!(stage instanceof HTMLElement) || !(table instanceof HTMLElement)) {
        return 0;
      }
      return (
        table.getBoundingClientRect().height /
        stage.getBoundingClientRect().height
      );
    });
    expect(Math.abs(mobileRatio - adjustedAria / 100)).toBeLessThan(0.14);
    const mobileColumns = await graphCanvas.evaluate((el) => {
      const node = el as HTMLCanvasElement;
      return {
        fill: node.dataset.graphFill,
        boxW: Number(node.dataset.graphBoxW),
        boxH: Number(node.dataset.graphBoxH),
        cssW: node.clientWidth,
        title: node.dataset.graphTitlePx,
        tick: node.dataset.graphTickPx,
        axis: node.dataset.graphAxisPx
      };
    });
    expect(mobileColumns.fill).toBe('stack');
    expect(mobileColumns.boxW).toBeGreaterThan(mobileColumns.cssW * 0.85);
    expect(mobileColumns.title).toBe('18');
    expect(mobileColumns.tick).toBe('16');
    expect(mobileColumns.axis).toBe('16');
    const chartScroll = await page
      .locator('.data-workspace-chart')
      .evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(chartScroll).toBeGreaterThan(8);
    await page.screenshot({
      path: auditShot('ticker-chart-390-light')
    });
    await expect(chartEntry).toBeVisible();
    const mobileToolbarBox = await page
      .locator('.teaching-stage-floating-controls')
      .boundingBox();
    expect(mobileToolbarBox).not.toBeNull();
    expect(mobileToolbarBox!.y).toBeGreaterThanOrEqual(0);
    expect(mobileToolbarBox!.y + mobileToolbarBox!.height).toBeLessThanOrEqual(
      844
    );
    await expect(page.locator('.lab-stage-toolbar')).toBeHidden();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBe(0);
    await chartEntry.click();
    await expect(chartEntry).toHaveText('图像分析');
    await expect(page.locator('.layout-master')).not.toHaveClass(
      /is-data-workspace-chart/
    );
    await chartEntry.click();
    await expect(chartEntry).toHaveText('返回数据处理');
    await expect(page.locator('.layout-master')).toHaveClass(
      /is-data-workspace-chart/
    );
    await page.setViewportSize({ width: 844, height: 390 });
    const phoneLandscape = typeTargetsFor({ width: 844, height: 390 });
    await expect(page.locator('.data-workspace-title')).toHaveCSS(
      'font-size',
      phoneLandscape.title
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    await expect
      .poll(async () => {
        const geometry = await readPlotGeometry(page);
        if (geometry.cols === '1') {
          return geometry.boxW / geometry.cssW > 0.85;
        }
        return (
          geometry.cols === '2' &&
          geometry.boxW / geometry.cssW > 0.4 &&
          geometry.boxW / geometry.cssW < 0.55
        );
      })
      .toBe(true);
    await expect(page.locator('.data-workspace-review-table')).toHaveCSS(
      'font-size',
      phoneLandscape.review
    );
    await expect
      .poll(async () => graphCanvas.getAttribute('data-graph-title-px'))
      .toBe(phoneLandscape.canvasTitle);
    const landscapeGraph = await graphCanvas.evaluate((el) => {
      const node = el as HTMLCanvasElement;
      return {
        cols: node.dataset.graphCols ?? '',
        fill: node.dataset.graphFill ?? '',
        boxW: Number(node.dataset.graphBoxW),
        boxH: Number(node.dataset.graphBoxH),
        cssW: node.clientWidth,
        cssH: node.clientHeight
      };
    });
    if (landscapeGraph.cols === '1') {
      expect(landscapeGraph.boxW).toBeGreaterThan(landscapeGraph.cssW * 0.85);
    } else {
      expect(landscapeGraph.cols).toBe('2');
      expect(landscapeGraph.fill).toBe('fill');
      expect(landscapeGraph.boxW).toBeGreaterThan(landscapeGraph.cssW * 0.4);
      expect(landscapeGraph.boxW).toBeLessThan(landscapeGraph.cssW * 0.55);
      expect(landscapeGraph.boxH).toBeGreaterThan(landscapeGraph.cssH * 0.75);
    }
    const reviewReach = await page
      .locator('.data-workspace-chart-stage > .data-workspace-review')
      .evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
        const last = el.querySelector(
          'tr:last-child td:last-child, th:last-child'
        );
        const cell =
          last instanceof HTMLElement ? last.getBoundingClientRect() : null;
        const host = el.getBoundingClientRect();
        const root = document.documentElement;
        return {
          pageOverflow: root.scrollWidth - root.clientWidth,
          lastRight: cell?.right ?? -1,
          hostLeft: host.left,
          hostRight: host.right
        };
      });
    expect(reviewReach.pageOverflow).toBeLessThanOrEqual(1);
    expect(reviewReach.lastRight).toBeGreaterThan(reviewReach.hostLeft);
    expect(reviewReach.lastRight).toBeLessThanOrEqual(
      reviewReach.hostRight + 2
    );
    // A drag that starts from the even 50% split is too tall for this
    // 390px-high screen. The short-screen plot check uses the minimum
    // split; Home is asserted again below.
    await splitter.focus();
    await splitter.press('Home');
    await expect
      .poll(async () => Number(await splitter.getAttribute('aria-valuenow')))
      .toBe(18);
    const plotOnScreen = await page.evaluate(() => {
      const canvas = document.querySelector('.data-workspace-chart canvas');
      if (!(canvas instanceof HTMLElement)) {
        return { visible: 0, top: 9999, viewH: 0 };
      }
      const box = canvas.getBoundingClientRect();
      const viewH = window.innerHeight;
      return {
        visible: Math.max(
          0,
          Math.min(box.bottom, viewH) - Math.max(box.top, 0)
        ),
        top: box.top,
        viewH
      };
    });
    expect(plotOnScreen.top).toBeLessThan(plotOnScreen.viewH - 64);
    expect(plotOnScreen.visible).toBeGreaterThan(72);
    const plotInk = await graphCanvas.evaluate((el) => {
      const canvas = el as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx || canvas.width < 4 || canvas.height < 4) {
        return { onScreen: 0, sampleY: -1 };
      }
      const rect = canvas.getBoundingClientRect();
      const scaleY = canvas.height / Math.max(1, canvas.clientHeight);
      const titlePx = Number(canvas.dataset.graphTitlePx || 18);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const bgAt = (px: number, py: number) => {
        const i = (py * canvas.width + px) * 4;
        return [image[i], image[i + 1], image[i + 2]];
      };
      const bg = bgAt(2, 2);
      const yStart = Math.min(
        canvas.height - 2,
        Math.ceil((titlePx + 8) * scaleY)
      );
      const step = Math.max(2, Math.round(scaleY * 2));
      let onScreen = 0;
      let sampleY = -1;
      for (let y = yStart; y < canvas.height - 2; y += step) {
        const cssY = rect.top + y / scaleY;
        if (cssY < 0 || cssY > window.innerHeight - 4) continue;
        for (let x = 2; x < canvas.width - 2; x += step) {
          const i = (y * canvas.width + x) * 4;
          const sat =
            Math.max(image[i], image[i + 1], image[i + 2]) -
            Math.min(image[i], image[i + 1], image[i + 2]);
          const dist =
            Math.abs(image[i] - bg[0]) +
            Math.abs(image[i + 1] - bg[1]) +
            Math.abs(image[i + 2] - bg[2]);
          if (dist < 80 || sat < 35) continue;
          onScreen += 1;
          if (sampleY < 0) sampleY = cssY;
          if (onScreen >= 12) break;
        }
        if (onScreen >= 12) break;
      }
      return { onScreen, sampleY };
    });
    expect(plotInk.onScreen).toBeGreaterThanOrEqual(8);
    expect(plotInk.sampleY).toBeGreaterThanOrEqual(0);
    expect(plotInk.sampleY).toBeLessThan(390);
    const toolbarBox = await page.locator('.lab-plot-toolbar').boundingBox();
    expect(toolbarBox).not.toBeNull();
    expect(toolbarBox!.y).toBeGreaterThanOrEqual(0);
    expect(toolbarBox!.y + 24).toBeLessThanOrEqual(plotOnScreen.viewH);
    expect(
      await page.locator('.lab-plot-toolbar button').count()
    ).toBeGreaterThan(0);
    await page.screenshot({
      path: auditShot('ticker-chart-844x390-light')
    });
    const lightPlotBackground = await graphCanvas.evaluate((el) => {
      const canvas = el as HTMLCanvasElement;
      const pixel = canvas.getContext('2d')?.getImageData(1, 1, 1, 1).data;
      return pixel ? [...pixel].join(',') : '';
    });
    await page.locator('.theme-toggle-btn:visible').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(async () =>
        graphCanvas.evaluate((el) => {
          const canvas = el as HTMLCanvasElement;
          const pixel = canvas.getContext('2d')?.getImageData(1, 1, 1, 1).data;
          return pixel ? [...pixel].join(',') : '';
        })
      )
      .not.toBe(lightPlotBackground);
    await page.screenshot({
      path: auditShot('ticker-chart-844x390-dark')
    });
    await page.locator('.theme-toggle-btn:visible').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const panelOverflow = await page
      .locator('.data-workspace-panel')
      .evaluate((el) => getComputedStyle(el).overflowY);
    expect(panelOverflow).not.toBe('hidden');
    const summary = page.locator(
      '.data-workspace-panel > .data-workspace-summary'
    );
    await summary.scrollIntoViewIfNeeded();
    const summaryBox = await summary.boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(summaryBox!.height).toBeGreaterThan(8);
    expect(summaryBox!.y + summaryBox!.height).toBeLessThanOrEqual(392);
    const splitterMargin = await splitter.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        top: Number.parseFloat(style.marginTop),
        bottom: Number.parseFloat(style.marginBottom),
        height: el.getBoundingClientRect().height
      };
    });
    expect(splitterMargin.top).toBeGreaterThanOrEqual(0);
    expect(splitterMargin.bottom).toBeGreaterThanOrEqual(0);
    expect(splitterMargin.height).toBeGreaterThanOrEqual(32);

    await splitter.scrollIntoViewIfNeeded();
    await splitter.focus();
    await splitter.press('Home');
    await expect(chartStage).toHaveAttribute('data-split-mode', 'manual');
    await expect
      .poll(async () => Number(await splitter.getAttribute('aria-valuenow')))
      .toBe(18);
    const splitRatio = async () =>
      page.evaluate(() => {
        const stage = document.querySelector('.data-workspace-chart-stage');
        const table = document.querySelector(
          '.data-workspace-chart-stage > .data-workspace-review'
        );
        if (
          !(stage instanceof HTMLElement) ||
          !(table instanceof HTMLElement)
        ) {
          return 0;
        }
        return (
          table.getBoundingClientRect().height /
          stage.getBoundingClientRect().height
        );
      });
    expect(Math.abs((await splitRatio()) - 0.18)).toBeLessThan(0.12);
    await splitter.press('End');
    await expect
      .poll(async () => Number(await splitter.getAttribute('aria-valuenow')))
      .toBe(72);
    expect(Math.abs((await splitRatio()) - 0.72)).toBeLessThan(0.12);
    await splitter.scrollIntoViewIfNeeded();
    const shortHandle = await splitter.boundingBox();
    expect(shortHandle).not.toBeNull();
    const shortX = shortHandle!.x + shortHandle!.width / 2;
    const shortY = shortHandle!.y + shortHandle!.height / 2;
    await page.mouse.move(shortX, shortY);
    await page.mouse.down();
    await page.mouse.move(shortX, shortY - 36, { steps: 6 });
    await page.mouse.up();
    await expect
      .poll(async () => Number(await splitter.getAttribute('aria-valuenow')))
      .toBeLessThan(72);
    const shortDragged = Number(await splitter.getAttribute('aria-valuenow'));
    expect(shortDragged).toBeGreaterThanOrEqual(18);
    expect(shortDragged).toBeLessThanOrEqual(72);

    const shortResultInput = page.locator(
      '.data-workspace-input[data-field="aFit"]'
    );
    await shortResultInput.scrollIntoViewIfNeeded();
    await shortResultInput.fill('0.400');
    await shortResultInput.press('Enter');
    const shortResult = page.locator('.data-workspace-result');
    await expect(shortResult).toContainText('v–t 图像斜率 a');
    await shortResult.scrollIntoViewIfNeeded();
    const shortResultBox = await shortResult.boundingBox();
    expect(shortResultBox).not.toBeNull();
    expect(shortResultBox!.height).toBeGreaterThan(8);
    expect(shortResultBox!.y).toBeLessThan(390);
    expect(
      shortResultBox!.y + Math.min(shortResultBox!.height, 40)
    ).toBeLessThanOrEqual(392);

    await page.setViewportSize({ width: 1280, height: 720 });

    const aFit = page.locator('.data-workspace-input[data-field="aFit"]');
    await expect(aFit).toBeVisible();
    // aFit 同样按 3 位有效数字判分。
    await aFit.fill('0.400');
    await aFit.press('Enter');
    await expect(page.locator('.data-workspace-result')).toContainText(
      'v–t 图像斜率 a'
    );
    await expect(page.locator('.data-workspace-result')).toHaveCSS(
      'font-size',
      TYPE_TARGETS.result
    );
    await expect(page.locator('.data-workspace-result')).toHaveCSS(
      'font-weight',
      '600'
    );
    await expect(
      page.locator('.data-workspace-result-field > .data-workspace-input')
    ).toHaveCSS('font-size', TYPE_TARGETS.resultValue);
    const gradedStack = await chartStack(page);
    expect(gradedStack.chart).toBeLessThan(gradedStack.summary!);
    expect(gradedStack.summary!).toBeLessThan(gradedStack.result!);

    // 图像分析 → 数据处理 → 退出，逐级返回。
    await expect(chartEntry).toHaveText('返回数据处理');
    await chartEntry.click();
    await expect(chartEntry).toHaveText('图像分析');
    await expect(page.locator('.layout-master')).not.toHaveClass(
      /is-data-workspace-chart/
    );
    await expect(page.locator('.data-workspace-review')).toBeHidden();
    await expect(page.locator('.lab-stage-slot canvas')).toBeVisible();
    await expect(entry).toHaveText('返回实验');
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

  test('classroom type, table reach, and status contrast at four viewports', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.goto(scenePage('ticker-tape', '?preset=ua'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 400 });
    await page
      .locator('.data-workspace-entry:not(.graph-analysis-entry)')
      .click();
    await expect(page.locator('.data-workspace-panel')).toBeVisible();

    const x0 = page.locator(
      '.data-workspace-input[data-field="x"][data-trial="0"]'
    );
    await x0.fill('0.00');
    await x0.press('Enter');
    await expect(
      page.locator(
        '.data-workspace-field:has(.data-workspace-input[data-field="x"][data-trial="0"]) .data-workspace-status'
      )
    ).toHaveClass(/is-ok/);
    const x1 = page.locator(
      '.data-workspace-input[data-field="x"][data-trial="1"]'
    );
    await x1.fill('9.99');
    await x1.press('Enter');
    await expect(
      page.locator(
        '.data-workspace-field:has(.data-workspace-input[data-field="x"][data-trial="1"]) .data-workspace-status'
      )
    ).toHaveClass(/is-error/);

    const viewports = [
      { width: 1920, height: 1080, name: '1920' },
      { width: 1280, height: 720, name: '1280' },
      { width: 390, height: 844, name: '390' },
      { width: 844, height: 390, name: '844x390' }
    ] as const;
    mkdirSync(SCREENSHOT_DIR, { recursive: true });

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });
      if (viewport.height >= 640) {
        const split = await page.evaluate(() => {
          const stage = document.querySelector('.lab-stage-anim');
          const panel = document.querySelector('.data-workspace-panel');
          if (
            !(stage instanceof HTMLElement) ||
            !(panel instanceof HTMLElement)
          ) {
            return null;
          }
          return {
            stage: stage.getBoundingClientRect().height,
            panel: panel.getBoundingClientRect().height,
            scrollTop: document.scrollingElement?.scrollTop ?? 0
          };
        });
        expect(split).not.toBeNull();
        expect(Math.abs(split!.stage - split!.panel)).toBeLessThanOrEqual(8);
        expect(split!.scrollTop).toBe(0);
        if (viewport.width >= 1600 && viewport.height >= 900) {
          const rows = await page.evaluate(() => {
            const boxes = ['x', 'deltaX'].map((field) => {
              const row = document.querySelector(
                `.data-workspace-table tr[data-field="${field}"]`
              );
              if (!(row instanceof HTMLElement)) return null;
              const box = row.getBoundingClientRect();
              return { top: box.top, bottom: box.bottom };
            });
            return {
              boxes,
              viewH: window.innerHeight
            };
          });
          for (const box of rows.boxes) {
            expect(box).not.toBeNull();
            expect(box!.top).toBeGreaterThanOrEqual(0);
            expect(box!.bottom).toBeLessThanOrEqual(rows.viewH);
          }
        }
      }
      for (const theme of ['light', 'dark'] as const) {
        await setWorkspaceTheme(page, theme);
        const targets = typeTargetsFor(viewport);
        await expect(page.locator('.data-workspace-title')).toHaveCSS(
          'font-size',
          targets.title
        );
        await expect(
          page.locator('.data-workspace-known-label').first()
        ).toHaveCSS('font-size', targets.knownLabel);
        await expect(
          page.locator('.data-workspace-known-value').first()
        ).toHaveCSS('font-size', targets.knownValue);
        await expect(page.locator('.data-workspace-hint')).toHaveCSS(
          'font-size',
          targets.hint
        );
        await expect(page.locator('.data-workspace-table').first()).toHaveCSS(
          'font-size',
          targets.table
        );
        await expect(page.locator('.data-workspace-input').first()).toHaveCSS(
          'font-size',
          targets.input
        );
        await expect(page.locator('.data-workspace-check').first()).toHaveCSS(
          'font-size',
          targets.button
        );
        await expect(page.locator('.data-workspace-status.is-ok')).toHaveCSS(
          'font-size',
          targets.status
        );
        if (viewport.width >= 1600 && viewport.height >= 900) {
          const density = await page.evaluate(() => {
            const row = document.querySelector(
              '.data-workspace-table[data-orientation="fields"] tbody tr'
            );
            const input = row?.querySelector('.data-workspace-input');
            const title = document.querySelector('.data-workspace-title');
            const table = document.querySelector('.data-workspace-table');
            const rowBox =
              row instanceof HTMLElement ? row.getBoundingClientRect() : null;
            const inputBox =
              input instanceof HTMLElement
                ? input.getBoundingClientRect()
                : null;
            const titleBox =
              title instanceof HTMLElement
                ? title.getBoundingClientRect()
                : null;
            const tableBox =
              table instanceof HTMLElement
                ? table.getBoundingClientRect()
                : null;
            const button = row?.querySelector('.data-workspace-check');
            const status = row?.querySelector('.data-workspace-status');
            const label = row?.querySelector('th');
            const boxOf = (el: Element | null) =>
              el instanceof HTMLElement ? el.getBoundingClientRect().height : 0;
            return {
              rowHeight: rowBox?.height ?? 0,
              inputHeight: inputBox?.height ?? 0,
              buttonHeight: boxOf(button ?? null),
              statusHeight: boxOf(status ?? null),
              labelHeight: boxOf(label ?? null),
              gap: titleBox && tableBox ? tableBox.top - titleBox.bottom : 999
            };
          });
          const header = await page.evaluate(() => {
            const title = document.querySelector('.data-workspace-title');
            const knowns = document.querySelector(
              '.data-workspace-panel > .data-workspace-knowns'
            );
            const hint = document.querySelector(
              '.data-workspace-panel > .data-workspace-hint'
            );
            const panel = document.querySelector('.data-workspace-panel');
            if (
              !(title instanceof HTMLElement) ||
              !(knowns instanceof HTMLElement) ||
              !(hint instanceof HTMLElement) ||
              !(panel instanceof HTMLElement)
            ) {
              return null;
            }
            const titleBox = title.getBoundingClientRect();
            const knownBox = knowns.getBoundingClientRect();
            const hintBox = hint.getBoundingClientRect();
            const panelBox = panel.getBoundingClientRect();
            const line = Number.parseFloat(getComputedStyle(hint).lineHeight);
            return {
              titleMid: (titleBox.top + titleBox.bottom) / 2,
              knownMid: (knownBox.top + knownBox.bottom) / 2,
              hintTop: hintBox.top,
              titleBottom: titleBox.bottom,
              hintWidth: hintBox.width,
              panelWidth: panelBox.width,
              hintLines: line > 0 ? hintBox.height / line : 99
            };
          });
          expect(header).not.toBeNull();
          expect(Math.abs(header!.titleMid - header!.knownMid)).toBeLessThan(
            28
          );
          expect(header!.hintTop).toBeGreaterThanOrEqual(
            header!.titleBottom - 2
          );
          expect(header!.hintWidth).toBeGreaterThan(header!.panelWidth * 0.8);
          expect(header!.hintLines).toBeLessThan(4);
          expect(density.inputHeight).toBeGreaterThanOrEqual(84);
          expect(density.inputHeight).toBeLessThanOrEqual(90);
          expect(
            density.rowHeight,
            `row=${density.rowHeight} input=${density.inputHeight} button=${density.buttonHeight} status=${density.statusHeight} label=${density.labelHeight}`
          ).toBeLessThanOrEqual(density.inputHeight + 8);
          const tableReach = await page.evaluate(() => {
            const wrap = document.querySelector('.data-workspace-table-wrap');
            const table = document.querySelector('.data-workspace-table');
            const panel = document.querySelector('.data-workspace-panel');
            if (
              !(wrap instanceof HTMLElement) ||
              !(table instanceof HTMLElement) ||
              !(panel instanceof HTMLElement)
            ) {
              return null;
            }
            const action = table.querySelector('td.data-workspace-actions');
            return {
              wrapClient: wrap.clientWidth,
              wrapScroll: wrap.scrollWidth,
              tableWidth: table.getBoundingClientRect().width,
              panelHeight: panel.getBoundingClientRect().height,
              actionWidth:
                action instanceof HTMLElement
                  ? action.getBoundingClientRect().width
                  : 0
            };
          });
          expect(tableReach).not.toBeNull();
          expect(tableReach!.wrapClient).toBeLessThanOrEqual(
            header!.panelWidth + 2
          );
          expect(tableReach!.wrapScroll).toBeGreaterThanOrEqual(
            tableReach!.wrapClient
          );
          expect(tableReach!.actionWidth).toBeGreaterThanOrEqual(160);
          expect(tableReach!.wrapScroll).toBeLessThanOrEqual(
            tableReach!.wrapClient + 2
          );
          const panelBottom = await page
            .locator('.data-workspace-panel')
            .evaluate((el) => el.getBoundingClientRect().bottom);
          expect(viewport.height - panelBottom).toBeLessThan(8);
          // 端点 Δx 是「—」，不是输入框。两行按字段行取各自第一个可输入格。
          const twoRows = await page.evaluate(() => {
            const inputs = ['x', 'deltaX'].map((field) =>
              document.querySelector(
                `tr[data-field="${field}"] .data-workspace-input`
              )
            );
            const panel = document.querySelector('.data-workspace-panel');
            return {
              scroll: panel instanceof HTMLElement ? panel.scrollTop : -1,
              pageScroll: document.scrollingElement?.scrollTop ?? 0,
              boxes: inputs.map((el) =>
                el instanceof HTMLElement ? el.getBoundingClientRect() : null
              )
            };
          });
          expect(twoRows.scroll).toBe(0);
          expect(twoRows.pageScroll).toBe(0);
          for (const box of twoRows.boxes) {
            expect(box).not.toBeNull();
            expect(box!.top).toBeGreaterThanOrEqual(0);
            expect(box!.bottom).toBeLessThanOrEqual(viewport.height);
          }
          const fitted = await page.evaluate(() => {
            const measure = (el: Element | null) => {
              if (!(el instanceof HTMLElement)) {
                return { font: 0, contentH: 0, scrollWidth: 0, clientWidth: 0 };
              }
              const style = getComputedStyle(el);
              return {
                font: Number.parseFloat(style.fontSize),
                contentH:
                  el.clientHeight -
                  (Number.parseFloat(style.paddingTop) || 0) -
                  (Number.parseFloat(style.paddingBottom) || 0),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth
              };
            };
            const panel = document.querySelector('.data-workspace-panel');
            const kids = panel
              ? [...panel.children].filter(
                  (el) =>
                    el instanceof HTMLElement &&
                    !el.hidden &&
                    el.getClientRects().length > 0
                )
              : [];
            const last = kids[kids.length - 1];
            const tail =
              panel instanceof HTMLElement && last instanceof HTMLElement
                ? panel.getBoundingClientRect().bottom -
                  last.getBoundingClientRect().bottom
                : 9999;
            return {
              tail,
              input: measure(document.querySelector('.data-workspace-input')),
              check: measure(document.querySelector('.data-workspace-check'))
            };
          });
          // 面板贴齐视口后，三行字段和选填 a 短于面板。尾距是面板内剩余，
          // 不再用 < 96 要求内容撑满；选填 a 仍要留在面板内。
          expect(fitted.tail).toBeGreaterThanOrEqual(0);
          expect(fitted.input.contentH).toBeGreaterThanOrEqual(
            fitted.input.font
          );
          expect(fitted.input.scrollWidth).toBeLessThanOrEqual(
            fitted.input.clientWidth + 2
          );
          expect(fitted.check.contentH).toBeGreaterThanOrEqual(
            fitted.check.font
          );
          expect(fitted.check.scrollWidth).toBeLessThanOrEqual(
            fitted.check.clientWidth + 2
          );
        }

        await page.keyboard.press('Tab');
        const firstCheck = page.locator('.data-workspace-check').first();
        await firstCheck.focus();
        const hit = await firstCheck.evaluate((el) => {
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const input = document.querySelector('.data-workspace-input');
          const inputBox =
            input instanceof HTMLElement ? input.getBoundingClientRect() : null;
          return {
            width: box.width,
            height: box.height,
            focusVisible: el.matches(':focus-visible'),
            outline: parseFloat(style.outlineWidth),
            inputHeight: inputBox?.height ?? 0
          };
        });
        expect(hit.width).toBeGreaterThanOrEqual(44);
        expect(hit.height).toBeGreaterThanOrEqual(44);
        expect(hit.inputHeight).toBeGreaterThanOrEqual(44);
        expect(hit.focusVisible).toBe(true);
        expect(hit.outline).toBeGreaterThanOrEqual(2);

        const reach = await page
          .locator('.data-workspace-table-wrap')
          .evaluate((el) => {
            el.scrollLeft = el.scrollWidth;
            const last = el.querySelector('thead th:last-child');
            const cell =
              last instanceof HTMLElement ? last.getBoundingClientRect() : null;
            const host = el.getBoundingClientRect();
            const root = document.documentElement;
            return {
              pageOverflow: root.scrollWidth - root.clientWidth,
              lastRight: cell?.right ?? -1,
              hostLeft: host.left,
              hostRight: host.right
            };
          });
        expect(reach.pageOverflow).toBeLessThanOrEqual(1);
        expect(reach.lastRight).toBeGreaterThan(reach.hostLeft + 8);
        expect(reach.lastRight).toBeLessThanOrEqual(reach.hostRight + 2);

        const contrast = await page.evaluate(() => {
          const parse = (input: string) => {
            const match = input.match(/rgba?\(([^)]+)\)/);
            if (!match) return null;
            const parts = match[1]
              .split(',')
              .map((part) => Number.parseFloat(part.trim()));
            return {
              r: parts[0],
              g: parts[1],
              b: parts[2],
              a: parts.length > 3 ? parts[3] : 1
            };
          };
          const over = (
            front: { r: number; g: number; b: number; a: number },
            back: { r: number; g: number; b: number; a: number }
          ) => {
            const alpha = front.a + back.a * (1 - front.a);
            const mix = (fg: number, bg: number) =>
              alpha === 0
                ? 0
                : (fg * front.a + bg * back.a * (1 - front.a)) / alpha;
            return {
              r: mix(front.r, back.r),
              g: mix(front.g, back.g),
              b: mix(front.b, back.b),
              a: alpha
            };
          };
          const backdrop = (el: Element) => {
            const layers: Array<{
              r: number;
              g: number;
              b: number;
              a: number;
            }> = [];
            let node: Element | null = el;
            while (node) {
              const color = parse(getComputedStyle(node).backgroundColor);
              if (color && color.a > 0) layers.push(color);
              if (color && color.a >= 0.99) break;
              node = node.parentElement;
            }
            let bg = { r: 255, g: 255, b: 255, a: 1 };
            for (let i = layers.length - 1; i >= 0; i -= 1) {
              bg = over(layers[i], bg);
            }
            return bg;
          };
          const linear = (value: number) => {
            const channel = value / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          };
          const ratio = (
            fg: { r: number; g: number; b: number },
            bg: { r: number; g: number; b: number }
          ) => {
            const lum = (color: { r: number; g: number; b: number }) =>
              0.2126 * linear(color.r) +
              0.7152 * linear(color.g) +
              0.0722 * linear(color.b);
            const lighter = Math.max(lum(fg), lum(bg));
            const darker = Math.min(lum(fg), lum(bg));
            return (lighter + 0.05) / (darker + 0.05);
          };
          const measure = (selector: string) => {
            const el = document.querySelector(selector);
            if (!(el instanceof HTMLElement)) return 0;
            const fg = parse(getComputedStyle(el).color);
            if (!fg) return 0;
            return ratio(fg, backdrop(el));
          };
          return {
            ok: measure('.data-workspace-status.is-ok'),
            error: measure('.data-workspace-status.is-error'),
            title: measure('.data-workspace-title')
          };
        });
        expect(contrast.ok).toBeGreaterThanOrEqual(4.5);
        expect(contrast.error).toBeGreaterThanOrEqual(4.5);
        expect(contrast.title).toBeGreaterThanOrEqual(4.5);
        await page.screenshot({
          path: auditShot(`ticker-data-${viewport.name}-${theme}`)
        });
      }
    }
  });

  test('workspace reading zoom redraws the tape without moving the origin', async ({
    page
  }) => {
    await page.goto(scenePage('ticker-tape', '?preset=ua'), {
      waitUntil: 'domcontentloaded'
    });
    await waitForFirstFrame(page, { remainderMs: 500 });

    const entry = page.locator(
      '.data-workspace-entry:not(.graph-analysis-entry)'
    );
    await entry.click();
    await expect(page.locator('.data-workspace-panel')).toBeVisible();
    // 场景自绘缩放：没有平台的 CSS 缩放视口，控件同名。
    await expect(page.locator('.stage-viewport')).toHaveCount(0);
    const zoomIn = page.getByRole('button', { name: '放大' });
    await expect(zoomIn).toBeVisible();
    await expect(page.getByRole('button', { name: '缩小' })).toBeVisible();

    const canvas = page.locator(STAGE_CANVAS);
    await expect(canvas).toHaveAttribute('data-view-zoom', '1.000');
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
    await expect.poll(async () => readViewZoom(page)).toBeGreaterThan(1);

    // 按在尺上横向拖：只平移视图，计时起点不变。
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

    // 放大到平台 CSS 缩放的 3 倍上限之外。
    for (let i = 0; i < 12; i += 1) {
      if ((await readViewZoom(page)) >= 3.99) break;
      await zoomIn.click();
    }
    await expect
      .poll(async () => readViewZoom(page))
      .toBeGreaterThanOrEqual(3.99);

    const zoomed = await readStageZoomMetrics(page, STAGE_CANVAS, STAGE_SLOT);
    mkdirSync(join(process.cwd(), 'artifacts', 'data-workspace'), {
      recursive: true
    });
    writeFileSync(
      ZOOM_EVIDENCE,
      `${JSON.stringify({ viewZoom: await readViewZoom(page), ...zoomed }, null, 2)}\n`
    );
    // 矢量重画：不靠 CSS 放大，也不加大画布背衬。
    expect(zoomed.zoom).toBe(1);
    expect(zoomed.boost).toBe(1);
    await expect(canvas).not.toHaveAttribute('data-render-boost');
    expect(zoomed.canvasWidth).toBe(baseline.canvasWidth);
    expect(zoomed.canvasHeight).toBe(baseline.canvasHeight);
    expectCanvasLayoutNotInflated(zoomed);
    expectCanvasNotBlank(zoomed);

    await page.getByRole('button', { name: '复位视图' }).click();
    await expect(canvas).toHaveAttribute('data-view-zoom', '1.000');
    await expect(canvas).toHaveAttribute(
      'data-origin-tick-index',
      originBefore as string
    );

    // 退出工作区：缩放控件撤掉，拖尺恢复可用。
    await entry.click();
    await expect(page.locator('.data-workspace-panel')).toHaveCount(0);
    await expect(canvas).not.toHaveAttribute('data-view-zoom');
    await expect(page.getByRole('button', { name: '放大' })).toHaveCount(0);
  });
});
