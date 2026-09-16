import {
  applyCanvasSize,
  getResponsiveScale,
  scaledSize
} from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  emfInternalConstants as C,
  type EmfFit,
  type EmfInternalState,
  type EmfRecord
} from './scene.sim';

export type CreateEmfInternalViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const BASE_W = C.baseWidth;
const BASE_H = C.baseHeight;

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

function contentBoxSize(host: HTMLElement): { width: number; height: number } {
  const cs = getComputedStyle(host);
  const rect = host.getBoundingClientRect();
  const padX =
    (Number.parseFloat(cs.paddingLeft) || 0) +
    (Number.parseFloat(cs.paddingRight) || 0);
  const padY =
    (Number.parseFloat(cs.paddingTop) || 0) +
    (Number.parseFloat(cs.paddingBottom) || 0);
  return {
    width: Math.max(1, Math.floor(rect.width - padX)),
    height: Math.max(1, Math.floor(rect.height - padY))
  };
}

export function sizeGraphCanvasToHost(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  responsiveScale: number;
} {
  const host = canvas.parentElement;
  let cssWidth: number;
  let cssHeight: number;
  if (host) {
    const box = contentBoxSize(host);
    cssWidth = box.width;
    cssHeight = box.height;
  } else {
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, Math.floor(rect.width || C.graphFallbackWidth));
    cssHeight = Math.max(1, Math.floor(rect.height || C.graphFallbackHeight));
  }
  const dpr = Math.min(
    2,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  );
  const responsiveScale = getResponsiveScale(cssWidth, cssHeight);
  const ctx = applyCanvasSize(canvas, {
    width: Math.max(1, Math.floor(cssWidth * dpr)),
    height: Math.max(1, Math.floor(cssHeight * dpr)),
    cssWidth,
    cssHeight,
    dpr,
    responsiveScale
  });
  return { ctx, cssWidth, cssHeight, responsiveScale };
}

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
  radius = 10
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
  width: number,
  dashed = false
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [6, 6] : []);
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
  fraction: number,
  accent: string,
  p: Palette,
  radius: number
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius - 10, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  const t = Math.max(0, Math.min(1, fraction));
  const angle = Math.PI * (1.15 + 0.7 * t);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x + Math.cos(angle) * radius * 0.62,
    y + Math.sin(angle) * radius * 0.62
  );
  ctx.stroke();
  text(ctx, letter, x, y - radius * 0.18, accent, 16, 'center', 700);
}

function drawSource(ctx: CanvasRenderingContext2D, p: Palette): void {
  const left = C.sourceX - C.sourceWidth / 2;
  const top = C.sourceY - C.sourceHeight / 2;
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 2;
  rounded(ctx, left, top, C.sourceWidth, C.sourceHeight, 8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(C.sourceX - 26, C.sourceY - 14);
  ctx.lineTo(C.sourceX - 26, C.sourceY + 14);
  ctx.stroke();
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(C.sourceX + 24, C.sourceY - 10);
  ctx.lineTo(C.sourceX + 24, C.sourceY + 10);
  ctx.stroke();
  text(ctx, '+', C.sourceX - 42, C.sourceY - 20, p.red, 14, 'center', 700);
  text(ctx, '−', C.sourceX + 42, C.sourceY - 20, p.ink, 14, 'center', 700);
  text(ctx, 'E, r', C.sourceX, C.sourceY + 40, p.ink, 13, 'center', 700);
}

function drawSwitch(
  ctx: CanvasRenderingContext2D,
  closed: boolean,
  p: Palette
): void {
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(C.switchX - 16, C.sourceY, 5, 0, Math.PI * 2);
  ctx.arc(C.switchX + 18, C.sourceY, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(C.switchX - 16, C.sourceY);
  ctx.lineTo(
    closed ? C.switchX + 18 : C.switchX + 6,
    closed ? C.sourceY : C.sourceY - 20
  );
  ctx.strokeStyle = closed ? p.teal : p.red;
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, 'S', C.switchX, C.sourceY + 32, p.ink, 13, 'center', 700);
}

function drawRheostat(
  ctx: CanvasRenderingContext2D,
  r: number,
  p: Palette
): void {
  const left = C.rheostatX;
  const top = C.rheostatY - C.rheostatHeight / 2;
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 2;
  rounded(ctx, left, top, C.rheostatWidth, C.rheostatHeight, 6);
  ctx.fill();
  ctx.stroke();
  for (let i = 1; i < 11; i += 1) {
    const x = left + (C.rheostatWidth * i) / 11;
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, top + 4);
    ctx.lineTo(x, top + C.rheostatHeight - 4);
    ctx.stroke();
  }
  const knobX =
    left +
    ((r - C.rheostatMin) / (C.rheostatMax - C.rheostatMin)) * C.rheostatWidth;
  ctx.fillStyle = p.blue;
  rounded(ctx, knobX - 11, top - 16, 22, 20, 4);
  ctx.fill();
  text(
    ctx,
    'R',
    left + C.rheostatWidth / 2,
    top - 28,
    p.ink,
    13,
    'center',
    700
  );
  text(ctx, 'P', knobX, top - 6, '#ffffff', 12, 'center', 700);
}

function polylineLength(points: Array<[number, number]>): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    length += Math.hypot(dx, dy);
  }
  return length;
}

function pointOnPath(
  points: Array<[number, number]>,
  distance: number
): [number, number] {
  let remaining = distance;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const seg = Math.hypot(dx, dy);
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg;
      return [points[i - 1][0] + dx * t, points[i - 1][1] + dy * t];
    }
    remaining -= seg;
  }
  return points[points.length - 1];
}

function drawFlow(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  p: Palette
): void {
  if (!state.params.switchClosed) return;
  const path: Array<[number, number]> = [
    [C.wireLeft, C.sourceY],
    [C.wireRight, C.sourceY],
    [C.wireRight, C.wireBottom],
    [C.wireLeft, C.wireBottom],
    [C.wireLeft, C.sourceY]
  ];
  const total = polylineLength(path);
  const spacing = C.flowSpacing;
  const offset = ((state.phase % C.flowPeriod) / C.flowPeriod) * spacing;
  ctx.fillStyle = p.flow;
  for (let d = offset; d < total; d += spacing) {
    const [x, y] = pointOnPath(path, d);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCircuit(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  p: Palette
): void {
  const lw = 4;
  wire(
    ctx,
    [
      [C.wireLeft, C.sourceY],
      [C.sourceX - C.sourceWidth / 2, C.sourceY]
    ],
    p.wire,
    lw
  );
  wire(
    ctx,
    [
      [C.sourceX + C.sourceWidth / 2, C.sourceY],
      [C.switchX - 16, C.sourceY]
    ],
    p.wire,
    lw
  );
  wire(
    ctx,
    [
      [C.switchX + 18, C.sourceY],
      [C.ammeterX - C.meterRadius, C.ammeterY]
    ],
    p.wire,
    lw
  );
  wire(
    ctx,
    [
      [C.ammeterX + C.meterRadius, C.ammeterY],
      [C.rheostatX, C.rheostatY]
    ],
    p.wire,
    lw
  );
  wire(
    ctx,
    [
      [C.rheostatX + C.rheostatWidth, C.rheostatY],
      [C.wireRight, C.rheostatY],
      [C.wireRight, C.wireBottom]
    ],
    p.wire,
    lw
  );
  wire(
    ctx,
    [
      [C.wireLeft, C.wireBottom],
      [C.wireLeft, C.sourceY]
    ],
    p.wire,
    lw
  );
  wire(
    ctx,
    [
      [C.wireLeft, C.wireBottom],
      [C.wireRight, C.wireBottom]
    ],
    p.wire,
    lw
  );
  wire(
    ctx,
    [
      [C.switchX - 16, C.sourceY],
      [C.switchX - 16, C.voltmeterY],
      [C.voltmeterX - C.meterRadius, C.voltmeterY]
    ],
    p.blue,
    2,
    true
  );
  wire(
    ctx,
    [
      [C.wireRight, C.wireBottom],
      [C.wireRight - 48, C.wireBottom],
      [C.wireRight - 48, C.voltmeterY],
      [C.voltmeterX + C.meterRadius, C.voltmeterY]
    ],
    p.blue,
    2,
    true
  );
  drawFlow(ctx, state, p);
  drawSource(ctx, p);
  drawSwitch(ctx, state.params.switchClosed, p);
  drawRheostat(ctx, state.rheostatResistance, p);
  const iFrac = Math.min(1, state.current / 1.2);
  const uFrac = Math.min(
    1,
    state.terminalVoltage / Math.max(1.5, state.sourceVoltage)
  );
  drawMeter(ctx, C.ammeterX, C.ammeterY, 'A', iFrac, p.red, p, C.meterRadius);
  drawMeter(
    ctx,
    C.voltmeterX,
    C.voltmeterY,
    'V',
    uFrac,
    p.blue,
    p,
    C.meterRadius
  );
}

function graphPoint(
  record: EmfRecord,
  currentMax: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
  uMax: number
): [number, number] {
  return [
    left + (record.current / currentMax) * (right - left),
    bottom - (record.voltage / uMax) * (bottom - top)
  ];
}

export function niceUiAxis(
  requiredMax: number,
  approxIntervals = 6
): { max: number; step: number; ticks: number[] } {
  const need = Math.max(requiredMax, 1e-6);
  const intervals = Math.max(2, Math.round(approxIntervals));
  const rough = need / intervals;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / mag;
  const step = residual >= 5 ? 5 * mag : residual >= 2 ? 2 * mag : mag;
  const n = Math.ceil(need / step - 1e-9);
  const max = n * step;
  const ticks: number[] = [];
  for (let i = 0; i <= n; i += 1) ticks.push(i * step);
  return { max, step, ticks };
}

export function formatUiTick(value: number, step: number): string {
  if (Math.abs(value) < 1e-9) return '0';
  if (step >= 1 - 1e-9) return String(Math.round(value));
  const decimals = step >= 0.1 - 1e-9 ? 1 : 2;
  return value.toFixed(decimals);
}

export function uiGraphAxes(
  input: {
    sourceVoltage: number;
    internalResistance: number;
    fit?: EmfFit | null;
  },
  approxIntervals = 6
): {
  currentMax: number;
  voltageMax: number;
  currentStep: number;
  voltageStep: number;
  currentTicks: number[];
  voltageTicks: number[];
} {
  const shortI =
    input.sourceVoltage / Math.max(C.resistanceMin, input.internalResistance);
  const fitI =
    input.fit && input.fit.internalResistance > 0
      ? input.fit.emf / input.fit.internalResistance
      : 0;
  const iAxis = niceUiAxis(
    Math.max(C.graphCurrentBaseMax, shortI, fitI),
    approxIntervals
  );
  const uAxis = niceUiAxis(
    Math.max(C.graphVoltageBaseMax, input.sourceVoltage, input.fit?.emf ?? 0),
    approxIntervals
  );
  return {
    currentMax: iAxis.max,
    voltageMax: uAxis.max,
    currentStep: iAxis.step,
    voltageStep: uAxis.step,
    currentTicks: iAxis.ticks,
    voltageTicks: uAxis.ticks
  };
}

export function uiGraphPlotBox(
  width: number,
  height: number
): { left: number; right: number; top: number; bottom: number } {
  const padL = Math.max(36, width * 0.1);
  const padR = Math.max(28, width * 0.06);
  const padT = Math.max(28, height * 0.14);
  const padB = Math.max(36, height * 0.18);
  return {
    left: padL,
    right: width - padR,
    top: padT,
    bottom: height - padB
  };
}

export function uiGraphLineEnd(
  emf: number,
  resistance: number,
  currentMax: number
): { current: number; voltage: number } {
  const visibleMax = Math.max(0, currentMax);
  if (
    !(resistance > 0) ||
    !Number.isFinite(resistance) ||
    !Number.isFinite(emf)
  ) {
    return {
      current: visibleMax,
      voltage: Math.max(0, Number.isFinite(emf) ? emf : 0)
    };
  }
  const interceptI = emf / resistance;
  if (interceptI >= 0 && interceptI <= visibleMax) {
    return { current: interceptI, voltage: 0 };
  }
  return {
    current: visibleMax,
    voltage: Math.max(0, emf - visibleMax * resistance)
  };
}

function drawGraphCanvas(
  ctx: CanvasRenderingContext2D,
  state: EmfInternalState,
  width: number,
  height: number,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const { left, right, top, bottom } = uiGraphPlotBox(width, height);
  const axes = uiGraphAxes(state);
  const uMax = axes.voltageMax;
  const currentMax = axes.currentMax;
  text(ctx, 'U-I', left, 16, p.ink, font(14), 'left', 700);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  axes.currentTicks.forEach((current) => {
    const x = left + (current / currentMax) * (right - left);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  });
  axes.voltageTicks.forEach((voltage) => {
    const y = bottom - (voltage / uMax) * (bottom - top);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  });
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, top);
  ctx.stroke();
  text(ctx, 'I / A', right, bottom + 24, p.ink, font(11), 'right', 700);
  text(ctx, 'U / V', left - 8, top - 12, p.ink, font(11), 'left', 700);
  text(ctx, '0', left - 8, bottom + 11, p.muted, font(10), 'right', 600);
  axes.currentTicks.forEach((current) => {
    if (current === 0) return;
    const x = left + (current / currentMax) * (right - left);
    const align: CanvasTextAlign = current === currentMax ? 'right' : 'center';
    text(
      ctx,
      formatUiTick(current, axes.currentStep),
      x,
      bottom + 11,
      p.muted,
      font(10),
      align,
      600
    );
  });
  axes.voltageTicks.forEach((voltage) => {
    if (voltage === 0) return;
    const y = bottom - (voltage / uMax) * (bottom - top);
    text(
      ctx,
      formatUiTick(voltage, axes.voltageStep),
      left - 8,
      y,
      p.muted,
      font(10),
      'right',
      600
    );
  });
  const theoreticalEnd = uiGraphLineEnd(
    state.sourceVoltage,
    state.internalResistance,
    currentMax
  );
  const theoretical: EmfRecord[] = [
    { current: 0, voltage: state.sourceVoltage, resistance: 0 },
    {
      current: theoreticalEnd.current,
      voltage: theoreticalEnd.voltage,
      resistance: 0
    }
  ];
  const [tx1, ty1] = graphPoint(
    theoretical[0],
    currentMax,
    left,
    right,
    top,
    bottom,
    uMax
  );
  const [tx2, ty2] = graphPoint(
    theoretical[1],
    currentMax,
    left,
    right,
    top,
    bottom,
    uMax
  );
  ctx.strokeStyle = p.muted;
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tx1, ty1);
  ctx.lineTo(tx2, ty2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (state.fit) {
    const fittedEnd = uiGraphLineEnd(
      state.fit.emf,
      state.fit.internalResistance,
      currentMax
    );
    const fitted: EmfRecord[] = [
      { current: 0, voltage: state.fit.emf, resistance: 0 },
      {
        current: fittedEnd.current,
        voltage: fittedEnd.voltage,
        resistance: 0
      }
    ];
    const [fx1, fy1] = graphPoint(
      fitted[0],
      currentMax,
      left,
      right,
      top,
      bottom,
      uMax
    );
    const [fx2, fy2] = graphPoint(
      fitted[1],
      currentMax,
      left,
      right,
      top,
      bottom,
      uMax
    );
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx1, fy1);
    ctx.lineTo(fx2, fy2);
    ctx.stroke();
  }
  state.records.forEach((record, index) => {
    const [x, y] = graphPoint(
      record,
      currentMax,
      left,
      right,
      top,
      bottom,
      uMax
    );
    ctx.fillStyle = p.teal;
    ctx.beginPath();
    ctx.arc(x, y, C.pointRadius, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, String(index + 1), x + 8, y - 8, p.teal, font(10), 'left', 700);
  });
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
  let graphCanvas: HTMLCanvasElement | null = options.graphCanvas ?? null;
  let snapshot: EmfInternalState | null = null;

  function paintGraph(state: EmfInternalState): void {
    if (!graphCanvas) return;
    const sized = sizeGraphCanvasToHost(graphCanvas);
    const typeScale = env.contentScale();
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(sized.responsiveScale, 0.3), 10);
    drawGraphCanvas(
      sized.ctx,
      state,
      sized.cssWidth,
      sized.cssHeight,
      PALETTE[env.theme],
      font
    );
  }

  function draw(state: EmfInternalState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetX = (width - BASE_W * fit) / 2;
    const offsetY = (height - BASE_H * fit) / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    const p = PALETTE[env.theme];
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    drawCircuit(ctx, state, p);
    ctx.restore();
    paintGraph(state);
  }

  return {
    render(state: EmfInternalState): void {
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
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graphCanvas = canvas;
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      graphCanvas = null;
      stage.release();
    }
  };
}
