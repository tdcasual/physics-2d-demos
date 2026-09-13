import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  emfInternalConstants,
  type EmfInternalState,
  type EmfRecord
} from './scene.sim';

export type CreateEmfInternalViewOptions = {
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
  circuitTop: CIRCUIT_TOP,
  circuitBottom: CIRCUIT_BOTTOM,
  graphX: GRAPH_X,
  graphY: GRAPH_Y,
  graphWidth: GRAPH_W,
  graphHeight: GRAPH_H,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  graphCurrentBaseMax: GRAPH_I_BASE_MAX,
  graphVoltageMax: GRAPH_U_MAX,
  graphGridStep: GRAPH_GRID_STEP,
  sourceX: SOURCE_X,
  sourceY: SOURCE_Y,
  sourceWidth: SOURCE_W,
  sourceHeight: SOURCE_H,
  switchX: SWITCH_X,
  ammeterX: AMMETER_X,
  ammeterY: AMMETER_Y,
  voltmeterX: VOLTMETER_X,
  voltmeterY: VOLTMETER_Y,
  meterRadius: METER_RADIUS,
  rheostatX: RHEOSTAT_X,
  rheostatY: RHEOSTAT_Y,
  rheostatWidth: RHEOSTAT_W,
  rheostatHeight: RHEOSTAT_H,
  wireLeft: WIRE_LEFT,
  wireRight: WIRE_RIGHT,
  wireBottom: WIRE_BOTTOM,
  cardX: CARD_X,
  cardWidth: CARD_W,
  headerRuleY: HEADER_RULE_Y,
  readoutY: READOUT_Y,
  readoutHeight: READOUT_H,
  recordsY: RECORDS_Y,
  recordsHeight: RECORDS_H,
  fitY: FIT_Y,
  fitHeight: FIT_H,
  flowPeriod: FLOW_PERIOD,
  flowSpacing: FLOW_SPACING,
  pointRadius: POINT_RADIUS
} = emfInternalConstants;

type Palette = {
  bg: string;
  panel: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  wire: string;
  flow: string;
  blue: string;
  teal: string;
  red: string;
  gold: string;
  grid: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f1f3f4',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    wire: '#3e4854',
    flow: '#f3b21a',
    blue: '#2d82d0',
    teal: '#23a99a',
    red: '#ef4050',
    gold: '#d99416',
    grid: '#e6e9e7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#253249',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    wire: '#c2cedc',
    flow: '#ffd15c',
    blue: '#65b6ef',
    teal: '#4ed9c0',
    red: '#ff707c',
    gold: '#fbbf24',
    grid: '#2a394d'
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

function wire(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string,
  dashed = false
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = dashed ? 2 : 5;
  ctx.setLineDash(dashed ? [7, 7] : []);
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  letter: string,
  value: string,
  accent: string,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, METER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, METER_RADIUS - 11, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + METER_RADIUS * 0.35, y - METER_RADIUS * 0.64);
  ctx.stroke();
  text(ctx, letter, x, y - 20, accent, 18, 'center', 700);
  text(ctx, value, x, y + METER_RADIUS + 20, accent, 14, 'center', 700);
}

function drawSource(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  p: Palette
): void {
  const left = SOURCE_X - SOURCE_W / 2;
  const top = SOURCE_Y - SOURCE_H / 2;
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 2;
  rounded(ctx, left, top, SOURCE_W, SOURCE_H, 9);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(SOURCE_X - 28, SOURCE_Y - 16);
  ctx.lineTo(SOURCE_X - 28, SOURCE_Y + 16);
  ctx.stroke();
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(SOURCE_X + 26, SOURCE_Y - 12);
  ctx.lineTo(SOURCE_X + 26, SOURCE_Y + 12);
  ctx.stroke();
  text(ctx, '+', SOURCE_X - 45, SOURCE_Y - 22, p.red, 16, 'center', 700);
  text(ctx, '−', SOURCE_X + 45, SOURCE_Y - 22, p.ink, 16, 'center', 700);
  text(
    ctx,
    `电源 E=${state.sourceVoltage.toFixed(2)} V`,
    SOURCE_X,
    SOURCE_Y + 52,
    p.ink,
    13,
    'center',
    700
  );
}

function drawSwitch(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  p: Palette
): void {
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(SWITCH_X - 16, SOURCE_Y, 6, 0, Math.PI * 2);
  ctx.arc(SWITCH_X + 20, SOURCE_Y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(SWITCH_X - 16, SOURCE_Y);
  ctx.lineTo(
    state.params.switchClosed ? SWITCH_X + 20 : SWITCH_X + 8,
    state.params.switchClosed ? SOURCE_Y : SOURCE_Y - 22
  );
  ctx.strokeStyle = state.params.switchClosed ? p.teal : p.red;
  ctx.stroke();
  text(ctx, '开关 S', SWITCH_X, SOURCE_Y + 40, p.ink, 13, 'center', 700);
}

function drawRheostat(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  p: Palette
): void {
  const left = RHEOSTAT_X;
  const top = RHEOSTAT_Y - RHEOSTAT_H / 2;
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 2;
  rounded(ctx, left, top, RHEOSTAT_W, RHEOSTAT_H, 6);
  ctx.fill();
  ctx.stroke();
  for (let i = 1; i < 11; i += 1) {
    const x = left + (RHEOSTAT_W * i) / 11;
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, top + 5);
    ctx.lineTo(x, top + RHEOSTAT_H - 5);
    ctx.stroke();
  }
  const knobX = left + ((state.rheostatResistance - 1) / 14) * RHEOSTAT_W;
  ctx.fillStyle = p.blue;
  rounded(ctx, knobX - 12, top - 17, 24, 22, 5);
  ctx.fill();
  text(
    ctx,
    `滑动变阻器 R=${state.rheostatResistance.toFixed(1)} Ω`,
    left + RHEOSTAT_W / 2,
    top - 30,
    p.ink,
    13,
    'center',
    700
  );
  text(ctx, 'P', knobX, top - 6, '#ffffff', 13, 'center', 700);
}

function drawFlow(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  p: Palette
): void {
  if (!state.params.switchClosed) return;
  const path: Array<[number, number]> = [
    [SOURCE_X + SOURCE_W / 2, SOURCE_Y],
    [WIRE_RIGHT, SOURCE_Y],
    [WIRE_RIGHT, WIRE_BOTTOM],
    [WIRE_LEFT, WIRE_BOTTOM],
    [WIRE_LEFT, SOURCE_Y]
  ];
  ctx.fillStyle = p.flow;
  path.forEach(([x, y], index) => {
    const offset =
      ((state.phase * FLOW_SPACING + index * FLOW_SPACING) % FLOW_PERIOD) -
      FLOW_PERIOD / 2;
    ctx.beginPath();
    ctx.arc(x + offset * 0.18, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCircuit(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  p: Palette
): void {
  text(
    ctx,
    '实验电路',
    FIELD_LEFT + 4,
    CIRCUIT_TOP - 2,
    p.ink,
    18,
    'left',
    700
  );
  text(
    ctx,
    state.status,
    FIELD_RIGHT - 4,
    CIRCUIT_TOP - 2,
    state.params.switchClosed ? p.teal : p.red,
    14,
    'right',
    700
  );
  wire(
    ctx,
    [
      [WIRE_LEFT, SOURCE_Y],
      [SOURCE_X - SOURCE_W / 2, SOURCE_Y]
    ],
    p.wire
  );
  wire(
    ctx,
    [
      [SOURCE_X + SOURCE_W / 2, SOURCE_Y],
      [SWITCH_X - 16, SOURCE_Y]
    ],
    p.wire
  );
  wire(
    ctx,
    [
      [SWITCH_X + 20, SOURCE_Y],
      [AMMETER_X - METER_RADIUS, AMMETER_Y]
    ],
    p.wire
  );
  wire(
    ctx,
    [
      [AMMETER_X + METER_RADIUS, AMMETER_Y],
      [RHEOSTAT_X, RHEOSTAT_Y]
    ],
    p.wire
  );
  wire(
    ctx,
    [
      [RHEOSTAT_X + RHEOSTAT_W, RHEOSTAT_Y],
      [WIRE_RIGHT, RHEOSTAT_Y],
      [WIRE_RIGHT, WIRE_BOTTOM]
    ],
    p.wire
  );
  wire(
    ctx,
    [
      [WIRE_LEFT, WIRE_BOTTOM],
      [WIRE_LEFT, SOURCE_Y]
    ],
    p.wire
  );
  wire(
    ctx,
    [
      [WIRE_LEFT, WIRE_BOTTOM],
      [WIRE_RIGHT, WIRE_BOTTOM]
    ],
    p.wire
  );
  wire(
    ctx,
    [
      [SWITCH_X + 20, SOURCE_Y],
      [SWITCH_X + 20, VOLTMETER_Y],
      [VOLTMETER_X - METER_RADIUS, VOLTMETER_Y]
    ],
    p.blue,
    true
  );
  wire(
    ctx,
    [
      [WIRE_RIGHT, WIRE_BOTTOM],
      [WIRE_RIGHT - 56, WIRE_BOTTOM],
      [WIRE_RIGHT - 56, VOLTMETER_Y],
      [VOLTMETER_X + METER_RADIUS, VOLTMETER_Y]
    ],
    p.blue,
    true
  );
  drawFlow(ctx, state, p);
  drawSource(ctx, state, p);
  drawSwitch(ctx, state, p);
  drawRheostat(ctx, state, p);
  drawMeter(
    ctx,
    AMMETER_X,
    AMMETER_Y,
    'A',
    `${state.current.toFixed(2)} A`,
    p.red,
    p
  );
  drawMeter(
    ctx,
    VOLTMETER_X,
    VOLTMETER_Y,
    'V',
    `${state.terminalVoltage.toFixed(2)} V`,
    p.blue,
    p
  );
  text(
    ctx,
    '调节滑片改变 R，记录多组 U-I 数据',
    FIELD_LEFT + 8,
    CIRCUIT_BOTTOM - 14,
    p.muted,
    13,
    'left',
    600
  );
}

function graphPoint(record: EmfRecord, currentMax: number): [number, number] {
  return [
    GRAPH_LEFT + (record.current / currentMax) * (GRAPH_RIGHT - GRAPH_LEFT),
    GRAPH_BOTTOM - (record.voltage / GRAPH_U_MAX) * (GRAPH_BOTTOM - GRAPH_TOP)
  ];
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  p: Palette
): void {
  const currentMax = Math.max(
    GRAPH_I_BASE_MAX,
    (state.sourceVoltage / Math.max(0.5, state.internalResistance)) * 1.15
  );
  rounded(ctx, GRAPH_X, GRAPH_Y, GRAPH_W, GRAPH_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    'U-I 图像与拟合',
    GRAPH_X + 18,
    GRAPH_Y + 24,
    p.ink,
    16,
    'left',
    700
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = GRAPH_LEFT; x <= GRAPH_RIGHT; x += GRAPH_GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, GRAPH_TOP);
    ctx.lineTo(x, GRAPH_BOTTOM);
    ctx.stroke();
  }
  for (let y = GRAPH_TOP; y <= GRAPH_BOTTOM; y += GRAPH_GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_RIGHT + 12, GRAPH_BOTTOM);
  ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_LEFT, GRAPH_TOP - 10);
  ctx.stroke();
  text(ctx, 'I / A', GRAPH_RIGHT + 18, GRAPH_BOTTOM, p.ink, 13, 'left', 700);
  text(ctx, 'U / V', GRAPH_LEFT - 10, GRAPH_TOP - 18, p.ink, 13, 'right', 700);
  text(ctx, '0', GRAPH_LEFT - 12, GRAPH_BOTTOM + 4, p.muted, 11, 'right', 600);
  text(
    ctx,
    `${currentMax.toFixed(1)}`,
    GRAPH_RIGHT,
    GRAPH_BOTTOM + 18,
    p.muted,
    11,
    'center',
    600
  );
  text(
    ctx,
    `${GRAPH_U_MAX}`,
    GRAPH_LEFT - 12,
    GRAPH_TOP,
    p.muted,
    11,
    'right',
    600
  );
  if (state.params.switchClosed) {
    const theoretical: EmfRecord[] = [
      { current: 0, voltage: state.sourceVoltage, resistance: 0 },
      {
        current: currentMax,
        voltage: Math.max(
          0,
          state.sourceVoltage - currentMax * state.internalResistance
        ),
        resistance: 0
      }
    ];
    const [x1, y1] = graphPoint(theoretical[0], currentMax);
    const [x2, y2] = graphPoint(theoretical[1], currentMax);
    ctx.strokeStyle = p.muted;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (state.fit) {
    const fitted: EmfRecord[] = [
      { current: 0, voltage: state.fit.emf, resistance: 0 },
      {
        current: currentMax,
        voltage: Math.max(0, state.fit.emf + state.fit.slope * currentMax),
        resistance: 0
      }
    ];
    const [x1, y1] = graphPoint(fitted[0], currentMax);
    const [x2, y2] = graphPoint(fitted[1], currentMax);
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  state.records.forEach((record, index) => {
    const [x, y] = graphPoint(record, currentMax);
    ctx.fillStyle = p.teal;
    ctx.beginPath();
    ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, String(index + 1), x + 10, y - 10, p.teal, 11, 'left', 700);
  });
  if (state.records.length === 0) {
    text(
      ctx,
      '闭合开关并记录多组数据',
      (GRAPH_LEFT + GRAPH_RIGHT) / 2,
      GRAPH_BOTTOM - 22,
      p.muted,
      14,
      'center',
      600
    );
  }
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(FIELD_W, 0, BASE_W - FIELD_W, BASE_H);
  text(ctx, '电源实验', PANEL_X + 18, 38, p.ink, 20, 'left', 700);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + 18, HEADER_RULE_Y);
  ctx.lineTo(PANEL_X + PANEL_W - 22, HEADER_RULE_Y);
  ctx.stroke();
  rounded(ctx, CARD_X, READOUT_Y, CARD_W, READOUT_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, '实时读数', CARD_X + 16, READOUT_Y + 20, p.muted, 14, 'left', 700);
  const rows = [
    ['滑片电阻 R', `${state.rheostatResistance.toFixed(1)} Ω`, p.ink],
    ['端电压 U', `${state.terminalVoltage.toFixed(2)} V`, p.blue],
    ['电流 I', `${state.current.toFixed(3)} A`, p.red],
    [
      '状态',
      state.params.switchClosed ? '已闭合' : '已断开',
      state.params.switchClosed ? p.teal : p.red
    ]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = READOUT_Y + 45 + index * 20;
    text(ctx, label, CARD_X + 16, y, p.muted, 12, 'left', 600);
    text(ctx, value, CARD_X + CARD_W - 16, y, color, 13, 'right', 700);
  });
  rounded(ctx, CARD_X, RECORDS_Y, CARD_W, RECORDS_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '测量数据', CARD_X + 16, RECORDS_Y + 22, p.blue, 15, 'left', 700);
  text(
    ctx,
    `已记录 ${state.records.length}/${6} 组`,
    CARD_X + CARD_W - 16,
    RECORDS_Y + 22,
    p.muted,
    12,
    'right',
    600
  );
  const tableY = RECORDS_Y + 50;
  text(ctx, '序号', CARD_X + 20, tableY, p.muted, 11, 'left', 700);
  text(ctx, 'U / V', CARD_X + 110, tableY, p.muted, 11, 'center', 700);
  text(ctx, 'I / A', CARD_X + 210, tableY, p.muted, 11, 'center', 700);
  text(ctx, 'R / Ω', CARD_X + 310, tableY, p.muted, 11, 'center', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CARD_X + 16, tableY + 15);
  ctx.lineTo(CARD_X + CARD_W - 16, tableY + 15);
  ctx.stroke();
  const visible = state.records.slice(-4);
  if (visible.length === 0) {
    text(
      ctx,
      '点击“记录当前数据”',
      CARD_X + CARD_W / 2,
      RECORDS_Y + 112,
      p.muted,
      12,
      'center',
      600
    );
  } else {
    visible.forEach((record, index) => {
      const y = tableY + 35 + index * 24;
      text(
        ctx,
        String(state.records.length - visible.length + index + 1),
        CARD_X + 20,
        y,
        p.ink,
        12,
        'left',
        600
      );
      text(
        ctx,
        record.voltage.toFixed(2),
        CARD_X + 110,
        y,
        p.blue,
        12,
        'center',
        600
      );
      text(
        ctx,
        record.current.toFixed(3),
        CARD_X + 210,
        y,
        p.red,
        12,
        'center',
        600
      );
      text(
        ctx,
        record.resistance.toFixed(1),
        CARD_X + 310,
        y,
        p.ink,
        12,
        'center',
        600
      );
    });
  }
  rounded(ctx, CARD_X, FIT_Y, CARD_W, FIT_H, 12);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.gold;
  ctx.stroke();
  text(
    ctx,
    '模拟数据拟合结果',
    CARD_X + 16,
    FIT_Y + 24,
    p.gold,
    15,
    'left',
    700
  );
  if (state.fit) {
    text(
      ctx,
      `E测 = ${state.fit.emf.toFixed(2)} V`,
      CARD_X + 16,
      FIT_Y + 62,
      p.ink,
      16,
      'left',
      700
    );
    text(
      ctx,
      `r测 = ${state.fit.internalResistance.toFixed(2)} Ω`,
      CARD_X + 16,
      FIT_Y + 92,
      p.ink,
      16,
      'left',
      700
    );
    text(
      ctx,
      state.params.systematicError
        ? '分流修正：E测、r测偏小'
        : '理想表计：拟合应接近理论值',
      CARD_X + 16,
      FIT_Y + 132,
      state.params.systematicError ? p.red : p.muted,
      12,
      'left',
      600
    );
  } else {
    text(
      ctx,
      '至少记录 2 组数据后拟合',
      CARD_X + 16,
      FIT_Y + 72,
      p.muted,
      13,
      'left',
      600
    );
    text(ctx, 'U = E − Ir', CARD_X + 16, FIT_Y + 108, p.ink, 18, 'left', 700);
  }
}

export function createEmfInternalView(
  options: CreateEmfInternalViewOptions = {}
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
  function draw(state: EmfInternalState): void {
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
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = responsiveScale;
    for (let x = FIELD_LEFT; x <= FIELD_RIGHT; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, FIELD_TOP);
      ctx.lineTo(x, FIELD_BOTTOM);
      ctx.stroke();
    }
    for (let y = FIELD_TOP; y <= FIELD_BOTTOM; y += 42) {
      ctx.beginPath();
      ctx.moveTo(FIELD_LEFT, y);
      ctx.lineTo(FIELD_RIGHT, y);
      ctx.stroke();
    }
    drawCircuit(ctx, state, p);
    drawGraph(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.restore();
  }
  return {
    render(state: EmfInternalState): void {
      stage.ensureSized();
      draw(state);
    },
    resize(): void {
      stage.resize();
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
    },
    dispose(): void {
      stage.release();
    }
  };
}
