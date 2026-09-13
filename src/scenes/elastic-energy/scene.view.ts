import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { energyConstants, type EnergyState } from './scene.sim';

export type CreateEnergyViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  grid: string;
  axis: string;
  red: string;
  blue: string;
  teal: string;
  yellow: string;
  border: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    card: '#fff',
    ink: '#303744',
    muted: '#8795a7',
    grid: '#e8e5e0',
    axis: '#343d48',
    red: '#ee3e4c',
    blue: '#2e82de',
    teal: '#18a58a',
    yellow: '#efa800',
    border: '#d8e0e8'
  },
  dark: {
    bg: '#101827',
    card: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2b3b52',
    axis: '#dbe5ef',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    yellow: '#fde047',
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
  ctx.roundRect(x, y, w, h, 13);
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
  ctx.lineTo(x + dx - ux * 13 + px * 7, y + dy - uy * 13 + py * 7);
  ctx.lineTo(x + dx - ux * 13 - px * 7, y + dy - uy * 13 - py * 7);
  ctx.closePath();
  ctx.fill();
}
function mapX(value: number): number {
  return (
    energyConstants.trackLeft +
    ((value - energyConstants.xMin) /
      (energyConstants.xMax - energyConstants.xMin)) *
      (energyConstants.trackRight - energyConstants.trackLeft)
  );
}
function drawBackground(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, energyConstants.fieldWidth, energyConstants.baseHeight);
}
function drawFormulaHeader(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  card(ctx, 58, 22, 704, 72, p);
  text(ctx, '系统物理量守恒看牌', 82, 44, p.muted, 15 * scale, 'left', 700);
  text(ctx, 'p = m₁v₁ + m₂v₂ = 常数', 82, 73, p.ink, 16 * scale, 'left', 600);
  text(
    ctx,
    'Eₖ = Eₖ₁ + Eₖ₂ + Eₚ = 常数',
    420,
    73,
    p.ink,
    16 * scale,
    'left',
    600
  );
}
function drawTrack(
  ctx: CanvasRenderingContext2D,
  state: EnergyState,
  p: Palette,
  scale: number
): void {
  text(ctx, '弹性碰撞物理实验室', 28, 126, p.ink, 22 * scale, 'left', 700);
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(energyConstants.trackLeft, energyConstants.trackY);
  ctx.lineTo(energyConstants.trackRight, energyConstants.trackY);
  ctx.stroke();
  for (let i = energyConstants.xMin; i <= energyConstants.xMax; i += 1) {
    const x = mapX(i);
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, energyConstants.trackY);
    ctx.lineTo(x, energyConstants.trackY + 14);
    ctx.stroke();
    if (i % 2 === 0)
      text(
        ctx,
        `${i}.0米`,
        x,
        energyConstants.trackY + 32,
        p.muted,
        12 * scale,
        'center',
        600
      );
  }
  const comX = mapX(state.centerOfMass);
  ctx.setLineDash([6, 7]);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(comX, energyConstants.centerLineTop);
  ctx.lineTo(comX, energyConstants.trackY - 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(comX, energyConstants.trackY, 7, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '系统质心位置', comX, 145, p.teal, 13 * scale, 'center', 700);
  drawBall(
    ctx,
    mapX(state.positionA),
    'A',
    state.massA,
    state.velocityA,
    p.red,
    p,
    scale
  );
  drawBall(
    ctx,
    mapX(state.positionB),
    'B',
    state.massB,
    state.velocityB,
    p.blue,
    p,
    scale
  );
  text(
    ctx,
    `t = ${state.time.toFixed(2)} 秒`,
    410,
    energyConstants.timelineLabelY,
    p.teal,
    16 * scale,
    'center',
    700
  );
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(energyConstants.timelineStart, energyConstants.timelineY);
  ctx.lineTo(energyConstants.timelineEnd, energyConstants.timelineY);
  ctx.stroke();
  ctx.fillStyle = p.card;
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(
    energyConstants.timelineStart +
      Math.min(
        energyConstants.timelineEnd - energyConstants.timelineStart,
        (state.time / energyConstants.animationPeriod) *
          (energyConstants.timelineEnd - energyConstants.timelineStart)
      ),
    energyConstants.timelineY,
    16,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '手动时间探针',
    energyConstants.timelineStart,
    energyConstants.timelineTitleY,
    p.ink,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '0.0秒（始）',
    energyConstants.timelineStart,
    420,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    `${energyConstants.animationPeriod.toFixed(1)}秒（终）`,
    energyConstants.timelineEnd,
    420,
    p.muted,
    12 * scale,
    'right',
    600
  );
}
function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  label: string,
  mass: number,
  velocity: number,
  color: string,
  p: Palette,
  scale: number
): void {
  const y = energyConstants.trackY - energyConstants.ballRadius - 8;
  const gradient = ctx.createRadialGradient(
    x - 9,
    y - 12,
    4,
    x,
    y,
    energyConstants.ballRadius
  );
  gradient.addColorStop(0, '#fff');
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(1, color);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, energyConstants.ballRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, x, y - 6, '#fff', 19 * scale, 'center', 700);
  text(
    ctx,
    `${mass.toFixed(0)}千克`,
    x,
    y + 16,
    '#fff',
    11 * scale,
    'center',
    700
  );
  const sign = velocity >= 0 ? 1 : -1;
  arrow(
    ctx,
    x,
    y - 42,
    sign * Math.min(92, 32 + Math.abs(velocity) * 12),
    0,
    color
  );
  const velocityLabelY = label === 'A' ? y - 70 : y - 96;
  text(
    ctx,
    `${velocity.toFixed(1)} 米/秒`,
    x + sign * 52,
    velocityLabelY,
    color,
    13 * scale,
    sign > 0 ? 'left' : 'right',
    700
  );
}
function drawAxes(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  p: Palette
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = x0; x <= x1; x += energyConstants.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  for (let y = y0; y <= y1; y += energyConstants.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x1 + 12, y1);
  ctx.moveTo(x0, y1);
  ctx.lineTo(x0, y0 - 10);
  ctx.stroke();
}
function drawVelocityGraph(
  ctx: CanvasRenderingContext2D,
  state: EnergyState,
  p: Palette,
  scale: number
): void {
  const x0 = energyConstants.velocityGraphLeft;
  const x1 = energyConstants.velocityGraphRight;
  const y0 = energyConstants.velocityGraphTop;
  const y1 = energyConstants.velocityGraphBottom;
  card(ctx, 36, 452, 384, 256, p);
  text(ctx, '速度—时间图像', 58, 474, p.ink, 15 * scale, 'left', 700);
  text(ctx, 'A球', 276, 474, p.red, 12 * scale, 'center', 700);
  text(ctx, 'B球', 340, 474, p.blue, 12 * scale, 'center', 700);
  drawAxes(ctx, x0, x1, y0, y1, p);
  const zeroY = (y0 + y1) / 2;
  const vScale = (y1 - y0) / energyConstants.graphForceMax;
  const collisionX =
    x0 +
    ((state.collisionTime ?? 1.8) / energyConstants.animationPeriod) *
      (x1 - x0);
  drawVelocityLine(
    ctx,
    x0,
    collisionX,
    zeroY - (state.initialVelocityA * vScale) / 2,
    p.red
  );
  drawVelocityLine(
    ctx,
    collisionX,
    x1,
    zeroY - (state.velocityA * vScale) / 2,
    p.red
  );
  drawVelocityLine(
    ctx,
    x0,
    collisionX,
    zeroY - (state.initialVelocityB * vScale) / 2,
    p.blue
  );
  drawVelocityLine(
    ctx,
    collisionX,
    x1,
    zeroY - (state.velocityB * vScale) / 2,
    p.blue
  );
  ctx.strokeStyle = p.yellow;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(collisionX, y0);
  ctx.lineTo(collisionX, y1);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, 't', x1 + 12, y1, p.axis, 12 * scale, 'left', 700);
  text(ctx, 'v', x0, y0 - 10, p.axis, 12 * scale, 'center', 700);
  text(ctx, '碰撞', collisionX + 8, y0 + 12, p.yellow, 11 * scale, 'left', 700);
}
function drawVelocityLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
}
function drawEnergyGraph(
  ctx: CanvasRenderingContext2D,
  state: EnergyState,
  p: Palette,
  scale: number
): void {
  const x0 = energyConstants.energyGraphLeft;
  const x1 = energyConstants.energyGraphRight;
  const y0 = energyConstants.energyGraphTop;
  const y1 = energyConstants.energyGraphBottom;
  card(ctx, 426, 452, 348, 256, p);
  text(ctx, '能量分配与转换（焦耳）', 448, 474, p.ink, 15 * scale, 'left', 700);
  drawAxes(ctx, x0, x1, y0, y1, p);
  const values = [
    state.energyA,
    state.energyB,
    state.potentialEnergy,
    state.totalEnergy
  ];
  const labels = ['Eₖ₁', 'Eₖ₂', 'Eₚ', 'E总'];
  const colors = [p.red, p.blue, p.yellow, p.teal];
  const barWidth = 36;
  const step = (x1 - x0 - 30) / values.length;
  values.forEach((value, index) => {
    const x = x0 + 18 + step * index + step / 2;
    const h = Math.max(
      0,
      Math.min(
        y1 - y0 - 20,
        (value / energyConstants.graphEnergyMax) * (y1 - y0 - 20)
      )
    );
    ctx.fillStyle = p.grid;
    ctx.fillRect(x - barWidth / 2, y0 + 12, barWidth, y1 - y0 - 12);
    ctx.fillStyle = colors[index];
    ctx.fillRect(x - barWidth / 2, y1 - h, barWidth, h);
    text(
      ctx,
      value.toFixed(1),
      x,
      y1 - h - 15,
      colors[index],
      12 * scale,
      'center',
      700
    );
    text(ctx, labels[index], x, y1 + 18, p.muted, 12 * scale, 'center', 600);
  });
}
function drawFooter(
  ctx: CanvasRenderingContext2D,
  state: EnergyState,
  p: Palette,
  scale: number
): void {
  text(
    ctx,
    state.collided
      ? '碰撞完成：动量与动能守恒'
      : '调节质量与初速，观察碰撞和能量分配',
    36,
    738,
    p.muted,
    14 * scale,
    'left',
    600
  );
}

export function createEnergyView(options: CreateEnergyViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: energyConstants.baseWidth,
      fallbackHeight: energyConstants.baseHeight
    },
    initialWidth: energyConstants.baseWidth,
    initialHeight: energyConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: EnergyState | null = null;
  function draw(state: EnergyState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(
      width / energyConstants.baseWidth,
      height / energyConstants.baseHeight
    );
    const offsetX = Math.max(0, (width - energyConstants.baseWidth * fit) / 2);
    const offsetY = Math.max(
      0,
      (height - energyConstants.baseHeight * fit) / 2
    );
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawBackground(ctx, PALETTE[env.theme]);
    drawFormulaHeader(ctx, PALETTE[env.theme], scale);
    drawTrack(ctx, state, PALETTE[env.theme], scale);
    drawVelocityGraph(ctx, state, PALETTE[env.theme], scale);
    drawEnergyGraph(ctx, state, PALETTE[env.theme], scale);
    drawFooter(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }
  return {
    render(state: EnergyState) {
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

/** Standard graph entry point for external graph hosts and visual tests. */
export function renderGraph(
  ctx: CanvasRenderingContext2D,
  state: EnergyState,
  theme: TeachingTheme = 'light'
): void {
  const palette = PALETTE[theme];
  drawVelocityGraph(ctx, state, palette, 1);
  drawEnergyGraph(ctx, state, palette, 1);
}
