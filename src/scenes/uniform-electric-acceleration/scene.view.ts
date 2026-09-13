import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  uniformElectricAccelerationConstants,
  type UniformElectricAccelerationState
} from './scene.sim';

export type CreateUniformElectricAccelerationViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelX: PANEL_X,
  panelWidth: PANEL_W,
  panelInset: PANEL_INSET,
  plateLeft: PLATE_LEFT,
  plateTop: PLATE_TOP,
  plateBottom: PLATE_BOTTOM,
  axisY: AXIS_Y,
  gapScale: GAP_SCALE,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  gridStep: GRID_STEP,
  particleRadius: PARTICLE_R,
  titleY: TITLE_Y,
  panelRuleY: PANEL_RULE_Y,
  metricsCardY: METRICS_Y,
  metricsCardHeight: METRICS_H,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  energyCardX: ENERGY_X,
  energyCardY: ENERGY_Y,
  energyCardWidth: ENERGY_W,
  energyCardHeight: ENERGY_H,
  cardRadius: CARD_RADIUS
} = uniformElectricAccelerationConstants;

const GRID_ALPHA = '30';
const DASH = 8;
const GAP = 6;

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  soft: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  green: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfe',
    panel: '#ffffff',
    ink: '#303b4d',
    muted: '#78869b',
    border: '#d5deea',
    grid: '#d4deea',
    soft: '#f0f4f8',
    blue: '#2f7ed8',
    red: '#f05252',
    teal: '#1eaa91',
    gold: '#ef9616',
    green: '#31a66b'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef4fb',
    muted: '#a9b7ca',
    border: '#40506a',
    grid: '#2c3d58',
    soft: '#223149',
    blue: '#67a6ff',
    red: '#fb7185',
    teal: '#38d6b3',
    gold: '#fbbf24',
    green: '#63d995'
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

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = CARD_RADIUS
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 3,
  dashed = false
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [DASH, GAP] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 11 - uy * 5, y2 - uy * 11 + ux * 5);
  ctx.lineTo(x2 - ux * 11 + uy * 5, y2 - uy * 11 - ux * 5);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = `${p.grid}${GRID_ALPHA}`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD_W; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD_TOP);
    ctx.lineTo(x, FIELD_BOTTOM);
    ctx.stroke();
  }
  for (let y = FIELD_TOP; y <= FIELD_BOTTOM; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
}

function drawDimension(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  gap: number,
  p: Palette
): void {
  const y = 148;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.moveTo(left, y - 9);
  ctx.lineTo(left, y + 9);
  ctx.moveTo(right, y - 9);
  ctx.lineTo(right, y + 9);
  ctx.stroke();
  text(
    ctx,
    `极板间距 d = ${gap.toFixed(1)} cm`,
    (left + right) / 2,
    y - 16,
    p.muted,
    13,
    'center',
    700
  );
}

function drawPlates(
  ctx: CanvasRenderingContext2D,
  state: UniformElectricAccelerationState,
  p: Palette
): { left: number; right: number } {
  const left = PLATE_LEFT;
  const right = left + state.params.plateGap * GAP_SCALE;
  drawDimension(ctx, left, right, state.params.plateGap, p);
  ctx.fillStyle = p.red;
  ctx.fillRect(left - 9, PLATE_TOP, 18, PLATE_BOTTOM - PLATE_TOP);
  ctx.fillStyle = p.blue;
  ctx.fillRect(right - 9, PLATE_TOP, 18, PLATE_BOTTOM - PLATE_TOP);
  text(ctx, '极板 A（电势 U）', left, 188, p.red, 15, 'center', 700);
  const rightLabelX = right < ENERGY_X ? right : ENERGY_X - 8;
  text(
    ctx,
    '极板 B（电势 0）',
    rightLabelX,
    188,
    p.blue,
    15,
    right < ENERGY_X ? 'center' : 'right',
    700
  );
  for (let y = PLATE_TOP + 42; y < PLATE_BOTTOM - 20; y += 62) {
    text(ctx, '+', left, y, p.panel, 18, 'center', 700);
    text(ctx, '−', right, y, p.panel, 18, 'center', 700);
  }
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(32, AXIS_Y);
  ctx.lineTo(FIELD_W - 26, AXIS_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let index = 0; index < 5; index += 1) {
    const x = left + 34 + ((right - left - 68) * index) / 4;
    arrow(ctx, x, AXIS_Y - 76, x + 42, AXIS_Y - 76, p.blue, 2);
    arrow(ctx, x, AXIS_Y + 76, x + 42, AXIS_Y + 76, p.blue, 2);
  }
  text(
    ctx,
    `E = U / d = ${state.electricField.toFixed(0)} N/C`,
    (left + right) / 2,
    624,
    p.blue,
    14,
    'center',
    700
  );
  return { left, right };
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  state: UniformElectricAccelerationState,
  bounds: { left: number; right: number },
  p: Palette
): void {
  const x =
    bounds.left + 28 + (bounds.right - bounds.left - 56) * state.progress;
  ctx.fillStyle = `${p.gold}35`;
  ctx.beginPath();
  ctx.arc(x, AXIS_Y, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.gold;
  ctx.beginPath();
  ctx.arc(x, AXIS_Y, PARTICLE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.panel;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '+q', x, AXIS_Y, p.panel, 11, 'center', 700);
  if (state.params.showVectors) {
    const vectorScale = 26 + 42 * state.progress;
    arrow(
      ctx,
      x + 18,
      AXIS_Y - 20,
      x + 18 + vectorScale,
      AXIS_Y - 20,
      p.red,
      3
    );
    arrow(
      ctx,
      x + 18,
      AXIS_Y + 38,
      x + 18 + vectorScale * 0.72,
      AXIS_Y + 38,
      p.teal,
      3
    );
    text(
      ctx,
      `v = ${(state.speed / 1e5).toFixed(2)}×10⁵ m/s`,
      x + 24,
      AXIS_Y - 47,
      p.red,
      12,
      'left',
      700
    );
    text(ctx, 'F = qE', x + 24, AXIS_Y + 64, p.teal, 12, 'left', 700);
  }
  text(ctx, 'v₀ = 0', bounds.left - 28, AXIS_Y - 34, p.muted, 12, 'right', 600);
  text(
    ctx,
    `x = ${(state.position * 100).toFixed(1)} cm`,
    x,
    AXIS_Y + 92,
    p.ink,
    12,
    'center',
    700
  );
}

function drawEnergyCard(
  ctx: CanvasRenderingContext2D,
  state: UniformElectricAccelerationState,
  p: Palette
): void {
  rounded(ctx, ENERGY_X, ENERGY_Y, ENERGY_W, ENERGY_H, 10);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '系统能量转化',
    ENERGY_X + ENERGY_W / 2,
    ENERGY_Y + 20,
    p.ink,
    15,
    'center',
    700
  );
  const barTop = ENERGY_Y + 52;
  const barX = ENERGY_X + ENERGY_W * 0.26;
  const barWidth = ENERGY_W * 0.58;
  const barHeight = 16;
  const potential = Math.max(0, 1 - state.progress);
  const kinetic = state.progress;
  const drawBar = (
    y: number,
    value: number,
    color: string,
    label: string,
    percent: string
  ) => {
    text(
      ctx,
      label,
      ENERGY_X + 14,
      y + barHeight / 2,
      p.muted,
      11,
      'left',
      600
    );
    ctx.fillStyle = p.soft;
    ctx.fillRect(barX, y, barWidth, barHeight);
    ctx.fillStyle = color;
    ctx.fillRect(barX, y, barWidth * value, barHeight);
    text(
      ctx,
      percent,
      ENERGY_X + ENERGY_W * 0.94,
      y + barHeight / 2,
      color,
      11,
      'right',
      700
    );
  };
  drawBar(
    barTop,
    potential,
    p.blue,
    '电势能',
    `${Math.round(potential * 100)}%`
  );
  drawBar(barTop + 38, kinetic, p.red, '动能', `${Math.round(kinetic * 100)}%`);
  text(
    ctx,
    'W = qU = ΔEₖ',
    ENERGY_X + ENERGY_W / 2,
    ENERGY_Y + ENERGY_H - 14,
    p.green,
    13,
    'center',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: UniformElectricAccelerationState,
  p: Palette,
  scale: number
): void {
  const x = PANEL_X + PANEL_INSET;
  const width = PANEL_W - PANEL_INSET * 2;
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, PANEL_W, BASE_H);
  text(ctx, '匀强电场加速', x, TITLE_Y, p.ink, 22 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(x + width, PANEL_RULE_Y);
  ctx.stroke();
  rounded(ctx, x, METRICS_Y, width, METRICS_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(ctx, '实时读数', x + 14, METRICS_Y + 24, p.ink, 16 * scale, 'left', 700);
  const rows = [
    ['电场强度 E', `${state.electricField.toFixed(0)} N/C`, p.blue],
    ['电场力 F', `${state.force.toExponential(2)} N`, p.teal],
    ['位移 x', `${(state.position * 100).toFixed(1)} cm`, p.ink],
    ['速度 v', `${(state.speed / 1e5).toFixed(2)}×10⁵ m/s`, p.red],
    ['做功 W', `${state.work.toExponential(2)} J`, p.gold],
    ['末速度 v末', `${(state.finalSpeed / 1e5).toFixed(2)}×10⁵ m/s`, p.green]
  ] as const;
  rows.forEach(([label, value, color], index) => {
    const y = METRICS_Y + 55 + index * 34;
    text(ctx, label, x + 14, y, p.muted, 13 * scale, 'left', 600);
    text(ctx, value, x + width - 14, y, color, 13 * scale, 'right', 700);
    if (index < rows.length - 1) {
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 16);
      ctx.lineTo(x + width - 12, y + 16);
      ctx.stroke();
    }
  });
  rounded(ctx, x, FORMULA_Y, width, FORMULA_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '动能定理',
    x + 14,
    FORMULA_Y + 24,
    p.green,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'E = U / d',
    x + 14,
    FORMULA_Y + 58,
    p.ink,
    15 * scale,
    'left',
    600
  );
  text(ctx, 'F = qE', x + 14, FORMULA_Y + 88, p.ink, 15 * scale, 'left', 600);
  text(
    ctx,
    'W = qU = ½mv²',
    x + 14,
    FORMULA_Y + 118,
    p.red,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'v末 = √(2qU / m)',
    x + 14,
    FORMULA_Y + 150,
    p.red,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    '改变 d：E、F、时间变化；v末不变',
    x + 14,
    FORMULA_Y + 190,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    `U = ${state.params.voltage.toFixed(0)} V · d = ${state.params.plateGap.toFixed(1)} cm`,
    x + 14,
    FORMULA_Y + 214,
    p.muted,
    12 * scale,
    'left',
    600
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: UniformElectricAccelerationState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  text(
    ctx,
    '带电粒子在匀强电场中的加速',
    26,
    TITLE_Y,
    p.ink,
    22 * scale,
    'left',
    700
  );
  text(
    ctx,
    '调节 U、d、q、m，观察受力与能量',
    28,
    TITLE_Y + 27,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    '末速度只由 qU/m 决定，与极板间距 d 无关',
    26,
    100,
    p.red,
    15 * scale,
    'left',
    700
  );
  drawEnergyCard(ctx, state, p);
  const bounds = drawPlates(ctx, state, p);
  drawParticle(ctx, state, bounds, p);
  drawPanel(ctx, state, p, scale);
}

export function createUniformElectricAccelerationView(
  options: CreateUniformElectricAccelerationViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BASE_W, fallbackHeight: BASE_H },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: UniformElectricAccelerationState | null = null;
  function draw(state: UniformElectricAccelerationState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    drawField(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }
  return {
    render(state: UniformElectricAccelerationState): void {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    },
    reset(): void {
      snapshot = null;
    }
  };
}
