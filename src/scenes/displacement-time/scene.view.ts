import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  displacementTimeConstants,
  type DisplacementTimeState
} from './scene.sim';

export type CreateDisplacementTimeViewOptions = {
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
  panelInset: INSET,
  trackStartX: TRACK_START_X,
  trackEndX: TRACK_END_X,
  trackY: TRACK_Y,
  trackOriginX: TRACK_ORIGIN_X,
  trackScale: TRACK_SCALE,
  trackDotStartX: TRACK_DOT_START_X,
  trackDotGap: TRACK_DOT_GAP,
  trackDotCount: TRACK_DOT_COUNT,
  carWidth: CAR_WIDTH,
  carHeight: CAR_HEIGHT,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  velocityTop: VELOCITY_TOP,
  velocityBottom: VELOCITY_BOTTOM,
  velocityAxisY: VELOCITY_AXIS_Y,
  velocityMax: VELOCITY_MAX,
  displacementTop: DISPLACEMENT_TOP,
  displacementBottom: DISPLACEMENT_BOTTOM,
  displacementAxisY: DISPLACEMENT_AXIS_Y,
  displacementMax: DISPLACEMENT_MAX,
  maxTime: MAX_TIME,
  cursorWidth: CURSOR_WIDTH,
  panelTitleY: PANEL_TITLE_Y,
  panelDividerY: PANEL_DIVIDER_Y,
  inputCardY1: INPUT_CARD_Y1,
  inputCardY2: INPUT_CARD_Y2,
  inputCardHeight: INPUT_CARD_HEIGHT,
  formulaY: FORMULA_Y,
  formulaHeight: FORMULA_HEIGHT,
  readoutY: READOUT_Y,
  readoutHeight: READOUT_HEIGHT
} = displacementTimeConstants;

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
    panel: '#ffffff',
    grid: '#dbe2ea',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    blue: '#35a9db',
    teal: '#259d91',
    gold: '#efb52b',
    border: '#d2d9e2',
    soft: '#f1f4f7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    grid: '#40516b',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    blue: '#38bdf8',
    teal: '#4dd4c0',
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

function graphX(time: number): number {
  return GRAPH_LEFT + (GRAPH_RIGHT - GRAPH_LEFT) * (time / MAX_TIME);
}

function velocityY(velocity: number): number {
  return (
    VELOCITY_AXIS_Y -
    velocity * ((VELOCITY_AXIS_Y - VELOCITY_TOP) / VELOCITY_MAX)
  );
}

function displacementY(displacement: number): number {
  return (
    DISPLACEMENT_AXIS_Y -
    displacement * ((DISPLACEMENT_AXIS_Y - DISPLACEMENT_TOP) / DISPLACEMENT_MAX)
  );
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  state: DisplacementTimeState,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(TRACK_START_X, TRACK_Y);
  ctx.lineTo(TRACK_END_X, TRACK_Y);
  ctx.stroke();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(TRACK_START_X, TRACK_Y - 7);
  ctx.lineTo(TRACK_END_X, TRACK_Y - 7);
  ctx.stroke();
  for (let i = 0; i < TRACK_DOT_COUNT; i += 1) {
    const x = TRACK_DOT_START_X + i * TRACK_DOT_GAP;
    ctx.fillStyle = p.muted;
    ctx.beginPath();
    ctx.arc(x, TRACK_Y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const carX = Math.max(
    TRACK_START_X + CAR_WIDTH / 2,
    Math.min(
      TRACK_END_X - CAR_WIDTH / 2,
      TRACK_ORIGIN_X + state.displacement * TRACK_SCALE
    )
  );
  ctx.fillStyle = '#2b9fd6';
  ctx.beginPath();
  ctx.roundRect(
    carX - CAR_WIDTH / 2,
    TRACK_Y - CAR_HEIGHT,
    CAR_WIDTH,
    CAR_HEIGHT,
    7
  );
  ctx.fill();
  ctx.fillStyle = '#bfeaf8';
  ctx.beginPath();
  ctx.roundRect(carX - 18, TRACK_Y - CAR_HEIGHT - 12, 36, 15, 5);
  ctx.fill();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(carX - 20, TRACK_Y + 2, 8, 0, Math.PI * 2);
  ctx.arc(carX + 20, TRACK_Y + 2, 8, 0, Math.PI * 2);
  ctx.fill();
  const direction = Math.sign(state.velocity || 1);
  const speedLength = Math.max(
    18,
    Math.min(86, Math.abs(state.velocity) * 3.1)
  );
  arrow(
    ctx,
    carX,
    TRACK_Y - 36,
    carX + direction * speedLength,
    TRACK_Y - 36,
    p.red,
    4
  );
  text(
    ctx,
    'v',
    carX + direction * (speedLength + 15),
    TRACK_Y - 36,
    p.red,
    17 * scale,
    'center',
    700
  );
  arrow(
    ctx,
    TRACK_ORIGIN_X,
    TRACK_Y + 28,
    TRACK_ORIGIN_X + 50,
    TRACK_Y + 28,
    p.ink,
    2
  );
  text(
    ctx,
    'x',
    TRACK_END_X + 20,
    TRACK_Y + 20,
    p.ink,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    '−50m',
    TRACK_START_X + 120,
    TRACK_Y + 28,
    p.muted,
    13 * scale,
    'center'
  );
  text(ctx, '0', TRACK_ORIGIN_X, TRACK_Y + 28, p.ink, 13 * scale, 'center');
  text(
    ctx,
    '50m',
    TRACK_ORIGIN_X + 50 * TRACK_SCALE,
    TRACK_Y + 28,
    p.muted,
    13 * scale,
    'center'
  );
}

function drawGraphGrid(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= MAX_TIME; i += 1) {
    const x = graphX(i);
    ctx.beginPath();
    ctx.moveTo(x, VELOCITY_TOP);
    ctx.lineTo(x, VELOCITY_BOTTOM);
    ctx.moveTo(x, DISPLACEMENT_TOP);
    ctx.lineTo(x, DISPLACEMENT_BOTTOM);
    ctx.stroke();
    text(ctx, `${i}`, x, VELOCITY_BOTTOM + 16, p.muted, 11 * scale, 'center');
  }
  for (let i = -2; i <= 2; i += 1) {
    const y = velocityY(i * 10);
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
    text(ctx, `${i * 10}`, GRAPH_LEFT - 12, y, p.muted, 11 * scale, 'right');
  }
  for (let i = 0; i <= 3; i += 1) {
    const y = displacementY(i * 20);
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, VELOCITY_TOP - 8);
  ctx.lineTo(GRAPH_LEFT, VELOCITY_BOTTOM);
  ctx.lineTo(GRAPH_RIGHT + 10, VELOCITY_BOTTOM);
  ctx.moveTo(GRAPH_LEFT, DISPLACEMENT_TOP - 8);
  ctx.lineTo(GRAPH_LEFT, DISPLACEMENT_BOTTOM);
  ctx.lineTo(GRAPH_RIGHT + 10, DISPLACEMENT_BOTTOM);
  ctx.stroke();
  text(
    ctx,
    'v',
    GRAPH_LEFT - 10,
    VELOCITY_TOP - 10,
    p.ink,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    'x',
    GRAPH_LEFT - 10,
    DISPLACEMENT_TOP - 10,
    p.ink,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    't',
    GRAPH_RIGHT + 18,
    VELOCITY_BOTTOM,
    p.ink,
    15 * scale,
    'center',
    700
  );
  text(
    ctx,
    't',
    GRAPH_RIGHT + 18,
    DISPLACEMENT_BOTTOM,
    p.ink,
    15 * scale,
    'center',
    700
  );
}

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: DisplacementTimeState,
  p: Palette,
  scale: number
): void {
  text(
    ctx,
    'v-t 图：面积 = 位移',
    (GRAPH_LEFT + GRAPH_RIGHT) / 2,
    156,
    p.muted,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    'x-t 图',
    (GRAPH_LEFT + GRAPH_RIGHT) / 2,
    388,
    p.muted,
    16 * scale,
    'center',
    700
  );
  drawGraphGrid(ctx, p, scale);
  const cursorX = graphX(state.time);
  const v0Y = velocityY(state.params.v0);
  const currentY = velocityY(state.velocity);
  if (state.params.showArea) {
    ctx.fillStyle = 'rgba(53,169,219,0.22)';
    ctx.fillRect(
      GRAPH_LEFT,
      Math.min(VELOCITY_AXIS_Y, v0Y),
      cursorX - GRAPH_LEFT,
      Math.abs(v0Y - VELOCITY_AXIS_Y)
    );
    ctx.fillStyle = 'rgba(239,64,80,0.22)';
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, v0Y);
    ctx.lineTo(cursorX, currentY);
    ctx.lineTo(cursorX, v0Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, v0Y);
  ctx.lineTo(cursorX, currentY);
  ctx.stroke();
  text(
    ctx,
    'v₀t',
    (GRAPH_LEFT + cursorX) / 2,
    (VELOCITY_AXIS_Y + v0Y) / 2,
    p.blue,
    13 * scale,
    'center',
    700
  );
  text(
    ctx,
    '½at²',
    (GRAPH_LEFT + cursorX) / 2 + 32,
    (v0Y + currentY) / 2 - 14,
    p.red,
    13 * scale,
    'center',
    700
  );
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= 40; i += 1) {
    const t = MAX_TIME * (i / 40);
    const x = graphX(t);
    const displacement =
      state.params.v0 * t + 0.5 * state.params.acceleration * t * t;
    const y = displacementY(displacement);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const currentDisplacementY = displacementY(state.displacement);
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cursorX, currentDisplacementY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f0b429';
  ctx.lineWidth = CURSOR_WIDTH;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(cursorX, VELOCITY_TOP - 25);
  ctx.lineTo(cursorX, DISPLACEMENT_BOTTOM + 12);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: DisplacementTimeState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, PANEL_W, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, BASE_H);
  ctx.stroke();
  text(
    ctx,
    '匀变速直线运动图像',
    x + INSET,
    PANEL_TITLE_Y,
    p.ink,
    20 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + INSET, PANEL_DIVIDER_Y);
  ctx.lineTo(x + PANEL_W - INSET, PANEL_DIVIDER_Y);
  ctx.stroke();
  const cardWidth = PANEL_W - INSET * 2;
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + INSET, INPUT_CARD_Y1, cardWidth, INPUT_CARD_HEIGHT, 10);
  ctx.roundRect(x + INSET, INPUT_CARD_Y2, cardWidth, INPUT_CARD_HEIGHT, 10);
  ctx.fill();
  text(ctx, '初速度 v₀', x + INSET + 16, 104, p.ink, 14 * scale, 'left', 700);
  text(
    ctx,
    `${state.params.v0.toFixed(0)} m/s`,
    x + PANEL_W - INSET - 16,
    104,
    p.ink,
    15 * scale,
    'right',
    700
  );
  text(ctx, '加速度 a', x + INSET + 16, 170, p.ink, 14 * scale, 'left', 700);
  text(
    ctx,
    `${state.params.acceleration.toFixed(0)} m/s²`,
    x + PANEL_W - INSET - 16,
    170,
    p.ink,
    15 * scale,
    'right',
    700
  );
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + INSET, READOUT_Y, cardWidth, READOUT_HEIGHT, 10);
  ctx.fill();
  text(
    ctx,
    '实时运动数据',
    x + INSET + 16,
    READOUT_Y + 20,
    p.muted,
    13 * scale,
    'left',
    700
  );
  text(ctx, '时刻 t', x + INSET + 16, READOUT_Y + 54, p.ink, 14 * scale);
  text(
    ctx,
    `${state.time.toFixed(2)} s`,
    x + PANEL_W - INSET - 16,
    READOUT_Y + 54,
    p.ink,
    15 * scale,
    'right',
    700
  );
  text(ctx, '瞬时速度 v', x + INSET + 16, READOUT_Y + 88, p.red, 14 * scale);
  text(
    ctx,
    `${state.velocity.toFixed(2)} m/s`,
    x + PANEL_W - INSET - 16,
    READOUT_Y + 88,
    p.red,
    15 * scale,
    'right',
    700
  );
  text(ctx, '总位移 x', x + INSET + 16, READOUT_Y + 122, p.teal, 14 * scale);
  text(
    ctx,
    `${state.displacement.toFixed(2)} m`,
    x + PANEL_W - INSET - 16,
    READOUT_Y + 122,
    p.teal,
    15 * scale,
    'right',
    700
  );
  ctx.fillStyle = '#fff1f1';
  ctx.beginPath();
  ctx.roundRect(x + INSET, FORMULA_Y, cardWidth, FORMULA_HEIGHT, 10);
  ctx.fill();
  text(
    ctx,
    'v-t 图像面积 = 位移',
    x + PANEL_W / 2,
    FORMULA_Y + 24,
    p.muted,
    13 * scale,
    'center',
    700
  );
  text(
    ctx,
    'x = v₀t + ½at²',
    x + PANEL_W / 2,
    FORMULA_Y + 54,
    p.red,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    `x = ${(state.params.v0 * state.time).toFixed(2)} + ${(0.5 * state.params.acceleration * state.time * state.time).toFixed(2)} = ${state.displacement.toFixed(2)} m`,
    x + PANEL_W / 2,
    FORMULA_Y + 94,
    p.blue,
    12 * scale,
    'center',
    700
  );
}

export function createDisplacementTimeView(
  options: CreateDisplacementTimeViewOptions = {}
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
  let snapshot: DisplacementTimeState | null = null;

  function draw(state: DisplacementTimeState): void {
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
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, FIELD_W, BASE_H);
    drawTrack(ctx, state, p, scale);
    drawGraphs(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }

  return {
    render(state: DisplacementTimeState): void {
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
