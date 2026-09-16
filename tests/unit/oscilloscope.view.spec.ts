import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { oscilloscopeControlsSchema } from '../../src/scenes/oscilloscope/controls-schema';
import { oscilloscopeMeta } from '../../src/scenes/oscilloscope/scene.meta';
import {
  OSCILLOSCOPE_SCAN_TITLE,
  OSCILLOSCOPE_SIGNAL_TITLE,
  apparatusLayout,
  createOscilloscopeSim,
  mapStagePoint,
  oscilloscopeConstants as C,
  stageLayoutFrom,
  stageTransform
} from '../../src/scenes/oscilloscope/scene.sim';
import {
  createOscilloscopeView,
  sizeGraphCanvasToHost
} from '../../src/scenes/oscilloscope/scene.view';

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

describe('oscilloscope view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(C.baseWidth).toBe(960);
    expect(C.baseHeight).toBe(540);
    expect('fieldWidth' in C).toBe(false);
    expect('panelWidth' in C).toBe(false);
    expect('formulaCardY' in C).toBe(false);
    expect('stableCardY' in C).toBe(false);
    expect(C.tubeRight).toBeLessThan(C.baseWidth);
    expect(C.scopeCenterY + C.scopeRadius).toBeLessThan(C.baseHeight);
  });

  it('has no drawPanel, formula-card, or time-plot paths in the animation source', () => {
    const viewSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/oscilloscope/scene.view.ts'),
      'utf8'
    );
    const simSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/oscilloscope/scene.sim.ts'),
      'utf8'
    );
    expect(viewSrc).not.toMatch(/drawPanel|drawReadout|drawWave\b/);
    expect(viewSrc).not.toMatch(/参数控制台|波形同步条件|核心关系|信号展开/);
    expect(viewSrc).not.toMatch(/fᵧ = n/);
    expect(simSrc).not.toMatch(
      /panelWidth|fieldWidth|formulaWidth|readoutWidth|formulaCardY|stableCardY/
    );
  });

  it('draws short apparatus labels and omits panel, formula, and data copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createOscilloscopeView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(createOscilloscopeSim({ autoRun: false }).getState());
    });
    expect(labels).toEqual(
      expect.arrayContaining([
        '电子枪',
        'Y',
        'Y′',
        'X',
        'X′',
        '荧光屏',
        '示波屏'
      ])
    );
    expect(labels.some((text) => text.includes('参数'))).toBe(false);
    expect(labels.some((text) => text.includes('控制台'))).toBe(false);
    expect(labels.some((text) => text.includes('核心关系'))).toBe(false);
    expect(labels.some((text) => text.includes('信号展开'))).toBe(false);
    expect(labels.some((text) => text.includes('fᵧ'))).toBe(false);
    expect(labels.some((text) => text.includes('稳定'))).toBe(false);
    expect(labels.some((text) => text.includes('示波管原理'))).toBe(false);
    expect(labels.includes(OSCILLOSCOPE_SIGNAL_TITLE)).toBe(false);
    expect(labels.includes(OSCILLOSCOPE_SCAN_TITLE)).toBe(false);
    view.dispose();
  });

  it('keeps Uy/Ux time plots on the graph canvas, not the animation canvas', () => {
    const canvas = mockCanvas(1280, 720);
    const graphCanvas = mockCanvas(640, 240);
    const view = createOscilloscopeView({ canvas, theme: 'light' });
    view.attachGraphCanvas(graphCanvas);
    const stageLabels = withFillTextCapture(canvas, () => {
      view.render(createOscilloscopeSim({ autoRun: false }).getState());
    });
    const graphLabels = withFillTextCapture(graphCanvas, () => {
      view.render(createOscilloscopeSim({ autoRun: false }).getState());
    });
    expect(stageLabels.includes(OSCILLOSCOPE_SIGNAL_TITLE)).toBe(false);
    expect(stageLabels.includes(OSCILLOSCOPE_SCAN_TITLE)).toBe(false);
    expect(graphLabels).toEqual(
      expect.arrayContaining([
        OSCILLOSCOPE_SIGNAL_TITLE,
        OSCILLOSCOPE_SCAN_TITLE,
        't'
      ])
    );
    view.dispose();
  });

  it('renders light/dark and presentation at desktop and mobile slots', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const graphCanvas = mockCanvas(Math.min(width, 640), 240);
      const view = createOscilloscopeView({ canvas, theme: 'light' });
      expect(() => {
        const sim = createOscilloscopeSim({ autoRun: false });
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
    expect(oscilloscopeMeta.testProfile?.hasGraph).toBe(true);
    expect(oscilloscopeMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'cycles-per-scan',
        'stable',
        'signal-frequency',
        'scan-frequency'
      ])
    );
    const titles = oscilloscopeControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('待测信号');
    expect(titles).toContain('扫描信号');
    expect(titles).toContain('公式');
    expect(titles).not.toContain('结论');
    const keys = oscilloscopeControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'signalAmplitude',
        'signalFrequency',
        'scanEnabled',
        'scanFrequency',
        'autoRun'
      ])
    );
    const hint = oscilloscopeControlsSchema.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === 'formula');
    expect(hint && 'lines' in hint ? hint.lines : []).toEqual(
      expect.arrayContaining(['fᵧ = n · fₓ'])
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
    const view = createOscilloscopeView({
      canvas: mockCanvas(800, 400),
      theme: 'light'
    });
    view.attachGraphCanvas(graphCanvas);
    view.render(createOscilloscopeSim({ autoRun: false }).getState());
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

  it('keeps the floating 数据读数 card from covering tube, scope, or labels', () => {
    const overlayLeft = 1068;
    const pose = stageTransform(1280, 720, {
      floatingReadout: true,
      overlayPx: 1280 - overlayLeft,
      overlayTopPx: 60,
      overlayHeightPx: 280
    });
    const layout = apparatusLayout(
      createOscilloscopeSim({ autoRun: false }).getState()
    );
    const rightmost = [
      layout.tube.right,
      layout.screenHit.x,
      layout.scope.cx + layout.scope.r,
      ...layout.labels.map((label) => label.x)
    ];
    for (const x of rightmost) {
      expect(mapStagePoint(x, layout.tube.centerY, pose).x).toBeLessThanOrEqual(
        overlayLeft - C.overlayGapPx + 1e-6
      );
    }
    expect(pose.offsetX).toBeGreaterThanOrEqual(0);
    expect(
      pose.offsetX + pose.boxW * pose.fit * pose.scaleX
    ).toBeLessThanOrEqual(1280 + 1e-6);
  });

  it('detects split-right and lab overlay panels and reflows the stage', () => {
    function mockRect(
      left: number,
      top: number,
      width: number,
      height: number
    ): DOMRect {
      return {
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        toJSON() {
          return {};
        }
      } as DOMRect;
    }

    const split = document.createElement('div');
    split.className = 'layout-srgb-graph-bottom';
    split.dataset.testid = 'split-right-graph-bottom-layout';
    const splitSlot = document.createElement('div');
    const splitCanvas = mockCanvas(1280, 720);
    const splitPanel = document.createElement('div');
    splitPanel.className = 'srgb-readout-panel readout-panel';
    splitPanel.style.position = 'absolute';
    splitCanvas.getBoundingClientRect = () => mockRect(0, 0, 1280, 720);
    splitPanel.getBoundingClientRect = () => mockRect(1068, 60, 192, 280);
    splitSlot.append(splitCanvas, splitPanel);
    split.appendChild(splitSlot);
    document.body.appendChild(split);

    const splitView = createOscilloscopeView({
      canvas: splitCanvas,
      theme: 'light'
    });
    splitView.render(createOscilloscopeSim({ autoRun: false }).getState());
    const splitHint = stageLayoutFrom(splitCanvas);
    expect(splitHint.floatingReadout).toBe(true);
    expect(splitHint.overlayPx).toBeGreaterThanOrEqual(1280 - 1068);
    const splitPose = stageTransform(1280, 720, splitHint);
    expect(
      splitPose.offsetX + splitPose.boxW * splitPose.fit
    ).toBeLessThanOrEqual(1068 - C.overlayGapPx + 1e-6);
    splitView.dispose();
    split.remove();

    const lab = document.createElement('div');
    lab.className = 'lab-stage-layout';
    lab.dataset.testid = 'lab-stage-layout';
    const labSlot = document.createElement('div');
    labSlot.className = 'lab-stage-slot';
    const labCanvas = mockCanvas(1280, 720);
    const labPanel = document.createElement('div');
    labPanel.className = 'lab-float lab-float-data';
    labPanel.style.position = 'absolute';
    labCanvas.getBoundingClientRect = () => mockRect(0, 0, 1280, 720);
    labPanel.getBoundingClientRect = () => mockRect(1068, 60, 192, 280);
    labSlot.appendChild(labCanvas);
    lab.append(labSlot, labPanel);
    document.body.appendChild(lab);

    const labView = createOscilloscopeView({
      canvas: labCanvas,
      theme: 'light'
    });
    labView.render(createOscilloscopeSim({ autoRun: false }).getState());
    const labHint = stageLayoutFrom(labCanvas);
    expect(labHint.floatingReadout).toBe(true);
    expect(labHint.overlayPx).toBeGreaterThanOrEqual(1280 - 1068);
    const labPose = stageTransform(1280, 720, labHint);
    expect(labPose.offsetX + labPose.boxW * labPose.fit).toBeLessThanOrEqual(
      1068 - C.overlayGapPx + 1e-6
    );
    labView.dispose();
    lab.remove();
  });
});
