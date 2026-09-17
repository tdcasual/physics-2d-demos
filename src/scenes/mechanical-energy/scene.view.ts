import {
  applyCanvasSize,
  getResponsiveScale,
  scaledSize
} from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  endTime,
  heightAt,
  mechanicalEnergyConstants as C,
  type MechanicalEnergyState
} from './scene.sim';

export type CreateMechanicalEnergyViewOptions = {
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
  stand: string;
  timer: string;
  timerDark: string;
  gold: string;
  red: string;
  blue: string;
  tape: string;
  base: string;
};

type PlotBox = { left: number; right: number; top: number; bottom: number };

export type StripLayout = {
  left: number;
  right: number;
  tapeTop: number;
  tapeH: number;
  rulerTop: number;
  rulerH: number;
  span: number;
  cmMax: number;
};

export type ApparatusLayout = {
  tapeX: number;
  tapeTop: number;
  tapeBottom: number;
  standX: number;
  standTop: number;
  standBottom: number;
  timerX: number;
  timerY: number;
  timerW: number;
  timerH: number;
  wheelX: number;
  wheelY: number;
  wheelR: number;
  weightX: number;
  weightY: number;
  weightW: number;
  weightH: number;
  heightRef: number;
  strip: StripLayout;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f4f7fb',
    panel: '#ffffff',
    ink: '#2c3544',
    muted: '#7d8997',
    border: '#d5dde6',
    grid: '#e7ebf0',
    stand: '#4b5563',
    timer: '#3b7aa8',
    timerDark: '#2f628a',
    gold: '#e6b035',
    red: '#e24b57',
    blue: '#2f7ab8',
    tape: '#fffdf6',
    base: '#6b7380'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#e8eef6',
    muted: '#9aa7b8',
    border: '#3c4b61',
    grid: '#243246',
    stand: '#9aa6b6',
    timer: '#4f92c4',
    timerDark: '#3b74a0',
    gold: '#f3c14a',
    red: '#ff6f7c',
    blue: '#6eb0e6',
    tape: '#e9eef5',
    base: '#7d8a9c'
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
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

export function plotBox(width: number, height: number, scale: number): PlotBox {
  return {
    left: Math.max(44 * scale, width * 0.12),
    right: width - Math.max(28 * scale, width * 0.08),
    top: Math.max(36 * scale, height * 0.32),
    bottom: height - Math.max(24 * scale, height * 0.2)
  };
}

export function plotChrome(
  width: number,
  height: number,
  scale: number
): {
  box: PlotBox;
  title: { x: number; y: number };
  yUnit: { x: number; y: number };
} {
  const box = plotBox(width, height, scale);
  const titleY = Math.max(11 * scale, 10);
  return {
    box,
    title: { x: Math.max(10 * scale, 8), y: titleY },
    yUnit: {
      x: box.left,
      y: Math.max(titleY + Math.max(16 * scale, 14), box.top - 8 * scale)
    }
  };
}

/** Cover composition stays 0–20 cm; extreme g/T₀ expand to fit A–E. */
export function stripRangeCm(state: MechanicalEnergyState): number {
  const tE = C.countPointCount * state.params.pointPeriod;
  const fromE = heightAt(state.acceleration, tE) * 100;
  const fromLabels = stripDotCandidates(state).reduce((max, dot) => {
    if (!dot.label) return max;
    return Math.max(max, dot.height * 100);
  }, 0);
  const need = Math.max(fromE, fromLabels);
  if (need <= C.rulerCentimetres + 1e-6) return C.rulerCentimetres;
  const step = need <= 40 ? 5 : need <= 100 ? 10 : 20;
  return Math.ceil((need + 1e-6) / step) * step;
}

export function stripTickStep(cmMax: number): {
  minor: number;
  major: number;
} {
  if (cmMax <= 20) return { minor: 1, major: 5 };
  if (cmMax <= 50) return { minor: 2, major: 10 };
  if (cmMax <= 100) return { minor: 5, major: 20 };
  return { minor: 10, major: 50 };
}

export function stripLayout(
  width: number,
  height: number,
  scale: number,
  cmMax = C.rulerCentimetres
): StripLayout {
  const overlayReserve = width / Math.max(height, 1) > 1.55 ? width * 0.3 : 0;
  const padX = Math.max(14 * scale, width * 0.04);
  const padBottom = Math.max(6 * scale, height * 0.016);
  const rulerH = Math.max(18 * scale, height * 0.06);
  const tapeH = Math.max(22 * scale, height * 0.08);
  const gap = Math.max(4 * scale, height * 0.01);
  const rulerTop = height - padBottom - rulerH;
  const tapeTop = rulerTop - gap - tapeH;
  const left = padX;
  const right = width - padX - overlayReserve;
  return {
    left,
    right,
    tapeTop,
    tapeH,
    rulerTop,
    rulerH,
    span: Math.max(1, right - left),
    cmMax
  };
}

export function heightToStripX(heightM: number, strip: StripLayout): number {
  const cm = Math.max(0, heightM * 100);
  const u = Math.min(1, cm / strip.cmMax);
  return strip.left + u * strip.span;
}

export function stripDotCandidates(state: MechanicalEnergyState): Array<{
  height: number;
  counting: boolean;
  label: string | null;
  time: number;
}> {
  const dots =
    state.tapeDots.length > 0
      ? state.tapeDots
      : [{ height: 0, counting: false, label: 'O' as const, time: 0 }];
  const hasO = dots.some((dot) => dot.label === 'O' || dot.height === 0);
  return hasO
    ? dots
    : [{ height: 0, counting: false, label: 'O', time: 0 }, ...dots];
}

export function visibleStripDots(
  state: MechanicalEnergyState,
  strip: StripLayout
): ReturnType<typeof stripDotCandidates> {
  return stripDotCandidates(state).filter(
    (dot) => dot.height * 100 <= strip.cmMax + 1e-6
  );
}

/** Neighbor ticks past the teaching ruler (e.g. F for v_E). Not counting points. */
export function clippedStripDots(
  state: MechanicalEnergyState,
  strip: StripLayout
): ReturnType<typeof stripDotCandidates> {
  return stripDotCandidates(state).filter(
    (dot) => dot.height * 100 > strip.cmMax + 1e-6
  );
}

export function apparatusLayout(
  width: number,
  height: number,
  scale: number,
  state: MechanicalEnergyState
): ApparatusLayout {
  const overlayReserve = width / Math.max(height, 1) > 1.55 ? width * 0.3 : 0;
  const padX = Math.max(16 * scale, width * 0.06);
  const transportClear = Math.max(48 * scale, height * 0.2);
  const strip = stripLayout(width, height, scale, stripRangeCm(state));
  const fieldRight = width - padX - overlayReserve;
  const fieldLeft = padX;
  const fieldW = Math.max(1, fieldRight - fieldLeft);
  const standX = fieldLeft + fieldW * 0.62;
  const standTop = transportClear;
  const standBottom = strip.tapeTop - Math.max(8 * scale, height * 0.02);
  const timerW = Math.max(56 * scale, fieldW * 0.28);
  const timerH = Math.max(32 * scale, height * 0.14);
  const timerX = standX - timerW - 4 * scale;
  const timerY = standTop;
  const tapeX = timerX + timerW * 0.34;
  const tapeTop = timerY + timerH;
  const tapeBottom = standBottom - Math.max(24 * scale, height * 0.07);
  const weightW = Math.max(30 * scale, fieldW * 0.1);
  const weightH = Math.max(36 * scale, height * 0.12);
  const heightRef = Math.max(
    heightAt(state.acceleration, endTime(state.params)),
    1e-6
  );
  const travel = Math.max(1, tapeBottom - tapeTop - weightH);
  const u = Math.min(1, state.height / heightRef);
  const weightY = tapeTop + u * travel;
  const wheelR = Math.max(8 * scale, timerH * 0.28);
  return {
    tapeX,
    tapeTop,
    tapeBottom,
    standX,
    standTop,
    standBottom,
    timerX,
    timerY,
    timerW,
    timerH,
    wheelX: timerX + timerW * 0.68,
    wheelY: timerY + timerH * 0.52,
    wheelR,
    weightX: tapeX,
    weightY,
    weightW,
    weightH,
    heightRef,
    strip
  };
}

export function tapeDotY(height: number, layout: ApparatusLayout): number {
  const travel = Math.max(
    1,
    layout.tapeBottom - layout.tapeTop - layout.weightH
  );
  const u = Math.min(1, height / layout.heightRef);
  return layout.tapeTop + u * travel;
}

function drawApparatus(
  ctx: CanvasRenderingContext2D,
  state: MechanicalEnergyState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const g = apparatusLayout(width, height, scale, state);
  const poleW = Math.max(10 * scale, width * 0.018);

  const baseW = Math.max(70 * scale, width * 0.16);
  const baseH = Math.max(10 * scale, height * 0.025);
  const footH = Math.max(6 * scale, 6);
  const baseY = g.standBottom - baseH - footH;
  ctx.fillStyle = p.stand;
  rounded(
    ctx,
    g.standX,
    g.standTop,
    poleW,
    Math.max(1, baseY - g.standTop),
    3 * scale
  );
  ctx.fill();
  rounded(
    ctx,
    g.standX + poleW / 2 - baseW / 2,
    baseY,
    baseW,
    baseH,
    3 * scale
  );
  ctx.fillStyle = p.base;
  ctx.fill();
  ctx.fillRect(
    g.standX + poleW / 2 - baseW * 0.42,
    baseY + baseH * 0.7,
    baseW * 0.84,
    footH
  );

  ctx.fillStyle = p.stand;
  ctx.fillRect(
    g.timerX + g.timerW - 2 * scale,
    g.timerY + g.timerH * 0.28,
    g.standX + poleW - (g.timerX + g.timerW - 2 * scale),
    Math.max(10 * scale, g.timerH * 0.22)
  );
  rounded(ctx, g.timerX, g.timerY, g.timerW, g.timerH, 8 * scale);
  ctx.fillStyle = p.timer;
  ctx.fill();
  ctx.strokeStyle = p.timerDark;
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.stroke();
  rounded(
    ctx,
    g.timerX + 6 * scale,
    g.timerY + 5 * scale,
    g.timerW - 12 * scale,
    g.timerH - 10 * scale,
    5 * scale
  );
  ctx.fillStyle = p.timerDark;
  ctx.globalAlpha = 0.22;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(g.wheelX, g.wheelY, g.wheelR, 0, Math.PI * 2);
  ctx.fillStyle = p.bg;
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = Math.max(1.6, 2.2 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(g.wheelX, g.wheelY, Math.max(2.4 * scale, 3), 0, Math.PI * 2);
  ctx.fillStyle = p.red;
  ctx.fill();

  const tapeW = Math.max(5 * scale, 5);
  const tapeBottom = g.weightY + 4 * scale;
  ctx.fillStyle = p.tape;
  ctx.fillRect(
    g.tapeX - tapeW / 2,
    g.tapeTop - 2 * scale,
    tapeW,
    tapeBottom - g.tapeTop
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(
    g.tapeX - tapeW / 2,
    g.tapeTop - 2 * scale,
    tapeW,
    tapeBottom - g.tapeTop
  );

  const dotR = Math.max(2.2 * scale, 2.4);
  for (const dot of state.tapeDots) {
    const y = tapeDotY(dot.height, g);
    if (y > g.weightY - 2) continue;
    ctx.beginPath();
    ctx.arc(
      g.tapeX,
      y,
      dot.counting ? dotR + 0.6 * scale : dotR,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = dot.counting ? p.red : p.ink;
    ctx.fill();
  }

  const wx = g.weightX - g.weightW / 2;
  rounded(ctx, wx, g.weightY, g.weightW, g.weightH, 5 * scale);
  ctx.fillStyle = p.gold;
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = Math.max(1.2, 1.6 * scale);
  ctx.stroke();
  text(
    ctx,
    'm',
    g.weightX,
    g.weightY + g.weightH / 2,
    p.ink,
    font(13),
    'center',
    700
  );
  drawStrip(ctx, state, p, scale, font, g.strip);
}

function drawStrip(
  ctx: CanvasRenderingContext2D,
  state: MechanicalEnergyState,
  p: Palette,
  scale: number,
  font: (n: number) => number,
  strip: StripLayout
): void {
  const tapeY = strip.tapeTop;
  const tapeH = strip.tapeH;
  const midY = tapeY + tapeH * 0.55;
  rounded(ctx, strip.left, tapeY, strip.span, tapeH, 4 * scale);
  ctx.fillStyle = p.tape;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.stroke();

  // Expanded ticker tape: physical h on the paper, not a chart or data table.
  const drawn = visibleStripDots(state, strip);
  const dotR = Math.max(2.2 * scale, 2.4);
  for (const dot of drawn) {
    const x = heightToStripX(dot.height, strip);
    ctx.beginPath();
    ctx.arc(
      x,
      midY,
      dot.counting || dot.label === 'O' ? dotR + 0.5 * scale : dotR,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = dot.counting ? p.red : p.ink;
    ctx.fill();
  }

  const labelSize = font(10);
  const above = midY - tapeH * 0.42;
  const below = midY + tapeH * 0.42;
  const minX = strip.left + 6 * scale;
  const maxX = strip.right - 6 * scale;
  for (const dot of drawn) {
    if (!dot.label) continue;
    const x = Math.max(minX, Math.min(maxX, heightToStripX(dot.height, strip)));
    const y =
      dot.label === 'A' || dot.label === 'C' || dot.label === 'E'
        ? below
        : above;
    const color = dot.counting ? p.red : p.ink;
    text(ctx, dot.label, x, y, color, labelSize, 'center', 700);
  }

  rounded(ctx, strip.left, strip.rulerTop, strip.span, strip.rulerH, 3 * scale);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = Math.max(1.2, 1.5 * scale);
  ctx.stroke();
  const tickTop = strip.rulerTop;
  const tickMax = strip.rulerH * 0.55;
  const tickMin = strip.rulerH * 0.32;
  const ticks = stripTickStep(strip.cmMax);
  for (let cm = 0; cm <= strip.cmMax + 1e-9; cm += ticks.minor) {
    const x = strip.left + (cm / strip.cmMax) * strip.span;
    const major =
      cm < 1e-9 ||
      Math.abs(cm - strip.cmMax) < 1e-9 ||
      Math.abs(cm / ticks.major - Math.round(cm / ticks.major)) < 1e-6;
    ctx.beginPath();
    ctx.moveTo(x, tickTop);
    ctx.lineTo(x, tickTop + (major ? tickMax : tickMin));
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = major ? Math.max(1.3, 1.6 * scale) : 1;
    ctx.stroke();
    if (major) {
      text(
        ctx,
        String(Math.round(cm)),
        x,
        strip.rulerTop + strip.rulerH * 0.78,
        p.ink,
        font(9),
        'center',
        600
      );
    }
  }

  if (clippedStripDots(state, strip).length > 0) {
    const tipX = strip.right - Math.max(3 * scale, 3);
    const wing = Math.max(4 * scale, 4);
    ctx.beginPath();
    ctx.moveTo(tipX - wing, midY - wing * 0.7);
    ctx.lineTo(tipX, midY);
    ctx.lineTo(tipX - wing, midY + wing * 0.7);
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = Math.max(1.2, 1.4 * scale);
    ctx.stroke();
    text(
      ctx,
      '…',
      Math.max(minX, tipX - wing * 1.6),
      above,
      p.muted,
      font(9),
      'right',
      600
    );
  }
}

function axisMax(value: number, floor = 0.05): number {
  const need = Math.max(value * 1.15, floor);
  const mag = 10 ** Math.floor(Math.log10(need));
  const residual = need / mag;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return nice * mag;
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

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: MechanicalEnergyState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(0, 0, width, height);
  const chrome = plotChrome(width, height, scale);
  const box = chrome.box;
  const hRef = heightAt(state.acceleration, endTime(state.params));
  const hMax = axisMax(hRef, 0.05);
  const vMax = axisMax(state.acceleration * hRef, 0.2);
  text(
    ctx,
    'v²/2 − h',
    chrome.title.x,
    chrome.title.y,
    p.ink,
    font(12),
    'left',
    700
  );
  text(
    ctx,
    'v²/2 / m²/s²',
    chrome.yUnit.x,
    chrome.yUnit.y,
    p.muted,
    font(10),
    'left',
    600
  );

  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const hTick = (hMax * i) / 4;
    const x = mapX(hTick, box.left, box.right, 0, hMax);
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.bottom);
    ctx.stroke();
    if (i > 0 && i < 4) {
      text(
        ctx,
        hTick.toFixed(2),
        x,
        box.bottom + 10 * scale,
        p.muted,
        font(10),
        'center',
        600
      );
    }
    const vTick = (vMax * i) / 4;
    const y = mapX(vTick, box.bottom, box.top, 0, vMax);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    text(
      ctx,
      vTick.toFixed(2),
      box.left - 6 * scale,
      y,
      p.muted,
      font(10),
      'right',
      600
    );
  }

  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(box.left, box.top - 4);
  ctx.lineTo(box.left, box.bottom);
  ctx.lineTo(box.right + 6, box.bottom);
  ctx.stroke();
  text(
    ctx,
    'h / m',
    box.right,
    Math.min(height - 8 * scale, box.bottom + 12 * scale),
    p.ink,
    font(10),
    'right',
    700
  );

  const xEnd = mapX(hMax, box.left, box.right, 0, hMax);
  const yEnd = Math.max(
    box.top,
    mapX(state.acceleration * hMax, box.bottom, box.top, 0, vMax)
  );
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = Math.max(1.8, 2.4 * scale);
  ctx.beginPath();
  ctx.moveTo(box.left, box.bottom);
  ctx.lineTo(xEnd, yEnd);
  ctx.stroke();

  for (const point of state.graphPoints) {
    const x = mapX(point.height, box.left, box.right, 0, hMax);
    const y = mapX(point.halfV2, box.bottom, box.top, 0, vMax);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(3 * scale, 3), 0, Math.PI * 2);
    ctx.fillStyle = p.red;
    ctx.fill();
  }
}

export function createMechanicalEnergyView(
  options: CreateMechanicalEnergyViewOptions = {}
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
  let snapshot: MechanicalEnergyState | null = null;

  function paint(state: MechanicalEnergyState): void {
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
    if (stage.canvas) {
      stage.canvas.dataset.simTime = state.time.toFixed(4);
      stage.canvas.dataset.playing =
        state.params.autoRun && !state.finished ? '1' : '0';
      stage.canvas.dataset.finished = state.finished ? '1' : '0';
    }
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
          graph.responsiveScale,
          gFont
        );
      }
    }
  }

  return {
    render(state: MechanicalEnergyState): void {
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
