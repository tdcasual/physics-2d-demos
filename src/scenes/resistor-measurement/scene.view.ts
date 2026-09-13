import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { resistorConstants, type ResistorState } from './scene.sim';

export type CreateResistorViewOptions = {
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
  flowPeriod: FLOW_PERIOD,
  comparisonLineOffset: COMPARISON_LINE_OFFSET,
  cardX: CARD_X,
  cardWidth: CARD_W,
  headerRuleY: HEADER_RULE_Y,
  readoutY: READOUT_Y,
  readoutHeight: READOUT_H,
  formulaY: FORMULA_Y,
  formulaHeight: FORMULA_H
} = resistorConstants;

const GEOMETRY = {
  sourceX: 390,
  sourceY: 620,
  sourceWidth: 150,
  sourceHeight: 62,
  targetX: 470,
  targetY: 300,
  targetWidth: 122,
  rheostatX: 292,
  rheostatY: 438,
  rheostatWidth: 230,
  meterAX: 222,
  meterAY: 300,
  meterVX: 531,
  meterVY: 168,
  meterRadius: 38,
  busLeft: 108,
  busRight: 690,
  panelBottomY: 748,
  comparisonY: 428,
  comparisonHeight: 112,
  flowSpacing: 34
} as const;

type Palette = {
  bg: string;
  panel: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  wire: string;
  flow: string;
  teal: string;
  red: string;
  gold: string;
  blue: string;
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
    teal: '#23a99a',
    red: '#ef4050',
    gold: '#d99416',
    blue: '#3a80c0',
    grid: '#e6e9e7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#253249',
    ink: '#eef2f7',
    muted: '#9eabbc',
    border: '#3e4d64',
    wire: '#c2cedc',
    flow: '#ffd15c',
    teal: '#4ed9c0',
    red: '#ff707c',
    gold: '#fbbf24',
    blue: '#65b6ef',
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

function flowDots(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  phase: number,
  p: Palette
): void {
  ctx.fillStyle = p.flow;
  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i];
    const offset =
      ((phase * GEOMETRY.flowSpacing + i * GEOMETRY.flowSpacing) %
        FLOW_PERIOD) -
      FLOW_PERIOD / 2;
    if (Math.abs(offset) < 40) {
      ctx.beginPath();
      ctx.arc(x + offset * 0.12, y + offset * 0.12, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  letter: string,
  value: string,
  p: Palette,
  accent: string
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, GEOMETRY.meterRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, letter, x, y - 3, p.ink, 26, 'center', 700);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(
    x - GEOMETRY.meterRadius + 2,
    y + GEOMETRY.meterRadius - 3,
    6,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.fillStyle = p.wire;
  ctx.beginPath();
  ctx.arc(
    x + GEOMETRY.meterRadius - 2,
    y + GEOMETRY.meterRadius - 3,
    6,
    0,
    Math.PI * 2
  );
  ctx.fill();
  text(ctx, value, x, y + GEOMETRY.meterRadius + 21, accent, 14, 'center', 700);
}

function drawResistor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  p: Palette
): void {
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 4;
  rounded(ctx, x, y - 16, width, 32, 7);
  ctx.fill();
  ctx.stroke();
  const stripeWidth = width / 5;
  [p.red, p.teal, p.gold, p.blue].forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + stripeWidth * (index + 0.5), y - 14, 5, 28);
  });
  text(ctx, label, x + width / 2, y + 48, p.muted, 14, 'center', 700);
}

function drawRheostat(
  ctx: CanvasRenderingContext2D,
  state: ResistorState,
  p: Palette
): void {
  const x = GEOMETRY.rheostatX;
  const y = GEOMETRY.rheostatY;
  const width = GEOMETRY.rheostatWidth;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(x + 18, y);
  ctx.lineTo(x + width - 18, y);
  ctx.stroke();
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 4;
  const activeEnd = x + 18 + state.params.rheostatPosition * (width - 36);
  ctx.beginPath();
  ctx.moveTo(x + 18, y);
  ctx.lineTo(activeEnd, y);
  ctx.stroke();
  ctx.fillStyle = p.teal;
  rounded(ctx, activeEnd - 12, y - 22, 24, 20, 5);
  ctx.fill();
  ctx.fillStyle = p.wire;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.arc(x + width, y, 7, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '滑动变阻器 R', x + width / 2, y + 32, p.muted, 14, 'center', 700);
  text(ctx, 'A', x - 16, y + 3, p.ink, 12, 'right', 700);
  text(ctx, 'B', x + width + 16, y + 3, p.ink, 12, 'left', 700);
  text(ctx, 'C', activeEnd, y - 33, p.teal, 12, 'center', 700);
}

function drawSource(
  ctx: CanvasRenderingContext2D,
  state: ResistorState,
  p: Palette
): void {
  const x = GEOMETRY.sourceX;
  const y = GEOMETRY.sourceY;
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 4;
  rounded(
    ctx,
    x - GEOMETRY.sourceWidth / 2,
    y - GEOMETRY.sourceHeight / 2,
    GEOMETRY.sourceWidth,
    GEOMETRY.sourceHeight,
    10
  );
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 18);
  ctx.lineTo(x - 34, y + 18);
  ctx.stroke();
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x + 28, y - 15);
  ctx.lineTo(x + 28, y + 15);
  ctx.stroke();
  text(ctx, '+', x - 55, y - 23, p.red, 18, 'center', 700);
  text(ctx, '−', x + 55, y - 23, p.ink, 18, 'center', 700);
  text(
    ctx,
    `直流电源 E=${state.params.supplyVoltage.toFixed(1)} V`,
    x,
    y + 56,
    p.muted,
    14,
    'center',
    700
  );
}

function drawCircuit(
  ctx: CanvasRenderingContext2D,
  state: ResistorState,
  p: Palette
): void {
  const tx = GEOMETRY.targetX;
  const ty = GEOMETRY.targetY;
  const targetRight = tx + GEOMETRY.targetWidth;
  const leftMeterRight = GEOMETRY.meterAX + GEOMETRY.meterRadius;
  const mainPath: Array<[number, number]> = [
    [GEOMETRY.busLeft, GEOMETRY.sourceY],
    [GEOMETRY.busLeft, ty],
    [GEOMETRY.meterAX - GEOMETRY.meterRadius, ty],
    [leftMeterRight, ty],
    [tx, ty],
    [targetRight, ty],
    [GEOMETRY.busRight, ty],
    [GEOMETRY.busRight, GEOMETRY.sourceY],
    [GEOMETRY.sourceX + GEOMETRY.sourceWidth / 2, GEOMETRY.sourceY]
  ];
  wire(ctx, mainPath, p.wire);
  const rheostatPath: Array<[number, number]> = [
    [GEOMETRY.busLeft, GEOMETRY.sourceY],
    [GEOMETRY.busLeft, GEOMETRY.rheostatY],
    [GEOMETRY.rheostatX, GEOMETRY.rheostatY]
  ];
  wire(
    ctx,
    rheostatPath,
    state.params.circuitMode === 'limiting' ? p.gold : p.teal
  );
  const activeEnd =
    GEOMETRY.rheostatX +
    18 +
    state.params.rheostatPosition * (GEOMETRY.rheostatWidth - 36);
  wire(
    ctx,
    [
      [activeEnd, GEOMETRY.rheostatY],
      [activeEnd, ty + 60],
      [tx, ty + 60],
      [tx, ty]
    ],
    state.params.circuitMode === 'limiting' ? p.gold : p.teal,
    state.params.circuitMode === 'divider'
  );
  if (state.params.circuitMode === 'divider') {
    wire(
      ctx,
      [
        [GEOMETRY.rheostatX + GEOMETRY.rheostatWidth, GEOMETRY.rheostatY],
        [GEOMETRY.rheostatX + GEOMETRY.rheostatWidth + 34, GEOMETRY.rheostatY],
        [GEOMETRY.rheostatX + GEOMETRY.rheostatWidth + 34, GEOMETRY.sourceY]
      ],
      p.teal,
      true
    );
  }
  const vLeft =
    state.params.meterMode === 'internal' ? GEOMETRY.meterAX + 8 : tx;
  const vRight = targetRight;
  wire(
    ctx,
    [
      [vLeft, ty],
      [vLeft, GEOMETRY.meterVY + GEOMETRY.meterRadius],
      [GEOMETRY.meterVX - 20, GEOMETRY.meterVY + GEOMETRY.meterRadius]
    ],
    p.blue,
    true
  );
  wire(
    ctx,
    [
      [vRight, ty],
      [vRight, GEOMETRY.meterVY + GEOMETRY.meterRadius],
      [GEOMETRY.meterVX + 20, GEOMETRY.meterVY + GEOMETRY.meterRadius]
    ],
    p.blue,
    true
  );
  flowDots(ctx, mainPath, state.flowPhase, p);
  drawRheostat(ctx, state, p);
  drawResistor(
    ctx,
    tx,
    ty,
    GEOMETRY.targetWidth,
    `Rx=${state.params.targetResistance.toFixed(0)} Ω`,
    p
  );
  drawMeter(
    ctx,
    GEOMETRY.meterAX,
    GEOMETRY.meterAY,
    'A',
    `${state.measuredCurrent.toFixed(3)} A`,
    p,
    p.red
  );
  drawMeter(
    ctx,
    GEOMETRY.meterVX,
    GEOMETRY.meterVY,
    'V',
    `${state.voltageMeasured.toFixed(2)} V`,
    p,
    p.blue
  );
  drawSource(ctx, state, p);
  text(
    ctx,
    state.params.circuitMode === 'divider' ? '分压接法' : '限流接法',
    FIELD_RIGHT - 12,
    FIELD_TOP + 4,
    p.teal,
    18,
    'right',
    700
  );
  text(
    ctx,
    state.params.meterMode === 'external' ? '电流表外接' : '电流表内接',
    FIELD_RIGHT - 12,
    FIELD_TOP + 30,
    p.blue,
    14,
    'right',
    700
  );
  text(
    ctx,
    '待测电阻 Rx',
    tx + GEOMETRY.targetWidth / 2,
    ty - 42,
    p.ink,
    14,
    'center',
    700
  );
}

function drawComparison(
  ctx: CanvasRenderingContext2D,
  state: ResistorState,
  p: Palette,
  scale: number
): void {
  rounded(
    ctx,
    CARD_X,
    GEOMETRY.comparisonY,
    CARD_W,
    GEOMETRY.comparisonHeight,
    12
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '误差方向',
    CARD_X + 16,
    GEOMETRY.comparisonY + 22,
    p.muted,
    14 * scale,
    'left',
    700
  );
  const lineX = CARD_X + 18;
  const lineY = GEOMETRY.comparisonY + COMPARISON_LINE_OFFSET;
  const lineWidth = CARD_W - 36;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(lineX, lineY);
  ctx.lineTo(lineX + lineWidth, lineY);
  ctx.stroke();
  const actualX = lineX + lineWidth * 0.5;
  const measuredX =
    lineX +
    lineWidth *
      (0.5 + Math.max(-0.45, Math.min(0.45, (state.errorPercent / 100) * 0.5)));
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(actualX, lineY - 16);
  ctx.lineTo(actualX, lineY + 16);
  ctx.stroke();
  ctx.fillStyle = state.errorPercent < 0 ? p.teal : p.red;
  ctx.beginPath();
  ctx.arc(measuredX, lineY, 8, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'Rx', actualX, lineY + 28, p.ink, 12 * scale, 'center', 700);
  text(
    ctx,
    'R测',
    measuredX,
    lineY - 28,
    state.errorPercent < 0 ? p.teal : p.red,
    12 * scale,
    'center',
    700
  );
  text(
    ctx,
    `${state.errorPercent >= 0 ? '+' : ''}${state.errorPercent.toFixed(1)}%`,
    CARD_X + CARD_W - 16,
    GEOMETRY.comparisonY + 22,
    state.errorPercent < 0 ? p.teal : p.red,
    15 * scale,
    'right',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ResistorState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(FIELD_W, 0, BASE_W - FIELD_W, BASE_H);
  text(ctx, '电阻测量', PANEL_X + 18, 38, p.ink, 20 * scale, 'left', 700);
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
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const rows = [
    ['电压表读数 U测', `${state.voltageMeasured.toFixed(2)} V`, p.blue],
    ['电流表读数 I测', `${state.measuredCurrent.toFixed(3)} A`, p.red],
    ['电阻测量值 R测', `${state.measuredResistance.toFixed(2)} Ω`, p.ink],
    ['真实电阻 Rx', `${state.params.targetResistance.toFixed(2)} Ω`, p.ink]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = READOUT_Y + 24 + index * 37;
    text(ctx, label, CARD_X + 16, y, p.muted, 13 * scale, 'left', 600);
    text(ctx, value, CARD_X + CARD_W - 16, y, color, 16 * scale, 'right', 700);
    if (index < rows.length - 1) {
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CARD_X + 16, y + 18);
      ctx.lineTo(CARD_X + CARD_W - 16, y + 18);
      ctx.stroke();
    }
  });
  rounded(ctx, CARD_X, FORMULA_Y, CARD_W, FORMULA_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '接法结论',
    CARD_X + 16,
    FORMULA_Y + 22,
    p.muted,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.status,
    CARD_X + 16,
    FORMULA_Y + 50,
    state.errorPercent < 0 ? p.teal : p.red,
    15 * scale,
    'left',
    700
  );
  const relation =
    state.params.meterMode === 'external' ? 'R测 = Rx ∥ RV' : 'R测 = Rx + RA';
  text(
    ctx,
    relation,
    CARD_X + 16,
    FORMULA_Y + 76,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.params.circuitMode === 'divider'
      ? '分压：U 可从 0 起'
      : '限流：串联控流',
    CARD_X + 16,
    FORMULA_Y + 102,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawComparison(ctx, state, p, scale);
  text(
    ctx,
    `E=${state.params.supplyVoltage.toFixed(1)} V · R滑=${state.rheostatResistance.toFixed(1)} Ω`,
    CARD_X + 16,
    GEOMETRY.panelBottomY - 18,
    p.muted,
    13 * scale,
    'left',
    600
  );
}

export function createResistorView(options: CreateResistorViewOptions = {}) {
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
  let snapshot: ResistorState | null = null;
  function draw(state: ResistorState): void {
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
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
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
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: ResistorState): void {
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
