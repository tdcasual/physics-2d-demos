import {
  applyCanvasSize,
  getResponsiveScale,
  scaledSize
} from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  apparatusLayout,
  findOverlayPanels,
  graphCursor,
  graphFrames,
  graphSeries,
  graphToPx,
  graphWindow,
  OSCILLOSCOPE_FLOATING_LAYOUT_SELECTOR,
  OSCILLOSCOPE_SCAN_TITLE,
  OSCILLOSCOPE_SIGNAL_TITLE,
  oscilloscopeConstants as C,
  stageLayoutFrom,
  stageTransform,
  sweepWaveform,
  type GraphFrame,
  type OscilloscopeGraphPoint,
  type OscilloscopeState
} from './scene.sim';

export type CreateOscilloscopeViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  blue: string;
  cyan: string;
  pink: string;
  green: string;
  tube: string;
  tubeStroke: string;
  anode: string;
  scopeBg: string;
  scopeGrid: string;
  hatch: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    ink: '#303744',
    muted: '#8b97a5',
    blue: '#4388ff',
    cyan: '#39c2e9',
    pink: '#ee1977',
    green: '#1aa082',
    tube: 'rgba(235,242,247,0.55)',
    tubeStroke: '#a8b3bf',
    anode: '#3e4650',
    scopeBg: '#081820',
    scopeGrid: '#1d3a4a',
    hatch: '#d4dce5'
  },
  dark: {
    bg: '#101827',
    ink: '#eef2f7',
    muted: '#9eabbc',
    blue: '#79a9ff',
    cyan: '#59d8f5',
    pink: '#ff4e9e',
    green: '#4dd4c0',
    tube: 'rgba(23,34,53,0.7)',
    tubeStroke: '#3d4d63',
    anode: '#c5d0dc',
    scopeBg: '#06141c',
    scopeGrid: '#244358',
    hatch: '#3c4b61'
  }
};

function contentBoxSize(host: HTMLElement): { width: number; height: number } {
  const cs = getComputedStyle(host);
  const rect = host.getBoundingClientRect();
  const padX =
    (Number.parseFloat(cs.paddingLeft) || 0) +
    (Number.parseFloat(cs.paddingRight) || 0);
  const padY =
    (Number.parseFloat(cs.paddingTop) || 0) +
    (Number.parseFloat(cs.paddingBottom) || 0);
  return {
    width: Math.max(1, Math.floor(rect.width - padX)),
    height: Math.max(1, Math.floor(rect.height - padY))
  };
}

/** Size the graph canvas to the host content box, not the padded border box. */
export function sizeGraphCanvasToHost(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  responsiveScale: number;
} {
  const host = canvas.parentElement;
  let cssWidth: number;
  let cssHeight: number;
  if (host) {
    const box = contentBoxSize(host);
    cssWidth = box.width;
    cssHeight = box.height;
  } else {
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, Math.floor(rect.width || C.graphFallbackWidth));
    cssHeight = Math.max(1, Math.floor(rect.height || C.graphFallbackHeight));
  }
  const dpr = Math.min(
    2,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  );
  const responsiveScale = getResponsiveScale(cssWidth, cssHeight);
  const ctx = applyCanvasSize(canvas, {
    width: Math.max(1, Math.floor(cssWidth * dpr)),
    height: Math.max(1, Math.floor(cssHeight * dpr)),
    cssWidth,
    cssHeight,
    dpr,
    responsiveScale
  });
  return { ctx, cssWidth, cssHeight, responsiveScale };
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'left',
  weight = 600
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.rect(x, y, w, h);
}

function drawTube(
  ctx: CanvasRenderingContext2D,
  state: OscilloscopeState,
  p: Palette,
  font: (n: number) => number
): void {
  const layout = apparatusLayout(state);
  const { tube } = layout;
  const half = tube.height / 2;
  ctx.fillStyle = p.tube;
  ctx.strokeStyle = p.tubeStroke;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(tube.left + 24, tube.centerY - half);
  ctx.quadraticCurveTo(tube.left, tube.centerY - half, tube.left, tube.centerY);
  ctx.quadraticCurveTo(
    tube.left,
    tube.centerY + half,
    tube.left + 24,
    tube.centerY + half
  );
  ctx.lineTo(tube.right - 28, tube.centerY + half);
  ctx.quadraticCurveTo(
    tube.right,
    tube.centerY + half,
    tube.right,
    tube.centerY
  );
  ctx.quadraticCurveTo(
    tube.right,
    tube.centerY - half,
    tube.right - 28,
    tube.centerY - half
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = p.tubeStroke;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(tube.left + 28, tube.centerY);
  ctx.lineTo(tube.right - 16, tube.centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = p.anode;
  for (const anode of layout.anodes) {
    ctx.fillRect(anode.x, anode.y, anode.w, anode.h);
  }
  ctx.fillStyle = p.cyan;
  ctx.beginPath();
  ctx.arc(layout.gun.x - 8, layout.gun.y, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.blue;
  rounded(
    ctx,
    layout.yPlateTop.x,
    layout.yPlateTop.y,
    layout.yPlateTop.w,
    layout.yPlateTop.h,
    4
  );
  ctx.fill();
  rounded(
    ctx,
    layout.yPlateBottom.x,
    layout.yPlateBottom.y,
    layout.yPlateBottom.w,
    layout.yPlateBottom.h,
    4
  );
  ctx.fill();

  ctx.fillStyle = p.pink;
  ctx.fillRect(
    layout.xPlate.x,
    layout.xPlate.y,
    layout.xPlate.w,
    layout.xPlate.h
  );

  ctx.strokeStyle = p.cyan;
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  layout.beam.forEach((pt, index) => {
    if (index === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(layout.screenHit.x, layout.screenHit.y, 6, 0, Math.PI * 2);
  ctx.fill();

  for (const label of layout.labels) {
    if (label.text === '示波屏') continue;
    const color =
      label.text === 'Y' || label.text === 'Y′'
        ? p.blue
        : label.text === 'X' || label.text === 'X′'
          ? p.pink
          : p.muted;
    const weight = label.text.length <= 2 ? 700 : 600;
    text(
      ctx,
      label.text,
      label.x,
      label.y,
      color,
      font(label.text.length <= 2 ? 16 : 13),
      'center',
      weight
    );
  }
}

function drawScope(
  ctx: CanvasRenderingContext2D,
  state: OscilloscopeState,
  p: Palette,
  font: (n: number) => number
): void {
  const layout = apparatusLayout(state);
  const { cx, cy, r } = layout.scope;
  const usable = r - 14;
  ctx.fillStyle = p.scopeBg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = p.scopeGrid;
  ctx.lineWidth = 1;
  const grid = 22;
  for (let x = cx - r; x <= cx + r; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, cy - r);
    ctx.lineTo(x, cy + r);
    ctx.stroke();
  }
  for (let y = cy - r; y <= cy + r; y += grid) {
    ctx.beginPath();
    ctx.moveTo(cx - r, y);
    ctx.lineTo(cx + r, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#738b98';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  const axSpan =
    (0.55 + (0.45 * state.params.scanAmplitude) / C.ampMax) * usable;
  const toX = (s: number): number =>
    state.params.scanEnabled ? cx + (s - 0.5) * 2 * axSpan : cx;
  const toY = (ny: number): number => cy - ny * usable;
  const wave = sweepWaveform(state.params, state.time, C.traceSamples);
  ctx.strokeStyle = p.cyan;
  ctx.lineWidth = 3;
  ctx.beginPath();
  wave.forEach((pt, index) => {
    const x = toX(pt.x);
    const y = toY(pt.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(toX(state.electronX), toY(state.electronY), 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#344752';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, 'Y', cx, cy - r + 16, p.blue, font(14), 'center', 700);
  text(ctx, 'X', cx + r - 14, cy, p.pink, font(14), 'center', 700);
  text(ctx, '示波屏', cx, cy + r + 18, p.muted, font(13), 'center');
}

function drawPlot(
  ctx: CanvasRenderingContext2D,
  frame: GraphFrame,
  points: OscilloscopeGraphPoint[],
  tMax: number,
  uMin: number,
  uMax: number,
  color: string,
  yLabel: string,
  p: Palette,
  font: (n: number) => number,
  showTimeAxis: boolean
): void {
  ctx.strokeStyle = p.hatch;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(frame.left, frame.top);
  ctx.lineTo(frame.left, frame.bottom);
  ctx.lineTo(frame.right, frame.bottom);
  ctx.stroke();
  const zero = graphToPx(0, 0, frame, tMax, uMin, uMax);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(frame.left, zero.y);
  ctx.lineTo(frame.right, zero.y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  points.forEach((pt, index) => {
    const xy = graphToPx(pt.t, pt.u, frame, tMax, uMin, uMax);
    if (index === 0) ctx.moveTo(xy.x, xy.y);
    else ctx.lineTo(xy.x, xy.y);
  });
  ctx.stroke();
  text(
    ctx,
    yLabel,
    frame.left - 8,
    frame.top + 8,
    color,
    font(12),
    'right',
    700
  );
  if (showTimeAxis) {
    text(ctx, 't', frame.right + 10, frame.bottom, p.ink, font(12), 'left');
  }
}

function drawGraphCanvas(
  ctx: CanvasRenderingContext2D,
  state: OscilloscopeState,
  width: number,
  height: number,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const frames = graphFrames(width, height);
  const tMax = graphWindow(state.params);
  const signal = graphSeries(state.params, state.time, 'signal');
  const scan = graphSeries(state.params, state.time, 'scan');
  drawPlot(
    ctx,
    frames.signal,
    signal,
    tMax,
    -C.ampMax,
    C.ampMax,
    p.blue,
    OSCILLOSCOPE_SIGNAL_TITLE,
    p,
    font,
    false
  );
  drawPlot(
    ctx,
    frames.scan,
    scan,
    tMax,
    0,
    C.ampMax,
    p.pink,
    OSCILLOSCOPE_SCAN_TITLE,
    p,
    font,
    true
  );
  const cursorT = graphCursor(state.params, state.time) * tMax;
  const top = graphToPx(
    cursorT,
    C.ampMax,
    frames.signal,
    tMax,
    -C.ampMax,
    C.ampMax
  );
  const bottom = graphToPx(cursorT, 0, frames.scan, tMax, 0, C.ampMax);
  ctx.strokeStyle = p.green;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(top.x, frames.signal.top);
  ctx.lineTo(top.x, frames.signal.bottom);
  ctx.moveTo(bottom.x, frames.scan.top);
  ctx.lineTo(bottom.x, frames.scan.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function createOscilloscopeView(
  options: CreateOscilloscopeViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: C.baseWidth,
      fallbackHeight: C.baseHeight
    },
    initialWidth: C.baseWidth,
    initialHeight: C.baseHeight,
    eagerContext: true
  });
  const graph = {
    canvas: (options.graphCanvas ?? null) as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    cssWidth: C.graphFallbackWidth as number,
    cssHeight: C.graphFallbackHeight as number,
    responsiveScale: 1,
    resize(): void {
      if (!graph.canvas) return;
      const sized = sizeGraphCanvasToHost(graph.canvas);
      graph.ctx = sized.ctx;
      graph.cssWidth = sized.cssWidth;
      graph.cssHeight = sized.cssHeight;
      graph.responsiveScale = sized.responsiveScale;
    },
    attach(canvas: HTMLCanvasElement): void {
      graph.canvas = canvas;
      graph.resize();
    },
    release(): void {
      graph.canvas = null;
      graph.ctx = null;
    }
  };
  if (graph.canvas) graph.resize();
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: OscilloscopeState | null = null;
  let drawing = false;
  const overlayObservers: Array<{ disconnect(): void }> = [];
  const observedOverlayNodes = new Set<Element>();

  function paint(state: OscilloscopeState): void {
    if (drawing) return;
    drawing = true;
    try {
      draw(state);
    } finally {
      drawing = false;
    }
  }

  function redraw(): void {
    if (snapshot) paint(snapshot);
  }

  function observeOverlayNode(node: Element): void {
    if (observedOverlayNodes.has(node)) return;
    observedOverlayNodes.add(node);
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => redraw());
      resize.observe(node);
      overlayObservers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutate = new MutationObserver(() => redraw());
      mutate.observe(node, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class', 'style']
      });
      overlayObservers.push(mutate);
    }
  }

  function watchOverlay(): void {
    if (!stage.canvas) return;
    const parent = stage.canvas.parentElement;
    if (parent) observeOverlayNode(parent);
    const layout = stage.canvas.closest(OSCILLOSCOPE_FLOATING_LAYOUT_SELECTOR);
    if (layout) observeOverlayNode(layout);
    for (const panel of findOverlayPanels(stage.canvas)) {
      observeOverlayNode(panel);
    }
  }

  function draw(state: OscilloscopeState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY, scaleX } = stageTransform(
      width,
      height,
      layout
    );
    const p = PALETTE[env.theme];
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 11) / Math.max(fit, 0.05);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit * scaleX, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
    drawTube(ctx, state, p, font);
    drawScope(ctx, state, p, font);
    ctx.restore();

    if (graph.canvas) {
      if (!graph.ctx) graph.resize();
      const gctx = graph.ctx;
      if (gctx) {
        const gFont = (base: number): number =>
          scaledSize(
            base * typeScale,
            Math.max(graph.responsiveScale, 0.3),
            10
          );
        drawGraphCanvas(gctx, state, graph.cssWidth, graph.cssHeight, p, gFont);
      }
    }
    watchOverlay();
  }

  return {
    render(state: OscilloscopeState): void {
      snapshot = state;
      stage.ensureSized();
      paint(state);
    },
    resize(): void {
      stage.resize();
      if (graph.canvas) graph.resize();
      if (snapshot) paint(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) paint(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) paint(snapshot);
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graph.attach(canvas);
      if (snapshot) paint(snapshot);
    },
    dispose(): void {
      snapshot = null;
      overlayObservers.forEach((observer) => observer.disconnect());
      overlayObservers.length = 0;
      observedOverlayNodes.clear();
      stage.release();
      graph.release();
    }
  };
}
