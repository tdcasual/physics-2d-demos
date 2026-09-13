import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  currentAtPosition,
  singleLoopConstants,
  velocityAtPosition,
  type SingleLoopState
} from './scene.sim';

export type CreateSingleLoopViewOptions = {
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
  diagramX: DIAGRAM_X,
  diagramY: DIAGRAM_Y,
  diagramWidth: DIAGRAM_W,
  diagramHeight: DIAGRAM_H,
  fieldLeft: FIELD_LEFT,
  fieldRight: FIELD_RIGHT,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  trackY: TRACK_Y,
  loopHeight: LOOP_H,
  loopWidth: LOOP_W,
  physicalFieldWidth: FIELD_D,
  positionScale: POSITION_SCALE,
  graphY: GRAPH_Y,
  graphHeight: GRAPH_H,
  vGraphX: V_GRAPH_X,
  vGraphWidth: V_GRAPH_W,
  iGraphX: I_GRAPH_X,
  iGraphWidth: I_GRAPH_W,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  graphLeftInset: GRAPH_LEFT_INSET,
  graphRightInset: GRAPH_RIGHT_INSET,
  xMin: X_MIN,
  xMax: X_MAX,
  vMin: V_MIN,
  vMax: V_MAX,
  currentMax: CURRENT_MAX,
  graphGridStep: GRID_STEP,
  panelCardX: CARD_X,
  panelCardWidth: CARD_W,
  headerRuleY: HEADER_RULE_Y,
  readoutY: READOUT_Y,
  readoutHeight: READOUT_H,
  formulaY: FORMULA_Y,
  formulaHeight: FORMULA_H,
  noteY: NOTE_Y,
  noteHeight: NOTE_H
} = singleLoopConstants;

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
  field: string;
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
    teal: '#16a28d',
    gold: '#d99416',
    purple: '#7b34c7',
    field: '#7cb1d2',
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
    field: '#65a9cf',
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
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
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
    x2 - 12 * Math.cos(angle - Math.PI / 6),
    y2 - 12 * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - 12 * Math.cos(angle + Math.PI / 6),
    y2 - 12 * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function positionToPx(position: number): number {
  return FIELD_LEFT + (position + 1) * POSITION_SCALE;
}

function xToGraphPx(
  position: number,
  graphX: number,
  graphWidth: number
): number {
  return (
    graphX +
    GRAPH_LEFT_INSET +
    ((position - X_MIN) / (X_MAX - X_MIN)) *
      (graphWidth - GRAPH_LEFT_INSET - GRAPH_RIGHT_INSET)
  );
}

function vToGraphPx(velocity: number): number {
  return (
    GRAPH_BOTTOM -
    ((velocity - V_MIN) / (V_MAX - V_MIN)) * (GRAPH_BOTTOM - GRAPH_TOP)
  );
}

function iToGraphPx(current: number): number {
  const min = -CURRENT_MAX;
  return (
    GRAPH_BOTTOM -
    ((current - min) / (CURRENT_MAX - min)) * (GRAPH_BOTTOM - GRAPH_TOP)
  );
}

function clampGraphY(y: number): number {
  return Math.max(GRAPH_TOP, Math.min(GRAPH_BOTTOM, y));
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: SingleLoopState,
  p: Palette
): void {
  rounded(ctx, DIAGRAM_X, DIAGRAM_Y, DIAGRAM_W, DIAGRAM_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '单匝线框穿过有界匀强磁场',
    DIAGRAM_X + 18,
    DIAGRAM_Y + 24,
    p.ink,
    18,
    'left',
    700
  );
  text(
    ctx,
    '× 方向垂直纸面向里；进入与穿出区产生感应电流',
    DIAGRAM_X + 18,
    DIAGRAM_Y + 52,
    p.muted,
    13,
    'left',
    600
  );
  ctx.fillStyle = `${p.field}25`;
  ctx.fillRect(
    FIELD_LEFT,
    FIELD_TOP,
    FIELD_RIGHT - FIELD_LEFT,
    FIELD_BOTTOM - FIELD_TOP
  );
  ctx.strokeStyle = p.field;
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(
    FIELD_LEFT,
    FIELD_TOP,
    FIELD_RIGHT - FIELD_LEFT,
    FIELD_BOTTOM - FIELD_TOP
  );
  ctx.setLineDash([]);
  for (let x = FIELD_LEFT + 20; x < FIELD_RIGHT; x += 32) {
    for (let y = FIELD_TOP + 22; y < FIELD_BOTTOM; y += 32) {
      text(ctx, '×', x, y, p.field, 16, 'center', 700);
    }
  }
  text(
    ctx,
    '有界匀强磁场 B',
    (FIELD_LEFT + FIELD_RIGHT) / 2,
    FIELD_TOP - 18,
    p.blue,
    16,
    'center',
    700
  );
  text(
    ctx,
    '进入区',
    FIELD_LEFT - 22,
    FIELD_TOP - 18,
    p.muted,
    12,
    'right',
    600
  );
  text(
    ctx,
    '匀速区（I=0）',
    (FIELD_LEFT + FIELD_RIGHT) / 2,
    FIELD_BOTTOM + 22,
    p.muted,
    12,
    'center',
    600
  );
  text(
    ctx,
    '穿出区',
    FIELD_RIGHT + 18,
    FIELD_TOP - 18,
    p.muted,
    12,
    'left',
    600
  );
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(DIAGRAM_X + 18, TRACK_Y);
  ctx.lineTo(DIAGRAM_X + DIAGRAM_W - 18, TRACK_Y);
  ctx.stroke();
  const loopX = positionToPx(state.position);
  const loopW = LOOP_W * POSITION_SCALE;
  const loopH = LOOP_H * POSITION_SCALE;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.strokeRect(loopX, TRACK_Y - loopH / 2, loopW, loopH);
  arrow(ctx, loopX + loopW, TRACK_Y, loopX + loopW + 62, TRACK_Y, p.red, 4);
  text(ctx, 'v', loopX + loopW + 72, TRACK_Y, p.red, 16, 'left', 700);
  text(
    ctx,
    `L = ${LOOP_W.toFixed(1)} m`,
    loopX + loopW / 2,
    TRACK_Y - loopH / 2 - 16,
    p.red,
    13,
    'center',
    700
  );
  if (Math.abs(state.current) > 0.01 && state.params.showCurrent) {
    arrow(
      ctx,
      loopX + loopW / 2,
      TRACK_Y - loopH / 2 - 34,
      loopX + loopW / 2 + (state.current > 0 ? 44 : -44),
      TRACK_Y - loopH / 2 - 34,
      p.teal,
      3
    );
    // Keep the current label clear of the field title while the loop enters.
    text(
      ctx,
      `i=${state.current.toFixed(2)} A`,
      loopX + loopW / 2 - 110,
      TRACK_Y - loopH / 2 - 54,
      p.teal,
      12,
      'left',
      700
    );
  }
  text(
    ctx,
    `D = ${FIELD_D.toFixed(1)} m`,
    (FIELD_LEFT + FIELD_RIGHT) / 2,
    FIELD_BOTTOM + 42,
    p.ink,
    14,
    'center',
    700
  );
}

function drawGraphPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  width: number,
  state: SingleLoopState,
  p: Palette,
  currentGraph: boolean
): void {
  rounded(ctx, x, GRAPH_Y, width, GRAPH_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const left = x + GRAPH_LEFT_INSET;
  const right = x + width - GRAPH_RIGHT_INSET;
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let gx = left; gx <= right; gx += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(gx, GRAPH_TOP);
    ctx.lineTo(gx, GRAPH_BOTTOM);
    ctx.stroke();
  }
  for (let gy = GRAPH_TOP; gy <= GRAPH_BOTTOM; gy += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(left, gy);
    ctx.lineTo(right, gy);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, GRAPH_BOTTOM);
  ctx.lineTo(right + 12, GRAPH_BOTTOM);
  ctx.moveTo(left, GRAPH_BOTTOM);
  ctx.lineTo(left, GRAPH_TOP - 12);
  ctx.stroke();
  const label = currentGraph ? 'i / A' : 'v / m·s⁻¹';
  text(ctx, label, left - 10, GRAPH_TOP - 18, p.ink, 12, 'right', 700);
  text(ctx, 'x / m', right + 16, GRAPH_BOTTOM, p.ink, 12, 'left', 700);
  text(ctx, '0', left - 10, GRAPH_BOTTOM + 4, p.muted, 10, 'right', 600);
  text(
    ctx,
    String(FIELD_D),
    xToGraphPx(FIELD_D, x, width),
    GRAPH_BOTTOM + 16,
    p.muted,
    10,
    'center',
    600
  );
  ctx.strokeStyle = currentGraph ? p.blue : p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let index = 0; index <= 100; index += 1) {
    const position = X_MIN + ((X_MAX - X_MIN) * index) / 100;
    const px = xToGraphPx(position, x, width);
    const value = currentGraph
      ? currentAtPosition(state.params, position)
      : velocityAtPosition(state.params, position);
    const py = clampGraphY(
      currentGraph ? iToGraphPx(value) : vToGraphPx(value)
    );
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  const cursorX = xToGraphPx(state.position, x, width);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(cursorX, GRAPH_TOP);
  ctx.lineTo(cursorX, GRAPH_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
  const cursorY = clampGraphY(
    currentGraph ? iToGraphPx(state.current) : vToGraphPx(state.velocity)
  );
  ctx.fillStyle = currentGraph ? p.blue : p.red;
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, 7, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    currentGraph ? 'i-x' : 'v-x',
    x + 18,
    GRAPH_Y + 24,
    p.ink,
    17,
    'left',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: SingleLoopState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(FIELD_W, 0, BASE_W - FIELD_W, BASE_H);
  text(ctx, '实验参数与图象', PANEL_X + 18, 38, p.ink, 20, 'left', 700);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + 18, HEADER_RULE_Y);
  ctx.lineTo(PANEL_X + PANEL_W - 22, HEADER_RULE_Y);
  ctx.stroke();
  rounded(ctx, CARD_X, READOUT_Y, CARD_W, READOUT_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '实时状态', CARD_X + 16, READOUT_Y + 24, p.teal, 15, 'left', 700);
  const rows: Array<[string, string, string]> = [
    [
      '阶段',
      state.region === 'inside'
        ? '匀速区'
        : state.region === 'entering'
          ? '进入区'
          : state.region === 'exiting'
            ? '穿出区'
            : state.region === 'after'
              ? '已穿出'
              : '未进入',
      p.ink
    ],
    ['位置 x', `${state.position.toFixed(2)} m`, p.ink],
    ['速度 v', `${state.velocity.toFixed(2)} m/s`, p.red],
    ['感应电流 i', `${state.current.toFixed(2)} A`, p.blue],
    ['感应电动势 E', `${state.emf.toFixed(2)} V`, p.teal],
    ['安培力 F', `${state.magneticForce.toFixed(2)} N`, p.purple]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = READOUT_Y + 55 + index * 25;
    text(ctx, label, CARD_X + 16, y, p.muted, 12, 'left', 600);
    text(ctx, value, CARD_X + CARD_W - 16, y, color, 13, 'right', 700);
  });
  rounded(ctx, CARD_X, FORMULA_Y, CARD_W, FORMULA_H, 12);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '模型关系', CARD_X + 16, FORMULA_Y + 24, p.gold, 15, 'left', 700);
  text(
    ctx,
    'E = Bdv，i = E/R',
    CARD_X + 16,
    FORMULA_Y + 62,
    p.ink,
    18,
    'left',
    700
  );
  text(
    ctx,
    'Fₐ = Bdi，方向阻碍相对运动',
    CARD_X + 16,
    FORMULA_Y + 98,
    p.blue,
    13,
    'left',
    600
  );
  text(
    ctx,
    '进入/穿出：v-x 斜率 = −B²d²/(mR)',
    CARD_X + 16,
    FORMULA_Y + 130,
    p.red,
    12,
    'left',
    600
  );
  text(
    ctx,
    '匀速区：磁通量不变，i = 0',
    CARD_X + 16,
    FORMULA_Y + 160,
    p.teal,
    12,
    'left',
    600
  );
  rounded(ctx, CARD_X, NOTE_Y, CARD_W, NOTE_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '观察', CARD_X + 16, NOTE_Y + 24, p.gold, 15, 'left', 700);
  text(
    ctx,
    '增大 B、减小 m 或 R，v-x 下降更快',
    CARD_X + 16,
    NOTE_Y + 62,
    p.ink,
    13,
    'left',
    600
  );
  text(
    ctx,
    state.params.autoRun ? '线框自动运动中' : '打开自动播放观察过程',
    CARD_X + 16,
    NOTE_Y + 98,
    p.teal,
    12,
    'left',
    600
  );
}

export function createSingleLoopView(
  options: CreateSingleLoopViewOptions = {}
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
  let snapshot: SingleLoopState | null = null;
  function draw(state: SingleLoopState): void {
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
    drawField(ctx, state, p);
    drawGraphPanel(ctx, V_GRAPH_X, V_GRAPH_W, state, p, false);
    drawGraphPanel(ctx, I_GRAPH_X, I_GRAPH_W, state, p, true);
    drawPanel(ctx, state, p);
    ctx.restore();
  }
  return {
    render(state: SingleLoopState): void {
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
