import {
  applyCanvasSize,
  getResponsiveScale,
  scaledSize
} from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  capacitorVelocityAt,
  motionEndTime,
  resistorTerminalVelocity,
  resistorVelocityAt,
  rodModelConstants as C,
  type RodParams,
  type RodState
} from './scene.sim';

export type CreateRodModelViewOptions = {
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
  teal: string;
  gold: string;
  field: string;
  fieldFill: string;
  rail: string;
  rod: string;
};

type PlotBox = { left: number; right: number; top: number; bottom: number };

type StageMetrics = {
  left: number;
  right: number;
  railTop: number;
  railBottom: number;
  fieldLeft: number;
  fieldRight: number;
  fieldTop: number;
  fieldBottom: number;
  circuitX: number;
  rodHalf: number;
};

export type HorizontalArrowGeom = {
  x1: number;
  x2: number;
  y: number;
  labelX: number;
  labelAlign: CanvasTextAlign;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    grid: '#e6e9e7',
    red: '#ef4050',
    blue: '#2d6fe0',
    teal: '#159f8b',
    gold: '#d99416',
    field: '#80adff',
    fieldFill: '#eef4ff',
    rail: '#5b6673',
    rod: '#e68b00'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    grid: '#2a394d',
    red: '#ff707c',
    blue: '#70a8ff',
    teal: '#4ed9c0',
    gold: '#fbbf24',
    field: '#83aefe',
    fieldFill: '#1b3348',
    rail: '#9aa7ba',
    rod: '#ffb52e'
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

export function stageMetrics(
  width: number,
  height: number,
  scale: number
): StageMetrics {
  const padX = Math.max(16 * scale, width * 0.04);
  const padY = Math.max(18 * scale, height * 0.08);
  const left = padX;
  const right = width - padX;
  const railTop = height * 0.34;
  const railBottom = height * 0.7;
  const circuitX = left + Math.max(22 * scale, width * 0.05);
  const fieldLeft = circuitX + Math.max(28 * scale, width * 0.06);
  const fieldRight = right - Math.max(10 * scale, width * 0.02);
  return {
    left,
    right,
    railTop,
    railBottom,
    fieldLeft,
    fieldRight,
    fieldTop: padY,
    fieldBottom: height - padY * 0.55,
    circuitX,
    rodHalf: Math.max(7 * scale, width * 0.012)
  };
}

export function rodXToPx(position: number, m: StageMetrics): number {
  const span = Math.max(1, m.right - m.rodHalf - m.fieldLeft);
  const u = clamp01(position / C.railLength);
  return m.fieldLeft + u * span;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Draw F / +v as a rightward arrow. When the rod is near the right rail,
 * shift the whole shaft to the rod's left instead of reversing the vector.
 */
export function rightwardRodArrow(options: {
  rodX: number;
  rodHalf: number;
  stageLeft: number;
  stageRight: number;
  scale: number;
  length: number;
  y: number;
  fromFace: boolean;
}): HorizontalArrowGeom {
  const { rodX, rodHalf, stageLeft, stageRight, scale, length, y, fromFace } =
    options;
  const gap = 4 * scale;
  const labelGap = 8 * scale;
  const minLen = Math.max(16 * scale, 14);
  const shaft = Math.max(minLen, length);
  const rightStart = fromFace ? rodX + rodHalf + gap : rodX;
  const roomRight = stageRight - rightStart;
  if (roomRight >= shaft + labelGap + 10 * scale) {
    const x1 = rightStart;
    const x2 = x1 + shaft;
    return { x1, x2, y, labelX: x2 + labelGap, labelAlign: 'left' };
  }
  const x2 = fromFace ? rodX - rodHalf - gap : rodX - gap;
  let x1 = x2 - shaft;
  const minX = stageLeft + 4 * scale;
  if (x1 < minX) x1 = minX;
  const x2Final = Math.max(x1 + minLen, x2);
  return {
    x1,
    x2: x2Final,
    y,
    labelX: x1 - 4 * scale,
    labelAlign: 'right'
  };
}

export function forceArrowGeom(
  position: number,
  force: number,
  width: number,
  height: number,
  scale: number
): HorizontalArrowGeom {
  const m = stageMetrics(width, height, scale);
  const rodX = rodXToPx(position, m);
  const midY = (m.railTop + m.railBottom) / 2;
  const fLen = Math.max(
    22 * scale,
    Math.min(width * 0.12, 18 * scale + 6 * scale * Math.max(0, force))
  );
  return rightwardRodArrow({
    rodX,
    rodHalf: m.rodHalf,
    stageLeft: m.left,
    stageRight: m.right,
    scale,
    length: fLen,
    y: midY - 16 * scale,
    fromFace: true
  });
}

export function velocityArrowGeom(
  position: number,
  velocity: number,
  width: number,
  height: number,
  scale: number
): HorizontalArrowGeom {
  const m = stageMetrics(width, height, scale);
  const rodX = rodXToPx(position, m);
  const rodTop = m.railTop - 12 * scale;
  const vLen = Math.max(
    18 * scale,
    Math.min(width * 0.1, 16 * scale + 4 * scale * Math.max(0, velocity))
  );
  return rightwardRodArrow({
    rodX,
    rodHalf: m.rodHalf,
    stageLeft: m.left,
    stageRight: m.right,
    scale,
    length: vLen,
    y: rodTop + 18 * scale,
    fromFace: false
  });
}

function drawResistor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  const hw = 10 * scale;
  const hh = 22 * scale;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = Math.max(2, 2.6 * scale);
  ctx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);
  text(ctx, 'R', x - hw - 8 * scale, y, p.gold, font(13), 'right', 700);
}

function drawCapacitor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  const gap = 8 * scale;
  const hh = 22 * scale;
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.beginPath();
  ctx.moveTo(x - gap, y - hh);
  ctx.lineTo(x - gap, y + hh);
  ctx.moveTo(x + gap, y - hh);
  ctx.lineTo(x + gap, y + hh);
  ctx.stroke();
  text(ctx, 'C', x - gap - 8 * scale, y, p.teal, font(13), 'right', 700);
}

function drawApparatus(
  ctx: CanvasRenderingContext2D,
  state: RodState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const m = stageMetrics(width, height, scale);
  const fieldH = m.fieldBottom - m.fieldTop;
  const fieldW = m.fieldRight - m.fieldLeft;

  ctx.fillStyle = `${p.fieldFill}`;
  ctx.fillRect(m.fieldLeft, m.fieldTop, fieldW, fieldH);
  ctx.strokeStyle = p.field;
  ctx.lineWidth = Math.max(1.2, 1.6 * scale);
  ctx.setLineDash([6 * scale, 4 * scale]);
  ctx.strokeRect(m.fieldLeft, m.fieldTop, fieldW, fieldH);
  ctx.setLineDash([]);

  const cols = Math.max(6, Math.round(fieldW / (26 * scale)));
  const rows = Math.max(3, Math.round(fieldH / (28 * scale)));
  ctx.fillStyle = p.field;
  ctx.font = `700 ${font(14)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const x = m.fieldLeft + ((c + 0.5) * fieldW) / cols;
      const y = m.fieldTop + ((r + 0.5) * fieldH) / rows;
      ctx.fillText('×', x, y);
    }
  }
  text(
    ctx,
    'B ⊗',
    (m.fieldLeft + m.fieldRight) / 2,
    m.fieldTop + 12 * scale,
    p.blue,
    font(13),
    'center',
    700
  );

  ctx.strokeStyle = p.rail;
  ctx.lineWidth = Math.max(5, 7 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m.left, m.railTop);
  ctx.lineTo(m.right, m.railTop);
  ctx.moveTo(m.left, m.railBottom);
  ctx.lineTo(m.right, m.railBottom);
  ctx.stroke();
  ctx.lineCap = 'butt';

  const rodX = rodXToPx(state.position, m);
  const rodTop = m.railTop - 12 * scale;
  const rodBottom = m.railBottom + 12 * scale;
  const rodW = m.rodHalf * 2;
  ctx.fillStyle = p.rod;
  ctx.fillRect(rodX - m.rodHalf, rodTop, rodW, rodBottom - rodTop);
  ctx.strokeStyle = p.rod;
  ctx.lineWidth = Math.max(1.4, 1.8 * scale);
  ctx.strokeRect(rodX - m.rodHalf, rodTop, rodW, rodBottom - rodTop);
  text(ctx, '+', rodX, rodTop + 12 * scale, '#ffffff', font(13), 'center', 700);
  text(
    ctx,
    '−',
    rodX,
    rodBottom - 12 * scale,
    '#ffffff',
    font(13),
    'center',
    700
  );
  const rodLabelY = Math.max(m.fieldTop + 10 * scale, rodTop - 14 * scale);
  const rodLabelRight = m.right - rodX < Math.max(36 * scale, width * 0.08);
  text(
    ctx,
    '导体棒',
    rodLabelRight ? rodX - m.rodHalf - 6 * scale : rodX,
    rodLabelY,
    p.rod,
    font(12),
    rodLabelRight ? 'right' : 'center',
    700
  );

  ctx.strokeStyle = p.muted;
  ctx.lineWidth = Math.max(2, 2.6 * scale);
  ctx.setLineDash([7 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(m.circuitX, m.railTop);
  ctx.lineTo(rodX, m.railTop);
  ctx.moveTo(m.circuitX, m.railBottom);
  ctx.lineTo(rodX, m.railBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(m.circuitX, m.railTop);
  ctx.lineTo(m.circuitX, m.railBottom);
  ctx.stroke();
  const midY = (m.railTop + m.railBottom) / 2;
  if (state.params.model === 'resistor') {
    drawResistor(ctx, m.circuitX, midY, p, scale, font);
  } else {
    drawCapacitor(ctx, m.circuitX, midY, p, scale, font);
  }

  const forceArrow = forceArrowGeom(
    state.position,
    state.params.externalForce,
    width,
    height,
    scale
  );
  arrow(
    ctx,
    forceArrow.x1,
    forceArrow.y,
    forceArrow.x2,
    forceArrow.y,
    p.red,
    Math.max(2.2, 3 * scale),
    8 * scale
  );
  text(
    ctx,
    'F',
    forceArrow.labelX,
    forceArrow.y,
    p.red,
    font(13),
    forceArrow.labelAlign,
    700
  );

  if (state.velocity > 0.02) {
    const velArrow = velocityArrowGeom(
      state.position,
      state.velocity,
      width,
      height,
      scale
    );
    arrow(
      ctx,
      velArrow.x1,
      velArrow.y,
      velArrow.x2,
      velArrow.y,
      p.teal,
      Math.max(1.8, 2.4 * scale),
      7 * scale
    );
    text(
      ctx,
      'v',
      velArrow.labelX,
      velArrow.y,
      p.teal,
      font(12),
      velArrow.labelAlign,
      700
    );
  }

  if (Math.abs(state.magneticForce) > 0.02) {
    const minAmp = Math.max(20 * scale, 16);
    const ampLen = Math.max(
      minAmp,
      Math.min(
        width * 0.16,
        16 * scale + 8 * scale * Math.abs(state.magneticForce)
      )
    );
    const labelOffset = Math.max(11 * scale, 10);
    const ampY = Math.min(
      rodBottom + Math.max(16 * scale, height * 0.045),
      Math.max(
        rodBottom + 8 * scale,
        Math.min(m.fieldBottom, height) - labelOffset - 4 * scale
      )
    );
    const leftLimit = m.left + Math.max(8 * scale, 6);
    let ampStart = rodX;
    let ampEnd = ampStart - ampLen;
    if (ampEnd < leftLimit) {
      ampEnd = leftLimit;
      ampStart = Math.max(ampEnd + minAmp, rodX + m.rodHalf);
    }
    if (ampStart - ampEnd > 2) {
      arrow(
        ctx,
        ampStart,
        ampY,
        ampEnd,
        ampY,
        p.blue,
        Math.max(2, 2.8 * scale),
        8 * scale
      );
      text(
        ctx,
        'F安',
        (ampStart + ampEnd) / 2,
        ampY + labelOffset,
        p.blue,
        font(12),
        'center',
        700
      );
    }
  }
}

export function plotBox(width: number, height: number, scale: number): PlotBox {
  return {
    left: Math.max(36 * scale, width * 0.11),
    right: width - Math.max(28 * scale, width * 0.07),
    top: Math.max(32 * scale, height * 0.26),
    bottom: height - Math.max(24 * scale, height * 0.16)
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
  const titleY = Math.max(12 * scale, 10);
  return {
    box,
    title: {
      x: Math.max(8 * scale, 8),
      y: titleY
    },
    yUnit: {
      x: box.left + 6 * scale,
      y: Math.max(
        titleY + Math.max(16 * scale, 14),
        box.top - Math.max(12 * scale, 12)
      )
    }
  };
}

function modelEndTime(params: RodParams, model: RodParams['model']): number {
  return motionEndTime({ ...params, model });
}

export function plotTimeMax(params: RodParams): number {
  const span = Math.max(
    modelEndTime(params, 'resistor'),
    modelEndTime(params, 'capacitor')
  );
  return Math.min(C.timeMax, Math.max(1, span * 1.15));
}

export function velocityAxisMax(params: RodParams): number {
  const tPlot = plotTimeMax(params);
  const tRes = Math.min(tPlot, modelEndTime(params, 'resistor'));
  const tCap = Math.min(tPlot, modelEndTime(params, 'capacitor'));
  const peak = Math.max(
    resistorVelocityAt(params, tRes),
    capacitorVelocityAt(params, tCap)
  );
  return Math.max(2, peak * 1.2);
}

function timeTickStep(tMax: number): number {
  if (tMax <= 1.2) return 0.2;
  if (tMax <= 2.5) return 0.5;
  if (tMax <= 6) return 1;
  return 2;
}

function formatTick(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: RodState,
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
  const tMax = plotTimeMax(state.params);
  const vMax = velocityAxisMax(state.params);
  text(
    ctx,
    'v–t 对比',
    chrome.title.x,
    chrome.title.y,
    p.ink,
    font(13),
    'left',
    700
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  const tStep = timeTickStep(tMax);
  const tDigits = tStep < 1 ? 1 : 0;
  for (let t = 0; t < tMax - tStep * 0.45; t += tStep) {
    const x = mapX(t, box.left, box.right, 0, tMax);
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.bottom);
    ctx.stroke();
    text(
      ctx,
      formatTick(t, tDigits),
      x,
      box.bottom + 12 * scale,
      p.muted,
      font(10),
      'center',
      600
    );
  }
  {
    const x = mapX(tMax, box.left, box.right, 0, tMax);
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.bottom);
    ctx.stroke();
    text(
      ctx,
      formatTick(tMax, tDigits),
      x,
      box.bottom + 12 * scale,
      p.muted,
      font(10),
      'center',
      600
    );
  }
  const yTicks = 5;
  const vDigits = vMax >= 10 ? 0 : 1;
  for (let i = 0; i <= yTicks; i += 1) {
    const v = (vMax * i) / yTicks;
    const y = mapX(v, box.bottom, box.top, 0, vMax);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    text(
      ctx,
      formatTick(v, vDigits),
      box.left - 6 * scale,
      y,
      p.muted,
      font(10),
      'right',
      600
    );
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = Math.max(1.4, 1.6 * scale);
  ctx.beginPath();
  ctx.moveTo(box.left, box.top - 4 * scale);
  ctx.lineTo(box.left, box.bottom);
  ctx.lineTo(box.right + 8 * scale, box.bottom);
  ctx.stroke();
  text(
    ctx,
    'v / (m·s⁻¹)',
    chrome.yUnit.x,
    chrome.yUnit.y,
    p.ink,
    font(11),
    'left',
    700
  );
  text(
    ctx,
    't / s',
    box.right + 6 * scale,
    box.bottom,
    p.ink,
    font(11),
    'left',
    700
  );

  const n = 120;
  const drawCurve = (
    color: string,
    fn: (time: number) => number,
    endTime: number,
    active: boolean
  ): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = active
      ? Math.max(2.6, 3.2 * scale)
      : Math.max(1.6, 2 * scale);
    ctx.setLineDash(active ? [] : [7 * scale, 4 * scale]);
    ctx.beginPath();
    const span = Math.max(0, Math.min(tMax, endTime));
    for (let i = 0; i <= n; i += 1) {
      const t = (span * i) / n;
      const x = mapX(t, box.left, box.right, 0, tMax);
      const y = mapX(Math.max(0, fn(t)), box.bottom, box.top, 0, vMax);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  drawCurve(
    p.gold,
    (t) => resistorVelocityAt(state.params, t),
    modelEndTime(state.params, 'resistor'),
    state.params.model === 'resistor'
  );
  drawCurve(
    p.teal,
    (t) => capacitorVelocityAt(state.params, t),
    modelEndTime(state.params, 'capacitor'),
    state.params.model === 'capacitor'
  );

  const terminal = resistorTerminalVelocity(state.params);
  if (terminal > 0 && terminal <= vMax) {
    const y = mapX(terminal, box.bottom, box.top, 0, vMax);
    ctx.strokeStyle = p.red;
    ctx.lineWidth = Math.max(1.2, 1.6 * scale);
    ctx.setLineDash([6 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      `vₘ=${terminal.toFixed(2)}`,
      box.right - 4 * scale,
      y - 10 * scale,
      p.red,
      font(10),
      'right',
      700
    );
  }

  const cursorX = mapX(state.time, box.left, box.right, 0, tMax);
  const cursorY = mapX(
    Math.max(0, state.velocity),
    box.bottom,
    box.top,
    0,
    vMax
  );
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = Math.max(1.2, 1.6 * scale);
  ctx.setLineDash([4 * scale, 3 * scale]);
  ctx.beginPath();
  ctx.moveTo(cursorX, box.top);
  ctx.lineTo(cursorX, box.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, 4.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  const legendY = box.top + 8 * scale;
  const legendX = box.left + Math.max(8 * scale, width * 0.22);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = Math.max(2, 2.4 * scale);
  ctx.beginPath();
  ctx.moveTo(legendX, legendY);
  ctx.lineTo(legendX + 16 * scale, legendY);
  ctx.stroke();
  text(
    ctx,
    '电阻棒 趋于 vₘ',
    legendX + 20 * scale,
    legendY,
    p.gold,
    font(11),
    'left',
    700
  );
  ctx.setLineDash([6 * scale, 4 * scale]);
  ctx.strokeStyle = p.teal;
  ctx.beginPath();
  ctx.moveTo(legendX + width * 0.28, legendY);
  ctx.lineTo(legendX + width * 0.28 + 16 * scale, legendY);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '电容棒 匀加速',
    legendX + width * 0.28 + 20 * scale,
    legendY,
    p.teal,
    font(11),
    'left',
    700
  );
}

export function createRodModelView(options: CreateRodModelViewOptions = {}) {
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
  let snapshot: RodState | null = null;

  function paint(state: RodState): void {
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
    render(state: RodState): void {
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
