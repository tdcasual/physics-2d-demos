import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blockBoardControlsSchema } from '../../src/scenes/block-board/controls-schema';
import { blockBoardMeta } from '../../src/scenes/block-board/scene.meta';
import {
  BLOCK_BOARD_X_TITLE,
  BLOCK_BOARD_Y_TITLE,
  blockBoardConstants as C,
  createBlockBoardSim,
  stageTransform
} from '../../src/scenes/block-board/scene.sim';
import {
  createBlockBoardView,
  sizeGraphCanvasToHost
} from '../../src/scenes/block-board/scene.view';

function mockCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      }
    }) as DOMRect;
  canvas.dataset.responsiveScale = String(
    Math.max(0.3, Math.min(1.5, Math.min(width, height) / 400))
  );
  return canvas;
}

type FillTextFn = CanvasRenderingContext2D['fillText'];
type FillTextHost = { fillText: FillTextFn };

function resolveFillTextHost(ctx: CanvasRenderingContext2D): FillTextHost {
  if (typeof ctx.fillText !== 'function') {
    throw new Error('fillText is not available on canvas context');
  }
  if (Object.prototype.hasOwnProperty.call(ctx, 'fillText')) {
    return ctx;
  }
  const ctorProto = (ctx.constructor as { prototype?: Partial<FillTextHost> })
    .prototype;
  if (ctorProto && typeof ctorProto.fillText === 'function') {
    return ctorProto as FillTextHost;
  }
  const proto = Object.getPrototypeOf(ctx) as Partial<FillTextHost> | null;
  if (proto && typeof proto.fillText === 'function') {
    return proto as FillTextHost;
  }
  return ctx;
}

function withFillTextCapture(
  canvas: HTMLCanvasElement,
  run: () => void
): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2d canvas context is required to capture fillText');
  }
  const host = resolveFillTextHost(ctx);
  const original = host.fillText;
  const labels: string[] = [];
  host.fillText = function fillTextSpy(
    this: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    maxWidth?: number
  ) {
    labels.push(String(value));
    if (maxWidth === undefined) original.call(this, value, x, y);
    else original.call(this, value, x, y, maxWidth);
  };
  try {
    run();
  } finally {
    host.fillText = original;
  }
  return labels;
}

describe('block-board view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(C.baseWidth).toBe(960);
    expect(C.baseHeight).toBe(360);
    expect('fieldWidth' in C).toBe(false);
    expect('panelWidth' in C).toBe(false);
    expect('formulaWidth' in C).toBe(false);
    expect('readoutWidth' in C).toBe(false);
    expect(C.trackEndX).toBeLessThan(C.baseWidth);
    expect(C.trackY).toBeLessThan(C.baseHeight - C.transportClearY);
  });

  it('has no drawPanel, formula-card, or readout-card paths in source', () => {
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/block-board/scene.view.ts'),
      'utf8'
    );
    const simSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/block-board/scene.sim.ts'),
      'utf8'
    );
    expect(viewSrc).not.toMatch(/drawPanel|drawReadout/);
    expect(viewSrc).not.toMatch(/实时计算|系统参数|核心关系/);
    expect(viewSrc).not.toMatch(/v-t 运动图像/);
    expect(simSrc).not.toMatch(
      /panelWidth|fieldWidth|formulaWidth|readoutWidth/
    );
  });

  it('draws short apparatus labels and omits panel, formula, and readout copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createBlockBoardView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(createBlockBoardSim({ autoRun: false }).getState());
    });
    expect(labels).toEqual(
      expect.arrayContaining(['m', 'M', 'v₁', 'x', '共速'])
    );
    expect(labels.some((text) => text.includes('实时'))).toBe(false);
    expect(labels.some((text) => text.includes('系统参数'))).toBe(false);
    expect(labels.some((text) => text.includes('核心关系'))).toBe(false);
    expect(labels.some((text) => text.includes('v-t'))).toBe(false);
    expect(labels.some((text) => text.includes('空格'))).toBe(false);
    expect(labels.some((text) => text.includes('木块加速度'))).toBe(false);
    expect(labels.some((text) => text.includes('t₀ ='))).toBe(false);
    view.dispose();
  });

  it('keeps v-t titles on the graph canvas, not the animation canvas', () => {
    const canvas = mockCanvas(1280, 720);
    const graphCanvas = mockCanvas(640, 240);
    const view = createBlockBoardView({ canvas, theme: 'light' });
    view.attachGraphCanvas(graphCanvas);
    const stageLabels = withFillTextCapture(canvas, () => {
      view.render(createBlockBoardSim({ autoRun: false }).getState());
    });
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(createBlockBoardSim({ autoRun: false }).getState());
    });
    expect(stageLabels.some((text) => text.includes('t / s'))).toBe(false);
    expect(stageLabels.some((text) => text.includes('Δx'))).toBe(false);
    expect(graphLabels).toEqual(
      expect.arrayContaining([
        BLOCK_BOARD_X_TITLE,
        BLOCK_BOARD_Y_TITLE,
        'Δx',
        'm',
        'M'
      ])
    );
    view.dispose();
  });

  it('omits Δx on the graph when showArea is false', () => {
    const canvas = mockCanvas(1280, 720);
    const graphCanvas = mockCanvas(640, 240);
    const view = createBlockBoardView({ canvas, theme: 'light' });
    view.attachGraphCanvas(graphCanvas);
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(
        createBlockBoardSim({ autoRun: false, showArea: false }).getState()
      );
    });
    expect(graphLabels.some((text) => text.includes('Δx'))).toBe(false);
    view.dispose();
  });

  it('renders light/dark and presentation at desktop and mobile slots', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const graphCanvas = mockCanvas(Math.min(width, 640), 200);
      const view = createBlockBoardView({ canvas, theme: 'light' });
      expect(() => {
        const sim = createBlockBoardSim({ autoRun: false });
        view.attachGraphCanvas(graphCanvas);
        view.render(sim.getState());
        sim.stepFrame(0.4);
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.2 });
        view.render(sim.getState());
        view.setMode('normal');
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps the graph on the layout card and formulas in the control pane', () => {
    expect(blockBoardMeta.testProfile?.hasGraph).toBe(true);
    expect(blockBoardMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'block-velocity',
        'board-velocity',
        'relative-displacement',
        'sync-time'
      ])
    );
    const titles = blockBoardControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('参数');
    expect(titles).toContain('显示');
    expect(titles).toContain('公式');
    expect(titles).not.toContain('结论');
    const keys = blockBoardControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'blockMass',
        'boardMass',
        'initialVelocity',
        'friction',
        'autoRun',
        'showArea'
      ])
    );
    const hint = blockBoardControlsSchema.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === 'formula');
    expect(hint && 'lines' in hint ? hint.lines : []).toEqual(
      expect.arrayContaining([
        't_c = v₀ / (μg(1 + m/M))',
        'v_c = m v₀ / (M + m)',
        'Δx = ½ v₀ t_c'
      ])
    );
  });

  it('sizes the graph canvas to the padded slot content box', () => {
    const host = document.createElement('div');
    host.style.padding = '8px';
    host.style.width = '640px';
    host.style.height = '163px';
    host.style.boxSizing = 'border-box';
    document.body.appendChild(host);
    host.getBoundingClientRect = () =>
      ({
        width: 640,
        height: 163,
        top: 557,
        left: 0,
        bottom: 720,
        right: 640,
        x: 0,
        y: 557,
        toJSON() {
          return {};
        }
      }) as DOMRect;
    const graphCanvas = document.createElement('canvas');
    host.appendChild(graphCanvas);
    const sized = sizeGraphCanvasToHost(graphCanvas);
    expect(sized.cssWidth).toBe(624);
    expect(sized.cssHeight).toBe(147);
    const view = createBlockBoardView({
      canvas: mockCanvas(800, 400),
      theme: 'light'
    });
    view.attachGraphCanvas(graphCanvas);
    view.render(createBlockBoardSim({ autoRun: false }).getState());
    expect(graphCanvas.style.height).toBe('147px');
    expect(graphCanvas.style.width).toBe('624px');
    view.dispose();
    host.remove();
  });

  it('keeps docked-bottom readout clear of the animation stage', () => {
    const docked = stageTransform(1280, 423, {
      floatingReadout: true,
      overlayPx: 1280,
      overlayTopPx: 265,
      overlayHeightPx: 158
    });
    expect(docked.offsetY + docked.boxH * docked.fit).toBeLessThanOrEqual(
      265 - C.overlayGapPx + 1e-6
    );
  });
});
