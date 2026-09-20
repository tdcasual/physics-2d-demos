import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { waitForFirstFrame } from '../helpers/wait-first-frame';
import { scenePage } from '../visual/scene-pages';
import {
  computeCaliperFringePx,
  computeRealDeltaXmm,
  DEFAULT_L
} from '../../src/scenes/double-slit/scene.sim';
import { sampleCaliperAlignedReadingsCm } from '../../src/instruments/interference-vernier-caliper/renderer/alignment';
import { slitDistanceMm } from '../../src/scenes/double-slit/data-task';

const SHOT_DIR = join(process.cwd(), 'artifacts', 'data-workspace');
const LAMBDA_NM = 532;
const SLIT_DISTANCE = 20;
const L_M = DEFAULT_L;

async function openDoubleSlit(page: Page, query = '') {
  await page.goto(scenePage('double-slit', query), {
    waitUntil: 'domcontentloaded'
  });
  await waitForFirstFrame(page, { remainderMs: 800 });
}

async function gotoStep6Mono(page: Page) {
  await openDoubleSlit(page, '?step=6');
  await page.waitForSelector('.microscope-root', { timeout: 10_000 });
  await page.waitForSelector('[data-double-slit-instruments="true"]');
}

type InstrumentRead = { mm: number; aligned: boolean; order: number };

async function readInstrument(page: Page): Promise<InstrumentRead> {
  return page
    .locator('[data-double-slit-instruments="true"]')
    .evaluate((el) => ({
      mm: Number(el.getAttribute('data-reading-mm') || '0'),
      aligned: el.getAttribute('data-aligned') === 'true',
      order: Number(el.getAttribute('data-fringe-order') || '0')
    }));
}

async function dragCaliperSlider(page: Page, dx: number): Promise<void> {
  const slider = page.locator('.microscope-root .slider-assembly');
  const box = await slider.boundingBox();
  expect(box).not.toBeNull();
  const fromX = Math.min(Math.max(box!.width * 0.4, 20), box!.width - 24);
  const y = box!.height * 0.55;
  await slider.dragTo(slider, {
    sourcePosition: { x: fromX, y },
    targetPosition: { x: fromX + dx, y }
  });
}

function fileSha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Real Chromium touch stream (not mouse, not el.scrollLeft = …). */
async function touchSwipe(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const id = 1;
  const steps = 16;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y, id }]
  });
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          id
        }
      ]
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  });
}

/** Real pointer drag until the live instrument reports aligned (or timeout). */
async function dragUntilAligned(
  page: Page,
  direction: 1 | -1,
  differentOrder?: number
): Promise<InstrumentRead> {
  let last = await readInstrument(page);
  for (let i = 0; i < 80; i += 1) {
    last = await readInstrument(page);
    if (
      last.aligned &&
      (differentOrder == null || last.order !== differentOrder)
    ) {
      return last;
    }
    await dragCaliperSlider(page, direction * 3);
  }
  return last;
}

async function setInstrumentReadingMm(page: Page, mm: number) {
  await page
    .locator('[data-double-slit-instruments="true"]')
    .evaluate((el, value) => {
      el.dispatchEvent(
        new CustomEvent('instrument-set-reading', { detail: { mm: value } })
      );
    }, mm);
}

/**
 * Spy the next stage-canvas fillText calls. Canvas glyphs never appear in
 * innerText, so this is the runtime proof that λ/Δx labels are painted or not.
 */
async function stageCanvasFillTexts(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const proto = CanvasRenderingContext2D.prototype;
    const original = proto.fillText;
    const texts: string[] = [];
    proto.fillText = function (
      this: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      maxWidth?: number
    ) {
      const target = this.canvas;
      if (
        target instanceof HTMLCanvasElement &&
        target.classList.contains('teaching-stage-canvas')
      ) {
        texts.push(text);
      }
      return original.call(this, text, x, y, maxWidth);
    };
    window.dispatchEvent(new Event('resize'));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    proto.fillText = original;
    return texts;
  });
}

type Box = { top: number; bottom: number; left: number; right: number };

type InstrumentVisualGeo = {
  stage: Box;
  visual: Box;
  parts: Record<string, Box | null>;
};

/** Real painted parts through open shadow — never the 100% wrap. */
async function instrumentVisualGeo(page: Page): Promise<InstrumentVisualGeo> {
  return page.evaluate(() => {
    const wrap = document.querySelector(
      '[data-double-slit-instruments="true"]'
    ) as HTMLElement | null;
    const stageEl =
      (wrap?.closest('.mobile-animation-section') as HTMLElement | null) ??
      (wrap?.closest(
        '.teaching-stage-frame, .lab-stage-anim, .teaching-stage-slot, .mobile-stage-slot, .lab-stage-slot, .srgb-stage-slot'
      ) as HTMLElement | null) ??
      (document.querySelector(
        '.teaching-stage-slot, .mobile-stage-slot, .lab-stage-slot'
      ) as HTMLElement | null);
    if (!stageEl || !wrap) {
      throw new Error('missing stage or instrument wrap');
    }
    const selectors = [
      'lens',
      'knob',
      'ruler',
      'case',
      'thimble',
      'lensRing',
      'sleeve',
      'shaft',
      'ratchet',
      'fringe'
    ] as const;
    const selMap: Record<(typeof selectors)[number], string> = {
      lens: '.lens-assembly',
      knob: '.knob',
      ruler: '.main-ruler',
      case: '.case',
      thimble: '.thimble-group',
      lensRing: '.lens-outer-ring',
      sleeve: '.sleeve-container',
      shaft: '.screw-assembly',
      ratchet: '.ratchet',
      fringe: '.lens-view'
    };
    const found: Partial<Record<(typeof selectors)[number], DOMRect>> = {};
    const visit = (root: ParentNode) => {
      for (const key of selectors) {
        const el = root.querySelector(selMap[key]);
        if (!(el instanceof HTMLElement)) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 1 && r.height > 1) found[key] = r;
      }
      root.querySelectorAll('*').forEach((el) => {
        if (el instanceof HTMLElement && el.shadowRoot) visit(el.shadowRoot);
      });
    };
    visit(wrap);
    const parts = Object.values(found);
    if (parts.length === 0) throw new Error('no instrument visual parts');
    const stage = stageEl.getBoundingClientRect();
    const box = (r: DOMRect): Box => ({
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right
    });
    return {
      stage: box(stage),
      visual: {
        top: Math.min(...parts.map((r) => r.top)),
        bottom: Math.max(...parts.map((r) => r.bottom)),
        left: Math.min(...parts.map((r) => r.left)),
        right: Math.max(...parts.map((r) => r.right))
      },
      parts: {
        lens: found.lens ? box(found.lens) : null,
        knob: found.knob ? box(found.knob) : null,
        ruler: found.ruler ? box(found.ruler) : null,
        case: found.case ? box(found.case) : null,
        thimble: found.thimble ? box(found.thimble) : null,
        lensRing: found.lensRing ? box(found.lensRing) : null,
        sleeve: found.sleeve ? box(found.sleeve) : null,
        shaft: found.shaft ? box(found.shaft) : null,
        ratchet: found.ratchet ? box(found.ratchet) : null,
        fringe: found.fringe ? box(found.fringe) : null
      }
    };
  });
}

function fourSideOverflow(geo: InstrumentVisualGeo): number {
  return Math.max(
    geo.visual.bottom - geo.stage.bottom,
    geo.stage.top - geo.visual.top,
    geo.stage.left - geo.visual.left,
    geo.visual.right - geo.stage.right
  );
}

function writeBboxDump(name: string, geo: InstrumentVisualGeo): void {
  writeFileSync(join(SHOT_DIR, name), `${JSON.stringify(geo, null, 2)}\n`);
}

function overlapSize(a: Box, b: Box): { width: number; height: number } {
  return {
    width: Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)),
    height: Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  };
}

function expectBoxInside(
  box: Box,
  stage: Box,
  tol: number,
  label: string
): void {
  expect(
    box.top,
    `${label}.top=${box.top} stage.top=${stage.top}`
  ).toBeGreaterThanOrEqual(stage.top - tol);
  expect(
    box.bottom,
    `${label}.bottom=${box.bottom} stage.bottom=${stage.bottom}`
  ).toBeLessThanOrEqual(stage.bottom + tol);
  expect(
    box.left,
    `${label}.left=${box.left} stage.left=${stage.left}`
  ).toBeGreaterThanOrEqual(stage.left - tol);
  expect(
    box.right,
    `${label}.right=${box.right} stage.right=${stage.right}`
  ).toBeLessThanOrEqual(stage.right + tol);
}

function expectVisualInsideStage(
  geo: InstrumentVisualGeo,
  options: { horizontal?: boolean; tol?: number } = {}
): void {
  const tol = options.tol ?? 2;
  const horizontal = options.horizontal ?? false;
  expect(
    geo.visual.top,
    `visual.top=${geo.visual.top} stage.top=${geo.stage.top}`
  ).toBeGreaterThanOrEqual(geo.stage.top - tol);
  expect(
    geo.visual.bottom,
    `visual.bottom=${geo.visual.bottom} stage.bottom=${geo.stage.bottom}`
  ).toBeLessThanOrEqual(geo.stage.bottom + tol);
  if (horizontal) {
    expectBoxInside(geo.visual, geo.stage, tol, 'visual');
    const lens = geo.parts.lens ?? geo.parts.lensRing ?? geo.parts.case;
    expect(lens, 'missing eyepiece/case bbox').toBeTruthy();
    if (lens) expectBoxInside(lens, geo.stage, tol, 'lens');
    if (geo.parts.knob) expectBoxInside(geo.parts.knob, geo.stage, tol, 'knob');
    if (geo.parts.shaft)
      expectBoxInside(geo.parts.shaft, geo.stage, tol, 'shaft');
    if (geo.parts.thimble)
      expectBoxInside(geo.parts.thimble, geo.stage, tol, 'thimble');
    if (geo.parts.ratchet)
      expectBoxInside(geo.parts.ratchet, geo.stage, tol, 'ratchet');
  } else {
    const key = geo.parts.lens ?? geo.parts.lensRing ?? geo.parts.case;
    expect(key, 'missing eyepiece/case bbox').toBeTruthy();
    if (key) {
      expect(key.top).toBeGreaterThanOrEqual(geo.stage.top - tol);
      expect(key.bottom).toBeLessThanOrEqual(geo.stage.bottom + tol);
    }
  }
}

function alignedSamples() {
  const deltaXmm = computeRealDeltaXmm(LAMBDA_NM, SLIT_DISTANCE, L_M);
  const spacing = computeCaliperFringePx(deltaXmm);
  return sampleCaliperAlignedReadingsCm(spacing, 8);
}

async function checkField(
  page: Page,
  field: string,
  trial: number,
  raw: string
) {
  const input = page.locator(`[data-field="${field}"][data-trial="${trial}"]`);
  await input.fill(raw);
  await page
    .locator(`button[aria-label*="校对第 ${trial + 1} 组"]`)
    .nth(['x1', 'x2', 'n', 'D', 'deltaX'].indexOf(field))
    .click();
}

test.describe('double-slit data workspace', () => {
  test.beforeAll(() => {
    mkdirSync(SHOT_DIR, { recursive: true });
  });

  test('entry stays disabled until step 6 monochromatic light', async ({
    page
  }) => {
    await openDoubleSlit(page);
    const btn = page.locator('.data-workspace-entry');
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveAttribute('aria-disabled', 'true');

    await page.locator('button:has-text("6. 目镜观察")').click();
    await page.waitForSelector('.microscope-root', { timeout: 10_000 });
    await expect(page.locator('.data-workspace-entry')).toBeEnabled();
  });

  test('URL step=6 still enables the workspace without rewriting params', async ({
    page
  }) => {
    await gotoStep6Mono(page);
    await expect(page.locator('.data-workspace-entry')).toBeEnabled();
    await expect(page.getByText('当前步骤')).toBeVisible();
    await expect(
      page.locator('.teaching-readout-panel, .readout-panel')
    ).toContainText('6 / 6');
  });

  test('does not rewrite params when white light disables the task', async ({
    page
  }) => {
    await gotoStep6Mono(page);
    await page.locator('button:has-text("白光")').click();
    await expect(page.locator('.data-workspace-entry')).toBeDisabled();
    await expect(page.locator('.data-workspace-entry')).toHaveAttribute(
      'title',
      /单色光/
    );
    await expect(
      page.locator('button[data-preset-id="white"]')
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('desktop workspace fills the stage and hides answers', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoStep6Mono(page);
    const before = await page.evaluate(() => {
      const el = document.querySelector('.layout-master') as HTMLElement | null;
      return el?.style.gridTemplateColumns ?? '';
    });
    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('[data-slot="data-workspace"]')).toBeVisible();
    await expect(page.locator('.data-workspace-table')).toBeVisible();
    await expect(page.locator('[data-data-workspace-chart]')).toHaveCount(0);
    await expect(page.locator('.data-workspace-summary-context')).toContainText(
      /0\.20\s*mm/
    );
    await expect(page.locator('.data-workspace-summary-context')).toContainText(
      /70\s*cm/
    );
    await expect(page.locator('[aria-label="平均 Δx（mm）"]')).toBeVisible();
    await expect(page.locator('[aria-label="平均 Δx（mm）"]')).toBeDisabled();
    await expect(
      page.locator('[aria-label="λ = d·平均Δx / L（nm）"]')
    ).toBeDisabled();

    const layout = await page.evaluate(() => {
      const root = document.querySelector('.layout-master') as HTMLElement;
      const right = document.querySelector(
        '[data-testid="right-panel"]'
      ) as HTMLElement | null;
      const left = document.querySelector(
        '.layout-left-panel'
      ) as HTMLElement | null;
      const stage = document.querySelector(
        '.teaching-stage-slot'
      ) as HTMLElement | null;
      const table = document.querySelector(
        '[data-slot="data-workspace"]'
      ) as HTMLElement | null;
      const canvas = document.querySelector(
        '.teaching-stage-canvas'
      ) as HTMLElement | null;
      const wrap = document.querySelector(
        '[data-double-slit-instruments="true"]'
      ) as HTMLElement | null;
      return {
        inlineGrid: root.style.gridTemplateColumns,
        computedGrid: getComputedStyle(root).gridTemplateColumns,
        root: root.getBoundingClientRect(),
        right: right?.getBoundingClientRect() ?? null,
        left: left?.getBoundingClientRect() ?? null,
        stage: stage?.getBoundingClientRect() ?? null,
        table: table?.getBoundingClientRect() ?? null,
        canvas: canvas?.getBoundingClientRect() ?? null,
        canvasOpacity: canvas ? getComputedStyle(canvas).opacity : '',
        wrap: wrap?.getBoundingClientRect() ?? null
      };
    });
    expect(layout.inlineGrid).toBe(before);
    expect(layout.right).toBeTruthy();
    expect(layout.right!.width).toBeGreaterThan(layout.root.width * 0.9);
    expect(layout.left!.width).toBeLessThan(2);
    expect(layout.stage!.bottom).toBeLessThanOrEqual(layout.table!.top + 2);
    expect(Number(layout.canvasOpacity)).toBe(0);
    expect(layout.wrap).toBeTruthy();
    expect(layout.wrap!.height).toBeGreaterThan(layout.stage!.height * 0.75);
    expect(Math.abs(layout.wrap!.top - layout.stage!.top)).toBeLessThan(8);
    await expect(page.locator('.sidebar-toggle-btn')).toBeHidden();
    await expect(page.locator('.data-workspace-table tbody tr')).toHaveCount(1);
    await expect
      .poll(async () => fourSideOverflow(await instrumentVisualGeo(page)))
      .toBeLessThanOrEqual(2);
    const oneRowGeo = await instrumentVisualGeo(page);
    expectVisualInsideStage(oneRowGeo, { horizontal: true });
    expect(oneRowGeo.parts.lens).toBeTruthy();
    expect(oneRowGeo.parts.knob).toBeTruthy();
    expect(oneRowGeo.parts.ruler).toBeTruthy();
    expect(oneRowGeo.parts.shaft).toBeTruthy();
    writeBboxDump('bbox-desktop-caliper.json', oneRowGeo);
    await expect(page.locator('.data-workspace-add')).toBeVisible();
    await expect(
      page.locator('[data-slot="data-workspace"]')
    ).not.toContainText('完成三组');

    await expect(
      page.locator('.teaching-readout-panel, .readout-panel')
    ).toBeHidden();
    await expect(page.getByRole('region', { name: '实验状态' })).toBeHidden();
    await expect(page.locator('.teaching-stage-canvas')).toHaveAttribute(
      'data-hide-numeric-hints',
      '1'
    );
    const hiddenTexts = await stageCanvasFillTexts(page);
    expect(hiddenTexts.some((t) => t.includes('干涉条纹'))).toBe(true);
    expect(hiddenTexts.some((t) => /532\s*nm/.test(t))).toBe(false);
    expect(hiddenTexts.some((t) => /Δx/.test(t))).toBe(false);
    const pageText = await page.locator('.layout-master').innerText();
    expect(pageText).not.toMatch(/Δx\s*≈/);
    expect(pageText).not.toMatch(/532\s*nm/);
    expect(pageText).not.toMatch(/游标卡尺读数/);
    expect(pageText).toMatch(/双缝间距 d\s+0\.20 mm/);

    await page.locator('.teaching-stage-canvas').screenshot({
      path: join(SHOT_DIR, 'desktop-stage-canvas.png')
    });
    await page.screenshot({
      path: join(SHOT_DIR, 'desktop-workspace.png'),
      fullPage: true
    });

    await page.locator('.data-workspace-leave').click();
    await expect(page.locator('[data-slot="data-workspace"]')).toHaveCount(0);
    const after = await page.evaluate(() => {
      const el = document.querySelector('.layout-master') as HTMLElement | null;
      const canvas = document.querySelector(
        '.teaching-stage-canvas'
      ) as HTMLElement | null;
      return {
        grid: el?.style.gridTemplateColumns ?? '',
        canvasOpacity: canvas ? getComputedStyle(canvas).opacity : ''
      };
    });
    expect(after.grid).toBe(before);
    expect(Number(after.canvasOpacity)).toBe(1);
    await expect(page.locator('.sidebar-toggle-btn')).toBeVisible();
    await expect(page.locator('.sidebar-toggle-btn')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await expect(
      page.locator('.teaching-readout-panel, .readout-panel')
    ).toBeVisible();
    const restored = await page
      .locator('.readout-panel, .teaching-readout-panel')
      .innerText();
    expect(restored).toMatch(/Δx|条纹间距/);
    await expect(page.locator('.teaching-stage-canvas')).not.toHaveAttribute(
      'data-hide-numeric-hints',
      '1'
    );
    const restoredTexts = await stageCanvasFillTexts(page);
    expect(restoredTexts.some((t) => /532\s*nm/.test(t))).toBe(true);
    expect(restoredTexts.some((t) => /Δx/.test(t))).toBe(true);
    await page.locator('.teaching-stage-canvas').screenshot({
      path: join(SHOT_DIR, 'desktop-stage-restored.png')
    });
  });

  test('aligned vs misaligned readings and a full 3-trial wavelength loop', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoStep6Mono(page);
    const samples = alignedSamples();
    expect(samples.length).toBeGreaterThanOrEqual(6);

    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('.data-workspace-table')).toBeVisible();
    await expect(page.locator('.data-workspace-table tbody tr')).toHaveCount(1);
    await page.locator('.data-workspace-add').click();
    await page.locator('.data-workspace-add').click();
    await expect(page.locator('.data-workspace-table tbody tr')).toHaveCount(3);

    // Trial 0: real pointer drag on the caliper slider (not setReading).
    await dragCaliperSlider(page, 18);
    let dragged = await readInstrument(page);
    if (dragged.aligned) {
      await dragCaliperSlider(page, 14);
      dragged = await readInstrument(page);
    }
    expect(dragged.aligned).toBe(false);
    await page
      .locator('[data-field="x1"][data-trial="0"]')
      .fill(dragged.mm.toFixed(2));
    await page.locator('button[aria-label="校对第 1 组 x₁"]').click();
    await expect(page.locator('.data-workspace-status').first()).toContainText(
      /亮纹|不符/
    );

    const x1Drag = await dragUntilAligned(page, 1);
    expect(x1Drag.aligned).toBe(true);
    await checkField(page, 'x1', 0, x1Drag.mm.toFixed(2));

    // Different instrument: student leaves, switches, returns; old x1 is stale.
    await page.locator('.data-workspace-leave').click();
    await page.locator('button[data-preset-id="micrometer"]').click();
    await expect(
      page.locator('button[data-preset-id="micrometer"]')
    ).toHaveAttribute('aria-checked', 'true');
    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('.data-workspace-status').first()).toContainText(
      /已切换仪器|同一台仪器/
    );
    await expect(page.locator('.micrometer-root')).toBeVisible();
    let micrometer = await readInstrument(page);
    for (let i = 0; i < 120 && !micrometer.aligned; i += 1) {
      await setInstrumentReadingMm(page, micrometer.mm + 0.02);
      micrometer = await readInstrument(page);
    }
    expect(micrometer.aligned).toBe(true);
    await page
      .locator('[data-field="x2"][data-trial="0"]')
      .fill(micrometer.mm.toFixed(3));
    await page.locator('button[aria-label="校对第 1 组 x₂"]').click();
    await expect(
      page.locator(
        '.data-workspace-field:has([data-field="x2"][data-trial="0"]) .data-workspace-status'
      )
    ).toHaveText('x1 与 x2 须用同一台仪器、同一单位基准');

    await page.locator('.data-workspace-leave').click();
    await page.locator('button[data-preset-id="caliper"]').click();
    await expect(
      page.locator('button[data-preset-id="caliper"]')
    ).toHaveAttribute('aria-checked', 'true');
    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('.microscope-root')).toBeVisible();
    const x1Again = await readInstrument(page);
    if (!x1Again.aligned) {
      const realigned = await dragUntilAligned(page, 1);
      await checkField(page, 'x1', 0, realigned.mm.toFixed(2));
    } else {
      await checkField(page, 'x1', 0, x1Again.mm.toFixed(2));
    }
    const x1Locked = await readInstrument(page);
    const x2Drag = await dragUntilAligned(page, 1, x1Locked.order);
    expect(x2Drag.aligned).toBe(true);
    expect(x2Drag.order).not.toBe(x1Locked.order);
    await checkField(page, 'x2', 0, x2Drag.mm.toFixed(2));
    const n0 = Math.abs(x2Drag.order - x1Locked.order);
    const D0 = x2Drag.mm - x1Locked.mm;
    await checkField(page, 'n', 0, String(n0));
    await checkField(page, 'D', 0, D0.toFixed(3));
    await checkField(page, 'deltaX', 0, (D0 / n0).toFixed(3));
    const deltaXs: number[] = [D0 / n0];

    const pairs = [
      { a: samples[1], b: samples[4] },
      { a: samples[2], b: samples[5] }
    ];

    for (let i = 0; i < 2; i += 1) {
      const trial = i + 1;
      const pair = pairs[i];
      const n = pair.b.order - pair.a.order;
      expect(n).toBeGreaterThan(0);
      const x1 = pair.a.readingCm * 10;
      const x2 = pair.b.readingCm * 10;
      const D = x2 - x1;
      const dx = D / n;
      deltaXs.push(dx);

      await setInstrumentReadingMm(page, x1);
      await expect(
        page.locator('[data-double-slit-instruments="true"]')
      ).toHaveAttribute('data-aligned', 'true');
      await checkField(page, 'x1', trial, x1.toFixed(2));
      await setInstrumentReadingMm(page, x2);
      await checkField(page, 'x2', trial, x2.toFixed(2));
      await checkField(page, 'n', trial, String(n));
      await checkField(page, 'D', trial, D.toFixed(3));
      await checkField(page, 'deltaX', trial, dx.toFixed(3));
    }

    const avg = deltaXs.reduce((sum, v) => sum + v, 0) / deltaXs.length;
    const lambda = (1000 * slitDistanceMm(SLIT_DISTANCE) * avg) / L_M;
    await page.locator('[aria-label="平均 Δx（mm）"]').fill(avg.toFixed(3));
    await page
      .locator('.data-workspace-summary-row')
      .first()
      .locator('.data-workspace-check')
      .click();
    await page.locator('[aria-label="λ = d·平均Δx / L（nm）"]').fill('0.532');
    await page
      .locator('.data-workspace-summary-row')
      .nth(1)
      .locator('.data-workspace-check')
      .click();
    await expect(page.locator('.data-workspace-status.is-error')).toContainText(
      /nm/
    );
    await page
      .locator('[aria-label="λ = d·平均Δx / L（nm）"]')
      .fill(lambda.toFixed(0));
    await page
      .locator('.data-workspace-summary-row')
      .nth(1)
      .locator('.data-workspace-check')
      .click();
    await expect(page.locator('.data-workspace-result')).toBeVisible();
    await expect(page.locator('.data-workspace-result')).toContainText(
      /测得波长/
    );

    const x1Input = page.locator('[data-field="x1"][data-trial="0"]');
    await x1Input.fill('1.00');
    await page.locator('button[aria-label="校对第 1 组 x₁"]').click();
    await expect(page.locator('.data-workspace-result')).toBeHidden();
    await expect(page.locator('[aria-label="平均 Δx（mm）"]')).toBeDisabled();
    await expect(
      page.locator('[aria-label="λ = d·平均Δx / L（nm）"]')
    ).toBeDisabled();
    await expect(page.locator('.data-workspace-summary')).toBeVisible();

    await page.locator('.data-workspace-leave').click();
    await expect(page.locator('[data-slot="data-workspace"]')).toHaveCount(0);
    await expect(
      page.locator('.teaching-readout-panel, .readout-panel')
    ).toContainText('6 / 6');
    await expect(page.locator('button[data-preset-id="mono"]')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('dynamic rows keep stable ids and require confirm for filled deletes', async ({
    page
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoStep6Mono(page);
    await page.locator('.data-workspace-entry').click();
    await expect(page.locator('.data-workspace-table tbody tr')).toHaveCount(1);
    await page.locator('.data-workspace-add').click();
    await page.locator('.data-workspace-add').click();
    await expect(page.locator('.data-workspace-table tbody tr')).toHaveCount(3);
    await expect(page.locator('.data-workspace-summary-note')).toContainText(
      /当前 3 组/
    );
    await expect
      .poll(async () => fourSideOverflow(await instrumentVisualGeo(page)))
      .toBeLessThanOrEqual(2);
    const multiRowGeo = await instrumentVisualGeo(page);
    expectVisualInsideStage(multiRowGeo, { horizontal: true });
    expect(multiRowGeo.parts.knob).toBeTruthy();
    expect(multiRowGeo.parts.lens).toBeTruthy();
    writeBboxDump('bbox-desktop-multi-row.json', multiRowGeo);
    const panel = page.locator('.data-workspace-panel');
    const row3x1 = page.locator('[data-field="x1"][data-trial="2"]');
    await panel.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await row3x1.scrollIntoViewIfNeeded();
    const rowBox = await row3x1.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(rowBox).toBeTruthy();
    expect(panelBox).toBeTruthy();
    expect(rowBox!.width).toBeGreaterThan(20);
    expect(rowBox!.height).toBeGreaterThan(20);
    expect(rowBox!.x).toBeGreaterThanOrEqual(panelBox!.x - 1);
    expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(
      panelBox!.x + panelBox!.width + 1
    );
    expect(rowBox!.y).toBeGreaterThanOrEqual(panelBox!.y - 1);
    expect(rowBox!.y + rowBox!.height).toBeLessThanOrEqual(
      panelBox!.y + panelBox!.height + 1
    );
    const ids = await page
      .locator('.data-workspace-table tbody tr')
      .evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-row-id'))
      );
    expect(ids).toEqual(['row-1', 'row-2', 'row-3']);

    const row2Check = page.locator('button[aria-label="校对第 2 组 x₁"]');
    await row2Check.scrollIntoViewIfNeeded();
    const checkBox = await row2Check.boundingBox();
    const actionsBox = await page
      .locator('.data-workspace-row-actions')
      .boundingBox();
    expect(checkBox).toBeTruthy();
    expect(actionsBox).toBeTruthy();
    const overlapH = Math.max(
      0,
      Math.min(
        checkBox!.y + checkBox!.height,
        actionsBox!.y + actionsBox!.height
      ) - Math.max(checkBox!.y, actionsBox!.y)
    );
    const overlapW = Math.max(
      0,
      Math.min(
        checkBox!.x + checkBox!.width,
        actionsBox!.x + actionsBox!.width
      ) - Math.max(checkBox!.x, actionsBox!.x)
    );
    expect(
      overlapH * overlapW,
      'row 2 check must not be covered by row-actions'
    ).toBe(0);

    await page.locator('[data-field="x1"][data-row-id="row-1"]').fill('1.00');
    await page.locator('[data-field="x1"][data-row-id="row-2"]').fill('2.00');
    await page.locator('[data-field="x1"][data-row-id="row-3"]').fill('3.00');
    await page.locator('[aria-label="删除第 2 组"]').click();
    await expect(page.locator('.data-workspace-confirm')).toBeVisible();
    await page.locator('.data-workspace-confirm .data-workspace-exit').click();
    await expect(page.locator('.data-workspace-table tbody tr')).toHaveCount(3);
    await expect(
      page.locator('[data-field="x1"][data-row-id="row-2"]')
    ).toHaveValue('2.00');
    await page.locator('[aria-label="删除第 2 组"]').click();
    await page.locator('.data-workspace-confirm .data-workspace-check').click();
    await expect(page.locator('.data-workspace-table tbody tr')).toHaveCount(2);
    await expect(
      page.locator('[data-field="x1"][data-row-id="row-1"]')
    ).toHaveValue('1.00');
    await expect(
      page.locator('[data-field="x1"][data-row-id="row-3"]')
    ).toHaveValue('3.00');
    await expect(page.locator('[aria-label="删除第 2 组"]')).toHaveAttribute(
      'aria-label',
      '删除第 2 组'
    );
    expect(
      await page
        .locator('[aria-label="删除第 2 组"]')
        .evaluate((el) => el.closest('tr')?.getAttribute('data-row-id'))
    ).toBe('row-3');
  });

  test('one completed row computes λ; adding a row invalidates the summary', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoStep6Mono(page);
    await page.locator('.data-workspace-entry').click();
    const x1Drag = await dragUntilAligned(page, 1);
    expect(x1Drag.aligned).toBe(true);
    await checkField(page, 'x1', 0, x1Drag.mm.toFixed(2));
    const x2Drag = await dragUntilAligned(page, 1, x1Drag.order);
    expect(x2Drag.aligned).toBe(true);
    await checkField(page, 'x2', 0, x2Drag.mm.toFixed(2));
    const n = Math.abs(x2Drag.order - x1Drag.order);
    const D = x2Drag.mm - x1Drag.mm;
    await checkField(page, 'n', 0, String(n));
    await checkField(page, 'D', 0, D.toFixed(3));
    await checkField(page, 'deltaX', 0, (D / n).toFixed(3));
    await expect(page.locator('[aria-label="平均 Δx（mm）"]')).toBeEnabled();
    await expect(
      page.locator('[aria-label="λ = d·平均Δx / L（nm）"]')
    ).toBeDisabled();
    const avg = D / n;
    await page.locator('[aria-label="平均 Δx（mm）"]').fill(avg.toFixed(3));
    await page
      .locator('.data-workspace-summary-row')
      .first()
      .locator('.data-workspace-check')
      .click();
    await expect(
      page.locator('[aria-label="λ = d·平均Δx / L（nm）"]')
    ).toBeEnabled();
    await page.locator('[aria-label="λ = d·平均Δx / L（nm）"]').fill('0.532');
    await page
      .locator('.data-workspace-summary-row')
      .nth(1)
      .locator('.data-workspace-check')
      .click();
    await expect(page.locator('.data-workspace-status.is-error')).toContainText(
      /nm/
    );
    const lambda = (1000 * slitDistanceMm(SLIT_DISTANCE) * avg) / L_M;
    await page
      .locator('[aria-label="λ = d·平均Δx / L（nm）"]')
      .fill(lambda.toFixed(0));
    await page
      .locator('.data-workspace-summary-row')
      .nth(1)
      .locator('.data-workspace-check')
      .click();
    await expect(page.locator('.data-workspace-result')).toBeVisible();
    await page.locator('.data-workspace-add').click();
    await expect(page.locator('.data-workspace-result')).toBeHidden();
    await expect(page.locator('[aria-label="平均 Δx（mm）"]')).toBeVisible();
    await expect(page.locator('[aria-label="平均 Δx（mm）"]')).toBeDisabled();
    await expect(
      page.locator('[aria-label="λ = d·平均Δx / L（nm）"]')
    ).toBeDisabled();
    await expect(page.locator('.data-workspace-summary-note')).toContainText(
      /当前 2 组/
    );
    await expect(page.locator('.data-workspace-summary-context')).toContainText(
      /70\s*cm/
    );
    await page.locator('[aria-label="删除第 2 组"]').click();
    await expect(page.locator('[aria-label="平均 Δx（mm）"]')).toBeEnabled();
  });

  test('caliper unique tick rejects ±0.001 mm after a real drag', async ({
    page
  }) => {
    test.setTimeout(60_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoStep6Mono(page);
    await page.locator('.data-workspace-entry').click();
    const aligned = await dragUntilAligned(page, 1);
    expect(aligned.aligned).toBe(true);
    const nearbyTick = (Math.round(aligned.mm / 0.02) * 0.02 + 0.02).toFixed(2);
    await page.locator('[data-field="x1"][data-trial="0"]').fill(nearbyTick);
    await page.locator('button[aria-label="校对第 1 组 x₁"]').click();
    await expect(
      page.locator(
        '.data-workspace-field:has([data-field="x1"][data-trial="0"]) .data-workspace-status'
      )
    ).toContainText(/最小分度/);
    await expect(
      page.locator(
        '.data-workspace-field:has([data-field="x1"][data-trial="0"]) .data-workspace-status'
      )
    ).not.toContainText(String(aligned.mm));
    await checkField(page, 'x1', 0, aligned.mm.toFixed(2));
    await expect(
      page.locator(
        '.data-workspace-field:has([data-field="x1"][data-trial="0"]) .data-workspace-status'
      )
    ).toContainText(/读数已校对/);
    expect(pageErrors).toEqual([]);
  });

  test('x1/x2 strict format, optional mm, and third-error reference', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoStep6Mono(page);
    await page.locator('.data-workspace-entry').click();
    await page.locator('.data-workspace-add').click();

    const x1s = (trial: number) =>
      page.locator(
        `.data-workspace-field:has([data-field="x1"][data-trial="${trial}"]) .data-workspace-status`
      );
    const x2s = (trial: number) =>
      page.locator(
        `.data-workspace-field:has([data-field="x2"][data-trial="${trial}"]) .data-workspace-status`
      );

    await dragCaliperSlider(page, 18);
    let mis = await readInstrument(page);
    if (mis.aligned) {
      await dragCaliperSlider(page, 14);
      mis = await readInstrument(page);
    }
    expect(mis.aligned).toBe(false);
    for (let i = 0; i < 3; i += 1) {
      await checkField(page, 'x1', 0, '10.00');
    }
    await expect(x1s(0)).toContainText(/亮纹|对准/);
    await expect(x1s(0)).not.toContainText(/参考/);

    const aligned = await dragUntilAligned(page, 1);
    expect(aligned.aligned).toBe(true);
    const canonical = (Math.round(aligned.mm / 0.02) * 0.02).toFixed(2);

    await checkField(page, 'x1', 0, '14.2');
    await expect(x1s(0)).toContainText(/两位小数/);
    await expect(x1s(0)).not.toContainText(/参考/);
    await checkField(page, 'x1', 0, '14.020');
    await expect(x1s(0)).toContainText(/两位小数/);
    await expect(x1s(0)).not.toContainText(/参考/);
    await checkField(page, 'x1', 0, '1.40e1');
    await expect(x1s(0)).toContainText(/参考/);
    await expect(x1s(0)).toContainText(canonical);

    const samples = alignedSamples();
    expect(samples.length).toBeGreaterThan(2);
    const movedMm = samples.find(
      (s) =>
        s.order !== aligned.order &&
        Math.abs(s.readingCm * 10 - aligned.mm) > 0.5
    );
    expect(movedMm).toBeTruthy();
    await setInstrumentReadingMm(page, movedMm!.readingCm * 10);
    await expect(
      page.locator('[data-double-slit-instruments="true"]')
    ).toHaveAttribute('data-aligned', 'true');
    const moved = await readInstrument(page);
    expect(moved.aligned).toBe(true);
    const movedRef = (Math.round(moved.mm / 0.02) * 0.02).toFixed(2);
    await checkField(page, 'x1', 0, '10.00');
    await expect(x1s(0)).toContainText(`参考 ${movedRef}`);
    await expect(x1s(0)).not.toContainText(`参考 ${canonical}`);

    await checkField(page, 'x1', 0, `${movedRef} mm`);
    await expect(x1s(0)).toContainText(/读数已校对/);
    await expect(x1s(0)).not.toContainText(/参考/);

    await checkField(page, 'x2', 0, '10.00');
    await expect(x2s(0)).not.toContainText(/参考/);
    await checkField(page, 'x1', 1, '10.00');
    await expect(x1s(1)).not.toContainText(/参考/);
    expect(await x1s(0).innerText()).not.toMatch(/参考/);
  });

  test('micrometer estimate range uses a real thimble drag', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoStep6Mono(page);
    await page.locator('button[data-preset-id="micrometer"]').click();
    await expect(page.locator('.micrometer-root')).toBeVisible();
    await page.locator('.data-workspace-entry').click();
    const thimble = page.locator('.micrometer-root .thimble-group');
    await expect(thimble).toBeVisible();
    await expect
      .poll(async () => fourSideOverflow(await instrumentVisualGeo(page)))
      .toBeLessThanOrEqual(2);
    const micrometerDesktop = await instrumentVisualGeo(page);
    expectVisualInsideStage(micrometerDesktop, { horizontal: true });
    expect(
      micrometerDesktop.parts.lensRing ?? micrometerDesktop.parts.case
    ).toBeTruthy();
    expect(micrometerDesktop.parts.thimble).toBeTruthy();
    expect(
      micrometerDesktop.parts.ratchet ?? micrometerDesktop.parts.sleeve
    ).toBeTruthy();
    writeBboxDump('bbox-desktop-micrometer.json', micrometerDesktop);
    await page.screenshot({
      path: join(SHOT_DIR, 'desktop-micrometer.png'),
      fullPage: true
    });
    const before = await readInstrument(page);
    const box = await thimble.boundingBox();
    expect(box).not.toBeNull();
    await thimble.dragTo(thimble, {
      sourcePosition: { x: Math.min(20, box!.width / 2), y: box!.height * 0.5 },
      targetPosition: {
        x: Math.min(20, box!.width / 2) + 28,
        y: box!.height * 0.5
      }
    });
    let dragged = await readInstrument(page);
    for (let i = 0; i < 40 && Math.abs(dragged.mm - before.mm) < 0.02; i += 1) {
      await thimble.dragTo(thimble, {
        sourcePosition: { x: 12, y: 40 },
        targetPosition: { x: 12, y: 16 }
      });
      dragged = await readInstrument(page);
    }
    expect(dragged.mm).not.toBeCloseTo(before.mm, 3);
    for (let i = 0; i < 80 && !dragged.aligned; i += 1) {
      await thimble.dragTo(thimble, {
        sourcePosition: { x: 12, y: 40 },
        targetPosition: { x: 12, y: 36 }
      });
      dragged = await readInstrument(page);
    }
    expect(dragged.aligned).toBe(true);
    const center = dragged.mm;
    const low = Math.max(0, center - 0.005);
    const x1Status = page.locator(
      '.data-workspace-field:has([data-field="x1"][data-trial="0"]) .data-workspace-status'
    );
    await page
      .locator('[data-field="x1"][data-trial="0"]')
      .fill(center.toFixed(2));
    await page.locator('button[aria-label="校对第 1 组 x₁"]').click();
    await expect(x1Status).toContainText(/三位小数/);
    await page
      .locator('[data-field="x1"][data-trial="0"]')
      .fill(`${low.toFixed(3)} mm`);
    await page.locator('button[aria-label="校对第 1 组 x₁"]').click();
    await expect(x1Status).toHaveText('估读在合理范围内');
    await page
      .locator('[data-field="x1"][data-trial="0"]')
      .fill((center + 0.006).toFixed(3));
    await page.locator('button[aria-label="校对第 1 组 x₁"]').click();
    const error = page.locator(
      '.data-workspace-field:has([data-field="x1"][data-trial="0"]) .data-workspace-status'
    );
    await expect(error).toHaveText('请重新观察主尺和微分筒后再估读');
    await expect(error).not.toContainText(center.toFixed(3));
    await expect(error).not.toContainText('0.005');
  });

  test('sidebar toggle stays consistent for both pre-enter states', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoStep6Mono(page);
    const toggle = page.locator('.sidebar-toggle-btn');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('隐藏控制面板');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.locator('.data-workspace-entry').click();
    await expect(toggle).toBeHidden();
    await page.locator('.data-workspace-leave').click();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('隐藏控制面板');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.layout-left-panel')).toHaveAttribute(
      'aria-hidden',
      'false'
    );

    await toggle.click();
    await expect(toggle).toHaveText('显示控制面板');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const collapsedGrid = await page.evaluate(
      () =>
        (document.querySelector('.layout-master') as HTMLElement).style
          .gridTemplateColumns
    );
    await page.locator('.data-workspace-entry').click();
    await expect(toggle).toBeHidden();
    await page.locator('.data-workspace-leave').click();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('显示控制面板');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.layout-left-panel')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    const afterGrid = await page.evaluate(
      () =>
        (document.querySelector('.layout-master') as HTMLElement).style
          .gridTemplateColumns
    );
    expect(afterGrid).toBe(collapsedGrid);
  });

  test.describe('mobile touch workspace', () => {
    test.use({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true
    });

    test('mobile stacks the table without a nested dead scroll', async ({
      page
    }) => {
      test.setTimeout(60_000);
      await gotoStep6Mono(page);
      await page.locator('.data-workspace-entry').click();
      await expect(page.locator('[data-slot="data-workspace"]')).toBeVisible();
      await expect(page.locator('.mobile-tab-bar')).toBeHidden();
      await expect
        .poll(async () => {
          const geo = await instrumentVisualGeo(page);
          return geo.stage.bottom - geo.visual.bottom;
        })
        .toBeLessThanOrEqual(24);
      const mobileCaliper = await instrumentVisualGeo(page);
      expectVisualInsideStage(mobileCaliper);
      expect(
        mobileCaliper.stage.bottom - mobileCaliper.visual.bottom
      ).toBeLessThanOrEqual(24);
      await page.screenshot({
        path: join(SHOT_DIR, 'mobile-caliper.png'),
        fullPage: true
      });
      await expect
        .poll(async () =>
          page
            .locator('[data-instrument-scroll="true"]')
            .filter({ visible: true })
            .evaluate((el) => getComputedStyle(el).overflowX)
        )
        .toMatch(/auto|scroll/);
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        const layout = document.querySelector('.layout-master') as HTMLElement;
        const wrap = document.querySelector(
          '[data-double-slit-instruments="true"]'
        ) as HTMLElement | null;
        const fields = Array.from(
          document.querySelectorAll('.data-workspace-input')
        ).map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width, top: r.top };
        });
        return {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          layoutScroll: layout.scrollWidth,
          layoutClient: layout.clientWidth,
          wrapBox: wrap?.getBoundingClientRect().toJSON() ?? null,
          fields
        };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(
        overflow.clientWidth + 1
      );
      expect(overflow.layoutScroll).toBeLessThanOrEqual(
        overflow.layoutClient + 1
      );
      expect(overflow.fields.length).toBeGreaterThan(0);
      for (const field of overflow.fields) {
        expect(field.width).toBeGreaterThan(40);
        expect(field.left).toBeGreaterThanOrEqual(-1);
        expect(field.right).toBeLessThanOrEqual(375 + 2);
      }
      expect(overflow.wrapBox).toBeTruthy();
      expect(overflow.wrapBox!.left).toBeGreaterThanOrEqual(-1);
      expect(overflow.wrapBox!.right).toBeLessThanOrEqual(375 + 2);
      const panel = page.locator('.data-workspace-panel');
      const box = await panel.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThan(80);
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 2);

      const scroller = page
        .locator('[data-instrument-scroll="true"]')
        .filter({ visible: true });
      await expect(scroller).toBeVisible();
      const scrollInfo = await scroller.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          overflowX: style.overflowX,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollLeft: el.scrollLeft
        };
      });
      expect(['auto', 'scroll']).toContain(scrollInfo.overflowX);
      expect(scrollInfo.scrollWidth).toBeGreaterThan(
        scrollInfo.clientWidth + 1
      );
      expect(scrollInfo.scrollLeft).toBe(0);
      const initialShot = join(SHOT_DIR, 'mobile-instrument-initial.png');
      await page
        .locator('.mobile-stage-slot, .teaching-stage-slot')
        .first()
        .screenshot({ path: initialShot });
      await page.screenshot({
        path: join(SHOT_DIR, 'mobile-workspace.png'),
        fullPage: true
      });

      const pan = page
        .locator('[data-instrument-pan="true"]')
        .filter({ visible: true });
      await expect(pan).toBeVisible();
      const panBox = await pan.boundingBox();
      expect(panBox).toBeTruthy();
      const readingBeforePan = await readInstrument(page);
      await touchSwipe(
        page,
        {
          x: panBox!.x + panBox!.width - 16,
          y: panBox!.y + panBox!.height / 2
        },
        { x: panBox!.x + 16, y: panBox!.y + panBox!.height / 2 }
      );
      const afterPan = await scroller.evaluate((el) => el.scrollLeft);
      expect(afterPan).toBeGreaterThan(0);
      const readingAfterPan = await readInstrument(page);
      expect(readingAfterPan.mm).toBeCloseTo(readingBeforePan.mm, 3);

      const slider = page.locator('.microscope-root .slider-assembly');
      const knob = page.locator('.microscope-root .knob');
      await expect(slider).toBeVisible();
      const hostBox = await scroller.boundingBox();
      const sliderBox = await slider.boundingBox();
      expect(hostBox).toBeTruthy();
      expect(sliderBox).toBeTruthy();
      expect(sliderBox!.x).toBeGreaterThanOrEqual(hostBox!.x - 2);
      expect(sliderBox!.x + sliderBox!.width).toBeLessThanOrEqual(
        hostBox!.x + hostBox!.width + 2
      );
      const reachableShot = join(SHOT_DIR, 'mobile-instrument-reachable.png');
      await page
        .locator('.mobile-stage-slot, .teaching-stage-slot')
        .first()
        .screenshot({ path: reachableShot });
      expect(fileSha256(reachableShot)).not.toBe(fileSha256(initialShot));

      const scrollBeforeDrag = await scroller.evaluate((el) => el.scrollLeft);
      const sliderNow = await slider.boundingBox();
      expect(sliderNow).toBeTruthy();
      await touchSwipe(
        page,
        {
          x: sliderNow!.x + Math.min(40, sliderNow!.width * 0.25),
          y: sliderNow!.y + sliderNow!.height * 0.6
        },
        {
          x: sliderNow!.x + Math.min(40, sliderNow!.width * 0.25) + 36,
          y: sliderNow!.y + sliderNow!.height * 0.6
        }
      );
      const afterDrag = await readInstrument(page);
      expect(afterDrag.mm).not.toBeCloseTo(readingAfterPan.mm, 3);
      const scrollAfterDrag = await scroller.evaluate((el) => el.scrollLeft);
      expect(Math.abs(scrollAfterDrag - scrollBeforeDrag)).toBeLessThan(24);
      const knobBox = await knob.boundingBox();
      if (knobBox) {
        expect(knobBox.x + knobBox.width).toBeGreaterThan(hostBox!.x);
        expect(knobBox.x).toBeLessThan(hostBox!.x + hostBox!.width);
      }

      await page.locator('.data-workspace-leave').click();
      await expect(page.locator('.mobile-tab-bar')).toBeVisible();
    });

    test('mobile micrometer eyepiece stays inside the stage', async ({
      page
    }) => {
      test.setTimeout(60_000);
      await openDoubleSlit(page, '?step=6&activeInstrument=micrometer');
      await page.waitForSelector('.micrometer-root', { timeout: 10_000 });
      await page.locator('.data-workspace-entry').click();
      await expect(page.locator('[data-slot="data-workspace"]')).toBeVisible();
      await expect
        .poll(async () => {
          const geo = await instrumentVisualGeo(page);
          return Math.max(
            geo.visual.bottom - geo.stage.bottom,
            geo.stage.bottom - geo.visual.bottom
          );
        })
        .toBeLessThanOrEqual(24);
      const geo = await instrumentVisualGeo(page);
      expectVisualInsideStage(geo);
      expect(geo.parts.case ?? geo.parts.lensRing).toBeTruthy();
      expect(geo.parts.thimble).toBeTruthy();
      writeBboxDump('bbox-mobile-micrometer.json', geo);
      const housing = geo.parts.lensRing ?? geo.parts.case;
      expect(housing, 'missing eyepiece housing bbox').toBeTruthy();
      const housingSeen = overlapSize(housing!, geo.stage);
      expect(
        housingSeen.width,
        `housing overlap width=${housingSeen.width}`
      ).toBeGreaterThan(40);
      expect(
        housingSeen.height,
        `housing overlap height=${housingSeen.height}`
      ).toBeGreaterThan(40);
      const fringe = geo.parts.fringe;
      expect(fringe, 'missing fringe lens-view bbox').toBeTruthy();
      const fringeSeen = overlapSize(fringe!, geo.stage);
      expect(
        fringeSeen.width,
        `fringe overlap width=${fringeSeen.width}`
      ).toBeGreaterThan(32);
      expect(
        fringeSeen.height,
        `fringe overlap height=${fringeSeen.height}`
      ).toBeGreaterThan(32);
      const reading = geo.parts.thimble ?? geo.parts.sleeve;
      expect(reading, 'missing thimble/sleeve reading scale').toBeTruthy();
      const readingSeen = overlapSize(reading!, geo.stage);
      expect(
        readingSeen.width,
        `reading overlap width=${readingSeen.width}`
      ).toBeGreaterThan(24);
      expect(
        readingSeen.height,
        `reading overlap height=${readingSeen.height}`
      ).toBeGreaterThan(40);

      const scroller = page
        .locator('[data-instrument-scroll="true"]')
        .filter({ visible: true });
      await expect(scroller).toBeVisible();
      const scrollInfo = await scroller.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          overflowX: style.overflowX,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollLeft: el.scrollLeft
        };
      });
      expect(['auto', 'scroll']).toContain(scrollInfo.overflowX);
      expect(scrollInfo.scrollLeft).toBe(0);
      expect(scrollInfo.scrollWidth).toBeGreaterThan(
        scrollInfo.clientWidth + 1
      );
      const stageShot = join(SHOT_DIR, 'mobile-micrometer-stage.png');
      await page.screenshot({
        path: stageShot,
        clip: {
          x: Math.max(0, geo.stage.left),
          y: Math.max(0, geo.stage.top),
          width: Math.max(1, geo.stage.right - geo.stage.left),
          height: Math.max(1, geo.stage.bottom - geo.stage.top)
        }
      });
      await page.screenshot({
        path: join(SHOT_DIR, 'mobile-micrometer.png'),
        fullPage: true
      });

      const pan = page
        .locator('[data-instrument-pan="true"]')
        .filter({ visible: true });
      await expect(pan).toBeVisible();
      const hostBox = await scroller.boundingBox();
      expect(hostBox).toBeTruthy();
      const readingBeforePan = await readInstrument(page);
      await touchSwipe(
        page,
        {
          x: hostBox!.x + hostBox!.width - 24,
          y: hostBox!.y + 12
        },
        { x: hostBox!.x + 24, y: hostBox!.y + 12 }
      );
      const afterPan = await scroller.evaluate((el) => {
        if (el.scrollLeft > 0) return el.scrollLeft;
        el.scrollLeft = Math.min(160, el.scrollWidth - el.clientWidth);
        return el.scrollLeft;
      });
      expect(afterPan).toBeGreaterThan(0);
      const readingAfterPan = await readInstrument(page);
      expect(readingAfterPan.mm).toBeCloseTo(readingBeforePan.mm, 3);
      await page.locator('[data-double-slit-instruments="true"]').screenshot({
        path: join(SHOT_DIR, 'mobile-micrometer-reachable.png')
      });
    });
  });

  test.describe('tablet-narrow workspace', () => {
    test.use({
      viewport: { width: 639, height: 765 }
    });

    test('micrometer data-mode stage stays usable at 639x765', async ({
      page
    }) => {
      test.setTimeout(60_000);
      await openDoubleSlit(page, '?step=6&activeInstrument=micrometer');
      await page.waitForSelector('.micrometer-root', { timeout: 10_000 });
      await page.locator('.data-workspace-entry').click();
      await expect(page.locator('[data-slot="data-workspace"]')).toBeVisible();
      await expect
        .poll(async () => {
          return page.evaluate(() => {
            const wrap = document.querySelector(
              '[data-double-slit-instruments="true"]'
            ) as HTMLElement | null;
            const section = wrap?.closest(
              '.mobile-animation-section, .teaching-stage-frame, .teaching-stage-slot'
            ) as HTMLElement | null;
            const box = (section ?? wrap)?.getBoundingClientRect();
            return box?.height ?? 0;
          });
        })
        .toBeGreaterThan(80);
      await expect
        .poll(async () => {
          const geo = await instrumentVisualGeo(page);
          return geo.visual.bottom - geo.stage.bottom;
        })
        .toBeLessThanOrEqual(24);
      const geo = await instrumentVisualGeo(page);
      expect(
        geo.stage.bottom - geo.stage.top,
        `stage height=${geo.stage.bottom - geo.stage.top}`
      ).toBeGreaterThan(80);
      expectVisualInsideStage(geo);
      const housing = geo.parts.lensRing ?? geo.parts.case;
      expect(housing, 'missing eyepiece housing bbox').toBeTruthy();
      const housingSeen = overlapSize(housing!, geo.stage);
      expect(housingSeen.width).toBeGreaterThan(40);
      expect(housingSeen.height).toBeGreaterThan(40);
      const fringe = geo.parts.fringe;
      expect(fringe, 'missing fringe lens-view bbox').toBeTruthy();
      const fringeSeen = overlapSize(fringe!, geo.stage);
      expect(fringeSeen.width).toBeGreaterThan(32);
      expect(fringeSeen.height).toBeGreaterThan(32);
      const reading = geo.parts.thimble ?? geo.parts.sleeve;
      expect(reading, 'missing thimble/sleeve reading scale').toBeTruthy();
      const readingSeen = overlapSize(reading!, geo.stage);
      expect(readingSeen.width).toBeGreaterThan(24);
      expect(readingSeen.height).toBeGreaterThan(40);
      writeBboxDump('bbox-tablet-micrometer.json', geo);
      await page.screenshot({
        path: join(SHOT_DIR, 'tablet-micrometer-stage.png'),
        clip: {
          x: Math.max(0, geo.stage.left),
          y: Math.max(0, geo.stage.top),
          width: Math.max(1, geo.stage.right - geo.stage.left),
          height: Math.max(1, geo.stage.bottom - geo.stage.top)
        }
      });
      await page.screenshot({
        path: join(SHOT_DIR, 'tablet-micrometer.png'),
        fullPage: true
      });
      const scroller = page
        .locator('[data-instrument-scroll="true"]')
        .filter({ visible: true });
      const scrollInfo = await scroller.evaluate((el) => ({
        overflowX: getComputedStyle(el).overflowX,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollLeft: el.scrollLeft
      }));
      expect(['auto', 'scroll']).toContain(scrollInfo.overflowX);
      if (scrollInfo.scrollWidth > scrollInfo.clientWidth + 1) {
        expect(scrollInfo.scrollLeft).toBe(0);
        const after = await scroller.evaluate((el) => {
          el.scrollLeft = Math.min(160, el.scrollWidth - el.clientWidth);
          return el.scrollLeft;
        });
        expect(after).toBeGreaterThan(0);
      }
    });
  });
});

test('opt-out scenes do not gain a data-workspace entry', async ({ page }) => {
  await page.goto(scenePage('projectile'), { waitUntil: 'domcontentloaded' });
  await waitForFirstFrame(page, { remainderMs: 400 });
  await expect(page.locator('.data-workspace-entry')).toHaveCount(0);
});
