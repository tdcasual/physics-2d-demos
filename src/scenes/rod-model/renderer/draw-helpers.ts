import {
  applyCanvasSize,
  getResponsiveScale
} from '../../../core/canvas-sizing';
import type { TeachingTheme } from '../../../platform/standards';
import { rodModelConstants as C } from '../scene.sim';

export type Palette = {
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

export type PlotBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type StageMetrics = {
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

export const PALETTE: Record<TeachingTheme, Palette> = {
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

export function text(
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

export function arrow(
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

export function mapX(
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
