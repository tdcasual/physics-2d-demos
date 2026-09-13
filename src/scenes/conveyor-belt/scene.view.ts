import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { conveyorConstants, type ConveyorState } from './scene.sim';

export type CreateConveyorViewOptions = {
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
  belt: string;
  beltEdge: string;
  beltMark: string;
  block: string;
  red: string;
  orange: string;
  green: string;
  blue: string;
  card: string;
  border: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    ink: '#303744',
    muted: '#8795a7',
    grid: '#e6ebf0',
    belt: '#f0f3f6',
    beltEdge: '#3b434e',
    beltMark: '#cfd6de',
    block: '#ef4050',
    red: '#ef4050',
    orange: '#f59e0b',
    green: '#12a77a',
    blue: '#2e8ccb',
    card: '#ffffff',
    border: '#d8e0e8'
  },
  dark: {
    bg: '#101827',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2a3a50',
    belt: '#273344',
    beltEdge: '#c3ccd7',
    beltMark: '#64748b',
    block: '#fb7185',
    red: '#fb7185',
    orange: '#fbbf24',
    green: '#34d399',
    blue: '#60a5fa',
    card: '#172235',
    border: '#3c4b61'
  }
};
const BLOCK_WIDTH = 34 * 2;
const BLOCK_HEIGHT = 28 * 2;
const GUIDE_DROP = 110;
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
  color: string,
  width = 4
): void {
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  const tx = x + dx;
  const ty = y + dy;
  const px = -uy;
  const py = ux;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - ux * 14 + px * 7, ty - uy * 14 + py * 7);
  ctx.lineTo(tx - ux * 14 - px * 7, ty - uy * 14 - py * 7);
  ctx.closePath();
  ctx.fill();
}
function drawBackground(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(
    0,
    0,
    conveyorConstants.fieldWidth,
    conveyorConstants.baseHeight
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= conveyorConstants.fieldWidth; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, conveyorConstants.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= conveyorConstants.baseHeight; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(conveyorConstants.fieldWidth, y);
    ctx.stroke();
  }
}
function drawRoller(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: Palette
): void {
  ctx.fillStyle = p.card;
  ctx.strokeStyle = p.beltEdge;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = p.beltEdge;
  ctx.fill();
  ctx.strokeStyle = p.beltEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 15, y);
  ctx.lineTo(x + 15, y);
  ctx.moveTo(x, y - 15);
  ctx.lineTo(x, y + 15);
  ctx.stroke();
}
function drawBelt(ctx: CanvasRenderingContext2D, p: Palette): void {
  const x0 = conveyorConstants.beltStartX;
  const y0 = conveyorConstants.beltStartY;
  const x1 = conveyorConstants.beltEndX;
  const y1 = conveyorConstants.beltEndY;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  ctx.fillStyle = p.belt;
  ctx.strokeStyle = p.beltEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * 20, y0 + ny * 20);
  ctx.lineTo(x1 + nx * 20, y1 + ny * 20);
  ctx.lineTo(x1 - nx * 20, y1 - ny * 20);
  ctx.lineTo(x0 - nx * 20, y0 - ny * 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.beltMark;
  ctx.lineWidth = 3;
  for (let s = 0; s <= 1; s += 0.08) {
    const cx = x0 + dx * s;
    const cy = y0 + dy * s;
    ctx.beginPath();
    ctx.moveTo(cx + nx * 15, cy + ny * 15);
    ctx.lineTo(cx - nx * 15, cy - ny * 15);
    ctx.stroke();
  }
  drawRoller(ctx, x0, y0, p);
  drawRoller(ctx, x1, y1, p);
}
function drawBlock(
  ctx: CanvasRenderingContext2D,
  state: ConveyorState,
  p: Palette
): { x: number; y: number; tx: number; ty: number } {
  const x0 = conveyorConstants.beltStartX;
  const y0 = conveyorConstants.beltStartY;
  const x1 = conveyorConstants.beltEndX;
  const y1 = conveyorConstants.beltEndY;
  const s = state.blockS / conveyorConstants.beltLength;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const tx = dx / len;
  const ty = dy / len;
  const nx = -ty;
  const ny = tx;
  const x = x0 + dx * s + nx * 28;
  const y = y0 + dy * s + ny * 28;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.fillStyle = p.block;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(
    -BLOCK_WIDTH / 2,
    -BLOCK_HEIGHT / 2,
    BLOCK_WIDTH,
    BLOCK_HEIGHT,
    8
  );
  ctx.fill();
  ctx.stroke();
  text(ctx, 'm', 0, 0, '#fff', 23, 'center', 700);
  ctx.restore();
  return { x, y, tx, ty };
}
function drawForceArrows(
  ctx: CanvasRenderingContext2D,
  state: ConveyorState,
  point: { x: number; y: number; tx: number; ty: number },
  p: Palette,
  scale: number
): void {
  const length = 50 + Math.min(80, Math.abs(state.gravityComponent) * 8);
  const gravityDx = -point.tx * length;
  const gravityDy = -point.ty * length;
  const anchor = point.y > 500 ? -1 : 1;
  const anchorY = point.y + anchor * 45;
  arrow(ctx, point.x, anchorY, gravityDx, gravityDy, p.orange);
  text(
    ctx,
    'mg sinθ',
    point.x + gravityDx - 4,
    anchorY + gravityDy - anchor * 12,
    p.orange,
    13 * scale,
    'center',
    700
  );
  const frictionSign = state.relativeVelocity < 0 ? 1 : -1;
  const frictionLength = 44 + Math.min(76, Math.abs(state.friction) * 6);
  const frictionDx = point.tx * frictionSign * frictionLength;
  const frictionDy = point.ty * frictionSign * frictionLength;
  const frictionY = point.y + anchor * 64;
  arrow(ctx, point.x, frictionY, frictionDx, frictionDy, p.green);
  text(
    ctx,
    'f',
    point.x + frictionDx + 4,
    frictionY + frictionDy + anchor * 14,
    p.green,
    15 * scale,
    'center',
    700
  );
}
function drawVelocity(
  ctx: CanvasRenderingContext2D,
  state: ConveyorState,
  p: Palette,
  scale: number
): void {
  const x = 128;
  const y = 128;
  text(ctx, '传送带速度', x, y - 22, p.muted, 13 * scale, 'left', 600);
  const sign = state.direction === 'up' ? 1 : -1;
  arrow(ctx, x, y, sign * 92, sign * -54, p.red);
  text(
    ctx,
    'v₀ ' + Math.abs(state.beltVelocity).toFixed(1) + ' m/s',
    sign > 0 ? x + 88 : x + 8,
    y + sign * -60,
    p.red,
    14 * scale,
    'left',
    700
  );
}
function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: ConveyorState,
  p: Palette,
  scale: number
): void {
  const x = 70;
  const y = 650;
  const w = 640;
  const h = 78;
  ctx.fillStyle = p.card;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'v–t', x + 18, y + 19, p.ink, 15 * scale, 'left', 700);
  ctx.strokeStyle = p.muted;
  ctx.beginPath();
  ctx.moveTo(x + 48, y + h - 18);
  ctx.lineTo(x + w - 18, y + h - 18);
  ctx.moveTo(x + 48, y + h - 18);
  ctx.lineTo(x + 48, y + 18);
  ctx.stroke();
  if (state.trail.length > 1) {
    const maxT = Math.max(1, state.trail[state.trail.length - 1].t);
    const maxV = Math.max(
      1,
      Math.abs(state.beltVelocity),
      ...state.trail.map((item) => Math.abs(item.v))
    );
    ctx.strokeStyle = p.blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    state.trail.forEach((item, index) => {
      const px = x + 48 + (item.t / maxT) * (w - 72);
      const py = y + h - 18 - (item.v / maxV) * (h - 36) * 0.8;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
  text(ctx, 't', x + w - 24, y + h - 14, p.muted, 11 * scale, 'right', 600);
  text(ctx, 'v', x + 39, y + 18, p.muted, 11 * scale, 'right', 600);
}
function drawField(
  ctx: CanvasRenderingContext2D,
  state: ConveyorState,
  p: Palette,
  scale: number
): void {
  drawBackground(ctx, p);
  text(ctx, '传送带运动学模型', 28, 34, p.ink, 22 * scale, 'left', 700);
  text(
    ctx,
    '点击斜面放置物块 · Space 暂停/继续',
    28,
    62,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawBelt(ctx, p);
  const point = drawBlock(ctx, state, p);
  drawForceArrows(ctx, state, point, p, scale);
  drawVelocity(ctx, state, p, scale);
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(conveyorConstants.beltStartX + 30, conveyorConstants.beltStartY);
  ctx.lineTo(
    conveyorConstants.beltStartX + 30,
    conveyorConstants.beltStartY + GUIDE_DROP
  );
  ctx.lineTo(
    conveyorConstants.beltEndX,
    conveyorConstants.beltStartY + GUIDE_DROP
  );
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    'θ = ' + state.angle.toFixed(0) + '°',
    485,
    410,
    p.muted,
    15 * scale,
    'center',
    700
  );
  drawGraph(ctx, state, p, scale);
}
export function createConveyorView(options: CreateConveyorViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: conveyorConstants.baseWidth,
      fallbackHeight: conveyorConstants.baseHeight
    },
    initialWidth: conveyorConstants.baseWidth,
    initialHeight: conveyorConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: ConveyorState | null = null;
  function draw(state: ConveyorState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(
      width / conveyorConstants.baseWidth,
      height / conveyorConstants.baseHeight
    );
    const offsetX = Math.max(
      0,
      (width - conveyorConstants.baseWidth * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - conveyorConstants.baseHeight * fit) / 2
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
    render(state: ConveyorState) {
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
