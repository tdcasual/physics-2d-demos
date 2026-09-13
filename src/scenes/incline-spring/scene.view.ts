import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { inclineSpringConstants, type InclineSpringState } from './scene.sim';

export type CreateInclineSpringViewOptions = {
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
  blue: string;
  red: string;
  gold: string;
  teal: string;
  border: string;
  slope: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#e7e8e6',
    card: '#ffffff',
    ink: '#303744',
    muted: '#7f8b9a',
    blue: '#2888d6',
    red: '#f2485e',
    gold: '#e99a13',
    teal: '#129b86',
    border: '#d5dbe1',
    slope: '#e9f0f7'
  },
  dark: {
    bg: '#0d1524',
    grid: '#1b2a40',
    card: '#152238',
    ink: '#eef2f7',
    muted: '#aab6c8',
    blue: '#60a5fa',
    red: '#fb7185',
    gold: '#fbbf24',
    teal: '#34d399',
    border: '#354861',
    slope: '#25364e'
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
function roundCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
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
  ctx.lineTo(x + dx - ux * 12 + px * 7, y + dy - uy * 12 + py * 7);
  ctx.lineTo(x + dx - ux * 12 - px * 7, y + dy - uy * 12 - py * 7);
  ctx.closePath();
  ctx.fill();
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(
    0,
    0,
    inclineSpringConstants.fieldWidth,
    inclineSpringConstants.baseHeight
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= inclineSpringConstants.fieldWidth; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, inclineSpringConstants.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= inclineSpringConstants.baseHeight; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(inclineSpringConstants.fieldWidth, y);
    ctx.stroke();
  }
}
function pointOnSlope(position: number): { x: number; y: number } {
  const c = inclineSpringConstants;
  const t = position / c.slopeLength;
  return {
    x: c.slopeLeft + (c.slopeRight - c.slopeLeft) * t,
    y: c.slopeTop + (c.slopeBottom - c.slopeTop) * t
  };
}
function drawSpring(
  ctx: CanvasRenderingContext2D,
  state: InclineSpringState,
  p: Palette
): void {
  const c = inclineSpringConstants;
  const anchor = pointOnSlope(c.anchorPosition);
  const block = pointOnSlope(state.position);
  const dx = block.x - anchor.x;
  const dy = block.y - anchor.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  const steps = c.springTurns * 2;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const alongX = anchor.x + dx * t;
    const alongY = anchor.y + dy * t;
    const amplitude =
      i === steps ? 0 : i % 2 === 0 ? c.springAmplitude : -c.springAmplitude;
    ctx.lineTo(alongX + px * amplitude, alongY + py * amplitude);
  }
  ctx.stroke();
}
function drawIncline(
  ctx: CanvasRenderingContext2D,
  state: InclineSpringState,
  p: Palette,
  scale: number
): void {
  const c = inclineSpringConstants;
  text(ctx, '斜面弹簧动力学', 28, 38, p.ink, 24 * scale, 'left', 700);
  text(ctx, '重力、弹力与摩擦力的能量转换', 28, 68, p.muted, 14 * scale);
  ctx.fillStyle = p.slope;
  ctx.beginPath();
  ctx.moveTo(c.slopeLeft, c.slopeTop);
  ctx.lineTo(c.slopeRight, c.slopeBottom);
  ctx.lineTo(c.slopeRight, c.slopeBottom + c.slopeThickness);
  ctx.lineTo(c.slopeLeft, c.slopeBottom + c.slopeThickness);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(c.slopeLeft, c.slopeTop);
  ctx.lineTo(c.slopeRight, c.slopeBottom);
  ctx.lineTo(c.slopeRight, c.slopeBottom + c.slopeThickness);
  ctx.lineTo(c.slopeLeft, c.slopeBottom + c.slopeThickness);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.slopeLeft, c.slopeBottom + c.slopeThickness);
  ctx.lineTo(c.slopeRight, c.slopeBottom + c.slopeThickness);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    'θ = 30°',
    c.slopeLeft + 90,
    c.slopeBottom + 46,
    p.ink,
    18 * scale,
    'center',
    700
  );
  drawSpring(ctx, state, p);
  const block = pointOnSlope(state.position);
  const angle = Math.atan2(
    c.slopeBottom - c.slopeTop,
    c.slopeRight - c.slopeLeft
  );
  ctx.save();
  ctx.translate(block.x, block.y);
  ctx.rotate(angle);
  ctx.fillStyle = p.red;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(
    -c.blockSize / 2,
    -c.blockSize / 2,
    c.blockSize,
    c.blockSize,
    8
  );
  ctx.fill();
  ctx.stroke();
  text(ctx, 'm', 0, 0, '#fff', 18 * scale, 'center', 700);
  ctx.restore();
  arrow(ctx, block.x, block.y + 2, 0, 62, p.red);
  text(ctx, 'G', block.x + 14, block.y + 68, p.red, 16 * scale, 'left', 700);
  arrow(ctx, block.x, block.y, 52, -30, p.blue);
  text(ctx, 'Fₙ', block.x + 58, block.y - 36, p.blue, 15 * scale, 'left', 700);
  arrow(ctx, block.x, block.y, -46, -26, p.gold);
  text(
    ctx,
    'F弹',
    block.x - 58,
    block.y - 34,
    p.gold,
    15 * scale,
    'right',
    700
  );
  text(
    ctx,
    `位置 ${state.position.toFixed(2)} m`,
    block.x,
    block.y + 102,
    p.muted,
    13 * scale,
    'center'
  );
  roundCard(ctx, 30, 470, 740, 110, p);
  text(ctx, state.status, 52, 496, p.teal, 18 * scale, 'left', 700);
  text(
    ctx,
    `v = ${state.velocity.toFixed(2)} m/s   a = ${state.acceleration.toFixed(2)} m/s²`,
    52,
    530,
    p.ink,
    15 * scale
  );
  text(
    ctx,
    `F弹 = ${state.springForce.toFixed(1)} N   G∥ = ${state.gravityAlong.toFixed(1)} N   N = ${state.normalForce.toFixed(1)} N`,
    52,
    558,
    p.muted,
    13 * scale
  );
  roundCard(ctx, 30, c.energyCardY, 740, c.energyCardHeight, p);
  text(
    ctx,
    '能量转换',
    c.energyLabelX,
    c.energyCardY + 26,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    `总能量 ${state.totalEnergy.toFixed(2)} J`,
    c.energyValueX,
    c.energyCardY + 26,
    p.teal,
    13 * scale,
    'right',
    700
  );
  const values = [
    state.gravitationalEnergy,
    state.springEnergy,
    state.kineticEnergy,
    state.frictionHeat
  ];
  const labels = ['重力势能', '弹性势能', '动能', '摩擦生热'];
  const colors = [p.blue, p.gold, p.teal, p.red];
  const max = Math.max(1, state.totalEnergy);
  for (let i = 0; i < values.length; i += 1) {
    const y = c.energyRowY + i * c.energyRowGap;
    text(ctx, labels[i], c.energyLabelX, y, p.muted, 11 * scale);
    text(
      ctx,
      `${values[i].toFixed(2)} J`,
      c.energyValueX,
      y,
      colors[i],
      11 * scale,
      'right',
      700
    );
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(c.energyTrackLeft, y);
    ctx.lineTo(c.energyTrackRight, y);
    ctx.stroke();
    ctx.strokeStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(c.energyTrackLeft, y);
    ctx.lineTo(c.energyTrackLeft + (c.energyTrackWidth * values[i]) / max, y);
    ctx.stroke();
  }
}
export function createInclineSpringView(
  options: CreateInclineSpringViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'dark',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: inclineSpringConstants.baseWidth,
      fallbackHeight: inclineSpringConstants.baseHeight
    },
    initialWidth: inclineSpringConstants.baseWidth,
    initialHeight: inclineSpringConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: InclineSpringState | null = null;
  function draw(state: InclineSpringState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(
      width / inclineSpringConstants.baseWidth,
      height / inclineSpringConstants.baseHeight
    );
    const offsetX = Math.max(
      0,
      (width - inclineSpringConstants.baseWidth * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - inclineSpringConstants.baseHeight * fit) / 2
    );
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, PALETTE[env.theme]);
    drawIncline(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }
  return {
    render(state: InclineSpringState) {
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
