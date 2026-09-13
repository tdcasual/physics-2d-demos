import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  impulseMomentumConstants,
  type ImpulseMomentumState
} from './scene.sim';

export type CreateImpulseMomentumViewOptions = {
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
  fieldLeft: FIELD_LEFT,
  fieldRight: FIELD_RIGHT,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  trackY: TRACK_Y,
  trackLeft: TRACK_LEFT,
  trackRight: TRACK_RIGHT,
  cartWidth: CART_W,
  cartHeight: CART_H,
  wheelRadius: WHEEL_R,
  graphX: GRAPH_X,
  graphY: GRAPH_Y,
  graphWidth: GRAPH_W,
  graphHeight: GRAPH_H,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  timeMin: TIME_MIN,
  timeMax: TIME_MAX,
  forceMin: FORCE_MIN,
  forceMax: FORCE_MAX,
  graphGridStep: GRID_STEP,
  cardX: CARD_X,
  cardWidth: CARD_W,
  headerRuleY: HEADER_RULE_Y,
  modelY: MODEL_Y,
  modelHeight: MODEL_H,
  readoutY: READOUT_Y,
  readoutHeight: READOUT_H,
  formulaY: FORMULA_Y,
  formulaHeight: FORMULA_H,
  forceArrowScale: FORCE_ARROW_SCALE,
  velocityArrowScale: VELOCITY_ARROW_SCALE,
  positionScale: POSITION_SCALE
} = impulseMomentumConstants;

type Palette = {
  bg: string;
  panel: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  purple: string;
  wire: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f1f3f4',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    grid: '#e6e9e7',
    red: '#ef4050',
    blue: '#2d82d0',
    teal: '#168a79',
    gold: '#d99416',
    purple: '#7b34c7',
    wire: '#586270'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#253249',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    grid: '#2a394d',
    red: '#ff707c',
    blue: '#65b6ef',
    teal: '#4ed9c0',
    gold: '#fbbf24',
    purple: '#bb86fc',
    wire: '#c2cedc'
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
  radius = 12
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 5
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - 14 * Math.cos(angle - Math.PI / 6),
    y2 - 14 * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - 14 * Math.cos(angle + Math.PI / 6),
    y2 - 14 * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function timeToPx(time: number): number {
  return (
    GRAPH_LEFT +
    ((time - TIME_MIN) / (TIME_MAX - TIME_MIN)) * (GRAPH_RIGHT - GRAPH_LEFT)
  );
}

function forceToPx(force: number): number {
  return (
    GRAPH_BOTTOM -
    ((force - FORCE_MIN) / (FORCE_MAX - FORCE_MIN)) * (GRAPH_BOTTOM - GRAPH_TOP)
  );
}

function drawStage(
  ctx: CanvasRenderingContext2D,
  state: ImpulseMomentumState,
  p: Palette
): void {
  rounded(
    ctx,
    FIELD_LEFT,
    FIELD_TOP,
    FIELD_RIGHT - FIELD_LEFT,
    FIELD_BOTTOM - FIELD_TOP,
    12
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '光滑水平面质点模型（非实验测量）',
    FIELD_LEFT + 18,
    FIELD_TOP + 30,
    p.ink,
    18,
    'left',
    700
  );
  text(
    ctx,
    '取水平向右为正；箭头仅表示方向，单点不影响动量',
    FIELD_LEFT + 18,
    FIELD_TOP + 62,
    p.muted,
    13,
    'left',
    600
  );
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(TRACK_LEFT, TRACK_Y);
  ctx.lineTo(TRACK_RIGHT, TRACK_Y);
  ctx.stroke();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  for (let x = TRACK_LEFT; x <= TRACK_RIGHT; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, TRACK_Y + 8);
    ctx.lineTo(x + 14, TRACK_Y + 20);
    ctx.stroke();
  }
  const cartCenter = Math.max(
    TRACK_LEFT + CART_W / 2,
    Math.min(
      TRACK_RIGHT - CART_W / 2,
      TRACK_LEFT + state.position * POSITION_SCALE
    )
  );
  const cartTop = TRACK_Y - CART_H;
  rounded(ctx, cartCenter - CART_W / 2, cartTop, CART_W, CART_H, 8);
  ctx.fillStyle = p.blue;
  ctx.fill();
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = p.wire;
  ctx.beginPath();
  ctx.arc(cartCenter - 28, TRACK_Y + 2, WHEEL_R, 0, Math.PI * 2);
  ctx.arc(cartCenter + 28, TRACK_Y + 2, WHEEL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(cartCenter - 28, TRACK_Y + 2, 4, 0, Math.PI * 2);
  ctx.arc(cartCenter + 28, TRACK_Y + 2, 4, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `m = ${state.params.mass.toFixed(1)} kg`,
    cartCenter,
    cartTop + CART_H / 2,
    '#ffffff',
    15,
    'center',
    700
  );
  arrow(
    ctx,
    cartCenter + CART_W / 2,
    cartTop + 18,
    cartCenter + CART_W / 2 + Math.max(32, state.force * FORCE_ARROW_SCALE),
    cartTop + 18,
    p.red,
    5
  );
  text(
    ctx,
    `Fₓ = ${state.force.toFixed(1)} N`,
    cartCenter + CART_W / 2 + 20,
    cartTop - 2,
    p.red,
    14,
    'left',
    700
  );
  arrow(
    ctx,
    cartCenter - 20,
    cartTop - 26,
    cartCenter - 20 + state.velocity * VELOCITY_ARROW_SCALE,
    cartTop - 26,
    p.teal,
    4
  );
  text(
    ctx,
    `v = ${state.velocity.toFixed(2)} m/s`,
    cartCenter - 20,
    cartTop - 48,
    p.teal,
    14,
    'left',
    700
  );
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: ImpulseMomentumState,
  p: Palette
): void {
  rounded(ctx, GRAPH_X, GRAPH_Y, GRAPH_W, GRAPH_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    'Fₓ-t 图象：相对 t 轴的有向面积 = 冲量 Iₓ',
    GRAPH_LEFT + 18,
    GRAPH_Y + 28,
    p.ink,
    18,
    'left',
    700
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = GRAPH_LEFT; x <= GRAPH_RIGHT; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, GRAPH_TOP);
    ctx.lineTo(x, GRAPH_BOTTOM);
    ctx.stroke();
  }
  for (let y = GRAPH_TOP; y <= GRAPH_BOTTOM; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_RIGHT + 18, GRAPH_BOTTOM);
  ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_LEFT, GRAPH_TOP - 12);
  ctx.stroke();
  text(ctx, 'Fₓ / N', GRAPH_LEFT - 12, GRAPH_TOP - 18, p.ink, 12, 'right', 700);
  text(ctx, 't / s', GRAPH_RIGHT + 20, GRAPH_BOTTOM, p.ink, 12, 'left', 700);
  text(ctx, '0', GRAPH_LEFT - 10, GRAPH_BOTTOM + 4, p.muted, 10, 'right', 600);
  text(
    ctx,
    TIME_MAX.toFixed(1),
    GRAPH_RIGHT,
    GRAPH_BOTTOM + 16,
    p.muted,
    10,
    'center',
    600
  );
  text(
    ctx,
    String(FORCE_MAX),
    GRAPH_LEFT - 10,
    GRAPH_TOP,
    p.muted,
    10,
    'right',
    600
  );
  if (state.params.showArea) {
    ctx.fillStyle = `${p.red}35`;
    ctx.beginPath();
    ctx.moveTo(timeToPx(TIME_MIN), GRAPH_BOTTOM);
    for (let index = 0; index <= 80; index += 1) {
      const time = (state.time * index) / 80;
      const force =
        state.params.forceModel === 'constant'
          ? state.params.peakForce
          : state.params.forceModel === 'triangle'
            ? index <= 40
              ? state.params.peakForce * (time / 2)
              : state.params.peakForce * Math.max(0, (4 - time) / 2)
            : state.params.forceModel === 'halfSine'
              ? state.params.peakForce * Math.sin((Math.PI * time) / 4)
              : state.params.peakForce * Math.min(1, time / 2);
      ctx.lineTo(timeToPx(time), forceToPx(force));
    }
    ctx.lineTo(timeToPx(state.time), GRAPH_BOTTOM);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let index = 0; index <= 100; index += 1) {
    const time = TIME_MIN + ((TIME_MAX - TIME_MIN) * index) / 100;
    const force =
      state.params.forceModel === 'constant'
        ? state.params.peakForce
        : state.params.forceModel === 'triangle'
          ? time <= 2
            ? state.params.peakForce * (time / 2)
            : time <= 4
              ? state.params.peakForce * ((4 - time) / 2)
              : 0
          : state.params.forceModel === 'halfSine'
            ? time <= 4
              ? state.params.peakForce * Math.sin((Math.PI * time) / 4)
              : 0
            : state.params.peakForce * Math.min(1, time / 2);
    const x = timeToPx(time);
    const y = forceToPx(force);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const cursorX = timeToPx(state.time);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(cursorX, GRAPH_TOP);
  ctx.lineTo(cursorX, GRAPH_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(cursorX, forceToPx(state.force), 8, 0, Math.PI * 2);
  ctx.fill();
  rounded(
    ctx,
    Math.max(GRAPH_LEFT + 16, cursorX - 70),
    GRAPH_TOP + 20,
    140,
    32,
    8
  );
  ctx.fillStyle = p.red;
  ctx.fill();
  text(
    ctx,
    `Iₓ = ${state.impulse.toFixed(2)} N·s`,
    Math.max(GRAPH_LEFT + 86, cursorX),
    GRAPH_TOP + 36,
    '#ffffff',
    13,
    'center',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ImpulseMomentumState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(FIELD_W, 0, BASE_W - FIELD_W, BASE_H);
  text(ctx, '动量定理实时计算', PANEL_X + 18, 38, p.ink, 20, 'left', 700);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + 18, HEADER_RULE_Y);
  ctx.lineTo(PANEL_X + PANEL_W - 22, HEADER_RULE_Y);
  ctx.stroke();
  rounded(ctx, CARD_X, MODEL_Y, CARD_W, MODEL_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '外力模型', CARD_X + 16, MODEL_Y + 24, p.blue, 15, 'left', 700);
  text(
    ctx,
    state.modelLabel,
    CARD_X + 16,
    MODEL_Y + 58,
    p.ink,
    18,
    'left',
    700
  );
  text(
    ctx,
    'Fₓ ≥ 0，冲量面积在 t 轴上方',
    CARD_X + 16,
    MODEL_Y + 88,
    p.muted,
    12,
    'left',
    600
  );
  rounded(ctx, CARD_X, READOUT_Y, CARD_W, READOUT_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '当前状态', CARD_X + 16, READOUT_Y + 24, p.teal, 15, 'left', 700);
  const rows: Array<[string, string, string]> = [
    ['时间 t', `${state.time.toFixed(2)} s`, p.ink],
    ['水平合外力 Fₓ', `${state.force.toFixed(2)} N`, p.red],
    ['有向面积 Iₓ', `${state.impulse.toFixed(2)} N·s`, p.red],
    ['动量变化 Δpₓ', `${state.momentumChange.toFixed(2)} kg·m/s`, p.teal],
    ['瞬时速度 v', `${state.velocity.toFixed(2)} m/s`, p.teal],
    ['末动量 pₓ', `${state.momentum.toFixed(2)} kg·m/s`, p.ink]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = READOUT_Y + 54 + index * 25;
    text(ctx, label, CARD_X + 16, y, p.muted, 12, 'left', 600);
    text(ctx, value, CARD_X + CARD_W - 16, y, color, 13, 'right', 700);
  });
  rounded(ctx, CARD_X, FORMULA_Y, CARD_W, FORMULA_H, 12);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '动量定理', CARD_X + 16, FORMULA_Y + 24, p.gold, 15, 'left', 700);
  text(
    ctx,
    'Iₓ = ∫Fₓdt = Δpₓ',
    CARD_X + 16,
    FORMULA_Y + 62,
    p.ink,
    20,
    'left',
    700
  );
  text(
    ctx,
    `p₀ₓ = ${state.initialMomentum.toFixed(2)} kg·m/s`,
    CARD_X + 16,
    FORMULA_Y + 98,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    '匀强外力：Iₓ = Fₓt',
    CARD_X + 16,
    FORMULA_Y + 128,
    p.blue,
    13,
    'left',
    600
  );
  text(
    ctx,
    '拖动参数或播放观察面积与速度同步',
    CARD_X + 16,
    FORMULA_Y + 152,
    p.teal,
    12,
    'left',
    600
  );
}

export function createImpulseMomentumView(
  options: CreateImpulseMomentumViewOptions = {}
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
  let snapshot: ImpulseMomentumState | null = null;
  function draw(state: ImpulseMomentumState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const responsiveScale = stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    const p = PALETTE[env.theme];
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.lineWidth = responsiveScale;
    drawStage(ctx, state, p);
    drawGraph(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.restore();
  }
  return {
    render(state: ImpulseMomentumState): void {
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
