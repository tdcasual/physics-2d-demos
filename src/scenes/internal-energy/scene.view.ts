import { applyCanvasSize, getResponsiveScale } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  internalEnergyConstants as C,
  processEndTime,
  sampleAt,
  type InternalEnergyState
} from './scene.sim';

export type CreateInternalEnergyViewOptions = {
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
  glass: string;
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
    glass: 'rgba(186, 214, 236, 0.28)'
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
    glass: 'rgba(40, 70, 104, 0.45)'
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
  const roundedValue = Math.round(value * 10) / 10;
  return Number.isInteger(roundedValue)
    ? String(roundedValue)
    : roundedValue.toFixed(1);
}

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

export function stageField(
  width: number,
  height: number,
  scale: number,
  _presentation = false
) {
  const pad = Math.max(16 * scale, width * 0.04);
  const overlayReserve = width / Math.max(height, 1) > 1.55 ? width * 0.3 : 0;
  // Desktop floating transport reaches ~87px on a 403px stage; keep ≥8px slack.
  const hasFloatingTransport = overlayReserve > 0;
  const transportClear = hasFloatingTransport
    ? Math.max(48 * scale * 2, height * 0.24)
    : pad;
  return {
    pad,
    overlayReserve,
    hasFloatingTransport,
    transportClear,
    bottomClear: pad,
    left: pad,
    right: width - pad - overlayReserve,
    top: transportClear,
    bottom: height - pad
  };
}

export type GasApparatusLayout = {
  field: ReturnType<typeof stageField>;
  tubeX: number;
  tubeY: number;
  tubeW: number;
  tubeH: number;
  gasLeft: number;
  gasRight: number;
  gasTop: number;
  gasBottom: number;
  pistonY: number;
  rodTop: number;
};

export function gasApparatusLayout(
  width: number,
  height: number,
  scale: number,
  volumeMl: number,
  mode: InternalEnergyState['params']['mode'],
  presentation = false
): GasApparatusLayout {
  const field = stageField(width, height, scale, presentation);
  const usableW = Math.max(1, field.right - field.left);
  const usableH = Math.max(1, field.bottom - field.top);
  const handle = Math.max(12 * scale, 10);
  const tubeW = Math.min(usableW * 0.3, Math.max(48 * scale, usableH * 0.24));
  const base = Math.max(10 * scale, 8);
  const tubeH = Math.max(usableH * 0.62, usableH - handle - base);
  const tubeX = field.left + (usableW - tubeW) * 0.5;
  const tubeY = field.top + handle;
  const innerPad = Math.max(6 * scale, 5);
  const gasLeft = tubeX + innerPad;
  const gasRight = tubeX + tubeW - innerPad;
  const gasBottom = tubeY + tubeH - innerPad;
  const gasTop = tubeY + innerPad * 2.4;
  const vMax = tubeVolumeMax(mode);
  const pistonY = map(volumeMl, 0, vMax, gasBottom, gasTop);
  return {
    field,
    tubeX,
    tubeY,
    tubeW,
    tubeH,
    gasLeft,
    gasRight,
    gasTop,
    gasBottom,
    pistonY,
    rodTop: field.top
  };
}

export function plotBox(width: number, height: number, scale: number): PlotBox {
  return {
    left: Math.max(36 * scale, width * 0.12),
    right: width - Math.max(16 * scale, width * 0.06),
    top: Math.max(32 * scale, height * 0.26),
    bottom: height - Math.max(22 * scale, height * 0.18)
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
      y: Math.max(
        titleY + Math.max(16 * scale, 14),
        box.top - Math.max(10 * scale, 8)
      )
    }
  };
}

function mixColor(t: number): string {
  const u = Math.max(0, Math.min(1, (t - 10) / 90));
  const r = Math.round(59 + (232 - 59) * u);
  const g = Math.round(130 - 70 * u);
  const b = Math.round(196 - 120 * u);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawVerticalArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  y1: number,
  color: string,
  scale: number
): void {
  const down = y1 >= y0;
  const head = Math.max(6 * scale, 5);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.stroke();
  ctx.beginPath();
  if (down) {
    ctx.moveTo(x, y1);
    ctx.lineTo(x - head * 0.45, y1 - head);
    ctx.lineTo(x + head * 0.45, y1 - head);
  } else {
    ctx.moveTo(x, y1);
    ctx.lineTo(x - head * 0.45, y1 + head);
    ctx.lineTo(x + head * 0.45, y1 + head);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHorizontalArrow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  color: string,
  scale: number
): void {
  const right = x1 >= x0;
  const head = Math.max(6 * scale, 5);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.8, 2.2 * scale);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.beginPath();
  if (right) {
    ctx.moveTo(x1, y);
    ctx.lineTo(x1 - head, y - head * 0.45);
    ctx.lineTo(x1 - head, y + head * 0.45);
  } else {
    ctx.moveTo(x1, y);
    ctx.lineTo(x1 + head, y - head * 0.45);
    ctx.lineTo(x1 + head, y + head * 0.45);
  }
  ctx.closePath();
  ctx.fill();
}

function volumeTicks(mode: InternalEnergyState['params']['mode']): number[] {
  if (mode === 'expand') {
    return [C.v0mL, C.v0mL * 2, C.v0mL * 3, C.v0mL * 4];
  }
  return [C.v0mL / 4, C.v0mL / 2, (3 * C.v0mL) / 4, C.v0mL];
}

function tubeVolumeMax(mode: InternalEnergyState['params']['mode']): number {
  return mode === 'expand' ? C.v0mL * C.ratioMax : C.v0mL;
}

function drawGasStage(
  ctx: CanvasRenderingContext2D,
  state: InternalEnergyState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  typeScale: number,
  presentation: boolean
): void {
  const {
    tubeX,
    tubeY,
    tubeW,
    tubeH,
    gasLeft,
    gasRight,
    gasTop,
    gasBottom,
    pistonY,
    rodTop
  } = gasApparatusLayout(
    width,
    height,
    scale,
    state.volume,
    state.params.mode,
    presentation
  );
  const rodW = Math.max(5 * scale, 4);
  const pistonH = Math.max(10 * scale, 9);
  const vMax = tubeVolumeMax(state.params.mode);

  ctx.fillStyle = p.border;
  rounded(
    ctx,
    tubeX - 8 * scale,
    tubeY + tubeH - 8 * scale,
    tubeW + 16 * scale,
    14 * scale,
    4 * scale
  );
  ctx.fill();

  ctx.strokeStyle = p.blue;
  ctx.lineWidth = Math.max(3, 3.2 * scale);
  ctx.strokeRect(tubeX, tubeY, tubeW, tubeH);
  ctx.fillStyle = p.glass;
  ctx.fillRect(gasLeft, pistonY, gasRight - gasLeft, gasBottom - pistonY);

  ctx.fillStyle = p.ink;
  ctx.fillRect(
    gasLeft - 2 * scale,
    pistonY - pistonH * 0.35,
    gasRight - gasLeft + 4 * scale,
    pistonH
  );
  ctx.fillRect(
    (gasLeft + gasRight) / 2 - rodW / 2,
    rodTop,
    rodW,
    Math.max(1, pistonY - rodTop)
  );

  if (state.playing && !state.finished) {
    const dir = state.params.mode === 'expand' ? -1 : 1;
    const ax = tubeX - Math.max(14 * scale, 12);
    const bx = tubeX + tubeW + Math.max(14 * scale, 12);
    let y0 = pistonY - dir * Math.max(24 * scale, 18);
    let y1 = pistonY + dir * Math.max(6 * scale, 5);
    const topMost = Math.min(y0, y1);
    if (topMost < rodTop) {
      const lift = rodTop - topMost;
      y0 += lift;
      y1 += lift;
    }
    drawVerticalArrow(ctx, ax, y0, y1, p.blue, scale);
    drawVerticalArrow(ctx, bx, y0, y1, p.blue, scale);
  }

  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1;
  const font = Math.max(9, 10 * typeScale);
  for (const tick of volumeTicks(state.params.mode)) {
    const y = map(tick, 0, vMax, gasBottom, gasTop);
    if (y < gasTop + 6 * scale || y > gasBottom - 4 * scale) continue;
    ctx.beginPath();
    ctx.moveTo(gasRight - 7 * scale, y);
    ctx.lineTo(gasRight, y);
    ctx.stroke();
    text(ctx, `${tick}`, gasLeft + 5 * scale, y, p.muted, font, 'left', 500);
  }
  text(
    ctx,
    'mL',
    gasLeft + 5 * scale,
    gasTop + 10 * scale,
    p.muted,
    font,
    'left',
    600
  );

  const rMol = Math.max(2.4 * scale, 2.2);
  ctx.fillStyle = p.blue;
  for (const mol of state.molecules) {
    if (mol.kind !== 'gas') continue;
    const mx = gasLeft + mol.x * (gasRight - gasLeft);
    const my = pistonY + mol.y * Math.max(1, gasBottom - pistonY);
    ctx.beginPath();
    ctx.arc(mx, my, rMol, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.fog) {
    const spanY = Math.max(1, gasBottom - pistonY);
    for (let i = 0; i < 18; i += 1) {
      const fx =
        gasLeft +
        4 * scale +
        ((i * 0.31) % 1) * (gasRight - gasLeft - 8 * scale);
      const fy =
        pistonY + 4 * scale + ((i * 0.47 + 0.12) % 1) * (spanY - 8 * scale);
      ctx.fillStyle = `rgba(248, 250, 252, ${0.35 + (i % 4) * 0.12})`;
      ctx.beginPath();
      ctx.arc(fx, fy, Math.max(5.5 * scale, 5) + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (state.params.mode === 'compress') {
    const cottonY = gasBottom - 6 * scale;
    ctx.fillStyle = state.ignited ? p.orange : p.muted;
    ctx.beginPath();
    ctx.ellipse(
      (gasLeft + gasRight) / 2,
      cottonY,
      Math.max(8 * scale, 7),
      Math.max(3 * scale, 2.5),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    text(
      ctx,
      '硝化棉',
      tubeX + tubeW + 8 * scale,
      cottonY,
      p.muted,
      font,
      'left',
      600
    );
    if (state.ignited) {
      ctx.fillStyle = p.orange;
      ctx.beginPath();
      ctx.moveTo((gasLeft + gasRight) / 2, cottonY - 16 * scale);
      ctx.lineTo((gasLeft + gasRight) / 2 - 5 * scale, cottonY);
      ctx.lineTo((gasLeft + gasRight) / 2 + 5 * scale, cottonY);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawHeatStage(
  ctx: CanvasRenderingContext2D,
  state: InternalEnergyState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  typeScale: number,
  presentation: boolean
): void {
  const field = stageField(width, height, scale, presentation);
  const usableW = Math.max(1, field.right - field.left);
  const usableH = Math.max(1, field.bottom - field.top);
  const gap = Math.max(18 * scale, usableW * 0.06);
  const blockW = Math.min((usableW - gap) * 0.42, usableH * 0.7);
  const blockH = Math.min(usableH * 0.62, blockW * 1.15);
  const cy = field.top + usableH * 0.52;
  const leftX = field.left + (usableW - 2 * blockW - gap) * 0.5;
  const rightX = leftX + blockW + gap;
  const top = cy - blockH / 2;
  const radius = Math.max(8 * scale, 7);

  ctx.fillStyle = mixColor(state.tHotNow);
  rounded(ctx, leftX, top, blockW, blockH, radius);
  ctx.fill();
  ctx.fillStyle = mixColor(state.tColdNow);
  rounded(ctx, rightX, top, blockW, blockH, radius);
  ctx.fill();

  const rMol = Math.max(2.6 * scale, 2.3);
  for (const mol of state.molecules) {
    const boxX = mol.kind === 'hot' ? leftX : rightX;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath();
    ctx.arc(
      boxX + 8 * scale + mol.x * (blockW - 16 * scale),
      top + 8 * scale + mol.y * (blockH - 16 * scale),
      rMol,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const dT = state.tHotNow - state.tColdNow;
  if (Math.abs(dT) > 0.4) {
    const y = cy;
    const fromHot = dT > 0;
    const x0 = fromHot ? leftX + blockW + 4 * scale : rightX - 4 * scale;
    const x1 = fromHot ? rightX - 4 * scale : leftX + blockW + 4 * scale;
    drawHorizontalArrow(ctx, x0, x1, y, p.orange, scale);
    text(
      ctx,
      'Q',
      (x0 + x1) / 2,
      y - Math.max(12 * scale, 10),
      p.orange,
      Math.max(11, 12 * typeScale),
      'center',
      700
    );
  }

  const font = Math.max(11, 12 * typeScale);
  text(
    ctx,
    '左块',
    leftX + blockW / 2,
    top - 12 * scale,
    p.ink,
    font,
    'center',
    700
  );
  text(
    ctx,
    '右块',
    rightX + blockW / 2,
    top - 12 * scale,
    p.ink,
    font,
    'center',
    700
  );
}

function drawStage(
  ctx: CanvasRenderingContext2D,
  state: InternalEnergyState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  typeScale: number,
  presentation: boolean
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  if (state.params.mode === 'heat') {
    drawHeatStage(ctx, state, width, height, p, scale, typeScale, presentation);
    return;
  }
  drawGasStage(ctx, state, width, height, p, scale, typeScale, presentation);
}

function snapDown(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function snapUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function temperatureAxis(state: InternalEnergyState): {
  min: number;
  max: number;
} {
  if (state.params.mode === 'heat') {
    const lo = Math.min(state.params.tHot, state.params.tCold, state.tEq);
    const hi = Math.max(state.params.tHot, state.params.tCold, state.tEq);
    return {
      min: lo >= 0 ? 0 : snapDown(lo - 4, 10),
      max: snapUp(hi + 8, 10)
    };
  }
  if (state.params.mode === 'expand') {
    const end = sampleAt(state.params, processEndTime(state.params));
    const lo = Math.min(end.temperature, state.params.dewPoint, C.t0C);
    const hi = Math.max(C.t0C, state.params.dewPoint, 0);
    return { min: snapDown(lo - 16, 20), max: snapUp(hi + 8, 20) };
  }
  const end = sampleAt(state.params, processEndTime(state.params));
  return {
    min: 0,
    max: snapUp(Math.max(end.temperature, C.schematicIgnitionC) + 16, 20)
  };
}

export function temperatureTickStep(min: number, max: number): number {
  const span = Math.max(20, max - min);
  if (span <= 50) return 10;
  if (span <= 120) return 20;
  if (span <= 280) return 40;
  return 50;
}

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: InternalEnergyState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  typeScale: number
): void {
  if (width < 8 || height < 8) return;
  ctx.fillStyle = p.panel;
  ctx.fillRect(0, 0, width, height);
  const chrome = plotChrome(width, height, scale);
  const box = chrome.box;
  const font = (n: number) => Math.max(n, n * typeScale);
  const tMax = processEndTime(state.params);
  const axis = temperatureAxis(state);
  const yStep = temperatureTickStep(axis.min, axis.max);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let tv = axis.min; tv <= axis.max + 1e-6; tv += yStep) {
    const y = map(tv, axis.min, axis.max, box.bottom, box.top);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    text(
      ctx,
      formatAxisTick(tv),
      box.left - 4 * scale,
      y,
      p.muted,
      font(8),
      'right'
    );
  }
  for (let i = 1; i < 4; i += 1) {
    const tv = (tMax * i) / 4;
    const x = map(tv, 0, tMax, box.left, box.right);
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.bottom);
    ctx.stroke();
    text(
      ctx,
      formatAxisTick(tv),
      x,
      box.bottom + 10 * scale,
      p.muted,
      font(8),
      'center'
    );
  }
  ctx.strokeStyle = p.ink;
  ctx.beginPath();
  ctx.moveTo(box.left, box.top - 2);
  ctx.lineTo(box.left, box.bottom);
  ctx.lineTo(box.right + 4, box.bottom);
  ctx.stroke();

  text(
    ctx,
    'T-t',
    chrome.title.x,
    chrome.title.y,
    p.ink,
    font(11),
    'left',
    700
  );
  text(ctx, 'T / °C', chrome.yUnit.x, chrome.yUnit.y, p.muted, font(9), 'left');
  text(
    ctx,
    't / s',
    box.right,
    Math.min(height - 6 * scale, box.bottom + 14 * scale),
    p.ink,
    font(9),
    'right',
    700
  );

  const dash = (yValue: number, label: string, color: string) => {
    if (yValue < axis.min || yValue > axis.max) return;
    const y = map(yValue, axis.min, axis.max, box.bottom, box.top);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.setLineDash([4 * scale, 3 * scale]);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    ctx.restore();
    text(
      ctx,
      label,
      box.right - 4 * scale,
      y - 7 * scale,
      color,
      font(8),
      'right'
    );
  };

  if (state.params.mode === 'compress') {
    dash(C.schematicIgnitionC, '180 示意', p.orange);
  } else if (state.params.mode === 'expand') {
    dash(state.params.dewPoint, '露点', p.teal);
  } else {
    dash(state.tEq, 'Teq', p.muted);
  }

  const plotLine = (
    color: string,
    pick: (sample: ReturnType<typeof sampleAt>) => number
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.6, 2 * scale);
    ctx.beginPath();
    for (let i = 0; i <= 48; i += 1) {
      const tt = (tMax * i) / 48;
      const sample = sampleAt(state.params, tt);
      const px = map(tt, 0, tMax, box.left, box.right);
      const py = map(pick(sample), axis.min, axis.max, box.bottom, box.top);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };

  if (state.params.mode === 'heat') {
    plotLine(p.red, (s) => s.tHotNow);
    plotLine(p.blue, (s) => s.tColdNow);
    text(
      ctx,
      '左',
      chrome.title.x + Math.max(36 * scale, 32),
      chrome.title.y,
      p.red,
      font(9)
    );
    text(
      ctx,
      '右',
      chrome.title.x + Math.max(52 * scale, 46),
      chrome.title.y,
      p.blue,
      font(9)
    );
    const px = map(state.time, 0, tMax, box.left, box.right);
    ctx.fillStyle = p.red;
    ctx.beginPath();
    ctx.arc(
      px,
      map(state.tHotNow, axis.min, axis.max, box.bottom, box.top),
      Math.max(3 * scale, 3),
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.fillStyle = p.blue;
    ctx.beginPath();
    ctx.arc(
      px,
      map(state.tColdNow, axis.min, axis.max, box.bottom, box.top),
      Math.max(3 * scale, 3),
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else {
    plotLine(p.red, (s) => s.temperature);
    const px = map(state.time, 0, tMax, box.left, box.right);
    const py = map(state.temperature, axis.min, axis.max, box.bottom, box.top);
    ctx.fillStyle = p.red;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(3 * scale, 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createInternalEnergyView(
  options: CreateInternalEnergyViewOptions = {}
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

  function paint(state: InternalEnergyState): void {
    const pal = PALETTE[env.theme];
    const rs = stage.responsiveScale || 1;
    const content = env.contentScale();
    const fontMul = env.fontScale() * Math.min(content, 1.25);
    const scale = rs * content;
    const typeScale = Math.max(rs, 1) * fontMul;
    const presentation = env.mode === 'presentation';
    const ctx = stage.ctx;
    if (ctx) {
      drawStage(
        ctx,
        state,
        stage.cssWidth,
        stage.cssHeight,
        pal,
        scale,
        typeScale,
        presentation
      );
    }
    if (stage.canvas) {
      stage.canvas.dataset.simTime = state.time.toFixed(4);
      stage.canvas.dataset.playing = state.playing ? '1' : '0';
      stage.canvas.dataset.finished = state.finished ? '1' : '0';
      stage.canvas.dataset.cssWidth = String(stage.cssWidth);
      stage.canvas.dataset.cssHeight = String(stage.cssHeight);
      stage.canvas.dataset.contentScale = String(content);
      stage.canvas.dataset.fontScale = String(env.fontScale());
      stage.canvas.dataset.visualScale = String(scale);
      stage.canvas.dataset.typeScale = String(typeScale);
      const field = stageField(
        stage.cssWidth,
        stage.cssHeight,
        scale,
        presentation
      );
      stage.canvas.dataset.fieldBottom = String(field.bottom);
      stage.canvas.dataset.bottomClear = String(field.bottomClear);
      stage.canvas.dataset.overlayReserve = String(field.overlayReserve);
      stage.canvas.dataset.fieldRight = String(field.right);
      if (state.params.mode !== 'heat') {
        const layout = gasApparatusLayout(
          stage.cssWidth,
          stage.cssHeight,
          scale,
          state.volume,
          state.params.mode,
          presentation
        );
        stage.canvas.dataset.rodTop = String(layout.rodTop);
        stage.canvas.dataset.tubeY = String(layout.tubeY);
        stage.canvas.dataset.gasBottom = String(layout.gasBottom);
        stage.canvas.dataset.gasRight = String(layout.gasRight);
      }
    }
    if (graph.canvas && graph.ctx) {
      const gs = graph.responsiveScale || 1;
      drawGraphs(
        graph.ctx,
        state,
        graph.cssWidth,
        graph.cssHeight,
        pal,
        gs * content,
        Math.max(gs, 1) * fontMul
      );
    }
  }

  return {
    canvas: stage.canvas,
    resize(): void {
      stage.resize();
      graph.resize();
    },
    render(state: InternalEnergyState): void {
      stage.ensureSized();
      paint(state);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
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
