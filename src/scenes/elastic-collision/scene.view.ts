import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { collisionConstants, type CollisionState } from './scene.sim';

export type CreateCollisionViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  ink: string;
  muted: string;
  grid: string;
  axis: string;
  red: string;
  blue: string;
  teal: string;
  yellow: string;
  card: string;
  border: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    ink: '#303744',
    muted: '#8795a7',
    grid: '#e4e9ef',
    axis: '#343d48',
    red: '#ee3e4c',
    blue: '#357fa5',
    teal: '#18a58a',
    yellow: '#f6c400',
    card: '#fff',
    border: '#d8e0e8'
  },
  dark: {
    bg: '#101827',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2b3b52',
    axis: '#dbe5ef',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    yellow: '#fde047',
    card: '#172235',
    border: '#3c4b61'
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
  ctx.font = weight + ' ' + size + 'px sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}
function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string
): void {
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
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
  ctx.lineTo(x + dx - ux * 14 + px * 7, y + dy - uy * 14 + py * 7);
  ctx.lineTo(x + dx - ux * 14 - px * 7, y + dy - uy * 14 - py * 7);
  ctx.closePath();
  ctx.fill();
}
function mapX(value: number): number {
  return (
    collisionConstants.axisLeft +
    ((value - collisionConstants.xMin) /
      (collisionConstants.xMax - collisionConstants.xMin)) *
      (collisionConstants.axisRight - collisionConstants.axisLeft)
  );
}
function drawBackground(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(
    0,
    0,
    collisionConstants.fieldWidth,
    collisionConstants.baseHeight
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= collisionConstants.fieldWidth; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, collisionConstants.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= collisionConstants.baseHeight; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(collisionConstants.fieldWidth, y);
    ctx.stroke();
  }
}
function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  label: string,
  mass: number,
  color: string,
  velocity: number,
  p: Palette,
  scale: number
): void {
  const y = collisionConstants.axisY - collisionConstants.ballRadius - 5;
  const gradient = ctx.createRadialGradient(
    x - 10,
    y - 12,
    4,
    x,
    y,
    collisionConstants.ballRadius
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(1, color);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, collisionConstants.ballRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, x, y - 7, '#fff', 20 * scale, 'center', 700);
  text(
    ctx,
    mass.toFixed(0) + 'kg',
    x,
    y + 17,
    '#fff',
    13 * scale,
    'center',
    700
  );
  const sign = velocity >= 0 ? 1 : -1;
  const arrowY = y - collisionConstants.ballRadius - 28;
  arrow(
    ctx,
    x,
    arrowY,
    sign * Math.min(95, 38 + Math.abs(velocity) * 11),
    0,
    color
  );
  // Stagger the labels vertically so opposite arrows remain legible when the
  // balls are close together (for example after a parameter change).
  const labelOffsetY = label === 'A' ? 22 : 42;
  const labelX =
    sign > 0
      ? Math.min(collisionConstants.fieldWidth - 100, x + 52)
      : Math.max(100, x - 52);
  text(
    ctx,
    velocity.toFixed(1) + ' m/s',
    labelX,
    arrowY - labelOffsetY,
    color,
    15 * scale,
    sign > 0 ? 'left' : 'right',
    700
  );
}
function drawAxis(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const y = collisionConstants.axisY;
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(collisionConstants.axisLeft - 18, y);
  ctx.lineTo(collisionConstants.axisRight + 18, y);
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  for (let i = collisionConstants.xMin; i <= collisionConstants.xMax; i += 1) {
    const x = mapX(i);
    const tick = i % 2 === 0 ? 15 : 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + tick);
    ctx.stroke();
    if (i % 2 === 0)
      text(ctx, String(i), x, y + 31, p.muted, 14 * scale, 'center', 600);
  }
  text(
    ctx,
    'x (m)',
    collisionConstants.axisRight + 20,
    y,
    p.axis,
    14 * scale,
    'left',
    700
  );
}
function drawConservation(
  ctx: CanvasRenderingContext2D,
  state: CollisionState,
  p: Palette,
  scale: number
): void {
  const x = 70;
  const y = 585;
  const w = 640;
  const h = 92;
  ctx.fillStyle = p.card;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  text(ctx, '守恒量', x + 20, y + 20, p.ink, 15 * scale, 'left', 700);
  text(
    ctx,
    '总动量 Σp  ' +
      (state.totalMomentum >= 0 ? '+' : '') +
      state.totalMomentum.toFixed(2),
    x + 20,
    y + 50,
    p.yellow,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '总动能 ΣEₖ  ' + state.totalEnergy.toFixed(2) + ' J',
    x + 300,
    y + 50,
    p.teal,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.collided ? '碰撞完成 · e = 1' : '等待碰撞',
    x + w - 20,
    y + 20,
    state.collided ? p.teal : p.muted,
    13 * scale,
    'right',
    700
  );
}
function drawField(
  ctx: CanvasRenderingContext2D,
  state: CollisionState,
  p: Palette,
  scale: number
): void {
  drawBackground(ctx, p);
  text(ctx, '一维弹性碰撞', 28, 34, p.ink, 22 * scale, 'left', 700);
  text(
    ctx,
    '无摩擦水平轨道 · Space 暂停/继续',
    28,
    63,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawAxis(ctx, p, scale);
  drawBall(
    ctx,
    mapX(state.positionA),
    'A',
    state.massA,
    p.red,
    state.velocityA,
    p,
    scale
  );
  drawBall(
    ctx,
    mapX(state.positionB),
    'B',
    state.massB,
    p.blue,
    state.velocityB,
    p,
    scale
  );
  drawConservation(ctx, state, p, scale);
  text(
    ctx,
    '相对接近速度  ' + state.relativeApproach.toFixed(2) + ' m/s',
    70,
    720,
    p.muted,
    13 * scale,
    'left',
    600
  );
}
export function createCollisionView(options: CreateCollisionViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: collisionConstants.baseWidth,
      fallbackHeight: collisionConstants.baseHeight
    },
    initialWidth: collisionConstants.baseWidth,
    initialHeight: collisionConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: CollisionState | null = null;
  function draw(state: CollisionState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(
      width / collisionConstants.baseWidth,
      height / collisionConstants.baseHeight
    );
    const offsetX = Math.max(
      0,
      (width - collisionConstants.baseWidth * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - collisionConstants.baseHeight * fit) / 2
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
    render(state: CollisionState) {
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
