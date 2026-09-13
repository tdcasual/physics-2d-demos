import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  electricDeflectionConstants,
  particleLabel,
  type ElectricDeflectionState
} from './scene.sim';

export type CreateElectricDeflectionViewOptions = {
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
  plateStartX: PLATE_START,
  plateEndX: PLATE_END,
  defaultGapVisual: DEFAULT_GAP_VISUAL,
  gapVisualRange: GAP_VISUAL_RANGE,
  screenX: SCREEN_X,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  gridStep: GRID_STEP,
  particleRadius: PARTICLE_R,
  fieldArrowCount: FIELD_ARROWS,
  maxVisualDeflection: MAX_DEFLECTION,
  visualScale: VISUAL_SCALE,
  titleY: TITLE_Y,
  panelRuleY: PANEL_RULE_Y,
  metricsCardY: METRICS_Y,
  metricsCardHeight: METRICS_H,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  cardRadius: CARD_RADIUS
} = electricDeflectionConstants;

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
  width = 2,
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
  ctx.setLineDash(dashed ? [7, 6] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 9 - uy * 4, y2 - uy * 9 + ux * 4);
  ctx.lineTo(x2 - ux * 9 + uy * 4, y2 - uy * 9 - ux * 4);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = `${p.grid}34`;
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

function drawPlates(
  ctx: CanvasRenderingContext2D,
  state: ElectricDeflectionState,
  p: Palette
): { top: number; bottom: number } {
  const gapVisual =
    DEFAULT_GAP_VISUAL + ((state.params.plateGap - 30) / 30) * GAP_VISUAL_RANGE;
  const top = AXIS_Y - gapVisual / 2;
  const bottom = AXIS_Y + gapVisual / 2;
  const plateHeight = 18;
  ctx.fillStyle = `${p.red}28`;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2;
  ctx.fillRect(
    PLATE_START,
    top - plateHeight,
    PLATE_END - PLATE_START,
    plateHeight
  );
  ctx.strokeRect(
    PLATE_START,
    top - plateHeight,
    PLATE_END - PLATE_START,
    plateHeight
  );
  ctx.fillStyle = `${p.blue}28`;
  ctx.strokeStyle = p.blue;
  ctx.fillRect(PLATE_START, bottom, PLATE_END - PLATE_START, plateHeight);
  ctx.strokeRect(PLATE_START, bottom, PLATE_END - PLATE_START, plateHeight);
  text(ctx, '+', PLATE_START + 22, top - 29, p.red, 22, 'center', 700);
  text(ctx, '−', PLATE_START + 22, bottom + 30, p.blue, 22, 'center', 700);
  text(ctx, '偏转电场 E', PLATE_END - 10, top - 29, p.muted, 13, 'right', 700);
  text(
    ctx,
    `d = ${state.params.plateGap.toFixed(1)} cm`,
    PLATE_START - 12,
    AXIS_Y,
    p.muted,
    13,
    'right',
    600
  );
  if (state.params.showField && state.params.voltage > 0) {
    for (let index = 0; index < FIELD_ARROWS; index += 1) {
      const x =
        PLATE_START +
        36 +
        index * ((PLATE_END - PLATE_START - 72) / (FIELD_ARROWS - 1));
      arrow(ctx, x, top + 24, x, bottom - 24, p.blue, 2);
    }
  }
  return { top, bottom };
}

function drawSource(ctx: CanvasRenderingContext2D, p: Palette): void {
  rounded(ctx, 28, AXIS_Y - 27, 92, 54, 8);
  ctx.fillStyle = p.ink;
  ctx.fill();
  text(ctx, '粒子源', 74, AXIS_Y, p.panel, 15, 'center', 700);
  arrow(ctx, 122, AXIS_Y, PLATE_START - 18, AXIS_Y, p.teal, 2, true);
  text(ctx, 'v₀', 164, AXIS_Y - 19, p.teal, 14, 'center', 700);
}

function drawScreen(
  ctx: CanvasRenderingContext2D,
  state: ElectricDeflectionState,
  p: Palette
): void {
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(SCREEN_X, FIELD_TOP + 14);
  ctx.lineTo(SCREEN_X, FIELD_BOTTOM - 14);
  ctx.stroke();
  text(ctx, '接收屏', SCREEN_X, FIELD_TOP - 11, p.ink, 15, 'center', 700);
  const screenY = AXIS_Y + clampVisual(state.screenDeflection * VISUAL_SCALE);
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SCREEN_X + 18, AXIS_Y);
  ctx.lineTo(SCREEN_X + 18, screenY);
  ctx.stroke();
  text(
    ctx,
    `y = ${(Math.abs(state.screenDeflection) * 100).toFixed(1)} cm`,
    SCREEN_X + 33,
    screenY,
    p.red,
    14,
    'left',
    700
  );
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  state: ElectricDeflectionState,
  p: Palette,
  plateBounds: { top: number; bottom: number }
): void {
  const deflectPx = clampVisual(state.deflection * VISUAL_SCALE);
  const screenPx = clampVisual(state.screenDeflection * VISUAL_SCALE);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(EMITTER_X, AXIS_Y);
  ctx.lineTo(PLATE_START, AXIS_Y);
  ctx.quadraticCurveTo(
    PLATE_START + (PLATE_END - PLATE_START) * 0.42,
    AXIS_Y + deflectPx * 0.18,
    PLATE_END,
    AXIS_Y + deflectPx
  );
  ctx.lineTo(SCREEN_X, AXIS_Y + screenPx);
  ctx.stroke();
  ctx.strokeStyle = `${p.muted}99`;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(0, AXIS_Y);
  ctx.lineTo(FIELD_W, AXIS_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  const midpointX = (PLATE_START + PLATE_END) / 2;
  ctx.strokeStyle = `${p.gold}e6`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(midpointX, AXIS_Y);
  ctx.lineTo(SCREEN_X, AXIS_Y + screenPx);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.gold;
  ctx.beginPath();
  ctx.arc(midpointX, AXIS_Y, 6, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    'L/2',
    midpointX,
    plateBounds.bottom + 45,
    p.gold,
    13,
    'center',
    700
  );
  ctx.strokeStyle = `${p.gold}66`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PLATE_END, plateBounds.top + 18);
  ctx.lineTo(PLATE_END, plateBounds.bottom - 18);
  ctx.stroke();
  text(
    ctx,
    `L = ${(electricDeflectionConstants.plateLength * 100).toFixed(0)} cm`,
    (PLATE_START + PLATE_END) / 2,
    plateBounds.bottom + 66,
    p.muted,
    13,
    'center',
    600
  );
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  state: ElectricDeflectionState,
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
  if (!state.params.showComponents) return;
  arrow(ctx, x, y, x + 52, y, p.blue, 3);
  const forceDirection = state.particleSign < 0 ? -1 : 1;
  arrow(ctx, x + 4, y, x + 4, y + forceDirection * 44, p.red, 3);
  text(ctx, 'v₀', x + 62, y, p.blue, 13, 'left', 700);
  text(ctx, 'F', x + 14, y + forceDirection * 55, p.red, 13, 'left', 700);
}

function clampVisual(value: number): number {
  return Math.max(-MAX_DEFLECTION, Math.min(MAX_DEFLECTION, value));
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ElectricDeflectionState,
  p: Palette,
  scale: number
): void {
  const x = PANEL_X + PANEL_INSET;
  const w = PANEL_W - PANEL_INSET * 2;
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, PANEL_W, BASE_H);
  text(ctx, '电场偏转', x, TITLE_Y, p.ink, 22 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(x + w, PANEL_RULE_Y);
  ctx.stroke();
  rounded(ctx, x, METRICS_Y, w, METRICS_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(ctx, '实时读数', x + 14, METRICS_Y + 25, p.ink, 16 * scale, 'left', 700);
  text(
    ctx,
    particleLabel(state.params.particle),
    x + w - 14,
    METRICS_Y + 25,
    p.teal,
    13 * scale,
    'right',
    700
  );
  const rows = [
    ['场强 E', `${state.field.toFixed(1)} V/m`, p.blue],
    [
      '出板偏转 |y|',
      `${(Math.abs(state.deflection) * 100).toFixed(1)} cm`,
      p.red
    ],
    [
      '屏上偏转 |Y|',
      `${(Math.abs(state.screenDeflection) * 100).toFixed(1)} cm`,
      p.red
    ],
    ['偏转角 |θ|', `${Math.abs(state.theta).toFixed(1)}°`, p.ink],
    ['状态', state.status, state.safe ? p.green : p.red]
  ] as const;
  rows.forEach(([label, value, color], index) => {
    const y = METRICS_Y + 59 + index * 39;
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
  text(ctx, '关系', x + 14, FORMULA_Y + 24, p.green, 15 * scale, 'left', 700);
  text(
    ctx,
    'E = U / d',
    x + 14,
    FORMULA_Y + 57,
    p.ink,
    15 * scale,
    'left',
    600
  );
  text(ctx, 'y = ½at²', x + 14, FORMULA_Y + 88, p.ink, 15 * scale, 'left', 600);
  text(
    ctx,
    'tan θ = vᵧ / v₀',
    x + 14,
    FORMULA_Y + 119,
    p.ink,
    15 * scale,
    'left',
    600
  );
  text(
    ctx,
    '反向延长线交于 L/2',
    x + 14,
    FORMULA_Y + 157,
    p.muted,
    12 * scale,
    'left',
    600
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: ElectricDeflectionState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  text(
    ctx,
    '带电粒子在匀强电场中的偏转',
    26,
    TITLE_Y,
    p.ink,
    22 * scale,
    'left',
    700
  );
  text(ctx, '类平抛运动', 28, TITLE_Y + 28, p.muted, 13 * scale, 'left', 600);
  drawSource(ctx, p);
  const bounds = drawPlates(ctx, state, p);
  drawTrajectory(ctx, state, p, bounds);
  drawScreen(ctx, state, p);
  drawParticle(ctx, state, p);
  drawPanel(ctx, state, p, scale);
}

export function createElectricDeflectionView(
  options: CreateElectricDeflectionViewOptions = {}
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
  let snapshot: ElectricDeflectionState | null = null;
  function draw(state: ElectricDeflectionState): void {
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
    render(state: ElectricDeflectionState): void {
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
