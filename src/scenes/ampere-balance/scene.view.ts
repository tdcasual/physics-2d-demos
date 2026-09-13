import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  ampereBalanceConstants,
  type AmpereBalanceState,
  type AmpereFieldDirection
} from './scene.sim';

export type CreateAmpereBalanceViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelWidth: PANEL_W,
  panelX: PANEL_X,
  panelInset: PANEL_INSET,
  titleY: TITLE_Y,
  ruleX: RULE_X,
  ruleY: RULE_Y,
  ruleWidth: RULE_W,
  ruleHeight: RULE_H,
  fieldArrowStartX: FIELD_ARROW_START_X,
  fieldArrowEndX: FIELD_ARROW_END_X,
  fieldArrowStartY: FIELD_ARROW_START_Y,
  fieldArrowEndY: FIELD_ARROW_END_Y,
  fieldColumnGap: FIELD_COLUMN_GAP,
  fieldRowGap: FIELD_ROW_GAP,
  gridStep: GRID_STEP,
  planeTopX: PLANE_TOP_X,
  planeTopY: PLANE_TOP_Y,
  planeEndX: PLANE_END_X,
  planeBaseY: PLANE_BASE_Y,
  blockT: BLOCK_T,
  blockRadius: BLOCK_RADIUS,
  vectorScale: VECTOR_SCALE,
  forceVectorCap: FORCE_VECTOR_CAP,
  weightVectorCap: WEIGHT_VECTOR_CAP,
  panelCardX: CARD_X,
  panelCardWidth: CARD_W,
  headerRuleY: HEADER_RULE_Y,
  fieldCardY: FIELD_CARD_Y,
  fieldCardHeight: FIELD_CARD_H,
  presetCardY: PRESET_CARD_Y,
  presetCardHeight: PRESET_CARD_H,
  paramCardY: PARAM_CARD_Y,
  paramCardHeight: PARAM_CARD_H,
  readoutCardY: READOUT_CARD_Y,
  readoutCardHeight: READOUT_CARD_H,
  readoutRowGap: READOUT_ROW_GAP,
  axisDashLength: AXIS_DASH_LENGTH,
  axisLabelDistance: AXIS_LABEL_DISTANCE,
  angleMarkerOffset: ANGLE_MARKER_OFFSET,
  groundExtension: GROUND_EXTENSION
} = ampereBalanceConstants;

const ARROW_HEAD = 12;
const DASH = 7;
const GAP = 6;
const CARD_RADIUS = 12;
const LABEL_OFFSET = 18;
const VECTOR_WIDTH = 5;

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  soft: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  brown: string;
  plane: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#8b97a5',
    border: '#d3dbe4',
    grid: '#e5e9ee',
    soft: '#f1f4f7',
    red: '#ef4050',
    blue: '#3285d5',
    teal: '#1f9b8f',
    gold: '#ee950f',
    brown: '#8e7467',
    plane: '#f0eee8'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#9eabbc',
    border: '#3c4b61',
    grid: '#2a3b54',
    soft: '#253249',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    gold: '#fbbf24',
    brown: '#c0a091',
    plane: '#273246'
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
  radius: number
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

function fieldLabel(direction: AmpereFieldDirection): string {
  if (direction === 'up') return '竖直向上 ↑';
  if (direction === 'right') return '水平向右 →';
  if (direction === 'left') return '水平向左 ←';
  if (direction === 'normalUp') return '垂直斜面 ↗';
  if (direction === 'normalDown') return '垂直斜面 ↙';
  return '竖直向下 ↓';
}

function currentLabel(
  direction: AmpereBalanceState['params']['currentDirection']
): string {
  return direction === 'out' ? '⊙ 垂直纸面向外' : '⊗ 垂直纸面向内';
}

function planeGeometry(angle: number) {
  const theta = (angle * Math.PI) / 180;
  const along = { x: Math.cos(theta), y: Math.sin(theta) };
  const normal = { x: Math.sin(theta), y: -Math.cos(theta) };
  const horizontalSpan = Math.min(
    PLANE_END_X - PLANE_TOP_X,
    (PLANE_BASE_Y - PLANE_TOP_Y) / Math.max(0.001, Math.tan(theta))
  );
  const top = { x: PLANE_TOP_X, y: PLANE_TOP_Y };
  const end = {
    x: top.x + horizontalSpan,
    y: top.y + horizontalSpan * Math.tan(theta)
  };
  const length = Math.hypot(end.x - top.x, end.y - top.y);
  return { theta, length, along, normal, top, end };
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

function drawFieldArrows(
  ctx: CanvasRenderingContext2D,
  state: AmpereBalanceState,
  p: Palette
): void {
  const scaleX = state.fieldVector.x;
  const scaleY = state.fieldVector.y;
  const vectorLength = 36;
  const columns = Math.floor(
    (FIELD_ARROW_END_X - FIELD_ARROW_START_X) / FIELD_COLUMN_GAP
  );
  const rows = Math.floor(
    (FIELD_ARROW_END_Y - FIELD_ARROW_START_Y) / FIELD_ROW_GAP
  );
  for (let column = 0; column <= columns; column += 1) {
    for (let row = 0; row <= rows; row += 1) {
      const x = FIELD_ARROW_START_X + column * FIELD_COLUMN_GAP;
      const y = FIELD_ARROW_START_Y + row * FIELD_ROW_GAP;
      arrow(
        ctx,
        x - scaleX * vectorLength * 0.5,
        y - scaleY * vectorLength * 0.5,
        x + scaleX * vectorLength * 0.5,
        y + scaleY * vectorLength * 0.5,
        p.blue,
        3,
        true
      );
    }
  }
}

function drawIncline(
  ctx: CanvasRenderingContext2D,
  state: AmpereBalanceState,
  p: Palette
): void {
  const { along, top, end } = planeGeometry(state.params.inclineAngle);
  ctx.fillStyle = p.plane;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(end.x, end.y);
  ctx.lineTo(end.x, PLANE_BASE_Y);
  ctx.lineTo(top.x, PLANE_BASE_Y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(end.x, end.y);
  ctx.lineTo(end.x + 36, PLANE_BASE_Y);
  ctx.moveTo(top.x - 24, PLANE_BASE_Y);
  ctx.lineTo(end.x + GROUND_EXTENSION, PLANE_BASE_Y);
  ctx.stroke();
  const markerX = end.x - ANGLE_MARKER_OFFSET;
  const markerY = PLANE_BASE_Y - 18;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(
    markerX,
    markerY,
    34,
    Math.PI * 1.5,
    Math.PI * 1.5 + Math.atan2(along.y, along.x)
  );
  ctx.stroke();
  text(
    ctx,
    `θ = ${state.params.inclineAngle.toFixed(0)}°`,
    markerX + 28,
    markerY - 28,
    p.red,
    17,
    'center',
    700
  );
}

function drawMotion(
  ctx: CanvasRenderingContext2D,
  state: AmpereBalanceState,
  p: Palette,
  scale: number
): void {
  const geometry = planeGeometry(state.params.inclineAngle);
  const t = Math.min(0.78, Math.max(0.35, BLOCK_T + state.blockOffset));
  const x = geometry.top.x + (geometry.end.x - geometry.top.x) * t;
  const y = geometry.top.y + (geometry.end.y - geometry.top.y) * t;
  const { along, normal } = geometry;
  const scaleVector = (vector: { x: number; y: number }, cap: number) => {
    const length = Math.hypot(vector.x, vector.y) * VECTOR_SCALE;
    const safeLength = Math.min(cap, Math.max(20, length));
    const unitX =
      Math.hypot(vector.x, vector.y) > 0
        ? vector.x / Math.hypot(vector.x, vector.y)
        : 0;
    const unitY =
      Math.hypot(vector.x, vector.y) > 0
        ? vector.y / Math.hypot(vector.x, vector.y)
        : 0;
    return { x: unitX * safeLength, y: unitY * safeLength };
  };
  drawIncline(ctx, state, p);
  const weightVector = scaleVector(state.weightVector, WEIGHT_VECTOR_CAP);
  const normalVector = scaleVector(state.normalVector, FORCE_VECTOR_CAP);
  const ampereVector = scaleVector(state.ampereVector, FORCE_VECTOR_CAP);
  const frictionVector = scaleVector(state.frictionVector, FORCE_VECTOR_CAP);

  arrow(
    ctx,
    x,
    y,
    x + weightVector.x,
    y + weightVector.y,
    p.brown,
    VECTOR_WIDTH
  );
  text(
    ctx,
    'G',
    x + weightVector.x * 0.6 + LABEL_OFFSET,
    y + weightVector.y * 0.6,
    p.brown,
    18 * scale,
    'left',
    700
  );
  arrow(
    ctx,
    x,
    y,
    x + normalVector.x,
    y + normalVector.y,
    p.teal,
    VECTOR_WIDTH
  );
  text(
    ctx,
    'Fₙ',
    x + normalVector.x * 0.76 + LABEL_OFFSET,
    y + normalVector.y * 0.76,
    p.teal,
    17 * scale,
    'left',
    700
  );
  arrow(ctx, x, y, x + ampereVector.x, y + ampereVector.y, p.red, VECTOR_WIDTH);
  text(
    ctx,
    'Fₐ',
    x + ampereVector.x * 0.74 + LABEL_OFFSET,
    y + ampereVector.y * 0.74,
    p.red,
    17 * scale,
    'left',
    700
  );
  if (state.frictionRequired > 0.08) {
    arrow(
      ctx,
      x,
      y,
      x + frictionVector.x,
      y + frictionVector.y,
      p.gold,
      4,
      true
    );
    text(
      ctx,
      'f需',
      x + frictionVector.x * 0.7,
      y + frictionVector.y * 0.7 - 12,
      p.gold,
      16 * scale,
      'center',
      700
    );
  }

  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, BLOCK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'I', x, y, p.red, 18 * scale, 'center', 700);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + along.x * AXIS_DASH_LENGTH, y + along.y * AXIS_DASH_LENGTH);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '+x',
    x + along.x * AXIS_LABEL_DISTANCE,
    y + along.y * AXIS_LABEL_DISTANCE,
    p.muted,
    13 * scale,
    'center',
    600
  );
  text(
    ctx,
    '+y',
    x + normal.x * AXIS_DASH_LENGTH,
    y + normal.y * AXIS_DASH_LENGTH,
    p.muted,
    13 * scale,
    'center',
    600
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: AmpereBalanceState,
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
    '安培力与导体平衡',
    PANEL_X + PANEL_INSET,
    TITLE_Y,
    p.ink,
    20 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + PANEL_INSET, HEADER_RULE_Y);
  ctx.lineTo(PANEL_X + PANEL_W - PANEL_INSET, HEADER_RULE_Y);
  ctx.stroke();

  rounded(ctx, CARD_X, FIELD_CARD_Y, CARD_W, FIELD_CARD_H, CARD_RADIUS);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '磁场与电流',
    CARD_X + 16,
    FIELD_CARD_Y + 24,
    p.ink,
    17 * scale,
    'left',
    700
  );
  text(
    ctx,
    `B：${fieldLabel(state.params.fieldDirection)}`,
    CARD_X + 16,
    FIELD_CARD_Y + 58,
    p.blue,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `I：${currentLabel(state.params.currentDirection)}`,
    CARD_X + 16,
    FIELD_CARD_Y + 86,
    p.red,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'Fₐ = BIL    (L ⟂ B)',
    CARD_X + 16,
    FIELD_CARD_Y + 122,
    p.ink,
    16 * scale,
    'left',
    700
  );

  rounded(ctx, CARD_X, PRESET_CARD_Y, CARD_W, PRESET_CARD_H, CARD_RADIUS);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '运动趋势与接触状态',
    CARD_X + 16,
    PRESET_CARD_Y + 24,
    p.ink,
    16 * scale,
    'left',
    700
  );
  const status = state.detached ? '已脱离斜面' : state.trend;
  const statusColor = state.detached
    ? p.red
    : state.trend === '近似平衡'
      ? p.teal
      : p.gold;
  text(
    ctx,
    status,
    CARD_X + 16,
    PRESET_CARD_Y + 55,
    statusColor,
    18 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.detached ? 'FN = 0' : '沿斜面合力与加速度同步更新',
    CARD_X + 16,
    PRESET_CARD_Y + 82,
    p.muted,
    12 * scale,
    'left'
  );

  rounded(ctx, CARD_X, PARAM_CARD_Y, CARD_W, PARAM_CARD_H, CARD_RADIUS);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '受力计算',
    CARD_X + 16,
    PARAM_CARD_Y + 25,
    p.ink,
    17 * scale,
    'left',
    700
  );
  const rows: Array<[string, string, string]> = [
    ['安培力 Fₐ', `${state.ampereForce.toFixed(2)} N`, p.red],
    ['重力 G', `${state.weight.toFixed(2)} N`, p.brown],
    ['支持力 FN', `${state.normalForce.toFixed(2)} N`, p.teal],
    ['所需摩擦力', `${state.frictionRequired.toFixed(2)} N`, p.gold],
    ['光滑斜面 a', `${state.acceleration.toFixed(2)} m/s²`, p.blue]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = PARAM_CARD_Y + 58 + index * 30;
    text(ctx, label, CARD_X + 16, y, p.ink, 13 * scale, 'left');
    text(ctx, value, CARD_X + CARD_W - 16, y, color, 14 * scale, 'right', 700);
  });

  rounded(ctx, CARD_X, READOUT_CARD_Y, CARD_W, READOUT_CARD_H, CARD_RADIUS);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '当前参数',
    CARD_X + 16,
    READOUT_CARD_Y + 24,
    p.ink,
    16 * scale,
    'left',
    700
  );
  const params: Array<[string, string]> = [
    ['θ', `${state.params.inclineAngle.toFixed(0)}°`],
    ['B', `${state.params.magneticField.toFixed(1)} T`],
    ['I', `${state.params.current.toFixed(1)} A`],
    ['m', `${state.params.mass.toFixed(1)} kg`]
  ];
  params.forEach(([label, value], index) => {
    const y = READOUT_CARD_Y + 54 + index * READOUT_ROW_GAP;
    text(ctx, label, CARD_X + 16, y, p.muted, 13 * scale, 'left');
    text(ctx, value, CARD_X + CARD_W - 16, y, p.blue, 14 * scale, 'right', 700);
  });
}

export function createAmpereBalanceView(
  options: CreateAmpereBalanceViewOptions = {}
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
  let snapshot: AmpereBalanceState | null = null;
  function draw(state: AmpereBalanceState): void {
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
    drawGrid(ctx, p);
    drawFieldArrows(ctx, state, p);
    drawMotion(ctx, state, p, scale);
    text(
      ctx,
      '通电导体棒在磁场斜面上的受力与平衡分析',
      RULE_X,
      TITLE_Y,
      p.ink,
      22 * scale,
      'left',
      700
    );
    rounded(ctx, RULE_X, RULE_Y, RULE_W, RULE_H, CARD_RADIUS);
    ctx.fillStyle = p.soft;
    ctx.fill();
    text(
      ctx,
      '左手定则：B × I → Fₐ',
      RULE_X + 18,
      RULE_Y + 24,
      p.red,
      16 * scale,
      'left',
      700
    );
    text(
      ctx,
      '磁场穿入掌心，四指沿电流，拇指指向安培力',
      RULE_X + 18,
      RULE_Y + 50,
      p.muted,
      13 * scale,
      'left'
    );
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: AmpereBalanceState): void {
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
