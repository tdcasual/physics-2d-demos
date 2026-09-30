import type { TeachingTheme } from '../../../platform/standards';

export type Palette = {
  bg: string;
  grid: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  soft: string;
};

export const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#ebe7e0',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#8795a7',
    border: '#d1d9e2',
    blue: '#2485d8',
    red: '#ef4050',
    teal: '#26a392',
    gold: '#d69a20',
    soft: '#f1f4f7'
  },
  dark: {
    bg: '#101827',
    grid: '#2a3a51',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    blue: '#60a5fa',
    red: '#fb7185',
    teal: '#34d399',
    gold: '#fbbf24',
    soft: '#202e42'
  }
};

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

export function roundedCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  p: Palette,
  fill = p.panel
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 13);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  width = 3
): void {
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * 12 + px * 6, y + dy - uy * 12 + py * 6);
  ctx.lineTo(x + dx - ux * 12 - px * 6, y + dy - uy * 12 - py * 6);
  ctx.closePath();
  ctx.fill();
}
