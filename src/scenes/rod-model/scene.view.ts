import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { accelerationAt, rodModelConstants, type RodState } from './scene.sim';

export type CreateRodModelViewOptions = {
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
  railLeft: RAIL_LEFT,
  railRight: RAIL_RIGHT,
  railTop: RAIL_TOP,
  railBottom: RAIL_BOTTOM,
  fieldLeft: FIELD_LEFT,
  fieldRight: FIELD_RIGHT,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  graphX: GRAPH_X,
  graphY: GRAPH_Y,
  graphWidth: GRAPH_W,
  graphHeight: GRAPH_H,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  graphGridStep: GRAPH_GRID_STEP,
  circuitComponentHeight: CIRCUIT_COMPONENT_H,
  legendPanelX: LEGEND_PANEL_X,
  legendPanelY: LEGEND_PANEL_Y,
  legendPanelWidth: LEGEND_PANEL_W,
  legendPanelHeight: LEGEND_PANEL_H,
  legendLineStartX: LEGEND_LINE_START_X,
  legendLineEndX: LEGEND_LINE_END_X,
  legendTextX: LEGEND_TEXT_X,
  legendLineY: LEGEND_LINE_Y,
  panelCardX: CARD_X,
  panelCardWidth: CARD_W,
  headerRuleY: HEADER_RULE_Y,
  readoutY: READOUT_Y,
  readoutHeight: READOUT_H,
  formulaY: FORMULA_Y,
  formulaHeight: FORMULA_H,
  noteY: NOTE_Y,
  noteHeight: NOTE_H,
  positionScale: POSITION_SCALE,
  timeMax: TIME_MAX,
  velocityMax: VELOCITY_MAX
} = rodModelConstants;

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
  rail: string;
  rod: string;
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
    blue: '#2d6fe0',
    teal: '#159f8b',
    gold: '#d99416',
    purple: '#7040db',
    field: '#80adff',
    rail: '#5b6673',
    rod: '#e68b00'
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
    blue: '#70a8ff',
    teal: '#4ed9c0',
    gold: '#fbbf24',
    purple: '#bb86fc',
    field: '#83aefe',
    rail: '#9aa7ba',
    rod: '#ffb52e'
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

function clampGraphY(value: number): number {
  return Math.max(GRAPH_TOP, Math.min(GRAPH_BOTTOM, value));
}

function positionToPx(position: number): number {
  return Math.min(RAIL_RIGHT - 18, FIELD_LEFT + position * POSITION_SCALE);
}

function timeToPx(time: number): number {
  return (
    GRAPH_LEFT +
    (Math.max(0, Math.min(TIME_MAX, time)) / TIME_MAX) *
      (GRAPH_RIGHT - GRAPH_LEFT)
  );
}

function velocityToPx(velocity: number): number {
  return (
    GRAPH_BOTTOM -
    (Math.max(0, Math.min(VELOCITY_MAX, velocity)) / VELOCITY_MAX) *
      (GRAPH_BOTTOM - GRAPH_TOP)
  );
}

function resistorVelocity(state: RodState, time: number): number {
  const params = state.params;
  const k =
    (params.fieldStrength *
      params.fieldStrength *
      params.railGap *
      params.railGap) /
    (params.mass * params.resistance);
  const terminal = state.terminalVelocity ?? 0;
  return terminal * (1 - Math.exp(-k * time));
}

function capacitorVelocity(state: RodState, time: number): number {
  return accelerationAt({ ...state.params, model: 'capacitor' }, 0) * time;
}

function drawFieldMarks(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = `${p.field}18`;
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
  for (let x = FIELD_LEFT + 22; x < FIELD_RIGHT; x += 54) {
    for (let y = FIELD_TOP + 30; y < FIELD_BOTTOM; y += 48) {
      text(ctx, '×', x, y, p.field, 22, 'center', 700);
    }
  }
  text(
    ctx,
    '磁感应强度 B（垂直纸面向里 ⊗）',
    FIELD_RIGHT - 8,
    FIELD_TOP - 16,
    p.blue,
    16,
    'right',
    700
  );
}

function drawResistor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: Palette
): void {
  ctx.strokeStyle = p.rod;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 11, y - CIRCUIT_COMPONENT_H / 2, 22, CIRCUIT_COMPONENT_H);
  text(ctx, 'R', x - 28, y, p.rod, 16, 'right', 700);
}

function drawCapacitor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: Palette
): void {
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 32);
  ctx.lineTo(x - 10, y + 32);
  ctx.moveTo(x + 10, y - 32);
  ctx.lineTo(x + 10, y + 32);
  ctx.stroke();
  text(ctx, 'C', x - 28, y, p.teal, 16, 'right', 700);
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: RodState,
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
    '物理情景演示区',
    DIAGRAM_X + 18,
    DIAGRAM_Y + 28,
    p.ink,
    19,
    'left',
    700
  );
  drawFieldMarks(ctx, p);

  ctx.strokeStyle = p.rail;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(RAIL_LEFT, RAIL_TOP);
  ctx.lineTo(RAIL_RIGHT, RAIL_TOP);
  ctx.moveTo(RAIL_LEFT, RAIL_BOTTOM);
  ctx.lineTo(RAIL_RIGHT, RAIL_BOTTOM);
  ctx.stroke();
  ctx.lineCap = 'butt';

  const rodX = positionToPx(state.position);
  const rodTop = RAIL_TOP - 20;
  const rodBottom = RAIL_BOTTOM + 20;
  ctx.fillStyle = p.rod;
  ctx.strokeStyle = p.rod;
  ctx.lineWidth = 2;
  ctx.fillRect(rodX - 10, rodTop, 20, rodBottom - rodTop);
  ctx.strokeRect(rodX - 10, rodTop, 20, rodBottom - rodTop);
  text(ctx, '导体棒 (m)', rodX, rodTop - 18, p.rod, 15, 'center', 700);

  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(ROD_CIRCUIT_X, RAIL_TOP);
  ctx.lineTo(rodX, RAIL_TOP);
  ctx.moveTo(ROD_CIRCUIT_X, RAIL_BOTTOM);
  ctx.lineTo(rodX, RAIL_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ROD_CIRCUIT_X, RAIL_TOP);
  ctx.lineTo(ROD_CIRCUIT_X, RAIL_BOTTOM);
  ctx.stroke();
  if (state.params.model === 'resistor')
    drawResistor(ctx, ROD_CIRCUIT_X, (RAIL_TOP + RAIL_BOTTOM) / 2, p);
  else drawCapacitor(ctx, ROD_CIRCUIT_X, (RAIL_TOP + RAIL_BOTTOM) / 2, p);

  arrow(
    ctx,
    rodX + 18,
    (RAIL_TOP + RAIL_BOTTOM) / 2 - 22,
    rodX + 82,
    (RAIL_TOP + RAIL_BOTTOM) / 2 - 22,
    p.red,
    4
  );
  text(
    ctx,
    'F',
    rodX + 92,
    (RAIL_TOP + RAIL_BOTTOM) / 2 - 22,
    p.red,
    16,
    'left',
    700
  );
  if (Math.abs(state.magneticForce) > 0.01) {
    arrow(
      ctx,
      rodX - 18,
      (RAIL_TOP + RAIL_BOTTOM) / 2 + 24,
      rodX - 78,
      (RAIL_TOP + RAIL_BOTTOM) / 2 + 24,
      p.blue,
      4
    );
    text(
      ctx,
      'F安',
      rodX - 88,
      (RAIL_TOP + RAIL_BOTTOM) / 2 + 24,
      p.blue,
      15,
      'right',
      700
    );
  }
  arrow(ctx, rodX + 18, RAIL_TOP + 28, rodX + 72, RAIL_TOP + 28, p.teal, 3);
  text(ctx, 'v', rodX + 82, RAIL_TOP + 28, p.teal, 15, 'left', 700);
  text(
    ctx,
    state.params.model === 'resistor' ? '纯电阻棒' : '纯电容棒',
    DIAGRAM_X + 18,
    DIAGRAM_Y + DIAGRAM_H - 20,
    state.params.model === 'resistor' ? p.gold : p.teal,
    15,
    'left',
    700
  );
}

function renderGraph(
  ctx: CanvasRenderingContext2D,
  state: RodState,
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
    '实时 v–t 运动图象对比',
    GRAPH_LEFT + 18,
    GRAPH_Y + 25,
    p.ink,
    18,
    'left',
    700
  );
  const plotTop = GRAPH_TOP;
  const plotBottom = GRAPH_BOTTOM;
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = GRAPH_LEFT; x <= GRAPH_RIGHT; x += GRAPH_GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, plotTop);
    ctx.lineTo(x, plotBottom);
    ctx.stroke();
  }
  for (let y = plotTop; y <= plotBottom; y += GRAPH_GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, plotBottom);
  ctx.lineTo(GRAPH_RIGHT + 14, plotBottom);
  ctx.moveTo(GRAPH_LEFT, plotBottom);
  ctx.lineTo(GRAPH_LEFT, plotTop - 12);
  ctx.stroke();
  text(
    ctx,
    'v / (m·s⁻¹)',
    GRAPH_LEFT - 10,
    plotTop - 18,
    p.ink,
    13,
    'right',
    700
  );
  text(ctx, 't / s', GRAPH_RIGHT + 18, plotBottom, p.ink, 13, 'left', 700);
  text(ctx, '0', GRAPH_LEFT - 10, plotBottom + 4, p.muted, 11, 'right', 600);
  text(ctx, '10', GRAPH_RIGHT, plotBottom + 18, p.muted, 11, 'center', 600);
  text(
    ctx,
    String(VELOCITY_MAX),
    GRAPH_LEFT - 10,
    plotTop,
    p.muted,
    11,
    'right',
    600
  );

  const curves: Array<{ color: string; fn: (time: number) => number }> = [
    { color: p.gold, fn: (time) => resistorVelocity(state, time) },
    { color: p.teal, fn: (time) => capacitorVelocity(state, time) }
  ];
  curves.forEach(({ color, fn }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth =
      state.params.model === (color === p.gold ? 'resistor' : 'capacitor')
        ? 4
        : 2;
    ctx.setLineDash(
      state.params.model === (color === p.gold ? 'resistor' : 'capacitor')
        ? []
        : [7, 5]
    );
    ctx.beginPath();
    for (let index = 0; index <= 100; index += 1) {
      const time = (TIME_MAX * index) / 100;
      const x = timeToPx(time);
      const y = clampGraphY(velocityToPx(fn(time)));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  if (state.params.model === 'resistor' && state.terminalVelocity !== null) {
    const y = clampGraphY(velocityToPx(state.terminalVelocity));
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      `vₘ = ${state.terminalVelocity.toFixed(2)}`,
      GRAPH_RIGHT - 4,
      y - 12,
      p.red,
      12,
      'right',
      700
    );
  }
  const cursorX = timeToPx(state.time);
  const cursorY = clampGraphY(velocityToPx(state.velocity));
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(cursorX, plotTop);
  ctx.lineTo(cursorX, plotBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, 7, 0, Math.PI * 2);
  ctx.fill();

  rounded(
    ctx,
    GRAPH_X + LEGEND_PANEL_X,
    GRAPH_Y + LEGEND_PANEL_Y,
    LEGEND_PANEL_W,
    LEGEND_PANEL_H,
    9
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '— 纯电阻棒（变加速，趋于 vₘ）',
    GRAPH_X + LEGEND_PANEL_X + 20,
    GRAPH_Y + LEGEND_PANEL_Y + 19,
    p.gold,
    13,
    'left',
    700
  );
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(GRAPH_X + LEGEND_LINE_START_X, GRAPH_Y + LEGEND_LINE_Y);
  ctx.lineTo(GRAPH_X + LEGEND_LINE_END_X, GRAPH_Y + LEGEND_LINE_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '纯电容棒（匀加速，a 恒定）',
    GRAPH_X + LEGEND_TEXT_X,
    GRAPH_Y + LEGEND_LINE_Y,
    p.teal,
    13,
    'left',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: RodState,
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
  text(
    ctx,
    '实时物理量看板',
    CARD_X + 16,
    READOUT_Y + 24,
    p.teal,
    15,
    'left',
    700
  );
  const rows: Array<[string, string, string]> = [
    [
      '模型',
      state.params.model === 'resistor' ? '纯电阻棒' : '纯电容棒',
      state.params.model === 'resistor' ? p.gold : p.teal
    ],
    ['速度 v', `${state.velocity.toFixed(2)} m/s`, p.teal],
    ['加速度 a', `${state.acceleration.toFixed(2)} m/s²`, p.purple],
    ['安培力 F安', `${state.magneticForce.toFixed(2)} N`, p.blue],
    ['感应电流 I', `${state.current.toFixed(2)} A`, p.gold],
    ['发热功率 P', `${state.heatingPower.toFixed(2)} W`, p.red]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = READOUT_Y + 55 + index * 21;
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
    'E = BLv，F安 = BIL',
    CARD_X + 16,
    FORMULA_Y + 59,
    p.ink,
    17,
    'left',
    700
  );
  if (state.params.model === 'resistor') {
    text(
      ctx,
      'I = BLv / R',
      CARD_X + 16,
      FORMULA_Y + 94,
      p.gold,
      15,
      'left',
      700
    );
    text(
      ctx,
      'a = (F − B²L²v/R) / m',
      CARD_X + 16,
      FORMULA_Y + 128,
      p.red,
      14,
      'left',
      600
    );
    text(
      ctx,
      'vₘ = FR / B²L²',
      CARD_X + 16,
      FORMULA_Y + 161,
      p.teal,
      14,
      'left',
      600
    );
  } else {
    text(
      ctx,
      'I = CBL a',
      CARD_X + 16,
      FORMULA_Y + 94,
      p.teal,
      15,
      'left',
      700
    );
    text(
      ctx,
      'a = F / (m + B²L²C)',
      CARD_X + 16,
      FORMULA_Y + 128,
      p.red,
      14,
      'left',
      600
    );
    text(
      ctx,
      'm* = m + B²L²C',
      CARD_X + 16,
      FORMULA_Y + 161,
      p.purple,
      14,
      'left',
      600
    );
  }

  rounded(ctx, CARD_X, NOTE_Y, CARD_W, NOTE_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '观察', CARD_X + 16, NOTE_Y + 24, p.gold, 15, 'left', 700);
  if (state.params.model === 'resistor') {
    text(
      ctx,
      '电阻棒：安培力随 v 增大',
      CARD_X + 16,
      NOTE_Y + 62,
      p.ink,
      13,
      'left',
      600
    );
    text(
      ctx,
      '速度趋于稳定值 vₘ',
      CARD_X + 16,
      NOTE_Y + 91,
      p.teal,
      13,
      'left',
      600
    );
  } else {
    text(
      ctx,
      '电容棒：电流维持充电过程',
      CARD_X + 16,
      NOTE_Y + 62,
      p.ink,
      13,
      'left',
      600
    );
    text(
      ctx,
      'B、C 增大，等效质量增大',
      CARD_X + 16,
      NOTE_Y + 91,
      p.teal,
      13,
      'left',
      600
    );
  }
  text(
    ctx,
    state.params.autoRun ? '导体棒运动中' : '打开自动播放观察',
    CARD_X + 16,
    NOTE_Y + 130,
    p.teal,
    12,
    'left',
    600
  );
  text(
    ctx,
    `B=${state.params.fieldStrength.toFixed(1)} T · L=${state.params.railGap.toFixed(1)} m`,
    CARD_X + 16,
    NOTE_Y + 165,
    p.muted,
    12,
    'left',
    600
  );
}

const ROD_CIRCUIT_X = 104;

export function createRodModelView(options: CreateRodModelViewOptions = {}) {
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
  let snapshot: RodState | null = null;
  function draw(state: RodState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const responsiveScale = stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.lineWidth = responsiveScale;
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    drawScene(ctx, state, p);
    renderGraph(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.restore();
  }
  return {
    render(state: RodState): void {
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
