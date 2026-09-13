import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { closedPowerConstants, type ClosedPowerState } from './scene.sim';

export type CreateClosedPowerViewOptions = {
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
  circuitLeft: CIRCUIT_LEFT,
  circuitRight: CIRCUIT_RIGHT,
  circuitTop: CIRCUIT_TOP,
  circuitBottom: CIRCUIT_BOTTOM,
  sourceX: SOURCE_X,
  meterX: METER_X,
  resistorX: RESISTOR_X,
  powerSummaryX: SUMMARY_X,
  powerSummaryY: SUMMARY_Y,
  powerSummaryWidth: SUMMARY_W,
  powerSummaryHeight: SUMMARY_H,
  graphLeft: GRAPH_L,
  graphTop: GRAPH_T,
  graphWidth: GRAPH_W,
  graphHeight: GRAPH_H,
  graphMaxResistance: GRAPH_R_MAX,
  titleY: TITLE_Y,
  panelRuleY: PANEL_RULE_Y,
  metricsCardY: METRICS_Y,
  metricsCardHeight: METRICS_H,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  cardRadius: CARD_RADIUS
} = closedPowerConstants;

const GRID_ALPHA = '30';

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

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = `${p.grid}${GRID_ALPHA}`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD_W; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BASE_H);
    ctx.stroke();
  }
  for (let y = 0; y <= BASE_H; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
}

function drawSource(
  ctx: CanvasRenderingContext2D,
  state: ClosedPowerState,
  p: Palette
): void {
  const top = CIRCUIT_TOP;
  const bottom = CIRCUIT_BOTTOM;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(CIRCUIT_LEFT, top);
  ctx.lineTo(SOURCE_X - 24, top);
  ctx.moveTo(SOURCE_X + 24, top);
  ctx.lineTo(CIRCUIT_RIGHT, top);
  ctx.lineTo(CIRCUIT_RIGHT, bottom);
  ctx.lineTo(CIRCUIT_LEFT, bottom);
  ctx.lineTo(CIRCUIT_LEFT, top);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(SOURCE_X - 12, top - 24);
  ctx.lineTo(SOURCE_X - 12, top + 24);
  ctx.stroke();
  ctx.strokeStyle = p.blue;
  ctx.beginPath();
  ctx.moveTo(SOURCE_X + 12, top - 16);
  ctx.lineTo(SOURCE_X + 12, top + 16);
  ctx.stroke();
  text(ctx, 'E', SOURCE_X - 30, top + 1, p.red, 16, 'center', 700);
  text(
    ctx,
    `${state.params.emf.toFixed(1)} V`,
    SOURCE_X,
    top + 43,
    p.ink,
    13,
    'center',
    700
  );
  text(
    ctx,
    '实际电源 (E, r)',
    SOURCE_X + 10,
    top + 68,
    p.gold,
    14,
    'left',
    700
  );
  text(
    ctx,
    `r = ${state.params.internalResistance.toFixed(1)} Ω`,
    SOURCE_X + 10,
    top + 89,
    p.gold,
    13,
    'left',
    600
  );
  rounded(ctx, METER_X - 25, top - 24, 50, 50, 25);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'A', METER_X, top + 1, p.ink, 16, 'center', 700);
  text(
    ctx,
    `I = ${state.current.toFixed(2)} A`,
    METER_X,
    top - 47,
    p.muted,
    13,
    'center',
    600
  );
  rounded(ctx, RESISTOR_X - 78, bottom - 20, 156, 40, 8);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    `负载 R = ${state.params.externalResistance.toFixed(1)} Ω`,
    RESISTOR_X,
    bottom + 1,
    p.ink,
    13,
    'center',
    700
  );
  text(
    ctx,
    `U = ${state.terminalVoltage.toFixed(2)} V`,
    RESISTOR_X,
    bottom + 30,
    p.blue,
    13,
    'center',
    600
  );
}

function drawPowerSummary(
  ctx: CanvasRenderingContext2D,
  state: ClosedPowerState,
  p: Palette
): void {
  const x = SUMMARY_X;
  const y = SUMMARY_Y;
  const width = SUMMARY_W;
  const height = SUMMARY_H;
  rounded(ctx, x, y, width, height, 10);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    `总功率 P总 = ${state.totalPower.toFixed(2)} W`,
    x + 18,
    y + 23,
    p.blue,
    14,
    'left',
    700
  );
  text(
    ctx,
    `内阻功率 P内 = ${state.internalPower.toFixed(2)} W`,
    x + 18,
    y + 49,
    p.teal,
    14,
    'left',
    700
  );
  text(
    ctx,
    `输出功率 P出 = ${state.outputPower.toFixed(2)} W`,
    x + 18,
    y + 76,
    p.red,
    14,
    'left',
    700
  );
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: ClosedPowerState,
  p: Palette
): void {
  const x0 = GRAPH_L;
  const y0 = GRAPH_T + GRAPH_H;
  const x1 = GRAPH_L + GRAPH_W;
  const y1 = GRAPH_T;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.stroke();
  for (let index = 1; index < 5; index += 1) {
    const x = GRAPH_L + (GRAPH_W * index) / 5;
    ctx.strokeStyle = `${p.grid}${GRID_ALPHA}`;
    ctx.beginPath();
    ctx.moveTo(x, GRAPH_T);
    ctx.lineTo(x, y0);
    ctx.stroke();
  }
  for (let index = 1; index < 4; index += 1) {
    const y = GRAPH_T + (GRAPH_H * index) / 4;
    ctx.beginPath();
    ctx.moveTo(GRAPH_L, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  const yMax = Math.max(
    1,
    state.params.emf ** 2 / state.params.internalResistance
  );
  const toX = (resistance: number) =>
    GRAPH_L + (resistance / GRAPH_R_MAX) * GRAPH_W;
  const toY = (power: number) => GRAPH_T + GRAPH_H - (power / yMax) * GRAPH_H;
  const drawCurve = (
    color: string,
    dash: number[],
    fn: (resistance: number) => number
  ): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (let index = 0; index <= 80; index += 1) {
      const resistance = (GRAPH_R_MAX * index) / 80;
      const x = toX(resistance);
      const y = toY(fn(resistance));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const emf = state.params.emf;
  const internal = state.params.internalResistance;
  drawCurve(
    p.red,
    [],
    (resistance) => (emf ** 2 * resistance) / (resistance + internal) ** 2
  );
  drawCurve(p.blue, [7, 5], (resistance) => emf ** 2 / (resistance + internal));
  drawCurve(
    p.teal,
    [3, 5],
    (resistance) => (emf ** 2 * internal) / (resistance + internal) ** 2
  );
  if (state.params.showPowerArea) {
    const maxX = toX(internal);
    const maxY = toY(state.maxOutputPower);
    ctx.strokeStyle = `${p.gold}99`;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(maxX, y0);
    ctx.lineTo(maxX, maxY);
    ctx.moveTo(x0, maxY);
    ctx.lineTo(maxX, maxY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p.gold;
    ctx.beginPath();
    ctx.arc(maxX, maxY, 7, 0, Math.PI * 2);
    ctx.fill();
    text(
      ctx,
      `Pmax = ${state.maxOutputPower.toFixed(2)} W`,
      maxX + 12,
      maxY - 18,
      p.gold,
      12,
      'left',
      700
    );
    text(
      ctx,
      `R = r = ${internal.toFixed(1)} Ω`,
      maxX + 12,
      y0 - 18,
      p.gold,
      12,
      'left',
      700
    );
  }
  const selectedX = toX(state.params.externalResistance);
  const selectedY = toY(state.outputPower);
  ctx.strokeStyle = `${p.red}99`;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(selectedX, y0);
  ctx.lineTo(selectedX, selectedY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(selectedX, selectedY, 7, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'P / W', GRAPH_L - 12, GRAPH_T - 18, p.ink, 13, 'left', 700);
  text(ctx, 'R / Ω', GRAPH_L + GRAPH_W - 10, y0 + 24, p.ink, 13, 'right', 700);
  text(
    ctx,
    'P出',
    GRAPH_L + GRAPH_W - 92,
    GRAPH_T + 18,
    p.red,
    12,
    'left',
    700
  );
  text(
    ctx,
    'P总',
    GRAPH_L + GRAPH_W - 58,
    GRAPH_T + 18,
    p.blue,
    12,
    'left',
    700
  );
  text(
    ctx,
    'P内',
    GRAPH_L + GRAPH_W - 24,
    GRAPH_T + 18,
    p.teal,
    12,
    'left',
    700
  );
  text(ctx, '功率—外电阻关系', GRAPH_L, GRAPH_T - 45, p.ink, 17, 'left', 700);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ClosedPowerState,
  p: Palette,
  scale: number
): void {
  const x = PANEL_X + PANEL_INSET;
  const width = PANEL_W - PANEL_INSET * 2;
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, PANEL_W, BASE_H);
  text(ctx, '闭合电路功率', x, TITLE_Y, p.ink, 22 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(x + width, PANEL_RULE_Y);
  ctx.stroke();
  rounded(ctx, x, METRICS_Y, width, METRICS_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(ctx, '实时读数', x + 14, METRICS_Y + 25, p.ink, 16 * scale, 'left', 700);
  const rows = [
    ['回路电流 I', `${state.current.toFixed(2)} A`, p.ink],
    ['路端电压 U', `${state.terminalVoltage.toFixed(2)} V`, p.blue],
    ['输出功率 P出', `${state.outputPower.toFixed(2)} W`, p.red],
    ['内阻功率 P内', `${state.internalPower.toFixed(2)} W`, p.teal],
    ['供电效率 η', `${(state.efficiency * 100).toFixed(1)} %`, p.gold],
    ['状态', state.status, state.matched ? p.green : p.muted]
  ] as const;
  rows.forEach(([label, value, color], index) => {
    const y = METRICS_Y + 56 + index * 33;
    text(ctx, label, x + 14, y, p.muted, 13 * scale, 'left', 600);
    text(ctx, value, x + width - 14, y, color, 14 * scale, 'right', 700);
    if (index < rows.length - 1) {
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 16);
      ctx.lineTo(x + width - 12, y + 16);
      ctx.stroke();
    }
  });
  rounded(ctx, x, FORMULA_Y, width, FORMULA_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '最大输出功率',
    x + 14,
    FORMULA_Y + 24,
    p.green,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'I = E / (R + r)',
    x + 14,
    FORMULA_Y + 58,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    'P出 = E²R / (R + r)²',
    x + 14,
    FORMULA_Y + 88,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    'R = r  ⇒  P出,max = E² / 4r',
    x + 14,
    FORMULA_Y + 118,
    p.red,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '纯电阻直流闭合电路',
    x + 14,
    FORMULA_Y + 160,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    `当前 R / r = ${(state.params.externalResistance / state.params.internalResistance).toFixed(2)}`,
    x + 14,
    FORMULA_Y + 186,
    p.muted,
    12 * scale,
    'left',
    600
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: ClosedPowerState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  text(
    ctx,
    '闭合电路功率与最大输出功率',
    26,
    TITLE_Y,
    p.ink,
    22 * scale,
    'left',
    700
  );
  text(
    ctx,
    '调节 E、r、R，观察功率分配',
    28,
    TITLE_Y + 27,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(ctx, '闭合电路模型', 26, 100, p.ink, 17 * scale, 'left', 700);
  drawSource(ctx, state, p);
  drawPowerSummary(ctx, state, p);
  drawGraph(ctx, state, p);
  drawPanel(ctx, state, p, scale);
}

export function createClosedPowerView(
  options: CreateClosedPowerViewOptions = {}
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
  let snapshot: ClosedPowerState | null = null;
  function draw(state: ClosedPowerState): void {
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
    render(state: ClosedPowerState): void {
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
