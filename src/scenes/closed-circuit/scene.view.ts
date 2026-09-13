import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { closedCircuitConstants, type ClosedCircuitState } from './scene.sim';

export type CreateClosedCircuitViewOptions = {
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
  gridStep: GRID_STEP,
  sourceX: SOURCE_X,
  resistorX: RESISTOR_X,
  meterX: METER_X,
  graphLeft: GRAPH_L,
  graphTop: GRAPH_T,
  graphWidth: GRAPH_W,
  graphHeight: GRAPH_H,
  titleY: TITLE_Y,
  panelRuleY: PANEL_RULE_Y,
  metricsCardY: METRICS_Y,
  metricsCardHeight: METRICS_H,
  powerCardY: POWER_Y,
  powerCardHeight: POWER_H,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  cardRadius: CARD_RADIUS
} = closedCircuitConstants;

const GRID_ALPHA = '2b';

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
    bg: '#fbfcfe',
    panel: '#fff',
    ink: '#303b4d',
    muted: '#7b8798',
    border: '#d5deea',
    grid: '#d6e0ea',
    soft: '#f0f4f8',
    blue: '#397fcb',
    red: '#ef4f59',
    teal: '#20a795',
    gold: '#ee9817'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef4fb',
    muted: '#aab7ca',
    border: '#40516b',
    grid: '#2d405c',
    soft: '#25344d',
    blue: '#70a9ff',
    red: '#fb7185',
    teal: '#38d6b3',
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
  for (let x = GRID_STEP; x < FIELD_W; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BASE_H);
    ctx.stroke();
  }
  for (let y = GRID_STEP; y < BASE_H; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
}

function drawCircuit(
  ctx: CanvasRenderingContext2D,
  state: ClosedCircuitState,
  p: Palette
): void {
  const left = 62;
  const right = 694;
  const top = 106;
  const bottom = 248;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(SOURCE_X - 30, top);
  ctx.moveTo(SOURCE_X + 30, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, bottom);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left, top);
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(SOURCE_X - 12, top - 24);
  ctx.lineTo(SOURCE_X - 12, top + 24);
  ctx.stroke();
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(SOURCE_X + 12, top - 16);
  ctx.lineTo(SOURCE_X + 12, top + 16);
  ctx.stroke();
  text(ctx, 'E', SOURCE_X, top - 44, p.red, 16, 'center', 700);
  text(
    ctx,
    `${state.params.emf.toFixed(1)} V`,
    SOURCE_X,
    top + 46,
    p.ink,
    13,
    'center',
    700
  );
  rounded(ctx, RESISTOR_X - 62, top - 22, 124, 44, 8);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    `r = ${state.params.internalResistance.toFixed(1)} Ω`,
    RESISTOR_X,
    top + 2,
    p.ink,
    13,
    'center',
    700
  );
  rounded(ctx, RESISTOR_X - 74, bottom - 20, 148, 40, 8);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    `R = ${state.params.externalResistance.toFixed(1)} Ω`,
    RESISTOR_X,
    bottom + 2,
    p.ink,
    13,
    'center',
    700
  );
  rounded(ctx, METER_X - 42, top + 44, 84, 38, 8);
  ctx.fillStyle = '#172337';
  ctx.fill();
  text(
    ctx,
    `A ${state.current.toFixed(2)}`,
    METER_X,
    top + 63,
    p.teal,
    13,
    'center',
    700
  );
  text(ctx, '闭合电路', 62, 286, p.teal, 14, 'left', 700);
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: ClosedCircuitState,
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
  for (let index = 1; index < 8; index += 1) {
    const x = GRAPH_L + (GRAPH_W * index) / 8;
    ctx.strokeStyle = `${p.grid}${GRID_ALPHA}`;
    ctx.beginPath();
    ctx.moveTo(x, GRAPH_T);
    ctx.lineTo(x, y0);
    ctx.stroke();
  }
  for (let index = 1; index < 5; index += 1) {
    const y = GRAPH_T + (GRAPH_H * index) / 5;
    ctx.beginPath();
    ctx.moveTo(GRAPH_L, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  const currentMax = Math.max(1, state.shortCircuitCurrent);
  const uMax = Math.max(1, state.params.emf);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y1 + 34);
  ctx.lineTo(x1, y1 + 34);
  ctx.stroke();
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x1, y0);
  ctx.stroke();
  const px = GRAPH_L + (state.current / currentMax) * GRAPH_W;
  const py = GRAPH_T + (1 - state.terminalVoltage / uMax) * GRAPH_H;
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'U / V', GRAPH_L - 12, GRAPH_T - 18, p.ink, 13, 'left', 700);
  text(ctx, 'I / A', GRAPH_L + GRAPH_W - 16, y0 + 24, p.ink, 13, 'right', 700);
  text(
    ctx,
    `I短 = ${state.shortCircuitCurrent.toFixed(2)} A`,
    GRAPH_L + 12,
    GRAPH_T + 22,
    p.red,
    12,
    'left',
    600
  );
  if (state.params.showPowerArea) {
    ctx.fillStyle = `${p.teal}32`;
    ctx.fillRect(GRAPH_L, py, px - GRAPH_L, y0 - py);
    ctx.strokeStyle = p.teal;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(GRAPH_L, py, px - GRAPH_L, y0 - py);
    ctx.setLineDash([]);
    text(ctx, 'P出 = UI', GRAPH_L + 18, py + 22, p.teal, 13, 'left', 700);
  }
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ClosedCircuitState,
  p: Palette,
  scale: number
): void {
  const x = PANEL_X + PANEL_INSET;
  const width = PANEL_W - PANEL_INSET * 2;
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, PANEL_W, BASE_H);
  text(ctx, '闭合电路欧姆定律', x, TITLE_Y, p.ink, 22 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(x + width, PANEL_RULE_Y);
  ctx.stroke();
  rounded(ctx, x, METRICS_Y, width, METRICS_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '实时能量与状态',
    x + 14,
    METRICS_Y + 25,
    p.ink,
    16 * scale,
    'left',
    700
  );
  const rows = [
    ['干路电流 I', `${state.current.toFixed(2)} A`],
    ['路端电压 U', `${state.terminalVoltage.toFixed(2)} V`],
    ['内电压 Ir', `${state.internalDrop.toFixed(2)} V`],
    ['总功率 P总', `${state.totalPower.toFixed(2)} W`]
  ] as const;
  rows.forEach(([label, value], index) => {
    const y = METRICS_Y + 68 + index * 42;
    text(ctx, label, x + 14, y, p.muted, 14 * scale, 'left', 600);
    text(
      ctx,
      value,
      x + width - 14,
      y,
      index === 1 ? p.blue : p.red,
      15 * scale,
      'right',
      700
    );
  });
  rounded(ctx, x, POWER_Y, width, POWER_H);
  ctx.fillStyle = `${p.gold}22`;
  ctx.fill();
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '电源输出功率 P出 = UI',
    x + 14,
    POWER_Y + 30,
    p.gold,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `${state.outputPower.toFixed(2)} W`,
    x + width - 14,
    POWER_Y + 30,
    p.gold,
    18 * scale,
    'right',
    700
  );
  text(
    ctx,
    `最大值 ${state.maxOutputPower.toFixed(2)} W（R = r）`,
    x + 14,
    POWER_Y + 84,
    p.muted,
    13 * scale,
    'left',
    600
  );
  if (state.params.externalResistance <= 0.05)
    text(
      ctx,
      '短路警示：R = 0，U = 0',
      x + 14,
      POWER_Y + 124,
      p.red,
      13 * scale,
      'left',
      700
    );
  rounded(ctx, x, FORMULA_Y, width, FORMULA_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '核心关系',
    x + 14,
    FORMULA_Y + 24,
    p.teal,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'U = E − Ir',
    x + 14,
    FORMULA_Y + 58,
    p.ink,
    17 * scale,
    'left',
    700
  );
  text(ctx, 'P出 = UI', x + 14, FORMULA_Y + 92, p.ink, 17 * scale, 'left', 700);
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: ClosedCircuitState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  text(
    ctx,
    '闭合电路欧姆定律：U-I 关系与功率',
    26,
    TITLE_Y,
    p.ink,
    22 * scale,
    'left',
    700
  );
  drawCircuit(ctx, state, p);
  drawGraph(ctx, state, p);
  drawPanel(ctx, state, p, scale);
}

export function createClosedCircuitView(
  options: CreateClosedCircuitViewOptions = {}
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
  let snapshot: ClosedCircuitState | null = null;
  function draw(state: ClosedCircuitState): void {
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
    render(state: ClosedCircuitState) {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize() {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme) {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose() {
      snapshot = null;
      stage.release();
    },
    reset() {
      snapshot = null;
    }
  };
}
