import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { blockBoardConstants, type BlockBoardState } from './scene.sim';

export type CreateBlockBoardViewOptions = {
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
  boardStartX: BOARD_START_X,
  boardWidth: BOARD_WIDTH,
  boardHeight: BOARD_HEIGHT,
  blockWidth: BLOCK_WIDTH,
  blockHeight: BLOCK_HEIGHT,
  trackScale: TRACK_SCALE,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  graphAxisY: GRAPH_AXIS_Y,
  graphMaxTime: GRAPH_MAX_TIME,
  graphMaxVelocity: GRAPH_MAX_VELOCITY,
  panelTop: PANEL_TOP,
  panelHeight: PANEL_HEIGHT,
  readoutWidth: READOUT_WIDTH,
  syncTopOffset: SYNC_TOP_OFFSET,
  readoutRuleY: READOUT_RULE_Y,
  panelRuleY: PANEL_RULE_Y,
  formulaCardY: FORMULA_CARD_Y,
  formulaCardHeight: FORMULA_CARD_HEIGHT,
  syncDash: SYNC_DASH
} = blockBoardConstants;

type Palette = {
  bg: string;
  panel: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  amber: string;
  border: string;
  soft: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#ffffff',
    panel: '#ffffff',
    grid: '#d9e1e9',
    ink: '#303744',
    muted: '#8d99a8',
    red: '#ef4050',
    blue: '#4b83a5',
    teal: '#229c8e',
    amber: '#f3a51d',
    border: '#d3dbe4',
    soft: '#f4f7f9'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    grid: '#44556d',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    red: '#fb7185',
    blue: '#73b4dc',
    teal: '#4dd4c0',
    amber: '#fbbf24',
    border: '#3d4d63',
    soft: '#243248'
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
  ctx.lineTo(x2 - ux * 14 - uy * 6, y2 - uy * 14 + ux * 6);
  ctx.lineTo(x2 - ux * 14 + uy * 6, y2 - uy * 14 - ux * 6);
  ctx.closePath();
  ctx.fill();
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  state: BlockBoardState,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TRACK_START_X, TRACK_Y + 30);
  ctx.lineTo(TRACK_END_X, TRACK_Y + 30);
  ctx.stroke();
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(TRACK_START_X, TRACK_Y + 30);
  ctx.lineTo(TRACK_END_X, TRACK_Y + 30);
  ctx.stroke();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 16; i += 1) {
    const x = TRACK_START_X + i * TRACK_SCALE;
    ctx.beginPath();
    ctx.moveTo(x, TRACK_Y + 35);
    ctx.lineTo(x, TRACK_Y + 47);
    ctx.stroke();
    if (i % 2 === 0)
      text(ctx, `${i}`, x, TRACK_Y + 65, p.muted, 12 * scale, 'center');
  }
  text(
    ctx,
    'x (m)',
    TRACK_END_X - 12,
    TRACK_Y + 62,
    p.muted,
    13 * scale,
    'right'
  );

  const boardX = BOARD_START_X + state.boardPosition * TRACK_SCALE;
  const blockX = BOARD_START_X + 172 + state.blockPosition * TRACK_SCALE;
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.roundRect(
    boardX,
    TRACK_Y - BOARD_HEIGHT / 2,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    7
  );
  ctx.fill();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.roundRect(
    blockX - BLOCK_WIDTH / 2,
    TRACK_Y - BOARD_HEIGHT / 2 - BLOCK_HEIGHT,
    BLOCK_WIDTH,
    BLOCK_HEIGHT,
    7
  );
  ctx.fill();
  text(
    ctx,
    'M',
    boardX + BOARD_WIDTH / 2,
    TRACK_Y,
    '#ffffff',
    18 * scale,
    'center',
    700
  );
  text(
    ctx,
    'm',
    blockX,
    TRACK_Y - BOARD_HEIGHT / 2 - BLOCK_HEIGHT / 2,
    '#ffffff',
    18 * scale,
    'center',
    700
  );
  const blockDirection = Math.sign(state.blockVelocity || 1);
  const boardDirection = Math.sign(state.boardVelocity || 1);
  arrow(
    ctx,
    blockX,
    TRACK_Y - BOARD_HEIGHT / 2 - BLOCK_HEIGHT - 16,
    blockX + blockDirection * 72,
    TRACK_Y - BOARD_HEIGHT / 2 - BLOCK_HEIGHT - 16,
    p.red,
    4
  );
  arrow(
    ctx,
    boardX + BOARD_WIDTH,
    TRACK_Y - 2,
    boardX + BOARD_WIDTH + boardDirection * 72,
    TRACK_Y - 2,
    p.teal,
    4
  );
  text(
    ctx,
    'v₁',
    blockX + blockDirection * 88,
    TRACK_Y - BOARD_HEIGHT / 2 - BLOCK_HEIGHT - 16,
    p.red,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    'v₂',
    boardX + BOARD_WIDTH + boardDirection * 88,
    TRACK_Y - 2,
    p.teal,
    16 * scale,
    'center',
    700
  );
  if (state.params.showForces && state.sliding) {
    arrow(
      ctx,
      blockX - 5,
      TRACK_Y - BOARD_HEIGHT / 2 - BLOCK_HEIGHT - 46,
      blockX - 58,
      TRACK_Y - BOARD_HEIGHT / 2 - BLOCK_HEIGHT - 46,
      p.amber,
      3
    );
    arrow(
      ctx,
      boardX + BOARD_WIDTH + 8,
      TRACK_Y + 16,
      boardX + BOARD_WIDTH + 60,
      TRACK_Y + 16,
      p.amber,
      3
    );
    text(
      ctx,
      'f',
      blockX - 72,
      TRACK_Y - BOARD_HEIGHT / 2 - BLOCK_HEIGHT - 46,
      p.amber,
      13 * scale,
      'center'
    );
  }
  const syncBlockPosition =
    state.params.initialVelocity * state.syncTime +
    0.5 * state.blockAcceleration * state.syncTime ** 2;
  const syncX = BOARD_START_X + 172 + syncBlockPosition * TRACK_SCALE;
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.setLineDash([SYNC_DASH, SYNC_DASH]);
  ctx.beginPath();
  ctx.moveTo(syncX, TRACK_Y - SYNC_TOP_OFFSET);
  ctx.lineTo(syncX, TRACK_Y + 48);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '共速预定点',
    syncX,
    TRACK_Y + 82,
    p.teal,
    13 * scale,
    'center',
    700
  );
}

function graphX(time: number): number {
  return GRAPH_LEFT + (GRAPH_RIGHT - GRAPH_LEFT) * (time / GRAPH_MAX_TIME);
}

function velocityY(velocity: number): number {
  return (
    GRAPH_AXIS_Y - velocity * ((GRAPH_AXIS_Y - GRAPH_TOP) / GRAPH_MAX_VELOCITY)
  );
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: BlockBoardState,
  p: Palette,
  scale: number
): void {
  text(
    ctx,
    'v-t 运动图像（面积 = 位移）',
    (GRAPH_LEFT + GRAPH_RIGHT) / 2,
    PANEL_TOP + 22,
    p.ink,
    16 * scale,
    'center',
    700
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i += 1) {
    const x = graphX(i);
    ctx.beginPath();
    ctx.moveTo(x, GRAPH_TOP);
    ctx.lineTo(x, GRAPH_BOTTOM);
    ctx.stroke();
    text(ctx, `${i}`, x, GRAPH_BOTTOM + 16, p.muted, 11 * scale, 'center');
  }
  for (let i = 0; i <= 2; i += 1) {
    const y = velocityY(i * 4);
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
    text(ctx, `${i * 4}`, GRAPH_LEFT - 12, y, p.muted, 11 * scale, 'right');
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, GRAPH_TOP - 8);
  ctx.lineTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_RIGHT + 10, GRAPH_BOTTOM);
  ctx.stroke();
  text(
    ctx,
    'v',
    GRAPH_LEFT - 10,
    GRAPH_TOP - 10,
    p.ink,
    15 * scale,
    'center',
    700
  );
  text(
    ctx,
    't (s)',
    GRAPH_RIGHT + 26,
    GRAPH_BOTTOM,
    p.ink,
    13 * scale,
    'center'
  );
  const syncX = graphX(state.syncTime);
  if (state.params.showArea) {
    ctx.fillStyle = 'rgba(243,165,29,0.24)';
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, velocityY(state.params.initialVelocity));
    ctx.lineTo(syncX, velocityY(state.commonVelocity));
    ctx.lineTo(syncX, velocityY(0));
    ctx.lineTo(GRAPH_LEFT, velocityY(0));
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, velocityY(state.params.initialVelocity));
  ctx.lineTo(syncX, velocityY(state.commonVelocity));
  ctx.lineTo(GRAPH_RIGHT, velocityY(state.commonVelocity));
  ctx.stroke();
  ctx.strokeStyle = p.blue;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, velocityY(0));
  ctx.lineTo(syncX, velocityY(state.commonVelocity));
  ctx.lineTo(GRAPH_RIGHT, velocityY(state.commonVelocity));
  ctx.stroke();
  text(
    ctx,
    '木块 m',
    GRAPH_RIGHT - 8,
    velocityY(state.commonVelocity) - 18,
    p.red,
    13 * scale,
    'right',
    700
  );
  text(
    ctx,
    '木板 M',
    GRAPH_RIGHT - 8,
    velocityY(state.commonVelocity) + 18,
    p.blue,
    13 * scale,
    'right',
    700
  );
  text(
    ctx,
    'Δx',
    (GRAPH_LEFT + syncX) / 2,
    velocityY(state.commonVelocity) + 34,
    p.amber,
    15 * scale,
    'center',
    700
  );
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.setLineDash([SYNC_DASH, SYNC_DASH]);
  ctx.beginPath();
  ctx.moveTo(syncX, GRAPH_TOP - 12);
  ctx.lineTo(syncX, GRAPH_BOTTOM + 8);
  ctx.stroke();
  ctx.setLineDash([]);
  const cursorX = graphX(state.time);
  ctx.strokeStyle = p.amber;
  ctx.lineWidth = 2;
  ctx.setLineDash([SYNC_DASH, SYNC_DASH]);
  ctx.beginPath();
  ctx.moveTo(cursorX, GRAPH_TOP - 12);
  ctx.lineTo(cursorX, GRAPH_BOTTOM + 8);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawReadout(
  ctx: CanvasRenderingContext2D,
  state: BlockBoardState,
  p: Palette,
  scale: number
): void {
  const x = 28;
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, PANEL_TOP, READOUT_WIDTH, PANEL_HEIGHT, 12);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '实时计算',
    x + READOUT_WIDTH / 2,
    PANEL_TOP + 30,
    p.ink,
    18 * scale,
    'center',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 22, PANEL_TOP + READOUT_RULE_Y);
  ctx.lineTo(x + READOUT_WIDTH - 22, PANEL_TOP + READOUT_RULE_Y);
  ctx.stroke();
  const rows: Array<[string, string, string]> = [
    ['木块加速度 a₁', `${state.blockAcceleration.toFixed(2)} m/s²`, p.red],
    ['木板加速度 a₂', `${state.boardAcceleration.toFixed(2)} m/s²`, p.blue],
    ['理论共速 v', `${state.commonVelocity.toFixed(2)} m/s`, p.teal],
    ['相对位移 Δx', `${state.relativeDisplacement.toFixed(2)} m`, p.amber],
    ['当前时间 t', `${state.time.toFixed(2)} s`, p.ink],
    ['木块速度 v₁', `${state.blockVelocity.toFixed(2)} m/s`, p.red],
    ['木板速度 v₂', `${state.boardVelocity.toFixed(2)} m/s`, p.blue]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = PANEL_TOP + 88 + index * 28;
    text(ctx, label, x + 24, y, p.ink, 13 * scale);
    text(
      ctx,
      value,
      x + READOUT_WIDTH - 24,
      y,
      color,
      13 * scale,
      'right',
      700
    );
  });
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: BlockBoardState,
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
  text(ctx, '系统参数', x + INSET, 42, p.ink, 20 * scale, 'left', 700);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + INSET, PANEL_RULE_Y);
  ctx.lineTo(x + PANEL_W - INSET, PANEL_RULE_Y);
  ctx.stroke();
  const rows: Array<[string, string, string]> = [
    ['木块质量 m', `${state.params.blockMass.toFixed(1)} kg`, p.red],
    ['木板质量 M', `${state.params.boardMass.toFixed(1)} kg`, p.blue],
    ['初速度 v₀', `${state.params.initialVelocity.toFixed(1)} m/s`, p.teal],
    ['动摩擦因数 μ', state.params.friction.toFixed(2), p.ink]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = 112 + index * 52;
    ctx.fillStyle = p.soft;
    ctx.beginPath();
    ctx.roundRect(x + INSET, y - 20, PANEL_W - INSET * 2, 40, 9);
    ctx.fill();
    text(ctx, label, x + INSET + 14, y, p.ink, 13 * scale);
    text(
      ctx,
      value,
      x + PANEL_W - INSET - 14,
      y,
      color,
      14 * scale,
      'right',
      700
    );
  });
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(
    x + INSET,
    FORMULA_CARD_Y,
    PANEL_W - INSET * 2,
    FORMULA_CARD_HEIGHT,
    10
  );
  ctx.fill();
  text(ctx, '核心关系', x + INSET + 16, 368, p.muted, 13 * scale, 'left', 700);
  text(ctx, 'f = μmg', x + INSET + 16, 398, p.red, 15 * scale, 'left', 700);
  text(
    ctx,
    't₀ = v₀ / (μg(1 + m/M))',
    x + INSET + 16,
    426,
    p.teal,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.sliding ? '滑动中' : '已共速',
    x + INSET + 16,
    480,
    state.sliding ? p.amber : p.teal,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `t₀ = ${state.syncTime.toFixed(2)} s`,
    x + PANEL_W - INSET - 14,
    480,
    p.ink,
    13 * scale,
    'right',
    700
  );
}

export function createBlockBoardView(
  options: CreateBlockBoardViewOptions = {}
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
  let snapshot: BlockBoardState | null = null;
  function draw(state: BlockBoardState): void {
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
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    drawTrack(ctx, state, p, scale);
    drawReadout(ctx, state, p, scale);
    drawGraph(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: BlockBoardState): void {
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
