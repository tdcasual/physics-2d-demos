import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { verticalCircleConstants, type VerticalCircleState } from './scene.sim';

export type CreateVerticalCircleViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  centerX: CENTER_X,
  centerY: CENTER_Y,
  orbitRadius: ORBIT_RADIUS,
  panelWidth: PANEL_W,
  panelInset: PANEL_INSET,
  titleY: TITLE_Y,
  modelY: MODEL_Y,
  modelLineY: MODEL_LINE_Y,
  formulaTop: FORMULA_TOP,
  formulaHeight: FORMULA_HEIGHT,
  formulaLineOneY: FORMULA_LINE_ONE_Y,
  formulaLineTwoY: FORMULA_LINE_TWO_Y,
  statusTop: STATUS_TOP,
  statusHeight: STATUS_HEIGHT,
  statusTitleY: STATUS_TITLE_Y,
  statusBodyY: STATUS_BODY_Y,
  valuesTop: VALUES_TOP,
  valuesHeight: VALUES_HEIGHT,
  valuesStartY: VALUES_START_Y,
  valuesRowGap: VALUES_ROW_GAP,
  constantsY: CONSTANTS_Y,
  canvasTitleY: CANVAS_TITLE_Y,
  topLabelY: TOP_LABEL_Y,
  bottomLabelY: BOTTOM_LABEL_Y,
  leftLabelX: LEFT_LABEL_X,
  rightLabelX: RIGHT_LABEL_X,
  statusPillY: STATUS_PILL_Y,
  statusPillLeft: STATUS_PILL_LEFT,
  statusPillWidth: STATUS_PILL_WIDTH,
  statusPillHeight: STATUS_PILL_HEIGHT,
  statusPillRadius: STATUS_PILL_RADIUS,
  gridStep: GRID_STEP,
  vectorScale: VECTOR_SCALE,
  ballRadius: BALL_RADIUS,
  maxVectorLength: MAX_VECTOR_LENGTH
} = verticalCircleConstants;

type Palette = {
  bg: string;
  panel: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  border: string;
  soft: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    grid: '#dfe4ea',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    blue: '#3c80a8',
    teal: '#1f9b8f',
    gold: '#e49a1b',
    border: '#d2d9e2',
    soft: '#f0f2f5'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    grid: '#435169',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    gold: '#fbbf24',
    border: '#3c4b61',
    soft: '#253249'
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

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 4
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
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 13 - uy * 6, y2 - uy * 13 + ux * 6);
  ctx.lineTo(x2 - ux * 13 + uy * 6, y2 - uy * 13 - ux * 6);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD_W; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BASE_H);
    ctx.stroke();
  }
  for (let y = 0; y <= BASE_H; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
}

function drawOrbit(
  ctx: CanvasRenderingContext2D,
  state: VerticalCircleState,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, ORBIT_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  if (state.params.showPath) {
    ctx.strokeStyle = p.muted;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, ORBIT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CENTER_X, CENTER_Y - ORBIT_RADIUS - 22);
  ctx.lineTo(CENTER_X, CENTER_Y + ORBIT_RADIUS + 22);
  ctx.moveTo(CENTER_X - ORBIT_RADIUS - 22, CENTER_Y);
  ctx.lineTo(CENTER_X + ORBIT_RADIUS + 22, CENTER_Y);
  ctx.stroke();
  text(
    ctx,
    '0°（最高点）',
    CENTER_X,
    TOP_LABEL_Y,
    p.muted,
    14 * scale,
    'center',
    700
  );
  text(
    ctx,
    '±180°（最低点）',
    CENTER_X,
    BOTTOM_LABEL_Y,
    p.muted,
    14 * scale,
    'center',
    700
  );
  text(ctx, '−90°', LEFT_LABEL_X, CENTER_Y, p.muted, 14 * scale, 'center', 700);
  text(ctx, '90°', RIGHT_LABEL_X, CENTER_Y, p.muted, 14 * scale, 'center', 700);
}

function drawVectors(
  ctx: CanvasRenderingContext2D,
  state: VerticalCircleState,
  p: Palette,
  scale: number
): void {
  if (!state.params.showVectors) return;
  const { x, y } = state.position;
  const angle = state.angle * (Math.PI / 180);
  const inwardX = (CENTER_X - x) / ORBIT_RADIUS;
  const inwardY = (CENTER_Y - y) / ORBIT_RADIUS;
  const tangentX = Math.cos(angle);
  const tangentY = Math.sin(angle);
  const gravityLength = 72;
  const normalLength = Math.min(
    MAX_VECTOR_LENGTH,
    Math.max(26, state.normalForce * VECTOR_SCALE)
  );
  const velocityLength = Math.min(
    MAX_VECTOR_LENGTH,
    Math.max(26, state.speed * VECTOR_SCALE)
  );
  arrow(ctx, x, y, x, y + gravityLength, p.teal, 5);
  text(
    ctx,
    'G',
    x - 16,
    y + gravityLength + 14,
    p.teal,
    17 * scale,
    'center',
    700
  );
  arrow(
    ctx,
    x,
    y,
    x + inwardX * normalLength,
    y + inwardY * normalLength,
    p.gold,
    5
  );
  text(
    ctx,
    'Fₙ',
    x + inwardX * (normalLength + 16),
    y + inwardY * (normalLength + 16),
    p.gold,
    16 * scale,
    'center',
    700
  );
  arrow(
    ctx,
    x,
    y,
    x + tangentX * velocityLength,
    y + tangentY * velocityLength,
    p.blue,
    5
  );
  text(
    ctx,
    'v',
    x + tangentX * (velocityLength + 15),
    y + tangentY * (velocityLength + 15),
    p.blue,
    17 * scale,
    'center',
    700
  );
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  state: VerticalCircleState,
  p: Palette
): void {
  const { x, y } = state.position;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(CENTER_X, CENTER_Y);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, 9, 0, Math.PI * 2);
  ctx.fill();
  const gradient = ctx.createRadialGradient(x - 6, y - 7, 2, x, y, BALL_RADIUS);
  gradient.addColorStop(0, '#f7fbff');
  gradient.addColorStop(0.42, p.muted);
  gradient.addColorStop(1, p.ink);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawStatusPill(
  ctx: CanvasRenderingContext2D,
  state: VerticalCircleState,
  p: Palette,
  scale: number
): void {
  const width = STATUS_PILL_WIDTH;
  const left = STATUS_PILL_LEFT;
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.roundRect(
    left,
    STATUS_PILL_Y - STATUS_PILL_RADIUS,
    width,
    STATUS_PILL_HEIGHT,
    STATUS_PILL_RADIUS
  );
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  const color =
    state.status === '绳子松弛' || state.status === '最高点脱轨'
      ? p.red
      : p.teal;
  text(
    ctx,
    state.status,
    left + width / 2,
    STATUS_PILL_Y,
    color,
    15 * scale,
    'center',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: VerticalCircleState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, BASE_W - FIELD_W, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, BASE_H);
  ctx.stroke();
  text(
    ctx,
    '竖直圆周临界',
    x + PANEL_INSET,
    TITLE_Y,
    p.ink,
    20 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.params.model === 'rope' ? '绳模型（只能拉）' : '杆模型（拉与推）',
    x + PANEL_INSET,
    MODEL_Y,
    state.params.model === 'rope' ? p.red : p.blue,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `R = 10 m  ·  g = 10 m/s²`,
    x + PANEL_INSET,
    MODEL_LINE_Y,
    p.muted,
    13 * scale
  );
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + PANEL_INSET, FORMULA_TOP, PANEL_W, FORMULA_HEIGHT, 10);
  ctx.fill();
  text(
    ctx,
    'v² = v₀² − 2gR(1+cosθ)',
    x + 42,
    FORMULA_LINE_ONE_Y,
    p.ink,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    'T = mv²/R − mg cosθ',
    x + 42,
    FORMULA_LINE_TWO_Y,
    p.ink,
    13 * scale,
    'left',
    700
  );
  const statusColor = state.status === '杆受压' ? p.blue : p.red;
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + PANEL_INSET, STATUS_TOP, PANEL_W, STATUS_HEIGHT, 10);
  ctx.fill();
  ctx.fillStyle = statusColor;
  ctx.fillRect(x + PANEL_INSET, STATUS_TOP, 5, STATUS_HEIGHT);
  text(
    ctx,
    state.status,
    x + 42,
    STATUS_TITLE_Y,
    statusColor,
    15 * scale,
    'left',
    700
  );
  const detail =
    state.status === '绳子松弛' || state.status === '最高点脱轨'
      ? '拉力不足，约束失效'
      : state.status === '杆受压'
        ? '杆提供背离圆心的支撑'
        : '约束力指向圆心';
  text(ctx, detail, x + 42, STATUS_BODY_Y, p.muted, 12 * scale, 'left');
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.roundRect(x + PANEL_INSET, VALUES_TOP, PANEL_W, VALUES_HEIGHT, 10);
  ctx.stroke();
  const rows: Array<[string, string, string]> = [
    ['当前速度 v', `${state.speed.toFixed(1)} m/s`, p.ink],
    ['最高点速度', `${state.topSpeed.toFixed(1)} m/s`, p.blue],
    ['径向力 Fₙ', `${state.normalForce.toFixed(1)} N`, p.gold],
    ['约束力 T', `${state.constraintForce.toFixed(1)} N`, statusColor]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = VALUES_START_Y + index * VALUES_ROW_GAP;
    text(ctx, label, x + 42, y, p.ink, 13 * scale, 'left');
    text(ctx, value, x + 224, y, color, 14 * scale, 'right', 700);
  });
  text(
    ctx,
    `临界最低速度：${state.criticalBottomSpeed.toFixed(1)} m/s`,
    x + PANEL_INSET,
    CONSTANTS_Y,
    p.muted,
    12 * scale
  );
}

export function createVerticalCircleView(
  options: CreateVerticalCircleViewOptions = {}
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
  let snapshot: VerticalCircleState | null = null;

  function draw(state: VerticalCircleState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const p = PALETTE[env.theme];
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, p);
    text(
      ctx,
      '竖直面圆周运动',
      CENTER_X,
      CANVAS_TITLE_Y,
      p.muted,
      16 * scale,
      'center',
      700
    );
    drawOrbit(ctx, state, p, scale);
    drawBall(ctx, state, p);
    drawVectors(ctx, state, p, scale);
    drawStatusPill(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }

  return {
    render(state: VerticalCircleState): void {
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
