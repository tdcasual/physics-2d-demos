import {
  applyCanvasSize,
  getResponsiveScale,
  scaledSize
} from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  forceAt,
  impulseMomentumConstants as C,
  type ImpulseMomentumState
} from './scene.sim';

export type CreateImpulseMomentumViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onTimeScrub?: (time: number) => void;
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
  teal: string;
  gold: string;
  wire: string;
  cart: string;
};

type PlotBox = { left: number; right: number; top: number; bottom: number };

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f4f7fb',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    grid: '#e6e9e7',
    red: '#ef4050',
    blue: '#2d82d0',
    teal: '#168a79',
    gold: '#d99416',
    wire: '#586270',
    cart: '#1fa39a'
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
    teal: '#4ed9c0',
    gold: '#fbbf24',
    wire: '#c2cedc',
    cart: '#2ec4b6'
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

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
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

function mapPx(
  px: number,
  left: number,
  right: number,
  x0: number,
  x1: number
): number {
  if (right <= left) return x0;
  return x0 + ((px - left) / (right - left)) * (x1 - x0);
}

function forceAxisMax(peakForce: number): number {
  const need = Math.max(peakForce * 1.2, 8);
  const mag = 10 ** Math.floor(Math.log10(need));
  const residual = need / mag;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return nice * mag;
}

function plotBox(width: number, height: number): PlotBox {
  return {
    left: Math.max(36, width * 0.1),
    right: width - Math.max(28, width * 0.06),
    top: Math.max(22, height * 0.16),
    bottom: height - Math.max(28, height * 0.18)
  };
}

function drawApparatus(
  ctx: CanvasRenderingContext2D,
  state: ImpulseMomentumState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const padX = Math.max(24 * scale, width * 0.06);
  const trackY = height * 0.62;
  const trackLeft = padX;
  const trackRight = width - padX;
  const cartW = Math.max(48 * scale, width * 0.11);
  const cartH = Math.max(28 * scale, height * 0.16);
  const wheelR = Math.max(6 * scale, 6);
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = Math.max(3, 5 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(trackLeft, trackY);
  ctx.lineTo(trackRight, trackY);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.beginPath();
  ctx.moveTo(trackLeft, trackY - 12 * scale);
  ctx.lineTo(trackLeft, trackY + 4 * scale);
  ctx.moveTo(trackRight, trackY - 12 * scale);
  ctx.lineTo(trackRight, trackY + 4 * scale);
  ctx.stroke();
  const span = trackRight - trackLeft - cartW;
  const origin = trackLeft + cartW / 2 + span * 0.18;
  const metersPerPx = 48 / Math.max(span, 1);
  const cartCenter = Math.max(
    trackLeft + cartW / 2,
    Math.min(trackRight - cartW / 2, origin + state.position / metersPerPx)
  );
  const cartTop = trackY - cartH - wheelR * 0.15;
  rounded(ctx, cartCenter - cartW / 2, cartTop, cartW, cartH, 8 * scale);
  ctx.fillStyle = p.cart;
  ctx.fill();
  ctx.fillStyle = p.wire;
  ctx.beginPath();
  ctx.arc(cartCenter - cartW * 0.28, trackY, wheelR, 0, Math.PI * 2);
  ctx.arc(cartCenter + cartW * 0.28, trackY, wheelR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(cartCenter - cartW * 0.28, trackY, wheelR * 0.35, 0, Math.PI * 2);
  ctx.arc(cartCenter + cartW * 0.28, trackY, wheelR * 0.35, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `m=${state.params.mass.toFixed(1)} kg`,
    cartCenter,
    cartTop + cartH / 2,
    '#ffffff',
    font(13),
    'center',
    700
  );
  const forceLen = Math.max(
    22 * scale,
    Math.min(width * 0.18, 8 * scale * Math.max(state.force, 1))
  );
  const forceDir = state.force >= 0 ? 1 : -1;
  if (Math.abs(state.force) > 1e-6) {
    arrow(
      ctx,
      cartCenter + forceDir * (cartW / 2),
      cartTop + cartH * 0.38,
      cartCenter + forceDir * (cartW / 2 + forceLen),
      cartTop + cartH * 0.38,
      p.red,
      Math.max(2.4, 3.2 * scale),
      8 * scale
    );
    text(
      ctx,
      'Fₓ',
      cartCenter + forceDir * (cartW / 2 + forceLen + 10 * scale),
      cartTop + cartH * 0.38,
      p.red,
      font(12),
      'left',
      700
    );
  }
  if (Math.abs(state.velocity) > 1e-6) {
    const vDir = state.velocity > 0 ? 1 : -1;
    const vLen = Math.max(
      16 * scale,
      Math.min(width * 0.16, 10 * scale * Math.abs(state.velocity))
    );
    arrow(
      ctx,
      cartCenter,
      cartTop - 14 * scale,
      cartCenter + vDir * vLen,
      cartTop - 14 * scale,
      p.teal,
      Math.max(2, 2.6 * scale),
      7 * scale
    );
    text(
      ctx,
      'v',
      cartCenter + vDir * (vLen + 10 * scale),
      cartTop - 14 * scale,
      p.teal,
      font(12),
      vDir > 0 ? 'left' : 'right',
      700
    );
  }
}

function drawForceCurve(
  ctx: CanvasRenderingContext2D,
  state: ImpulseMomentumState,
  box: PlotBox,
  fMax: number,
  upTo: number
): void {
  const n = 120;
  ctx.beginPath();
  for (let i = 0; i <= n; i += 1) {
    const t = (upTo * i) / n;
    const x = mapX(t, box.left, box.right, C.timeMin, C.timeMax);
    const y = mapX(
      forceAt(state.params.forceModel, t, state.params.peakForce),
      box.bottom,
      box.top,
      0,
      fMax
    );
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: ImpulseMomentumState,
  width: number,
  height: number,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(0, 0, width, height);
  const box = plotBox(width, height);
  const fMax = forceAxisMax(state.params.peakForce);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let t = 0; t <= C.timeMax + 1e-9; t += 1) {
    const x = mapX(t, box.left, box.right, C.timeMin, C.timeMax);
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.bottom);
    ctx.stroke();
    text(ctx, String(t), x, box.bottom + 12, p.muted, font(10), 'center', 600);
  }
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i += 1) {
    const f = (fMax * i) / yTicks;
    const y = mapX(f, box.bottom, box.top, 0, fMax);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    text(ctx, String(f), box.left - 6, y, p.muted, font(10), 'right', 600);
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(box.left, box.top - 4);
  ctx.lineTo(box.left, box.bottom);
  ctx.lineTo(box.right + 8, box.bottom);
  ctx.stroke();
  text(ctx, 'Fₓ / N', box.left, box.top - 12, p.ink, font(12), 'left', 700);
  text(ctx, 't / s', box.right + 6, box.bottom, p.ink, font(11), 'left', 700);
  if (state.params.showArea && state.time > 0) {
    ctx.fillStyle = `${p.red}33`;
    ctx.beginPath();
    ctx.moveTo(mapX(0, box.left, box.right, C.timeMin, C.timeMax), box.bottom);
    const n = 80;
    for (let i = 0; i <= n; i += 1) {
      const t = (state.time * i) / n;
      ctx.lineTo(
        mapX(t, box.left, box.right, C.timeMin, C.timeMax),
        mapX(
          forceAt(state.params.forceModel, t, state.params.peakForce),
          box.bottom,
          box.top,
          0,
          fMax
        )
      );
    }
    ctx.lineTo(
      mapX(state.time, box.left, box.right, C.timeMin, C.timeMax),
      box.bottom
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2.6;
  drawForceCurve(ctx, state, box, fMax, C.timeMax);
  ctx.stroke();
  const probeX = mapX(state.time, box.left, box.right, C.timeMin, C.timeMax);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(probeX, box.top);
  ctx.lineTo(probeX, box.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(
    probeX,
    mapX(state.force, box.bottom, box.top, 0, fMax),
    5,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

export function createImpulseMomentumView(
  options: CreateImpulseMomentumViewOptions = {}
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
  let snapshot: ImpulseMomentumState | null = null;
  let dragging = false;

  function paint(state: ImpulseMomentumState): void {
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
        const gFont = (base: number): number =>
          scaledSize(
            base * typeScale,
            Math.max(graph.responsiveScale, 0.3),
            10
          );
        drawGraphs(
          gctx,
          state,
          graph.cssWidth,
          graph.cssHeight,
          PALETTE[env.theme],
          gFont
        );
      }
    }
  }

  function timeFromEvent(event: PointerEvent): number | null {
    const canvas = graph.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const box = plotBox(graph.cssWidth, graph.cssHeight);
    if (!dragging && (x < box.left - 8 || x > box.right + 8)) return null;
    return mapPx(x, box.left, box.right, C.timeMin, C.timeMax);
  }

  function handlePointerDown(event: PointerEvent): void {
    const t = timeFromEvent(event);
    if (t === null) return;
    dragging = true;
    graph.canvas?.setPointerCapture?.(event.pointerId);
    options.onTimeScrub?.(t);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!dragging) return;
    const t = timeFromEvent(event);
    if (t === null) return;
    options.onTimeScrub?.(t);
  }

  function handlePointerUp(event: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    try {
      graph.canvas?.releasePointerCapture?.(event.pointerId);
    } catch {
      /* already released */
    }
  }

  function bindGraph(canvas: HTMLCanvasElement): void {
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'ew-resize';
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
  }

  function unbindGraph(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerUp);
  }

  if (graph.canvas) bindGraph(graph.canvas);

  return {
    render(state: ImpulseMomentumState): void {
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
      if (graph.canvas) unbindGraph(graph.canvas);
      graph.attach(canvas);
      bindGraph(canvas);
      if (snapshot) paint(snapshot);
    },
    dispose(): void {
      if (graph.canvas) unbindGraph(graph.canvas);
      snapshot = null;
      graph.release();
      stage.release();
    }
  };
}
