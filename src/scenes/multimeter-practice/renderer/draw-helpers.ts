import type { TeachingTheme } from '../../../platform/standards';
import { multimeterConstants } from '../scene.sim';

export type Palette = {
  bg: string;
  panel: string;
  face: string;
  darkBody: string;
  ink: string;
  muted: string;
  border: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  purple: string;
  soft: string;
};

export const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    face: '#fcfaf1',
    darkBody: '#1b2028',
    ink: '#303744',
    muted: '#7b8795',
    border: '#d1d9e2',
    blue: '#2485d8',
    red: '#ef4050',
    teal: '#22a18f',
    gold: '#e49b16',
    purple: '#8d55db',
    soft: '#f0f4f7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    face: '#edf1ea',
    darkBody: '#111820',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    blue: '#60a5fa',
    red: '#fb7185',
    teal: '#34d399',
    gold: '#fbbf24',
    purple: '#b58af3',
    soft: '#253249'
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

export function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke: string,
  line = 1.5
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = line;
  ctx.stroke();
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const width = multimeterConstants.fieldWidth * scale;
  const height = multimeterConstants.baseHeight * scale;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = `${p.border}55`;
  ctx.lineWidth = scale;
  for (let x = 0; x <= width; x += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}
