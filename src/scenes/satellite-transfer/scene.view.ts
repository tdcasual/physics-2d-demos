import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { satelliteConstants, type SatelliteState } from './scene.sim';

export type CreateSatelliteViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  grid: string;
  card: string;
  ink: string;
  muted: string;
  red: string;
  teal: string;
  gold: string;
  border: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#101827',
    grid: '#263550',
    card: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    red: '#fb7185',
    teal: '#22d3ee',
    gold: '#f59e0b',
    border: '#3c4b61'
  },
  dark: {
    bg: '#070d1a',
    grid: '#1c2b45',
    card: '#111b2e',
    ink: '#eef2f7',
    muted: '#aab6c8',
    red: '#fb7185',
    teal: '#22d3ee',
    gold: '#fbbf24',
    border: '#34445d'
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
function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
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
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
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
  ctx.lineTo(x + dx - ux * 13 + px * 7, y + dy - uy * 13 + py * 7);
  ctx.lineTo(x + dx - ux * 13 - px * 7, y + dy - uy * 13 - py * 7);
  ctx.closePath();
  ctx.fill();
}
function orbitPoint(state: SatelliteState): { x: number; y: number } {
  return {
    x: satelliteConstants.centerX + state.radius * Math.cos(state.angle),
    y: satelliteConstants.centerY + state.radius * Math.sin(state.angle)
  };
}
function drawStars(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(
    0,
    0,
    satelliteConstants.fieldWidth,
    satelliteConstants.baseHeight
  );
  ctx.fillStyle = '#b7c7dd';
  for (let i = 0; i < 36; i += 1) {
    const x = (i * 197) % satelliteConstants.fieldWidth;
    const y = (i * 83) % satelliteConstants.baseHeight;
    ctx.globalAlpha = 0.25 + (i % 3) * 0.15;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawPlanet(ctx: CanvasRenderingContext2D, p: Palette): void {
  const g = ctx.createRadialGradient(
    satelliteConstants.centerX - 20,
    satelliteConstants.centerY - 24,
    8,
    satelliteConstants.centerX,
    satelliteConstants.centerY,
    satelliteConstants.planetRadius
  );
  g.addColorStop(0, '#29c6e7');
  g.addColorStop(0.55, '#1678b6');
  g.addColorStop(1, '#0b315d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(
    satelliteConstants.centerX,
    satelliteConstants.centerY,
    satelliteConstants.planetRadius,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.stroke();
}
function drawOrbit(
  ctx: CanvasRenderingContext2D,
  radius: number,
  color: string,
  dash: boolean
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  if (dash) ctx.setLineDash([10, 9]);
  ctx.beginPath();
  ctx.arc(
    satelliteConstants.centerX,
    satelliteConstants.centerY,
    radius,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.setLineDash([]);
}
function drawField(
  ctx: CanvasRenderingContext2D,
  state: SatelliteState,
  p: Palette,
  scale: number
): void {
  drawStars(ctx, p);
  text(ctx, '卫星变轨控制台', 28, 38, p.ink, 24 * scale, 'left', 700);
  text(
    ctx,
    '轨道动力学 · 引力与速度的平衡',
    28,
    68,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawOrbit(ctx, satelliteConstants.lowRadius, p.teal, false);
  drawOrbit(ctx, satelliteConstants.highRadius, p.gold, true);
  if (state.orbit === 'transfer') drawOrbit(ctx, state.radius, p.red, true);
  drawPlanet(ctx, p);
  const point = orbitPoint(state);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
  ctx.fill();
  const tangent = { x: -Math.sin(state.angle), y: Math.cos(state.angle) };
  arrow(
    ctx,
    point.x,
    point.y,
    tangent.x * satelliteConstants.vectorLength,
    tangent.y * satelliteConstants.vectorLength,
    p.teal
  );
  const inward = {
    x: satelliteConstants.centerX - point.x,
    y: satelliteConstants.centerY - point.y
  };
  const inwardLength = Math.hypot(inward.x, inward.y) || 1;
  arrow(
    ctx,
    point.x,
    point.y,
    (inward.x / inwardLength) * satelliteConstants.vectorLength * 0.7,
    (inward.y / inwardLength) * satelliteConstants.vectorLength * 0.7,
    p.red
  );
  text(
    ctx,
    'v',
    point.x + tangent.x * 88,
    point.y + tangent.y * 88,
    p.teal,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    'a',
    point.x + (inward.x / inwardLength) * 60,
    point.y + (inward.y / inwardLength) * 60,
    p.red,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    'A（近地点）',
    satelliteConstants.labelRight,
    satelliteConstants.centerY,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    'B（远地点）',
    satelliteConstants.labelLeft,
    satelliteConstants.centerY,
    p.muted,
    13 * scale,
    'right',
    600
  );
  card(ctx, 34, 620, 736, 82, p);
  text(
    ctx,
    '运行轨迹进度',
    satelliteConstants.progressLeft,
    644,
    p.ink,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `${state.progress.toFixed(1)}%`,
    satelliteConstants.progressRight,
    644,
    p.teal,
    15 * scale,
    'right',
    700
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(satelliteConstants.progressLeft, satelliteConstants.progressY);
  ctx.lineTo(satelliteConstants.progressRight, satelliteConstants.progressY);
  ctx.stroke();
  ctx.strokeStyle = p.teal;
  ctx.beginPath();
  ctx.moveTo(satelliteConstants.progressLeft, satelliteConstants.progressY);
  ctx.lineTo(
    satelliteConstants.progressLeft +
      (state.progress / satelliteConstants.progressMax) *
        satelliteConstants.progressLength,
    satelliteConstants.progressY
  );
  ctx.stroke();
  text(
    ctx,
    '拖拽滑块随时穿梭定位',
    satelliteConstants.progressLeft,
    696,
    p.muted,
    11 * scale,
    'left',
    600
  );
  card(ctx, 34, 470, 736, 126, p);
  text(ctx, state.status, 56, 496, p.teal, 18 * scale, 'left', 700);
  text(
    ctx,
    `轨道半径 ${state.radius.toFixed(1)} · 速度 ${state.speed.toFixed(2)} · 向心加速度 ${state.acceleration.toFixed(2)}`,
    56,
    532,
    p.ink,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    `周期 ${state.orbitalPeriod.toFixed(2)} · 高度差 ${state.altitude.toFixed(1)}`,
    56,
    562,
    p.muted,
    13 * scale,
    'left',
    600
  );
}
export function createSatelliteView(options: CreateSatelliteViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'dark',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: satelliteConstants.baseWidth,
      fallbackHeight: satelliteConstants.baseHeight
    },
    initialWidth: satelliteConstants.baseWidth,
    initialHeight: satelliteConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: SatelliteState | null = null;
  function draw(state: SatelliteState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(
      width / satelliteConstants.baseWidth,
      height / satelliteConstants.baseHeight
    );
    const offsetX = Math.max(
      0,
      (width - satelliteConstants.baseWidth * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - satelliteConstants.baseHeight * fit) / 2
    );
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawField(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }
  return {
    render(state: SatelliteState) {
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
