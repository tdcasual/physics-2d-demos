import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { capacitorConstants, type CapacitorState } from './scene.sim';

export type CreateCapacitorViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  panel: string;
  soft: string;
  grid: string;
  ink: string;
  muted: string;
  border: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  dark: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f2f5f8',
    grid: '#dbe3ec',
    ink: '#303744',
    muted: '#8190a3',
    border: '#d4dde7',
    blue: '#2c68e8',
    red: '#ef4050',
    teal: '#2dbb93',
    gold: '#f2a51b',
    dark: '#0b1020'
  },
  dark: {
    bg: '#0f1728',
    panel: '#172235',
    soft: '#223249',
    grid: '#3d506a',
    ink: '#eef2f7',
    muted: '#9eacbe',
    border: '#43556e',
    blue: '#65a4ff',
    red: '#fb7185',
    teal: '#4dd4c0',
    gold: '#fbbf24',
    dark: '#080d18'
  }
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelX: PANEL_X,
  panelWidth: PANEL_W,
  panelTop: PANEL_TOP,
  panelBottom: PANEL_BOTTOM,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  voltageGraphTop: VOLTAGE_TOP,
  voltageGraphBottom: VOLTAGE_BOTTOM,
  currentGraphTop: CURRENT_TOP,
  currentGraphBottom: CURRENT_BOTTOM,
  maxTauCount: MAX_TAU
} = capacitorConstants;
const L = capacitorConstants.layout;

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
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 12
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
  width = 3
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
  ctx.lineTo(x2 - ux * 11 - uy * 5, y2 - uy * 11 + ux * 5);
  ctx.lineTo(x2 - ux * 11 + uy * 5, y2 - uy * 11 - ux * 5);
  ctx.closePath();
  ctx.fill();
}

function drawBattery(ctx: CanvasRenderingContext2D, p: Palette): void {
  const x = L.batteryX;
  const y = L.batteryY;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5;
  for (const [offset, width] of [
    [0, 58],
    [17, 42],
    [34, 58],
    [51, 42]
  ] as Array<[number, number]>) {
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y + offset);
    ctx.lineTo(x + width / 2, y + offset);
    ctx.stroke();
  }
  text(ctx, '+', x - 55, y - 4, p.ink, 18, 'center', L.fontBold);
  text(ctx, '−', x - 55, y + 57, p.ink, 18, 'center', L.fontBold);
  text(ctx, 'E', x + 44, y + 29, p.ink, 18, 'left', L.fontBold);
}

function drawResistor(ctx: CanvasRenderingContext2D, p: Palette): void {
  const x = L.resistorX;
  const y = L.componentY;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - L.resistorLead, y);
  ctx.lineTo(x - L.resistorHalf, y);
  ctx.stroke();
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  roundedRect(
    ctx,
    x - L.resistorHalf,
    y - 18,
    L.resistorBodyWidth,
    L.resistorBodyHeight,
    9
  );
  ctx.fill();
  ctx.stroke();
  for (const [offset, color] of [
    [-24, p.red],
    [-8, p.gold],
    [9, p.blue],
    [24, p.gold]
  ] as Array<[number, string]>) {
    ctx.fillStyle = color;
    ctx.fillRect(x + offset - 3, y - 17, 6, 34);
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + L.resistorHalf, y);
  ctx.lineTo(x + L.resistorLead + 1, y);
  ctx.stroke();
  text(ctx, 'R', x, y - 31, p.ink, 19, 'center', L.fontBold);
}

function drawCapacitor(
  ctx: CanvasRenderingContext2D,
  state: CapacitorState,
  p: Palette
): void {
  const x = L.capacitorX;
  const y = L.componentY;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - L.capacitorLead, y);
  ctx.lineTo(x - L.capacitorPlateHalf, y);
  ctx.moveTo(x + L.capacitorPlateHalf, y);
  ctx.lineTo(x + L.capacitorLead - 1, y);
  ctx.stroke();
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x - L.capacitorPlateHalf, y - L.capacitorPlateGap);
  ctx.lineTo(x + L.capacitorPlateHalf, y - L.capacitorPlateGap);
  ctx.moveTo(x - L.capacitorPlateHalf, y + L.capacitorPlateGap);
  ctx.lineTo(x + L.capacitorPlateHalf, y + L.capacitorPlateGap);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.globalAlpha = Math.min(
    1,
    state.voltageAcross / Math.max(1, state.params.voltage)
  );
  ctx.beginPath();
  ctx.arc(x - 12, y - 29, 5, 0, Math.PI * 2);
  ctx.arc(x + 12, y - 29, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  text(ctx, '极板 A', x, y - 51, p.ink, 15, 'center', 600);
  text(ctx, '极板 B', x, y + 52, p.ink, 15, 'center', 600);
  text(ctx, 'C', x - 53, y + 8, p.ink, 19, 'center', L.fontBold);
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 34 + i * 17, y - 20);
    ctx.lineTo(x - 34 + i * 17, y + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawMeter(
  ctx: CanvasRenderingContext2D,
  state: CapacitorState,
  p: Palette
): void {
  const x = L.meterX;
  const y = L.meterY;
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const sign = state.currentMilliamp < 0 ? -1 : 1;
  arrow(
    ctx,
    x,
    y,
    x + sign * 17,
    y - 16,
    state.currentMilliamp < 0 ? p.red : p.teal,
    3
  );
  text(ctx, 'I', x, y + 5, p.ink, 15, 'center', L.fontBold);
}

function drawCircuit(
  ctx: CanvasRenderingContext2D,
  state: CapacitorState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  roundedRect(
    ctx,
    L.circuitX,
    L.circuitY,
    FIELD_W - 36,
    L.circuitHeight,
    L.circuitRadius
  );
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 36; x < FIELD_W - 10; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, L.gridTop);
    ctx.lineTo(x, L.gridBottom);
    ctx.stroke();
  }
  for (let y = 36; y < L.gridBottom; y += 32) {
    ctx.beginPath();
    ctx.moveTo(25, y);
    ctx.lineTo(FIELD_W - 25, y);
    ctx.stroke();
  }
  text(
    ctx,
    '电路模型：开关控制充电 / 放电',
    FIELD_W / 2,
    53,
    p.ink,
    20,
    'center',
    L.fontBold
  );
  drawBattery(ctx, p);
  drawResistor(ctx, p);
  drawCapacitor(ctx, state, p);
  drawMeter(ctx, state, p);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(L.batteryX, L.batteryY);
  ctx.lineTo(L.batteryX, L.componentY);
  ctx.lineTo(L.wireLeft, L.componentY);
  ctx.moveTo(L.batteryX, L.batteryBottom);
  ctx.lineTo(L.batteryX, L.wireBottom);
  ctx.lineTo(L.meterX, L.wireBottom);
  ctx.lineTo(L.meterX, L.meterBottom);
  ctx.moveTo(L.meterX, L.meterTop);
  ctx.lineTo(L.meterX, L.componentY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(L.wireLeft, L.componentY);
  ctx.lineTo(L.switchX, L.componentY);
  ctx.moveTo(L.switchClosedX, L.componentY);
  ctx.lineTo(L.resistorX - L.resistorLead, L.componentY);
  ctx.stroke();
  ctx.fillStyle =
    state.params.mode === 1
      ? p.red
      : state.params.mode === 2
        ? p.blue
        : p.muted;
  ctx.beginPath();
  ctx.arc(L.switchX, L.componentY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(L.switchX, L.componentY);
  ctx.lineTo(
    state.params.mode === 2 ? L.switchClosedX : L.switchOpenX,
    L.switchY
  );
  ctx.stroke();
  text(
    ctx,
    '1 充电',
    L.labelChargeX,
    L.labelChargeY,
    state.params.mode === 1 ? p.red : p.muted,
    16,
    'left',
    L.fontBold
  );
  text(
    ctx,
    '0 断开',
    L.labelChargeX,
    L.labelOpenY,
    p.muted,
    16,
    'left',
    L.fontBold
  );
  text(
    ctx,
    '2 放电',
    L.labelChargeX,
    L.labelDischargeY,
    state.params.mode === 2 ? p.blue : p.muted,
    16,
    'left',
    L.fontBold
  );
  text(
    ctx,
    `E = ${state.params.voltage.toFixed(1)} V`,
    L.batteryX,
    L.voltageLabelY,
    p.ink,
    15,
    'center',
    600
  );
  text(
    ctx,
    '电流方向与电子运动相反',
    L.currentLabelX,
    L.currentHintY,
    p.muted,
    13,
    'center',
    500
  );
}

function graphX(timeRatio: number): number {
  return GRAPH_LEFT + (GRAPH_RIGHT - GRAPH_LEFT) * timeRatio;
}
function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: CapacitorState,
  p: Palette
): void {
  ctx.fillStyle = p.dark;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  roundedRect(
    ctx,
    L.graphCardX,
    L.graphCardY,
    FIELD_W - 36,
    L.graphCardHeight,
    L.graphCardRadius
  );
  ctx.fill();
  ctx.stroke();
  const tauRatio = 1 / MAX_TAU;
  const markerRatio = Math.min(1, state.progress / MAX_TAU);
  for (const [top, bottom] of [
    [VOLTAGE_TOP, VOLTAGE_BOTTOM],
    [CURRENT_TOP, CURRENT_BOTTOM]
  ] as Array<[number, number]>) {
    ctx.strokeStyle = '#293653';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i += 1) {
      const x = GRAPH_LEFT + ((GRAPH_RIGHT - GRAPH_LEFT) * i) / 5;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    for (let i = 0; i <= 3; i += 1) {
      const y = top + ((bottom - top) * i) / 3;
      ctx.beginPath();
      ctx.moveTo(GRAPH_LEFT, y);
      ctx.lineTo(GRAPH_RIGHT, y);
      ctx.stroke();
    }
  }
  text(
    ctx,
    'Uc / V',
    GRAPH_LEFT - 8,
    VOLTAGE_TOP - 12,
    '#d6e0f0',
    15,
    'left',
    L.fontBold
  );
  text(
    ctx,
    'I / mA',
    GRAPH_LEFT - 8,
    CURRENT_TOP - 12,
    '#d6e0f0',
    15,
    'left',
    L.fontBold
  );
  text(
    ctx,
    't / s',
    GRAPH_RIGHT,
    CURRENT_BOTTOM + 15,
    '#d6e0f0',
    14,
    'right',
    500
  );
  ctx.strokeStyle = p.gold;
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(graphX(tauRatio), VOLTAGE_TOP);
  ctx.lineTo(graphX(tauRatio), CURRENT_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '1τ (63.2%)',
    graphX(tauRatio) + 8,
    VOLTAGE_TOP + 18,
    p.gold,
    14,
    'left',
    L.fontBold
  );
  const curveColor = p.teal;
  ctx.strokeStyle = curveColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= 60; i += 1) {
    const ratio = i / 60;
    const voltage =
      state.params.voltage *
      (state.params.mode === 2
        ? Math.exp(-ratio * MAX_TAU)
        : 1 - Math.exp(-ratio * MAX_TAU));
    const x = graphX(ratio);
    const y =
      VOLTAGE_BOTTOM -
      (voltage / Math.max(1, state.params.voltage)) *
        (VOLTAGE_BOTTOM - VOLTAGE_TOP);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  if (state.params.showCurrent) {
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 60; i += 1) {
      const ratio = i / 60;
      const sign = state.params.mode === 2 ? -1 : 1;
      const current = sign * Math.exp(-ratio * MAX_TAU);
      const x = graphX(ratio);
      const y =
        (CURRENT_TOP + CURRENT_BOTTOM) / 2 -
        current * (CURRENT_BOTTOM - CURRENT_TOP) * 0.42;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const currentVoltage =
    state.voltageAcross / Math.max(1, state.params.voltage);
  const currentX = graphX(markerRatio);
  const currentY =
    VOLTAGE_BOTTOM - currentVoltage * (VOLTAGE_BOTTOM - VOLTAGE_TOP);
  ctx.fillStyle = curveColor;
  ctx.beginPath();
  ctx.arc(currentX, currentY, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: CapacitorState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  roundedRect(
    ctx,
    PANEL_X,
    PANEL_TOP,
    PANEL_W,
    PANEL_BOTTOM - PANEL_TOP,
    L.panelRadius
  );
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '电容器充放电实验室',
    PANEL_X + L.panelTitleX,
    PANEL_TOP + L.panelTitleY,
    p.ink,
    24,
    'left',
    L.fontBold
  );
  text(
    ctx,
    '高中物理',
    PANEL_X + PANEL_W - L.panelTitleRight,
    PANEL_TOP + L.panelTitleY,
    p.blue,
    15,
    'right',
    L.fontBold
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + 30, PANEL_TOP + L.panelRuleY);
  ctx.lineTo(PANEL_X + PANEL_W - 30, PANEL_TOP + L.panelRuleY);
  ctx.stroke();
  ctx.fillStyle = p.soft;
  roundedRect(
    ctx,
    PANEL_X + L.panelCardX,
    PANEL_TOP + L.panelReadoutY,
    PANEL_W - L.panelCardInset,
    L.panelReadoutHeight,
    14
  );
  ctx.fill();
  text(
    ctx,
    '实时实验测量值',
    PANEL_X + L.panelReadoutTextX,
    PANEL_TOP + L.panelReadoutTitleY,
    p.teal,
    16,
    'left',
    L.fontBold
  );
  text(
    ctx,
    `极板电压 Uc：${state.voltageAcross.toFixed(2)} V`,
    PANEL_X + L.panelReadoutTextX,
    PANEL_TOP + L.panelVoltageY,
    p.ink,
    16,
    'left',
    600
  );
  text(
    ctx,
    `回路电流 I：${state.currentMilliamp.toFixed(2)} mA`,
    PANEL_X + L.panelReadoutTextX,
    PANEL_TOP + L.panelCurrentY,
    p.ink,
    16,
    'left',
    600
  );
  text(
    ctx,
    `积累电荷 Q：${state.chargeMicrocoulomb.toFixed(1)} μC`,
    PANEL_X + L.panelReadoutTextX,
    PANEL_TOP + L.panelChargeY,
    p.ink,
    16,
    'left',
    600
  );
  ctx.fillStyle = '#fff7e5';
  roundedRect(
    ctx,
    PANEL_X + L.panelCardX,
    PANEL_TOP + L.panelTauCardY,
    PANEL_W - L.panelCardInset,
    L.panelTauCardHeight,
    12
  );
  ctx.fill();
  text(
    ctx,
    `时间常数 τ = RC：${state.tau.toFixed(2)} s`,
    PANEL_X + L.panelReadoutTextX,
    PANEL_TOP + L.panelTauTextY,
    p.gold,
    17,
    'left',
    L.fontBold
  );
  ctx.fillStyle = p.soft;
  roundedRect(
    ctx,
    PANEL_X + L.panelCardX,
    PANEL_TOP + L.panelFormulaY,
    PANEL_W - L.panelCardInset,
    L.panelFormulaHeight,
    14
  );
  ctx.fill();
  text(
    ctx,
    '电容定义式：',
    PANEL_X + L.panelFormulaTextX,
    PANEL_TOP + L.panelFormulaTextY,
    p.muted,
    16,
    'left',
    600
  );
  text(
    ctx,
    'C = Q / Uc',
    PANEL_X + PANEL_W - 50,
    PANEL_TOP + L.panelFormulaTextY,
    p.ink,
    18,
    'right',
    L.fontBold
  );
  text(
    ctx,
    `Q = ${state.params.capacitance} μF × ${state.voltageAcross.toFixed(2)} V`,
    PANEL_X + L.panelFormulaTextX,
    PANEL_TOP + L.panelFormulaY2,
    p.ink,
    15,
    'left',
    600
  );
  text(
    ctx,
    `= ${state.chargeMicrocoulomb.toFixed(1)} μC`,
    PANEL_X + L.panelFormulaTextX,
    PANEL_TOP + L.panelFormulaY3,
    p.ink,
    15,
    'left',
    600
  );
  ctx.fillStyle =
    state.params.mode === 1
      ? '#fff0f1'
      : state.params.mode === 2
        ? '#edf5ff'
        : p.soft;
  roundedRect(
    ctx,
    PANEL_X + L.panelStatusCardX,
    PANEL_TOP + L.panelStatusY,
    PANEL_W - L.panelCardInset,
    L.panelStatusHeight,
    14
  );
  ctx.fill();
  text(
    ctx,
    state.params.mode === 1
      ? '充电：Uc 上升，I 衰减'
      : state.params.mode === 2
        ? '放电：Uc、I 同时衰减'
        : '开关断开：保持当前状态',
    PANEL_X + L.panelReadoutTextX,
    PANEL_TOP + L.panelStatusTextY,
    state.params.mode === 1
      ? p.red
      : state.params.mode === 2
        ? p.blue
        : p.muted,
    16,
    'left',
    L.fontBold
  );
}

export function createCapacitorView(options: CreateCapacitorViewOptions = {}) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BASE_W, fallbackHeight: BASE_H },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints
  });
  let snapshot: CapacitorState | null = null;
  let lastKey: string | null = null;
  function draw(next: CapacitorState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const responsiveScale = stage.responsiveScale;
    const s =
      Math.min(width / BASE_W, height / BASE_H) * Math.min(1, responsiveScale);
    const ox = (width - BASE_W * s) / 2;
    const oy = (height - BASE_H * s) / 2;
    const p = PALETTE[env.theme];
    ctx.setTransform(s, 0, 0, s, ox, oy);
    ctx.clearRect(0, 0, BASE_W, BASE_H);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    drawCircuit(ctx, next, p);
    drawGraphs(ctx, next, p);
    drawPanel(ctx, next, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {
    render(next: CapacitorState): void {
      snapshot = next;
      const key = `${next.time.toFixed(3)}|${env.theme}|${env.mode}|${stage.cssWidth}x${stage.cssHeight}|${next.params.mode}|${next.params.voltage}|${next.params.resistance}|${next.params.capacitance}|${next.params.showCurrent}`;
      if (key === lastKey) return;
      lastKey = key;
      draw(next);
    },
    resize(): void {
      stage.resize();
      lastKey = null;
      if (snapshot) draw(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      env.setTheme(nextTheme);
      lastKey = null;
      if (snapshot) draw(snapshot);
    },
    setMode(nextMode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(nextMode, hints);
      lastKey = null;
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    }
  };
}
