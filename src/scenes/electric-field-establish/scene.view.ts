import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  electricFieldConstants as c,
  type ElectricFieldState
} from './scene.sim';
export type CreateElectricFieldViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  border: string;
  wire: string;
  electron: string;
  pos: string;
  field: string;
  card: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfe',
    grid: '#e7edf3',
    ink: '#303744',
    muted: '#8996a4',
    border: '#cfd9e4',
    wire: '#566575',
    electron: '#35b8e9',
    pos: '#f23d53',
    field: '#f04b59',
    card: '#fff'
  },
  dark: {
    bg: '#0d1524',
    grid: '#1b2a40',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3a4b63',
    wire: '#9aaac0',
    electron: '#48c7f1',
    pos: '#fb7185',
    field: '#fb7185',
    card: '#172337'
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
function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fillStyle = p.card;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string
): void {
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const px = -uy;
  const py = ux;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * 11 + px * 6, y + dy - uy * 11 + py * 6);
  ctx.lineTo(x + dx - ux * 11 - px * 6, y + dy - uy * 11 - py * 6);
  ctx.closePath();
  ctx.fill();
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, c.fieldWidth, c.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= c.fieldWidth; x += c.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, c.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= c.baseHeight; y += c.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(c.fieldWidth, y);
    ctx.stroke();
  }
}
function drawBattery(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(c.batteryX - 46, c.batteryY);
  ctx.lineTo(c.batteryX - 46, c.batteryY - 24);
  ctx.moveTo(c.batteryX - 14, c.batteryY);
  ctx.lineTo(c.batteryX - 14, c.batteryY - 38);
  ctx.moveTo(c.batteryX + 18, c.batteryY);
  ctx.lineTo(c.batteryX + 18, c.batteryY - 24);
  ctx.moveTo(c.batteryX + 50, c.batteryY);
  ctx.lineTo(c.batteryX + 50, c.batteryY - 38);
  ctx.stroke();
  text(ctx, '+', c.batteryX - 30, c.batteryY - 48, p.pos, 18, 'center', 700);
  text(ctx, '−', c.batteryX + 34, c.batteryY - 48, p.ink, 18, 'center', 700);
}
function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: ElectricFieldState,
  p: Palette
): void {
  const t = state.time / c.driftPeriod;
  for (let i = 0; i < c.electronCount; i += 1) {
    const u = (i / c.electronCount + t * (state.showDrift ? 0.7 : 0)) % 1;
    const x = c.wireLeft + 80 + u * (c.wireRight - c.wireLeft - 160);
    const y = c.wireTop + 72 + (i % 3) * 28;
    ctx.fillStyle = p.electron;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    if (state.showDrift && state.closed)
      arrow(ctx, x - 16, y, -18, 0, p.electron);
  }
}
function drawCircuit(
  ctx: CanvasRenderingContext2D,
  state: ElectricFieldState,
  p: Palette,
  scale: number
): void {
  text(ctx, '恒定电场的建立机制', 28, 38, p.ink, 24 * scale, 'left', 700);
  text(ctx, '表面电荷建立 · 自由电子定向漂移', 28, 68, p.muted, 14 * scale);
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(c.wireLeft, c.wireTop);
  ctx.lineTo(c.batteryX - 50, c.wireTop);
  ctx.moveTo(c.batteryX + c.batteryRightOffset, c.wireTop);
  ctx.lineTo(c.wireRight, c.wireTop);
  ctx.lineTo(c.wireRight, c.wireBottom);
  ctx.lineTo(c.wireLeft, c.wireBottom);
  ctx.lineTo(c.wireLeft, c.wireTop);
  ctx.stroke();
  drawBattery(ctx, p);
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3;
  ctx.fillStyle = p.card;
  ctx.beginPath();
  ctx.roundRect(c.resistorX, c.resistorY - 18, c.resistorWidth, 36, 6);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    'R',
    c.resistorX + 60,
    c.resistorY,
    p.ink,
    18 * scale,
    'center',
    700
  );
  if (state.closed) {
    ctx.strokeStyle = p.field;
    ctx.lineWidth = 3;
    arrow(ctx, 650, c.wireTop + 66, -76, 0, p.field);
    arrow(ctx, 320, c.wireTop + 120, 0, 70, p.field);
    text(ctx, 'E', 610, c.wireTop + 52, p.field, 18 * scale, 'center', 700);
  }
  if (state.showSurfaceCharge) {
    for (let i = 0; i < c.chargeCount; i += 1) {
      const u = i / (c.chargeCount - 1);
      const x = c.wireLeft + 40 + u * (c.wireRight - c.wireLeft - 80);
      ctx.fillStyle = p.pos;
      ctx.beginPath();
      ctx.arc(x, c.wireTop + 2, 9, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '+', x, c.wireTop + 2, '#fff', 12, 'center', 700);
    }
  }
  drawParticles(ctx, state, p);
  round(ctx, 30, 470, 740, 108, p);
  text(
    ctx,
    state.status,
    52,
    496,
    state.closed ? p.field : p.muted,
    18 * scale,
    'left',
    700
  );
  text(
    ctx,
    `内部场强 E = ${state.fieldStrength.toFixed(2)} V/m`,
    52,
    532,
    p.ink,
    15 * scale
  );
  text(
    ctx,
    `漂移速率 v = ${state.driftVelocity.toFixed(2)} m/s   I = ${state.current.toFixed(2)} A`,
    52,
    560,
    p.muted,
    14 * scale
  );
  round(ctx, 30, 604, 740, 86, p);
  text(ctx, '微观过程', 52, 630, p.ink, 16 * scale, 'left', 700);
  text(
    ctx,
    state.showSurfaceCharge ? '① 表面电荷已建立' : '① 隐藏表面电荷',
    220,
    630,
    p.pos,
    13 * scale
  );
  text(
    ctx,
    state.showDrift ? '② 电子定向漂移' : '② 隐藏漂移矢量',
    490,
    630,
    p.electron,
    13 * scale
  );
  text(ctx, 'E = U / L   v = μE', 52, 664, p.muted, 13 * scale);
}
export function createElectricFieldView(
  options: CreateElectricFieldViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: c.baseWidth,
      fallbackHeight: c.baseHeight
    },
    initialWidth: c.baseWidth,
    initialHeight: c.baseHeight,
    eagerContext: true
  });
  let snapshot: ElectricFieldState | null = null;
  function draw(state: ElectricFieldState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / c.baseWidth, height / c.baseHeight);
    const offsetX = Math.max(0, (width - c.baseWidth * fit) / 2);
    const offsetY = Math.max(0, (height - c.baseHeight * fit) / 2);
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, PALETTE[env.theme]);
    drawCircuit(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }
  return {
    render(state: ElectricFieldState) {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize() {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme) {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose() {
      snapshot = null;
      stage.release();
    }
  };
}
