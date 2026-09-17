import { applyCanvasSize, getResponsiveScale } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  endTime,
  fillStartX,
  forceAt,
  sampleAt,
  variableWorkConstants as C,
  type VariableWorkState
} from './scene.sim';

export type CreateVariableWorkViewOptions = {
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
  orange: string;
  blue: string;
  teal: string;
  cart: string;
};

type PlotBox = { left: number; right: number; top: number; bottom: number };

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f4f7fb',
    panel: '#ffffff',
    ink: '#2c3544',
    muted: '#7b8796',
    border: '#d5dde6',
    grid: '#e8edf3',
    red: '#e85d4c',
    orange: '#e59a12',
    blue: '#3b82c4',
    teal: '#2a9f91',
    cart: '#4ea3e0'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#e8eef6',
    muted: '#9aa8ba',
    border: '#3c4b61',
    grid: '#2d3e57',
    red: '#fb7185',
    orange: '#fbbf24',
    blue: '#60a5fa',
    teal: '#34d399',
    cart: '#3b82c4'
  }
};

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

function plotBox(
  left: number,
  top: number,
  width: number,
  height: number,
  scale: number
): PlotBox {
  return {
    left: left + Math.max(36 * scale, width * 0.12),
    right: left + width - Math.max(16 * scale, width * 0.06),
    top: top + Math.max(28 * scale, height * 0.22),
    bottom: top + height - Math.max(22 * scale, height * 0.18)
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
    const style = getComputedStyle(host);
    const padX =
      parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) || 0;
    const padY =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) || 0;
    const rect = host.getBoundingClientRect();
    cssWidth = Math.max(1, Math.floor(rect.width - padX));
    cssHeight = Math.max(1, Math.floor(rect.height - padY));
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

export function formatAxisTick(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export const FX_X_TICKS = [2.5, 5, 7.5, 10] as const;

function map(
  value: number,
  a: number,
  b: number,
  left: number,
  right: number
): number {
  const span = b - a || 1;
  return left + ((value - a) / span) * (right - left);
}

/** Internal F mapping only; stage arrows are not a painted 10 N scale. */
export const VECTOR_F_REF = 10;
/** Internal v mapping only; stage arrows are not a painted 4 m/s scale. */
export const VECTOR_V_REF = 4;

export type StageVector = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  length: number;
  clampedMin: boolean;
  clampedMax: boolean;
};

export function stageField(width: number, height: number, scale: number) {
  const pad = Math.max(16 * scale, width * 0.04);
  const overlayReserve = width / Math.max(height, 1) > 1.55 ? width * 0.3 : 0;
  const trackY = height * 0.58;
  const trackLeft = pad;
  const trackRight = width - pad - overlayReserve;
  const pxRef = Math.max(64 * scale, 56);
  return { pad, overlayReserve, trackY, trackLeft, trackRight, pxRef };
}

function clampArrowLength(
  raw: number,
  min: number,
  max: number,
  hideBelow: number
): number | null {
  if (raw < hideBelow) return null;
  return Math.max(min, Math.min(max, raw));
}

/** Stage F/v arrows are trend cues: min length for visibility, max = remaining track. Exact F,v live in the readout. */
export function stageVectorLayout(
  state: VariableWorkState,
  width: number,
  height: number,
  scale: number
): { f: StageVector | null; v: StageVector | null; pxRef: number } {
  const field = stageField(width, height, scale);
  const cartH = Math.max(32 * scale, 30);
  const cx = map(state.x, 0, C.trackMax, field.trackLeft, field.trackRight);
  const cy = field.trackY - cartH * 0.55;
  const room = Math.max(12 * scale, field.trackRight - cx - 14 * scale);
  const minLen = Math.max(8 * scale, 7);
  const fRaw = (Math.abs(state.force) / VECTOR_F_REF) * field.pxRef;
  const vRaw = (Math.abs(state.velocity) / VECTOR_V_REF) * field.pxRef;
  const fLen =
    Math.abs(state.force) < 1e-3
      ? null
      : clampArrowLength(fRaw, minLen, room, 0);
  const vLen =
    Math.abs(state.velocity) < 1e-3
      ? null
      : clampArrowLength(vRaw, minLen, room, 0);
  const arrowY = cy - cartH * 0.7;
  const pack = (len: number | null, y: number): StageVector | null =>
    len === null
      ? null
      : {
          x0: cx,
          y0: y,
          x1: cx + len,
          y1: y,
          length: len,
          clampedMin: Math.abs(len - minLen) < 1e-6,
          clampedMax: Math.abs(len - room) < 1e-6
        };
  return {
    pxRef: field.pxRef,
    f: pack(fLen, cy),
    v: pack(vLen, arrowY)
  };
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  vec: StageVector,
  color: string,
  scale: number
): void {
  const head = Math.min(10 * scale, Math.max(5 * scale, vec.length * 0.22));
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(vec.x0, vec.y0);
  ctx.lineTo(vec.x1, vec.y0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(vec.x1, vec.y0);
  ctx.lineTo(vec.x1 - head, vec.y0 - head * 0.45);
  ctx.lineTo(vec.x1 - head, vec.y0 + head * 0.45);
  ctx.closePath();
  ctx.fill();
}

function drawStage(
  ctx: CanvasRenderingContext2D,
  state: VariableWorkState,
  width: number,
  height: number,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const { trackY, trackLeft, trackRight } = stageField(width, height, scale);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = Math.max(2, 2.2 * scale);
  ctx.beginPath();
  ctx.moveTo(trackLeft, trackY);
  ctx.lineTo(trackRight, trackY);
  ctx.stroke();
  for (const xm of [0, 2, 5, 8, 10]) {
    const x = map(xm, 0, C.trackMax, trackLeft, trackRight);
    ctx.beginPath();
    ctx.moveTo(x, trackY);
    ctx.lineTo(x, trackY + 8 * scale);
    ctx.stroke();
    text(
      ctx,
      `${xm.toFixed(0)} m`,
      x,
      trackY + 18 * scale,
      p.muted,
      Math.max(9, 10 * scale),
      'center',
      600
    );
  }
  const cartW = Math.max(52 * scale, 48);
  const cartH = Math.max(32 * scale, 30);
  const cx = map(state.x, 0, C.trackMax, trackLeft, trackRight);
  const cy = trackY - cartH * 0.55;
  ctx.fillStyle = p.cart;
  ctx.beginPath();
  const rx = cx - cartW / 2;
  const ry = cy - cartH / 2;
  const rr = 6 * scale;
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(rx, ry, cartW, cartH, rr);
  } else {
    ctx.rect(rx, ry, cartW, cartH);
  }
  ctx.fill();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(cx - cartW * 0.28, trackY - 4 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.arc(cx + cartW * 0.28, trackY - 4 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, `m`, cx, cy, '#fff', Math.max(11, 12 * scale), 'center', 700);
  const vectors = stageVectorLayout(state, width, height, scale);
  if (vectors.f) {
    drawArrow(ctx, vectors.f, p.red, scale);
    text(
      ctx,
      'F',
      vectors.f.x1 + 6 * scale,
      vectors.f.y0 - 8 * scale,
      p.red,
      Math.max(10, 11 * scale),
      'left',
      700
    );
  }
  if (vectors.v) {
    drawArrow(ctx, vectors.v, p.blue, scale);
    text(
      ctx,
      'v',
      vectors.v.x1 + 6 * scale,
      vectors.v.y0,
      p.blue,
      Math.max(10, 11 * scale),
      'left',
      700
    );
  }
}

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: VariableWorkState,
  width: number,
  height: number,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(0, 0, width, height);
  const gap = Math.max(10 * scale, 8);
  const colW = (width - gap) / 2;
  drawFxPlot(ctx, state, 0, 0, colW, height, p, scale);
  drawPtPlot(ctx, state, colW + gap, 0, colW, height, p, scale);
}

function drawFxPlot(
  ctx: CanvasRenderingContext2D,
  state: VariableWorkState,
  left: number,
  top: number,
  width: number,
  height: number,
  p: Palette,
  scale: number
): void {
  const box = plotBox(left, top, width, height, scale);
  const font = (n: number) => Math.max(8, n * scale);
  text(
    ctx,
    'F-x',
    left + 8 * scale,
    top + 12 * scale,
    p.ink,
    font(11),
    'left',
    700
  );
  text(
    ctx,
    'F / N',
    box.left,
    Math.max(top + 22 * scale, box.top - 8 * scale),
    p.muted,
    font(9),
    'left',
    600
  );
  const xMax = C.trackMax;
  const fillStart = fillStartX(state.params);
  let fMax = 0.2;
  for (let i = 0; i <= 40; i += 1) {
    const xv = fillStart + ((xMax - fillStart) * i) / 40;
    fMax = Math.max(fMax, forceAt(state.params, xv));
  }
  fMax *= 1.15;
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = map(i / 4, 0, 1, box.bottom, box.top);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    if (i > 0) {
      text(
        ctx,
        formatAxisTick((fMax * i) / 4),
        box.left - 4 * scale,
        y,
        p.muted,
        font(8),
        'right'
      );
    }
  }
  for (const xm of FX_X_TICKS) {
    const x = map(xm, 0, xMax, box.left, box.right);
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.bottom);
    ctx.stroke();
    text(
      ctx,
      formatAxisTick(xm),
      x,
      box.bottom + 10 * scale,
      p.muted,
      font(9),
      'center'
    );
  }
  text(ctx, '0', box.left - 4 * scale, box.bottom, p.muted, font(8), 'right');
  ctx.strokeStyle = p.ink;
  ctx.beginPath();
  ctx.moveTo(box.left, box.top - 2);
  ctx.lineTo(box.left, box.bottom);
  ctx.lineTo(box.right + 4, box.bottom);
  ctx.stroke();
  text(
    ctx,
    'x / m',
    box.right,
    Math.min(top + height - 6 * scale, box.bottom + 14 * scale),
    p.ink,
    font(9),
    'right',
    700
  );
  const fillTo = Math.max(fillStart, state.x);
  if (state.rectangles.length) {
    ctx.fillStyle = 'rgba(42, 159, 145, 0.22)';
    for (const rec of state.rectangles) {
      const x0 = map(rec.x, 0, xMax, box.left, box.right);
      const x1 = map(rec.x + rec.width, 0, xMax, box.left, box.right);
      const y = map(rec.height, 0, fMax, box.bottom, box.top);
      ctx.fillRect(x0, y, Math.max(1, x1 - x0), box.bottom - y);
    }
    const bias =
      state.riemannBias === 'under'
        ? '低估'
        : state.riemannBias === 'over'
          ? '高估'
          : '';
    text(
      ctx,
      bias ? `Wₙ ${bias}` : 'Wₙ',
      map(0.5 * (fillStart + fillTo), 0, xMax, box.left, box.right),
      map(state.force * 0.45, 0, fMax, box.bottom, box.top),
      p.teal,
      font(9),
      'center',
      700
    );
  } else if (fillTo > fillStart + 1e-6) {
    ctx.fillStyle = 'rgba(232, 93, 76, 0.16)';
    ctx.beginPath();
    ctx.moveTo(map(fillStart, 0, xMax, box.left, box.right), box.bottom);
    for (let i = 0; i <= 32; i += 1) {
      const xv = fillStart + ((fillTo - fillStart) * i) / 32;
      ctx.lineTo(
        map(xv, 0, xMax, box.left, box.right),
        map(forceAt(state.params, xv), 0, fMax, box.bottom, box.top)
      );
    }
    ctx.lineTo(map(fillTo, 0, xMax, box.left, box.right), box.bottom);
    ctx.closePath();
    ctx.fill();
    text(
      ctx,
      'W',
      map(0.5 * (fillStart + fillTo), 0, xMax, box.left, box.right),
      map(state.force * 0.45, 0, fMax, box.bottom, box.top),
      p.red,
      font(9),
      'center',
      700
    );
  }
  ctx.strokeStyle = p.red;
  ctx.lineWidth = Math.max(1.6, 2 * scale);
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= 48; i += 1) {
    const xv = (xMax * i) / 48;
    if (xv + 1e-9 < fillStart) continue;
    const px = map(xv, 0, xMax, box.left, box.right);
    const py = map(forceAt(state.params, xv), 0, fMax, box.bottom, box.top);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else ctx.lineTo(px, py);
  }
  ctx.stroke();
  const px = map(state.x, 0, xMax, box.left, box.right);
  const py = map(state.force, 0, fMax, box.bottom, box.top);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(px, py, Math.max(3 * scale, 3), 0, Math.PI * 2);
  ctx.fill();
}

function drawPtPlot(
  ctx: CanvasRenderingContext2D,
  state: VariableWorkState,
  left: number,
  top: number,
  width: number,
  height: number,
  p: Palette,
  scale: number
): void {
  const box = plotBox(left, top, width, height, scale);
  const font = (n: number) => Math.max(8, n * scale);
  text(
    ctx,
    'P-t',
    left + 8 * scale,
    top + 12 * scale,
    p.ink,
    font(11),
    'left',
    700
  );
  text(
    ctx,
    'P / W',
    box.left,
    Math.max(top + 22 * scale, box.top - 8 * scale),
    p.muted,
    font(9),
    'left',
    600
  );
  const tMax = Math.max(endTime(state.params), 0.5);
  let pMax = 0.2;
  const samples = 32;
  for (let i = 0; i <= samples; i += 1) {
    pMax = Math.max(pMax, sampleAt(state.params, (tMax * i) / samples).power);
  }
  pMax *= 1.15;
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = map(i / 4, 0, 1, box.bottom, box.top);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    if (i > 0) {
      text(
        ctx,
        ((pMax * i) / 4).toFixed(0),
        box.left - 4 * scale,
        y,
        p.muted,
        font(8),
        'right'
      );
    }
    const x = map(i / 4, 0, 1, box.left, box.right);
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.bottom);
    ctx.stroke();
    if (i > 0) {
      text(
        ctx,
        ((tMax * i) / 4).toFixed(1),
        x,
        box.bottom + 10 * scale,
        p.muted,
        font(8),
        'center'
      );
    }
  }
  text(ctx, '0', box.left - 4 * scale, box.bottom, p.muted, font(8), 'right');
  ctx.strokeStyle = p.ink;
  ctx.beginPath();
  ctx.moveTo(box.left, box.top - 2);
  ctx.lineTo(box.left, box.bottom);
  ctx.lineTo(box.right + 4, box.bottom);
  ctx.stroke();
  text(
    ctx,
    't / s',
    box.right,
    Math.min(top + height - 6 * scale, box.bottom + 14 * scale),
    p.ink,
    font(9),
    'right',
    700
  );
  const now = Math.max(state.time, 1e-4);
  ctx.fillStyle = 'rgba(229, 154, 18, 0.18)';
  ctx.beginPath();
  ctx.moveTo(map(0, 0, tMax, box.left, box.right), box.bottom);
  for (let i = 0; i <= 36; i += 1) {
    const t = (now * i) / 36;
    const pt = sampleAt(state.params, t);
    ctx.lineTo(
      map(t, 0, tMax, box.left, box.right),
      map(pt.power, 0, pMax, box.bottom, box.top)
    );
  }
  ctx.lineTo(map(now, 0, tMax, box.left, box.right), box.bottom);
  ctx.closePath();
  ctx.fill();
  if (state.time > 1e-3) {
    text(
      ctx,
      'W',
      map(0.5 * now, 0, tMax, box.left, box.right),
      map(state.power * 0.45, 0, pMax, box.bottom, box.top),
      p.orange,
      font(9),
      'center',
      700
    );
  }
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = Math.max(1.6, 2 * scale);
  ctx.beginPath();
  for (let i = 0; i <= 48; i += 1) {
    const t = (tMax * i) / 48;
    const pt = sampleAt(state.params, t);
    const px = map(t, 0, tMax, box.left, box.right);
    const py = map(pt.power, 0, pMax, box.bottom, box.top);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  const px = map(state.time, 0, tMax, box.left, box.right);
  const py = map(state.power, 0, pMax, box.bottom, box.top);
  ctx.fillStyle = p.orange;
  ctx.beginPath();
  ctx.arc(px, py, Math.max(3 * scale, 3), 0, Math.PI * 2);
  ctx.fill();
}

export function createVariableWorkView(
  options: CreateVariableWorkViewOptions = {}
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

  function paint(state: VariableWorkState): void {
    const p = PALETTE[env.theme];
    const scale = stage.responsiveScale || 1;
    const ctx = stage.ctx;
    if (ctx) {
      drawStage(ctx, state, stage.cssWidth, stage.cssHeight, p, scale);
    }
    if (stage.canvas) {
      stage.canvas.dataset.simTime = state.time.toFixed(4);
      stage.canvas.dataset.playing = state.playing ? '1' : '0';
      stage.canvas.dataset.finished = state.finished ? '1' : '0';
    }
    if (graph.canvas && graph.ctx) {
      drawGraphs(
        graph.ctx,
        state,
        graph.cssWidth,
        graph.cssHeight,
        p,
        graph.responsiveScale
      );
    }
  }

  return {
    canvas: stage.canvas,
    resize(): void {
      stage.resize();
      graph.resize();
    },
    render(state: VariableWorkState): void {
      paint(state);
    },
    setTheme(theme: TeachingTheme): void {
      env.theme = theme;
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.mode = mode;
      if (hints) env.demoHints = hints;
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graph.attach(canvas);
    },
    dispose(): void {
      graph.release();
      stage.release();
    }
  };
}
