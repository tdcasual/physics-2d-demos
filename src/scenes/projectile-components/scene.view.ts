import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  projectileComponentsConstants,
  type ProjectileComponentsPoint,
  type ProjectileComponentsState
} from './scene.sim';

export type CreateProjectileComponentsViewOptions = {
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
  originX: ORIGIN_X,
  groundY: GROUND_Y,
  axisTopY: AXIS_TOP_Y,
  xScale: X_SCALE,
  yScale: Y_SCALE,
  gridMeters: GRID_METERS,
  trajectorySamples: TRAJECTORY_SAMPLES,
  pointRadius: POINT_RADIUS,
  shadowRadius: SHADOW_RADIUS,
  currentRadius: CURRENT_RADIUS,
  vectorScale: VECTOR_SCALE,
  vectorCap: VECTOR_CAP,
  titleY: TITLE_Y,
  formulaX: FORMULA_X,
  formulaY: FORMULA_Y,
  formulaWidth: FORMULA_W,
  formulaHeight: FORMULA_H,
  metricsCardX: METRICS_X,
  metricsCardY: METRICS_Y,
  metricsCardWidth: METRICS_W,
  metricsCardHeight: METRICS_H,
  tableCardY: TABLE_Y,
  tableCardHeight: TABLE_H,
  optionsCardY: OPTIONS_Y,
  optionsCardHeight: OPTIONS_H,
  panelRuleY: PANEL_RULE_Y,
  rowGap: ROW_GAP,
  tableRowGap: TABLE_ROW_GAP
} = projectileComponentsConstants;

const GRID_COLOR_ALPHA = '28';
const DASH = 7;
const GAP = 6;
const ARROW_HEAD = 12;
const CARD_RADIUS = 12;
const STROBE_DASH = 5;
const STROBE_GAP = 4;

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
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#7c8796',
    border: '#d3dbe4',
    grid: '#d7dfe7',
    soft: '#f1f4f7',
    blue: '#4b6ff2',
    red: '#ef4050',
    teal: '#249c8f',
    gold: '#ee950f'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    grid: '#2d3e57',
    soft: '#253249',
    blue: '#6d8bff',
    red: '#fb7185',
    teal: '#34d399',
    gold: '#fbbf24'
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
  height: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, CARD_RADIUS);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 4,
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
  ctx.lineTo(x2 - ux * ARROW_HEAD - uy * 6, y2 - uy * ARROW_HEAD + ux * 6);
  ctx.lineTo(x2 - ux * ARROW_HEAD + uy * 6, y2 - uy * ARROW_HEAD - ux * 6);
  ctx.closePath();
  ctx.fill();
}

function launchY(state: ProjectileComponentsState): number {
  return GROUND_Y - state.params.initialHeight * Y_SCALE;
}

function pointPosition(
  state: ProjectileComponentsState,
  point: ProjectileComponentsPoint
): { x: number; y: number } {
  const startY = launchY(state);
  return {
    x: ORIGIN_X + point.x * X_SCALE,
    y: startY + point.verticalDisplacement * Y_SCALE
  };
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  const startY = launchY(state);
  ctx.strokeStyle = `${p.grid}${GRID_COLOR_ALPHA}`;
  ctx.lineWidth = 1;
  const gridXStep = GRID_METERS * X_SCALE;
  const gridYStep = GRID_METERS * Y_SCALE;
  for (let x = ORIGIN_X; x <= FIELD_W; x += gridXStep) {
    ctx.beginPath();
    ctx.moveTo(x, AXIS_TOP_Y);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }
  for (let y = Math.max(AXIS_TOP_Y, startY); y <= GROUND_Y; y += gridYStep) {
    ctx.beginPath();
    ctx.moveTo(ORIGIN_X, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette,
  scale: number
): void {
  const startY = launchY(state);
  ctx.strokeStyle = p.ink;
  ctx.fillStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ORIGIN_X, startY);
  ctx.lineTo(FIELD_W - 28, startY);
  ctx.stroke();
  arrow(ctx, FIELD_W - 58, startY, FIELD_W - 18, startY, p.ink, 3);
  ctx.beginPath();
  ctx.moveTo(ORIGIN_X, AXIS_TOP_Y);
  ctx.lineTo(ORIGIN_X, GROUND_Y + 22);
  ctx.stroke();
  arrow(ctx, ORIGIN_X, GROUND_Y - 18, ORIGIN_X, GROUND_Y + 22, p.ink, 3);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ORIGIN_X, GROUND_Y);
  ctx.lineTo(FIELD_W - 32, GROUND_Y);
  ctx.stroke();
  text(ctx, 'x', FIELD_W - 14, startY - 12, p.ink, 17 * scale, 'center', 700);
  text(
    ctx,
    'y',
    ORIGIN_X - 14,
    GROUND_Y + 22,
    p.ink,
    17 * scale,
    'center',
    700
  );
  text(ctx, '0', ORIGIN_X - 16, startY - 18, p.muted, 13 * scale, 'center');
  text(ctx, 'h₀', ORIGIN_X + 20, startY - 24, p.muted, 13 * scale, 'left', 700);
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette
): void {
  if (!state.params.showTrajectory) return;
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let index = 0; index <= TRAJECTORY_SAMPLES; index += 1) {
    const point = {
      ...state.points[0],
      time: (state.flightTime * index) / TRAJECTORY_SAMPLES,
      index
    };
    const positioned = pointPosition(state, {
      ...point,
      x: state.params.speed * point.time,
      verticalDisplacement: 0.5 * state.params.gravity * point.time * point.time
    });
    if (index === 0) ctx.moveTo(positioned.x, positioned.y);
    else ctx.lineTo(positioned.x, positioned.y);
  }
  ctx.stroke();
}

function drawStrobePoints(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette
): void {
  state.points.forEach((point) => {
    const positioned = pointPosition(state, point);
    if (state.params.showShadows) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = p.blue;
      ctx.beginPath();
      ctx.arc(positioned.x, launchY(state), SHADOW_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.red;
      ctx.beginPath();
      ctx.arc(ORIGIN_X, positioned.y, SHADOW_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (state.params.showStrobe) {
      ctx.strokeStyle = p.gold;
      ctx.lineWidth = 2;
      ctx.setLineDash([STROBE_DASH, STROBE_GAP]);
      ctx.beginPath();
      ctx.arc(positioned.x, positioned.y, POINT_RADIUS + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = p.gold;
      ctx.beginPath();
      ctx.arc(positioned.x, positioned.y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      text(
        ctx,
        `${point.time.toFixed(1)}s`,
        positioned.x + 16,
        positioned.y - 18,
        p.gold,
        14,
        'left',
        700
      );
    }
  });
}

function drawVectors(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette,
  scale: number
): void {
  if (!state.params.showVectors) return;
  const current = pointPosition(state, {
    index: 0,
    time: state.time,
    x: state.x,
    verticalDisplacement: state.verticalDisplacement,
    height: state.height,
    vy: state.vy
  });
  const horizontalLength = Math.min(
    VECTOR_CAP,
    Math.max(18, state.vx * VECTOR_SCALE)
  );
  const verticalLength = Math.min(
    VECTOR_CAP,
    Math.max(18, state.vy * VECTOR_SCALE)
  );
  arrow(
    ctx,
    current.x,
    current.y,
    current.x + horizontalLength,
    current.y,
    p.blue,
    5
  );
  arrow(
    ctx,
    current.x,
    current.y,
    current.x,
    current.y + verticalLength,
    p.red,
    5
  );
  arrow(
    ctx,
    current.x,
    current.y,
    current.x + horizontalLength,
    current.y + verticalLength,
    p.teal,
    5
  );
  text(
    ctx,
    'vₓ',
    current.x + horizontalLength + 16,
    current.y - 14,
    p.blue,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    'vᵧ',
    current.x - 18,
    current.y + verticalLength + 16,
    p.red,
    16 * scale,
    'right',
    700
  );
  text(
    ctx,
    'v',
    current.x + horizontalLength + 20,
    current.y + verticalLength + 6,
    p.teal,
    17 * scale,
    'left',
    700
  );
}

function drawCurrent(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette,
  scale: number
): void {
  const current = pointPosition(state, {
    index: 0,
    time: state.time,
    x: state.x,
    verticalDisplacement: state.verticalDisplacement,
    height: state.height,
    vy: state.vy
  });
  ctx.fillStyle = p.gold;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(current.x, current.y, CURRENT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const onSample = state.points.some(
    (point) => Math.abs(point.time - state.time) < 0.02
  );
  if (!state.params.showStrobe || !onSample) {
    text(
      ctx,
      `${state.time.toFixed(1)}s`,
      current.x + 22,
      current.y - 24,
      p.gold,
      15 * scale,
      'left',
      700
    );
  }
}

function drawMetrics(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette,
  scale: number
): void {
  rounded(ctx, METRICS_X, METRICS_Y, METRICS_W, METRICS_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '运动读数',
    METRICS_X + 16,
    METRICS_Y + 24,
    p.ink,
    17 * scale,
    'left',
    700
  );
  const flight = `${state.time.toFixed(2)} / ${state.flightTime.toFixed(2)} s`;
  const rows: Array<[string, string, string]> = [
    ['飞行时长 t / T', flight, p.ink],
    ['[水平] 位移  x = v₀t', `${state.x.toFixed(1)} m`, p.blue],
    ['[水平] 速度  vₓ = v₀', `${state.vx.toFixed(1)} m/s`, p.blue],
    [
      '[竖直] 位移  y = ½gt²',
      `${state.verticalDisplacement.toFixed(1)} m`,
      p.red
    ],
    ['[竖直] 速度  vᵧ = gt', `${state.vy.toFixed(1)} m/s`, p.red]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = METRICS_Y + 58 + index * ROW_GAP;
    text(ctx, label, METRICS_X + 16, y, p.ink, 13 * scale, 'left');
    text(
      ctx,
      value,
      METRICS_X + METRICS_W - 16,
      y,
      color,
      14 * scale,
      'right',
      700
    );
  });
  rounded(ctx, METRICS_X + 14, METRICS_Y + METRICS_H - 46, METRICS_W - 28, 34);
  ctx.fillStyle = `${p.teal}18`;
  ctx.fill();
  text(
    ctx,
    '合速度  v',
    METRICS_X + 28,
    METRICS_Y + METRICS_H - 29,
    p.ink,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '√(vₓ² + vᵧ²)',
    METRICS_X + 108,
    METRICS_Y + METRICS_H - 29,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    `${state.speed.toFixed(1)} m/s`,
    METRICS_X + METRICS_W - 28,
    METRICS_Y + METRICS_H - 29,
    p.teal,
    16 * scale,
    'right',
    700
  );
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette,
  scale: number
): void {
  rounded(ctx, METRICS_X, TABLE_Y, METRICS_W, TABLE_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '频闪采样记录',
    METRICS_X + 16,
    TABLE_Y + 24,
    p.gold,
    17 * scale,
    'left',
    700
  );
  const headerY = TABLE_Y + 56;
  ctx.fillStyle = p.soft;
  ctx.fillRect(METRICS_X + 14, headerY - 16, METRICS_W - 28, 30);
  const columns: Array<[string, number]> = [
    ['t (s)', 52],
    ['x (m)', 126],
    ['y (m)', 204],
    ['vᵧ (m/s)', 292]
  ];
  columns.forEach(([label, offset]) =>
    text(
      ctx,
      label,
      METRICS_X + offset,
      headerY,
      p.muted,
      12 * scale,
      'center',
      700
    )
  );
  state.points.slice(0, 6).forEach((point, index) => {
    const y = headerY + 32 + index * TABLE_ROW_GAP;
    ctx.strokeStyle = p.border;
    ctx.beginPath();
    ctx.moveTo(METRICS_X + 14, y + 15);
    ctx.lineTo(METRICS_X + METRICS_W - 14, y + 15);
    ctx.stroke();
    text(
      ctx,
      point.time.toFixed(2),
      METRICS_X + 52,
      y,
      p.ink,
      12 * scale,
      'center'
    );
    text(
      ctx,
      point.x.toFixed(1),
      METRICS_X + 126,
      y,
      p.ink,
      12 * scale,
      'center'
    );
    text(
      ctx,
      point.verticalDisplacement.toFixed(1),
      METRICS_X + 204,
      y,
      p.ink,
      12 * scale,
      'center'
    );
    text(
      ctx,
      point.vy.toFixed(1),
      METRICS_X + 292,
      y,
      p.red,
      12 * scale,
      'center',
      700
    );
  });
}

function drawOptions(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette,
  scale: number
): void {
  rounded(ctx, METRICS_X, OPTIONS_Y, METRICS_W, OPTIONS_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  const options: Array<[boolean, string]> = [
    [state.params.showStrobe, '开启频闪采样'],
    [state.params.showTrajectory, '显示抛物线预期轨迹'],
    [state.params.showVectors, '显示速度正交分解矢量 (vₓ, vᵧ)'],
    [state.params.showShadows, '显示分运动影子球']
  ];
  options.forEach(([enabled, label], index) => {
    const y = OPTIONS_Y + 24 + index * 24;
    ctx.fillStyle = enabled ? p.ink : p.panel;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.fillRect(METRICS_X + 18, y - 8, 16, 16);
    ctx.strokeRect(METRICS_X + 18, y - 8, 16, 16);
    if (enabled)
      text(ctx, '✓', METRICS_X + 26, y, p.panel, 13 * scale, 'center', 700);
    text(ctx, label, METRICS_X + 44, y, p.ink, 12 * scale, 'left', 600);
  });
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, BASE_W - PANEL_X, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PANEL_X, 0);
  ctx.lineTo(PANEL_X, BASE_H);
  ctx.stroke();
  text(
    ctx,
    '平抛运动分解',
    PANEL_X + PANEL_INSET,
    TITLE_Y,
    p.ink,
    20 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + PANEL_INSET, PANEL_RULE_Y);
  ctx.lineTo(PANEL_X + PANEL_W - PANEL_INSET, PANEL_RULE_Y);
  ctx.stroke();
  drawMetrics(ctx, state, p, scale);
  drawTable(ctx, state, p, scale);
  drawOptions(ctx, state, p, scale);
}

export function createProjectileComponentsView(
  options: CreateProjectileComponentsViewOptions = {}
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
  let snapshot: ProjectileComponentsState | null = null;
  function draw(state: ProjectileComponentsState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, state, p);
    drawAxes(ctx, state, p, scale);
    drawTrajectory(ctx, state, p);
    drawStrobePoints(ctx, state, p);
    drawVectors(ctx, state, p, scale);
    drawCurrent(ctx, state, p, scale);
    text(
      ctx,
      '运动的独立性：水平匀速，竖直自由落体',
      FORMULA_X,
      FORMULA_Y,
      p.ink,
      17 * scale,
      'left',
      700
    );
    rounded(ctx, FORMULA_X, FORMULA_Y + 24, FORMULA_W, FORMULA_H - 24);
    ctx.fillStyle = p.soft;
    ctx.fill();
    text(
      ctx,
      'x = v₀t    vₓ = v₀',
      FORMULA_X + 18,
      FORMULA_Y + 48,
      p.blue,
      16 * scale,
      'left',
      700
    );
    text(
      ctx,
      'y = ½gt²    vᵧ = gt',
      FORMULA_X + 252,
      FORMULA_Y + 48,
      p.red,
      16 * scale,
      'left',
      700
    );
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: ProjectileComponentsState): void {
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
    }
  };
}
