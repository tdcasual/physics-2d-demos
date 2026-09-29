import {
  applyCanvasSize,
  getResponsiveScale
} from '../../../core/canvas-sizing';
import type { TeachingTheme } from '../../../platform/standards';
import {
  potentialGraphConstants as C,
  type PotentialGraphState
} from '../scene.sim';

export type Palette = {
  bg: string;
  panel: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  wire: string;
};

export type PlotBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type AxisLayout = {
  y: number;
  left: number;
  right: number;
  band: number;
};

export const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f1f3f4',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    grid: '#e6e9e7',
    red: '#ef4050',
    blue: '#2d82d0',
    teal: '#23a99a',
    gold: '#d99416',
    wire: '#3e4854'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#253249',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    grid: '#2a394d',
    red: '#ff707c',
    blue: '#65b6ef',
    teal: '#4ed9c0',
    gold: '#fbbf24',
    wire: '#c2cedc'
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

export function rounded(
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

function mapX(
  x: number,
  left: number,
  right: number,
  x0: number,
  x1: number
): number {
  return left + ((x - x0) / (x1 - x0)) * (right - left);
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

export function graphXToPx(x: number, left: number, right: number): number {
  return mapX(x, left, right, C.xMin, C.xMax);
}

/** Map world x onto the apparatus axis, whose ends are the Coulomb sources at −1 m and 11 m. */
export function apparatusXToPx(x: number, left: number, right: number): number {
  return mapX(x, left, right, C.pointChargeX, C.negativeChargeX);
}

export function apparatusPxToX(
  px: number,
  left: number,
  right: number
): number {
  return mapPx(px, left, right, C.pointChargeX, C.negativeChargeX);
}

export function yToPx(
  value: number,
  min: number,
  max: number,
  top: number,
  bottom: number
): number {
  const span = max - min || 1;
  return bottom - ((value - min) / span) * (bottom - top);
}

export function scenarioTitle(state: PotentialGraphState): string {
  const id = state.params.scenario;
  if (id === 'point') return '正点电荷';
  if (id === 'dipole') return '等量异种电荷';
  return '分段匀强场';
}

export function axisLayout(
  width: number,
  height: number,
  scale: number
): AxisLayout {
  const padX = Math.max(22 * scale, width * 0.07);
  const y = height * 0.52;
  return {
    y,
    left: padX,
    right: width - padX,
    band: Math.max(28 * scale, height * 0.18)
  };
}
