import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  chargedParticleElectricConstants,
  particleLabel,
  type ChargedParticleElectricState
} from './scene.sim';

export type CreateChargedParticleElectricViewOptions = {
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
  emitterX: EMITTER_X,
  axisY: AXIS_Y,
  accelPlateX: ACCEL_X,
  accelPlateTop: ACCEL_TOP,
  accelPlateBottom: ACCEL_BOTTOM,
  accelPlateHeight: ACCEL_PLATE_H,
  deflectStartX: DEFLECT_START,
  deflectEndX: DEFLECT_END,
  deflectTopY: DEFLECT_TOP,
  deflectBottomY: DEFLECT_BOTTOM,
  screenX: SCREEN_X,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  gridStep: GRID_STEP,
  particleRadius: PARTICLE_R,
  fieldArrowCount: FIELD_ARROWS,
  defaultPlateGap: DEFAULT_GAP,
  screenDistance: SCREEN_DISTANCE,
  maxVisualDeflection: MAX_DEFLECTION,
  reverseExtension: REVERSE_EXTENSION,
  titleY: TITLE_Y,
  panelRuleY: PANEL_RULE_Y,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  metricsCardY: METRICS_Y,
  metricsCardHeight: METRICS_H,
  cardRadius: CARD_RADIUS
} = chargedParticleElectricConstants;

const DEFLECT_GAP = DEFLECT_BOTTOM - DEFLECT_TOP;
const SCREEN_SCALE = MAX_DEFLECTION / 0.18;
const GRID_ALPHA = '30';
const DASH = 7;
const GAP = 6;
const ARROW_HEAD = 10;

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
  ctx.lineTo(x2 - ux * ARROW_HEAD - uy * 5, y2 - uy * ARROW_HEAD + ux * 5);
  ctx.lineTo(x2 - ux * ARROW_HEAD + uy * 5, y2 - uy * ARROW_HEAD - ux * 5);
  ctx.closePath();
  ctx.fill();
}

function gapBounds(state: ChargedParticleElectricState): {
  top: number;
  bottom: number;
} {
  const half = (DEFLECT_GAP * state.params.plateGap) / (DEFAULT_GAP * 2);
  return { top: AXIS_Y - half, bottom: AXIS_Y + half };
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = `${p.grid}${GRID_ALPHA}`;
  ctx.lineWidth = 1;
  for (let x = GRID_STEP; x < FIELD_W; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD_TOP);
    ctx.lineTo(x, FIELD_BOTTOM);
    ctx.stroke();
  }
  for (let y = FIELD_TOP; y < FIELD_BOTTOM; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
}

function drawSource(ctx: CanvasRenderingContext2D, p: Palette): void {
  rounded(ctx, 44, AXIS_Y - 28, 82, 56, 8);
  ctx.fillStyle = p.ink;
  ctx.fill();
  text(ctx, '发射源', 85, AXIS_Y, p.panel, 15, 'center', 700);
  text(ctx, '(+)', EMITTER_X - 14, AXIS_Y - 52, p.red, 18, 'center', 700);
  arrow(ctx, 126, AXIS_Y, ACCEL_X - 18, AXIS_Y, p.red, 2, true);
  text(ctx, '加速电场 E₁', 160, AXIS_Y - 72, p.red, 13, 'center', 700);
  text(ctx, '(→)', 160, AXIS_Y - 52, p.red, 12, 'center', 600);
}

function drawAccelerationPlates(
  ctx: CanvasRenderingContext2D,
  p: Palette
): void {
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.fillRect(ACCEL_X - 9, ACCEL_TOP, 18, ACCEL_PLATE_H);
  ctx.strokeRect(ACCEL_X - 9, ACCEL_TOP, 18, ACCEL_PLATE_H);
  ctx.fillRect(ACCEL_X - 9, ACCEL_BOTTOM - ACCEL_PLATE_H, 18, ACCEL_PLATE_H);
  ctx.strokeRect(ACCEL_X - 9, ACCEL_BOTTOM - ACCEL_PLATE_H, 18, ACCEL_PLATE_H);
  text(ctx, '−', ACCEL_X, ACCEL_TOP - 12, p.blue, 18, 'center', 700);
  text(ctx, '+', ACCEL_X, ACCEL_BOTTOM + 12, p.red, 18, 'center', 700);
  text(ctx, 'U₁', ACCEL_X + 32, ACCEL_BOTTOM + 42, p.ink, 18, 'left', 700);
  text(
    ctx,
    '加速电压',
    ACCEL_X + 32,
    ACCEL_BOTTOM + 64,
    p.muted,
    13,
    'left',
    600
  );
}

function drawDeflectionPlates(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleElectricState,
  p: Palette
): { top: number; bottom: number } {
  const bounds = gapBounds(state);
  const plateHeight = 18;
  ctx.fillStyle = '#c7d2df';
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.fillRect(
    DEFLECT_START,
    bounds.top - plateHeight,
    DEFLECT_END - DEFLECT_START,
    plateHeight
  );
  ctx.strokeRect(
    DEFLECT_START,
    bounds.top - plateHeight,
    DEFLECT_END - DEFLECT_START,
    plateHeight
  );
  ctx.fillRect(
    DEFLECT_START,
    bounds.bottom,
    DEFLECT_END - DEFLECT_START,
    plateHeight
  );
  ctx.strokeRect(
    DEFLECT_START,
    bounds.bottom,
    DEFLECT_END - DEFLECT_START,
    plateHeight
  );
  text(ctx, '+', DEFLECT_START + 22, bounds.top - 28, p.red, 20, 'center', 700);
  text(
    ctx,
    '−',
    DEFLECT_START + 22,
    bounds.bottom + 30,
    p.blue,
    20,
    'center',
    700
  );
  text(
    ctx,
    '偏转电场 E₂',
    DEFLECT_END - 12,
    bounds.top - 28,
    p.muted,
    13,
    'right',
    700
  );
  text(
    ctx,
    `d = ${state.params.plateGap.toFixed(1)} cm`,
    DEFLECT_START - 12,
    AXIS_Y,
    p.muted,
    13,
    'right',
    600
  );
  const fieldDirection = state.params.deflectVoltage >= 0 ? 1 : -1;
  const arrowColor = fieldDirection > 0 ? p.blue : p.red;
  for (let index = 0; index < FIELD_ARROWS; index += 1) {
    const x =
      DEFLECT_START +
      34 +
      index * ((DEFLECT_END - DEFLECT_START - 68) / (FIELD_ARROWS - 1));
    arrow(
      ctx,
      x,
      fieldDirection > 0 ? bounds.top + 20 : bounds.bottom - 20,
      x,
      fieldDirection > 0 ? bounds.bottom - 20 : bounds.top + 20,
      arrowColor,
      2
    );
  }
  return bounds;
}

function drawScreen(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleElectricState,
  p: Palette
): void {
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(SCREEN_X, FIELD_TOP + 8);
  ctx.lineTo(SCREEN_X, FIELD_BOTTOM - 8);
  ctx.stroke();
  const y = AXIS_Y + state.screenY * SCREEN_SCALE;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SCREEN_X + 18, AXIS_Y);
  ctx.lineTo(SCREEN_X + 18, y);
  ctx.stroke();
  text(ctx, '荧光屏', SCREEN_X, FIELD_TOP - 10, p.ink, 15, 'center', 700);
  text(
    ctx,
    `Y = ${(Math.abs(state.screenY) * 100).toFixed(2)} cm`,
    SCREEN_X + 34,
    y,
    p.red,
    14,
    'left',
    700
  );
  ctx.strokeStyle = `${p.muted}88`;
  ctx.setLineDash([DASH, GAP]);
  ctx.beginPath();
  ctx.moveTo(DEFLECT_END, AXIS_Y);
  ctx.lineTo(SCREEN_X, AXIS_Y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleElectricState,
  p: Palette
): void {
  const exitY = AXIS_Y + state.y * SCREEN_SCALE;
  const screenY = AXIS_Y + state.screenY * SCREEN_SCALE;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(EMITTER_X, AXIS_Y);
  ctx.lineTo(DEFLECT_START, AXIS_Y);
  ctx.quadraticCurveTo(
    DEFLECT_START + (DEFLECT_END - DEFLECT_START) * 0.42,
    AXIS_Y + state.y * SCREEN_SCALE * 0.15,
    DEFLECT_END,
    exitY
  );
  ctx.lineTo(SCREEN_X, screenY);
  ctx.stroke();
  if (state.params.showReverse) {
    ctx.strokeStyle = `${p.teal}bb`;
    ctx.setLineDash([DASH, GAP]);
    ctx.beginPath();
    ctx.moveTo(
      DEFLECT_END - REVERSE_EXTENSION,
      AXIS_Y - (screenY - AXIS_Y) * 0.44
    );
    ctx.lineTo(DEFLECT_END, exitY);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      '反向延长线',
      DEFLECT_END - REVERSE_EXTENSION,
      AXIS_Y - 62,
      p.teal,
      12,
      'left',
      600
    );
  }
}

function drawComponents(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleElectricState,
  p: Palette
): void {
  if (!state.params.showComponents) return;
  const { x, y } = state.particlePosition;
  const direction =
    state.particleSign * (state.params.deflectVoltage >= 0 ? 1 : -1);
  const vx = 52;
  const vy =
    direction *
    Math.min(
      70,
      Math.abs(state.tanTheta) * 140 * Math.max(0.25, state.progress)
    );
  arrow(ctx, x, y, x + vx, y, p.blue, 3);
  arrow(ctx, x, y, x, y + vy, p.red, 3);
  text(ctx, 'v₀', x + vx + 14, y, p.blue, 13, 'left', 700);
  text(ctx, 'vᵧ', x + 8, y + vy + (vy < 0 ? -12 : 12), p.red, 13, 'left', 700);
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleElectricState,
  p: Palette
): void {
  const { x, y } = state.particlePosition;
  ctx.beginPath();
  ctx.arc(x, y, PARTICLE_R, 0, Math.PI * 2);
  ctx.fillStyle = state.params.particle === 'electron' ? p.red : p.blue;
  ctx.fill();
  ctx.strokeStyle = p.panel;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    state.params.particle === 'electron' ? '−' : '+',
    x,
    y,
    p.panel,
    13,
    'center',
    700
  );
  drawComponents(ctx, state, p);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleElectricState,
  p: Palette,
  scale: number
): void {
  const x = PANEL_X + PANEL_INSET;
  const w = PANEL_W - PANEL_INSET * 2;
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, PANEL_W, BASE_H);
  text(ctx, '带电粒子电场运动', x, TITLE_Y, p.ink, 22 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(x + w, PANEL_RULE_Y);
  ctx.stroke();
  rounded(ctx, x, METRICS_Y, w, METRICS_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '实时参数板',
    x + 14,
    METRICS_Y + 26,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    particleLabel(state.params.particle),
    x + w - 14,
    METRICS_Y + 26,
    p.teal,
    13 * scale,
    'right',
    700
  );
  const rows = [
    ['入场初速度 v₀', `${(state.v0 / 1e5).toFixed(2)} × 10⁵ m/s`, p.ink],
    ['出板侧移 |y|', `${(Math.abs(state.y) * 100).toFixed(2)} cm`, p.blue],
    [
      '偏转正切 |tan θ|',
      `${Math.abs(state.tanTheta).toFixed(3)} (${Math.abs(state.theta).toFixed(1)}°)`,
      p.ink
    ],
    ['屏上侧移 |Y|', `${(Math.abs(state.screenY) * 100).toFixed(2)} cm`, p.red]
  ] as const;
  rows.forEach(([label, value, color], index) => {
    const y = METRICS_Y + 66 + index * 38;
    text(ctx, label, x + 14, y, p.muted, 14 * scale, 'left', 600);
    text(ctx, value, x + w - 14, y, color, 14 * scale, 'right', 700);
    if (index < rows.length - 1) {
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 20);
      ctx.lineTo(x + w - 12, y + 20);
      ctx.stroke();
    }
  });
  rounded(ctx, x, FORMULA_Y, w, FORMULA_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '核心理论推导',
    x + 14,
    FORMULA_Y + 24,
    p.green,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    '① |q|U₁ = ½mv₀²',
    x + 14,
    FORMULA_Y + 54,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    '② F = |q|U₂/d',
    x + 14,
    FORMULA_Y + 82,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    '③ |y| = |U₂|L²/(4dU₁)',
    x + 14,
    FORMULA_Y + 110,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    '正电荷与 E₂ 同向，负电荷反向',
    x + 14,
    FORMULA_Y + 144,
    p.muted,
    12 * scale,
    'left',
    600
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleElectricState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  text(
    ctx,
    '带电粒子在匀强电场中的加速与偏转',
    26,
    TITLE_Y,
    p.ink,
    22 * scale,
    'left',
    700
  );
  drawSource(ctx, p);
  drawAccelerationPlates(ctx, p);
  drawDeflectionPlates(ctx, state, p);
  drawTrajectory(ctx, state, p);
  drawScreen(ctx, state, p);
  drawParticle(ctx, state, p);
  text(
    ctx,
    `L = ${(chargedParticleElectricConstants.plateLength * 100).toFixed(1)} cm`,
    DEFLECT_START + 12,
    DEFLECT_TOP - 54,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    `D = ${(SCREEN_DISTANCE * 100).toFixed(1)} cm`,
    DEFLECT_END + 28,
    FIELD_BOTTOM - 30,
    p.muted,
    13,
    'left',
    600
  );
  drawPanel(ctx, state, p, scale);
}

export function createChargedParticleElectricView(
  options: CreateChargedParticleElectricViewOptions = {}
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
  let snapshot: ChargedParticleElectricState | null = null;
  function draw(state: ChargedParticleElectricState): void {
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
    render(state: ChargedParticleElectricState): void {
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
