import {
  applyCanvasSize,
  getResponsiveScale,
  scaledSize
} from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  currentAtPosition,
  ixPolyline,
  singleLoopConstants as C,
  velocityAtPosition,
  vxPolyline,
  type SingleLoopState
} from './scene.sim';

export type CreateSingleLoopViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  red: string;
  blue: string;
  field: string;
  fieldFill: string;
  loopFill: string;
  track: string;
};

type PlotBox = { left: number; right: number; top: number; bottom: number };

type StageMetrics = {
  left: number;
  right: number;
  fit: number;
  cy: number;
  fieldTop: number;
  fieldBottom: number;
  loopH: number;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#ffffff',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    grid: '#e6e9e7',
    red: '#ef4050',
    blue: '#2d82d0',
    field: '#6ba8d1',
    fieldFill: '#e7f4fb',
    loopFill: '#f8e4e6',
    track: '#c5ccd4'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    grid: '#2a394d',
    red: '#ff707c',
    blue: '#65b6ef',
    field: '#65a9cf',
    fieldFill: '#1b3348',
    loopFill: '#3a2430',
    track: '#3c4b61'
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

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  head: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * head * 0.4, y2 - uy * head * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - ux * head - uy * head * 0.45,
    y2 - uy * head + ux * head * 0.45
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.45,
    y2 - uy * head - ux * head * 0.45
  );
  ctx.closePath();
  ctx.fill();
}

function mapX(
  x: number,
  left: number,
  right: number,
  x0: number,
  x1: number
): number {
  const span = x1 - x0 || 1;
  return left + ((x - x0) / span) * (right - left);
}

export function apparatusXToPx(x: number, left: number, right: number): number {
  return mapX(x, left, right, C.worldXMin, C.worldXMax);
}

export function graphXToPx(x: number, left: number, right: number): number {
  return mapX(x, left, right, C.graphXMin, C.graphXMax);
}

export function stageMetrics(
  width: number,
  height: number,
  scale: number
): StageMetrics {
  const padX = Math.max(18 * scale, width * 0.04);
  const padTop = Math.max(34 * scale, height * 0.2);
  const padBottom = Math.max(26 * scale, height * 0.16);
  const availW = Math.max(1, width - padX * 2);
  const availH = Math.max(1, height - padTop - padBottom);
  const spanM = C.worldXMax - C.worldXMin;
  const fieldHeightM = C.loopHeight * 1.42;
  const fit = Math.min(availW / spanM, availH / fieldHeightM);
  const contentW = spanM * fit;
  const left = (width - contentW) / 2;
  const fieldH = fieldHeightM * fit;
  const cy = padTop + availH / 2;
  return {
    left,
    right: left + contentW,
    fit,
    cy,
    fieldTop: cy - fieldH / 2,
    fieldBottom: cy + fieldH / 2,
    loopH: C.loopHeight * fit
  };
}

function niceUpper(value: number): number {
  const v = Math.max(value, 1);
  const mag = 10 ** Math.floor(Math.log10(v));
  const residual = v / mag;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return nice * mag;
}

function velocityAxisMax(v0: number): number {
  return Math.max(10, niceUpper(v0 * 1.05));
}

function currentAxisMax(state: SingleLoopState): number {
  const peak =
    (state.params.fieldStrength * C.loopHeight * state.params.initialVelocity) /
    state.params.resistance;
  return Math.max(10, niceUpper(peak * 1.05));
}

function drawDimLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  color: string,
  scale: number
): void {
  const tick = 6 * scale;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.2, 1.5 * scale);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.moveTo(x1, y - tick);
  ctx.lineTo(x1, y + tick);
  ctx.moveTo(x2, y - tick);
  ctx.lineTo(x2, y + tick);
  ctx.stroke();
  const head = 7 * scale;
  arrow(
    ctx,
    x1 + 10 * scale,
    y,
    x1,
    y,
    color,
    Math.max(1.2, 1.4 * scale),
    head
  );
  arrow(
    ctx,
    x2 - 10 * scale,
    y,
    x2,
    y,
    color,
    Math.max(1.2, 1.4 * scale),
    head
  );
}

function drawApparatus(
  ctx: CanvasRenderingContext2D,
  state: SingleLoopState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const m = stageMetrics(width, height, scale);
  const xPx = (x: number): number => apparatusXToPx(x, m.left, m.right);
  const fieldLeft = xPx(0);
  const fieldRight = xPx(C.physicalFieldWidth);
  const enterX = xPx(C.loopWidth);
  const exitEnd = xPx(C.physicalFieldWidth + C.loopWidth);
  const fieldH = m.fieldBottom - m.fieldTop;

  ctx.strokeStyle = p.track;
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.setLineDash([6 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(m.left, m.fieldTop);
  ctx.lineTo(m.right, m.fieldTop);
  ctx.moveTo(m.left, m.fieldBottom);
  ctx.lineTo(m.right, m.fieldBottom);
  ctx.stroke();

  ctx.fillStyle = p.fieldFill;
  ctx.fillRect(fieldLeft, m.fieldTop, fieldRight - fieldLeft, fieldH);
  ctx.strokeStyle = p.field;
  ctx.lineWidth = Math.max(1.4, 1.8 * scale);
  ctx.strokeRect(fieldLeft, m.fieldTop, fieldRight - fieldLeft, fieldH);

  const cols = Math.max(8, Math.round((fieldRight - fieldLeft) / (22 * scale)));
  const rows = Math.max(4, Math.round(fieldH / (22 * scale)));
  ctx.fillStyle = p.field;
  ctx.font = `700 ${font(14)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const x = fieldLeft + ((c + 0.5) * (fieldRight - fieldLeft)) / cols;
      const y = m.fieldTop + ((r + 0.5) * fieldH) / rows;
      ctx.fillText('×', x, y);
    }
  }
  ctx.setLineDash([]);

  const labelY = Math.max(12 * scale, m.fieldTop - 28 * scale);
  ctx.strokeStyle = p.track;
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.setLineDash([5 * scale, 4 * scale]);
  for (const x of [fieldLeft, enterX, fieldRight]) {
    ctx.beginPath();
    ctx.moveTo(x, labelY - 8 * scale);
    ctx.lineTo(x, m.fieldBottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  text(
    ctx,
    '进入区',
    (fieldLeft + enterX) / 2,
    labelY,
    p.muted,
    font(12),
    'center',
    600
  );
  text(
    ctx,
    '匀速区 (Φ不变)',
    (enterX + fieldRight) / 2,
    labelY,
    p.muted,
    font(12),
    'center',
    600
  );
  text(
    ctx,
    '穿出区',
    (fieldRight + exitEnd) / 2,
    labelY,
    p.muted,
    font(12),
    'center',
    600
  );
  text(
    ctx,
    '有界匀强磁场 B (垂直纸面向里)',
    (fieldLeft + fieldRight) / 2,
    Math.max(labelY + 14 * scale, m.fieldTop - 12 * scale),
    p.blue,
    font(14),
    'center',
    700
  );

  const dimY = m.fieldBottom + 18 * scale;
  drawDimLine(ctx, fieldLeft, fieldRight, dimY, p.ink, scale);
  text(
    ctx,
    `磁场宽度 D = ${C.physicalFieldWidth.toFixed(1)} m`,
    (fieldLeft + fieldRight) / 2,
    dimY + 14 * scale,
    p.ink,
    font(12),
    'center',
    700
  );

  const loopW = C.loopWidth * m.fit;
  const loopRight = xPx(state.position);
  const loopLeft = loopRight - loopW;
  const loopTop = m.cy - m.loopH / 2;
  ctx.fillStyle = p.loopFill;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = Math.max(2.4, 3.2 * scale);
  ctx.fillRect(loopLeft, loopTop, loopW, m.loopH);
  ctx.strokeRect(loopLeft, loopTop, loopW, m.loopH);

  const lY = loopTop - 12 * scale;
  drawDimLine(ctx, loopLeft, loopRight, lY, p.red, scale);
  text(
    ctx,
    `L = ${C.loopWidth.toFixed(1)} m`,
    (loopLeft + loopRight) / 2,
    lY - 11 * scale,
    p.red,
    font(12),
    'center',
    700
  );

  if (state.velocity > C.stallSpeed) {
    const vLen = Math.max(28 * scale, loopW * 0.55);
    arrow(
      ctx,
      loopRight,
      m.cy,
      loopRight + vLen,
      m.cy,
      p.red,
      Math.max(2.4, 3.2 * scale),
      9 * scale
    );
    text(
      ctx,
      'v',
      loopRight + vLen + 8 * scale,
      m.cy,
      p.red,
      font(14),
      'left',
      700
    );
  }
}

function plotBox(
  left: number,
  right: number,
  top: number,
  bottom: number
): PlotBox {
  return { left, right, top, bottom };
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  box: PlotBox,
  yMin: number,
  yMax: number,
  color: string,
  width: number
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach((point, index) => {
    const px = graphXToPx(point.x, box.left, box.right);
    const py = mapX(point.y, box.bottom, box.top, yMin, yMax);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
}

function drawPlotFrame(
  ctx: CanvasRenderingContext2D,
  box: PlotBox,
  title: string,
  yLabel: string,
  yTicks: number[],
  p: Palette,
  font: (n: number) => number
): void {
  text(ctx, title, box.left, box.top - 16, p.ink, font(13), 'left', 700);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (const x of [1, 4, 5]) {
    const px = graphXToPx(x, box.left, box.right);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, box.top);
    ctx.lineTo(px, box.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, String(x), px, box.bottom + 12, p.muted, font(10), 'center', 600);
  }
  text(ctx, '0', box.left, box.bottom + 12, p.muted, font(10), 'center', 600);
  yTicks.forEach((tick) => {
    const py = mapX(
      tick,
      box.bottom,
      box.top,
      yTicks[0] ?? 0,
      yTicks[yTicks.length - 1] ?? 1
    );
    ctx.beginPath();
    ctx.moveTo(box.left, py);
    ctx.lineTo(box.right, py);
    ctx.stroke();
    text(ctx, String(tick), box.left - 6, py, p.muted, font(10), 'right', 600);
  });
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(box.left, box.top - 4);
  ctx.lineTo(box.left, box.bottom);
  ctx.lineTo(box.right + 8, box.bottom);
  ctx.stroke();
  text(ctx, yLabel, box.left, box.top - 4, p.ink, font(11), 'left', 700);
  text(ctx, 'x (m)', box.right + 6, box.bottom, p.ink, font(11), 'left', 700);
}

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: SingleLoopState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(0, 0, width, height);
  const padX = Math.max(36 * scale, width * 0.06);
  const padTop = Math.max(28 * scale, height * 0.18);
  const padBottom = Math.max(24 * scale, height * 0.16);
  const gap = Math.max(16 * scale, width * 0.04);
  const plotW = (width - padX * 2 - gap) / 2;
  const vBox = plotBox(padX, padX + plotW, padTop, height - padBottom);
  const iBox = plotBox(
    padX + plotW + gap,
    width - padX,
    padTop,
    height - padBottom
  );
  const vMax = velocityAxisMax(state.params.initialVelocity);
  const iMax = currentAxisMax(state);
  drawPlotFrame(
    ctx,
    vBox,
    '速度 - 位移图像 (v-x)',
    'v (m/s)',
    [0, vMax / 2, vMax],
    p,
    font
  );
  drawPlotFrame(
    ctx,
    iBox,
    '感应电流 - 位移图像 (i-x)',
    'i (A)',
    [-iMax, 0, iMax],
    p,
    font
  );
  drawPolyline(
    ctx,
    vxPolyline(state.params),
    vBox,
    0,
    vMax,
    p.red,
    Math.max(2.2, 2.8 * scale)
  );
  drawPolyline(
    ctx,
    ixPolyline(state.params),
    iBox,
    -iMax,
    iMax,
    p.blue,
    Math.max(2.2, 2.8 * scale)
  );
  const xProbe = clampGraphX(state.position);
  const v = velocityAtPosition(state.params, xProbe);
  const i = currentAtPosition(state.params, xProbe);
  const vPx = graphXToPx(xProbe, vBox.left, vBox.right);
  const iPx = graphXToPx(xProbe, iBox.left, iBox.right);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(
    vPx,
    mapX(v, vBox.bottom, vBox.top, 0, vMax),
    5 * scale,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(
    iPx,
    mapX(i, iBox.bottom, iBox.top, -iMax, iMax),
    5 * scale,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function clampGraphX(position: number): number {
  return Math.max(C.graphXMin, Math.min(C.graphXMax, position));
}

export function createSingleLoopView(
  options: CreateSingleLoopViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: C.stageFallbackWidth,
      fallbackHeight: C.stageFallbackHeight
    },
    initialWidth: C.stageFallbackWidth,
    initialHeight: C.stageFallbackHeight,
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
  let snapshot: SingleLoopState | null = null;

  function paint(state: SingleLoopState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 10);
    ctx.clearRect(0, 0, width, height);
    drawApparatus(ctx, state, width, height, PALETTE[env.theme], rs, font);
    if (graph.canvas) {
      if (!graph.ctx) graph.resize();
      const gctx = graph.ctx;
      if (gctx) {
        const gScale = graph.responsiveScale;
        const gFont = (base: number): number =>
          scaledSize(base * typeScale, Math.max(gScale, 0.3), 10);
        drawGraphs(
          gctx,
          state,
          graph.cssWidth,
          graph.cssHeight,
          PALETTE[env.theme],
          gScale,
          gFont
        );
      }
    }
  }

  return {
    render(state: SingleLoopState): void {
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
      graph.release();
      stage.release();
    }
  };
}
