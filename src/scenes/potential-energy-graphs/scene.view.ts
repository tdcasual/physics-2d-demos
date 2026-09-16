import {
  applyCanvasSize,
  getResponsiveScale,
  scaledSize
} from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  axisTicks,
  graphBounds,
  potentialAt,
  potentialGraphConstants as C,
  type PotentialGraphState
} from './scene.sim';

export type CreatePotentialGraphViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onProbePosition?: (x: number) => void;
};

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
  wire: string;
};

type PlotBox = { left: number; right: number; top: number; bottom: number };

type AxisLayout = {
  y: number;
  left: number;
  right: number;
  band: number;
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
    teal: '#23a99a',
    gold: '#d99416',
    wire: '#3e4854'
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
    wire: '#c2cedc'
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
  radius: number
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
  width: number,
  head: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * head * 0.4, y2 - uy * head * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - ux * head - uy * head * 0.45,
    y2 - uy * head + ux * head * 0.45
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.45,
    y2 - uy * head - ux * head * 0.45
  );
  ctx.closePath();
  ctx.fill();
}

function mapX(
  x: number,
  left: number,
  right: number,
  x0: number,
  x1: number
): number {
  return left + ((x - x0) / (x1 - x0)) * (right - left);
}

function mapPx(
  px: number,
  left: number,
  right: number,
  x0: number,
  x1: number
): number {
  if (right <= left) return x0;
  return x0 + ((px - left) / (right - left)) * (x1 - x0);
}

export function graphXToPx(x: number, left: number, right: number): number {
  return mapX(x, left, right, C.xMin, C.xMax);
}

/** Map world x onto the apparatus axis, whose ends are the Coulomb sources at −1 m and 11 m. */
export function apparatusXToPx(x: number, left: number, right: number): number {
  return mapX(x, left, right, C.pointChargeX, C.negativeChargeX);
}

function apparatusPxToX(px: number, left: number, right: number): number {
  return mapPx(px, left, right, C.pointChargeX, C.negativeChargeX);
}

function yToPx(
  value: number,
  min: number,
  max: number,
  top: number,
  bottom: number
): number {
  const span = max - min || 1;
  return bottom - ((value - min) / span) * (bottom - top);
}

function scenarioTitle(state: PotentialGraphState): string {
  const id = state.params.scenario;
  if (id === 'point') return '正点电荷';
  if (id === 'dipole') return '等量异种电荷';
  return '分段匀强场';
}

function axisLayout(width: number, height: number, scale: number): AxisLayout {
  const padX = Math.max(22 * scale, width * 0.07);
  const y = height * 0.52;
  return {
    y,
    left: padX,
    right: width - padX,
    band: Math.max(28 * scale, height * 0.18)
  };
}

function drawCharge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sign: 1 | -1,
  p: Palette,
  font: number
): void {
  ctx.fillStyle = sign > 0 ? p.red : p.blue;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, sign > 0 ? '+' : '−', x, y, '#ffffff', font, 'center', 700);
}

function drawPlates(
  ctx: CanvasRenderingContext2D,
  axis: AxisLayout,
  x0: number,
  x1: number,
  scale: number,
  p: Palette,
  font: number
): void {
  const plateW = Math.max(8 * scale, 6);
  const plateH = Math.max(36 * scale, axis.band * 1.15);
  ctx.fillStyle = p.red;
  ctx.fillRect(x0 - plateW * 0.5, axis.y - plateH / 2, plateW, plateH);
  ctx.fillStyle = p.blue;
  ctx.fillRect(x1 - plateW * 0.5, axis.y - plateH / 2, plateW, plateH);
  text(
    ctx,
    '极板',
    x0,
    axis.y + plateH / 2 + 12 * scale,
    p.muted,
    font,
    'center',
    600
  );
  text(
    ctx,
    '极板',
    x1,
    axis.y + plateH / 2 + 12 * scale,
    p.muted,
    font,
    'center',
    600
  );
}

function drawFieldArrows(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  axis: AxisLayout,
  scale: number,
  p: Palette
): void {
  const count = Math.max(
    6,
    Math.min(18, Math.floor((axis.right - axis.left) / 36))
  );
  let ePeak = 0.01;
  for (let i = 0; i < count; i += 1) {
    const x = C.xMin + ((C.xMax - C.xMin) * (i + 0.5)) / count;
    ePeak = Math.max(
      ePeak,
      Math.abs(potentialAt(state.params.scenario, x).field)
    );
  }
  const probePx = apparatusXToPx(state.probePosition, axis.left, axis.right);
  for (let i = 0; i < count; i += 1) {
    const x = C.xMin + ((C.xMax - C.xMin) * (i + 0.5)) / count;
    const px = apparatusXToPx(x, axis.left, axis.right);
    if (Math.abs(px - probePx) < 22 * scale) continue;
    const field = potentialAt(state.params.scenario, x).field;
    const mag = Math.abs(field) / ePeak;
    const len = Math.max(10 * scale, 22 * scale * mag);
    const dir = field >= 0 ? 1 : -1;
    const y = axis.y - 18 * scale;
    arrow(
      ctx,
      px - dir * len * 0.45,
      y,
      px + dir * len * 0.45,
      y,
      p.teal,
      Math.max(1.2, 1.6 * scale),
      Math.max(5, 6 * scale)
    );
  }
}

function drawApparatus(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const axis = axisLayout(width, height, scale);
  text(
    ctx,
    scenarioTitle(state),
    axis.left,
    Math.max(14 * scale, height * 0.08),
    p.ink,
    font(15),
    'left',
    700
  );
  const xPx = (x: number): number => apparatusXToPx(x, axis.left, axis.right);
  const intervalLeft = xPx(C.xMin);
  const intervalRight = xPx(C.xMax);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) {
    const x = xPx(i);
    ctx.beginPath();
    ctx.moveTo(x, axis.y - axis.band * 0.35);
    ctx.lineTo(x, axis.y + axis.band * 0.35);
    ctx.stroke();
  }
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = Math.max(2, 3.2 * scale);
  ctx.beginPath();
  ctx.moveTo(intervalLeft, axis.y);
  ctx.lineTo(intervalRight, axis.y);
  ctx.stroke();
  for (const tick of [0, 5, 10]) {
    text(
      ctx,
      String(tick),
      xPx(tick),
      axis.y + axis.band * 0.55,
      p.muted,
      font(10),
      'center',
      600
    );
  }
  if (state.params.scenario === 'segments') {
    drawPlates(ctx, axis, intervalLeft, intervalRight, scale, p, font(11));
  } else {
    const r = Math.max(11 * scale, 10);
    const plusX = xPx(C.pointChargeX);
    drawCharge(ctx, plusX, axis.y, r, 1, p, font(13));
    text(ctx, '+Q', plusX, axis.y + r + 12 * scale, p.red, font(11), 'center');
    if (state.params.scenario === 'dipole') {
      const minusX = xPx(C.negativeChargeX);
      drawCharge(ctx, minusX, axis.y, r, -1, p, font(13));
      text(
        ctx,
        '−Q',
        minusX,
        axis.y + r + 12 * scale,
        p.blue,
        font(11),
        'center'
      );
    }
  }
  drawFieldArrows(ctx, state, axis, scale, p);
  const probeX = xPx(state.probePosition);
  const probeR = Math.max(12 * scale, 11);
  ctx.strokeStyle = `${p.teal}99`;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(probeX, axis.y - axis.band * 0.85);
  ctx.lineTo(probeX, axis.y + axis.band * 0.85);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = state.params.probeCharge > 0 ? p.red : p.blue;
  ctx.beginPath();
  ctx.arc(probeX, axis.y, probeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.panel;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    state.params.probeCharge > 0 ? '+q' : '−q',
    probeX,
    axis.y,
    '#ffffff',
    font(12),
    'center',
    700
  );
  if (state.field !== null && state.force !== null) {
    const eDir = state.field >= 0 ? 1 : -1;
    const fDir = state.force >= 0 ? 1 : -1;
    const eLen = 28 * scale;
    const fLen = 34 * scale;
    arrow(
      ctx,
      probeX,
      axis.y - probeR - 8 * scale,
      probeX + eDir * eLen,
      axis.y - probeR - 8 * scale,
      p.teal,
      2,
      7 * scale
    );
    text(
      ctx,
      'E',
      probeX + eDir * (eLen + 8 * scale),
      axis.y - probeR - 8 * scale,
      p.teal,
      font(11),
      'center',
      700
    );
    arrow(
      ctx,
      probeX,
      axis.y,
      probeX + fDir * fLen,
      axis.y,
      state.params.probeCharge > 0 ? p.red : p.blue,
      2.4,
      8 * scale
    );
    text(
      ctx,
      'F',
      probeX + fDir * (fLen + 9 * scale),
      axis.y - 12 * scale,
      state.params.probeCharge > 0 ? p.red : p.blue,
      font(12),
      'center',
      700
    );
  }
  text(
    ctx,
    'x',
    intervalRight + 10 * scale,
    axis.y,
    p.ink,
    font(12),
    'left',
    700
  );
}

function plotBoxes(
  width: number,
  height: number
): { phi: PlotBox; e: PlotBox } {
  const gap = Math.max(8, height * 0.04);
  const half = (height - gap) / 2;
  const padL = Math.max(36, width * 0.09);
  const padR = Math.max(28, width * 0.06);
  const padT = Math.max(20, half * 0.16);
  const padB = Math.max(22, half * 0.2);
  return {
    phi: {
      left: padL,
      right: width - padR,
      top: padT,
      bottom: half - padB
    },
    e: {
      left: padL,
      right: width - padR,
      top: half + gap + padT,
      bottom: height - padB
    }
  };
}

function drawPlotFrame(
  ctx: CanvasRenderingContext2D,
  box: PlotBox,
  yMin: number,
  yMax: number,
  yLabel: string,
  p: Palette,
  font: (n: number) => number,
  showXAxis: boolean
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (const x of [0, 2, 4, 6, 8, 10]) {
    const px = graphXToPx(x, box.left, box.right);
    ctx.beginPath();
    ctx.moveTo(px, box.top);
    ctx.lineTo(px, box.bottom);
    ctx.stroke();
  }
  for (const y of axisTicks(yMin, yMax, 5)) {
    const py = yToPx(y, yMin, yMax, box.top, box.bottom);
    ctx.beginPath();
    ctx.moveTo(box.left, py);
    ctx.lineTo(box.right, py);
    ctx.stroke();
    text(
      ctx,
      Math.abs(y) < 1e-9 ? '0' : String(y),
      box.left - 6,
      py,
      p.muted,
      font(10),
      'right',
      600
    );
  }
  if (yMin < 0 && yMax > 0) {
    const zero = yToPx(0, yMin, yMax, box.top, box.bottom);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(box.left, zero);
    ctx.lineTo(box.right, zero);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(box.left, box.top - 4);
  ctx.lineTo(box.left, box.bottom);
  ctx.lineTo(box.right + 8, box.bottom);
  ctx.stroke();
  text(ctx, yLabel, box.left, box.top - 10, p.blue, font(12), 'left', 700);
  if (showXAxis) {
    text(ctx, 'x / m', box.right + 6, box.bottom, p.ink, font(11), 'left', 700);
    for (const x of [0, 2, 4, 6, 8, 10]) {
      text(
        ctx,
        String(x),
        graphXToPx(x, box.left, box.right),
        box.bottom + 10,
        p.muted,
        font(10),
        'center',
        600
      );
    }
  }
}

function drawPhiPlot(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  box: PlotBox,
  bounds: ReturnType<typeof graphBounds>,
  p: Palette,
  font: (n: number) => number
): void {
  drawPlotFrame(
    ctx,
    box,
    bounds.phiMin,
    bounds.phiMax,
    'φ / V',
    p,
    font,
    false
  );
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  const n = 120;
  for (let i = 0; i <= n; i += 1) {
    const x = C.xMin + ((C.xMax - C.xMin) * i) / n;
    const y = yToPx(
      potentialAt(state.params.scenario, x).potential,
      bounds.phiMin,
      bounds.phiMax,
      box.top,
      box.bottom
    );
    if (i === 0) ctx.moveTo(graphXToPx(x, box.left, box.right), y);
    else ctx.lineTo(graphXToPx(x, box.left, box.right), y);
  }
  ctx.stroke();
  const probeX = graphXToPx(state.probePosition, box.left, box.right);
  const probeY = yToPx(
    state.potential,
    bounds.phiMin,
    bounds.phiMax,
    box.top,
    box.bottom
  );
  const slope = state.slope;
  if (state.params.showTangent && slope !== null && !state.kink) {
    const x1 = Math.max(C.xMin, state.probePosition - C.tangentSpan);
    const x2 = Math.min(C.xMax, state.probePosition + C.tangentSpan);
    ctx.strokeStyle = p.teal;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(
      graphXToPx(x1, box.left, box.right),
      yToPx(
        state.potential + slope * (x1 - state.probePosition),
        bounds.phiMin,
        bounds.phiMax,
        box.top,
        box.bottom
      )
    );
    ctx.lineTo(
      graphXToPx(x2, box.left, box.right),
      yToPx(
        state.potential + slope * (x2 - state.probePosition),
        bounds.phiMin,
        bounds.phiMax,
        box.top,
        box.bottom
      )
    );
    ctx.stroke();
    ctx.setLineDash([]);
    const kLabel = `k=${slope.toFixed(2)}`;
    const kAlign: CanvasTextAlign =
      probeX > box.right - Math.max(48, (box.right - box.left) * 0.18)
        ? 'right'
        : 'left';
    text(
      ctx,
      kLabel,
      probeX + (kAlign === 'right' ? -8 : 8),
      probeY - 12,
      p.teal,
      font(11),
      kAlign,
      700
    );
  }
  if (state.kink) {
    const markAlign: CanvasTextAlign =
      probeX > box.right - Math.max(36, (box.right - box.left) * 0.16)
        ? 'right'
        : 'left';
    text(
      ctx,
      '折点',
      probeX + (markAlign === 'right' ? -8 : 8),
      probeY - 12,
      p.gold,
      font(11),
      markAlign,
      700
    );
  }
  ctx.strokeStyle = `${p.teal}99`;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(probeX, box.top);
  ctx.lineTo(probeX, box.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(probeX, probeY, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawEPolyline(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  box: PlotBox,
  bounds: ReturnType<typeof graphBounds>
): void {
  ctx.beginPath();
  const n = 120;
  for (let i = 0; i <= n; i += 1) {
    const x = C.xMin + ((C.xMax - C.xMin) * i) / n;
    const y = yToPx(
      potentialAt(state.params.scenario, x).field,
      bounds.eMin,
      bounds.eMax,
      box.top,
      box.bottom
    );
    if (i === 0) ctx.moveTo(graphXToPx(x, box.left, box.right), y);
    else ctx.lineTo(graphXToPx(x, box.left, box.right), y);
  }
  ctx.stroke();
}

function drawESteps(
  ctx: CanvasRenderingContext2D,
  box: PlotBox,
  bounds: ReturnType<typeof graphBounds>
): void {
  const knots = [C.xMin, ...C.segmentBreaks, C.xMax];
  ctx.beginPath();
  for (let i = 0; i < knots.length - 1; i += 1) {
    const x0 = knots[i];
    const x1 = knots[i + 1];
    const field = potentialAt('segments', x0 + 1e-4).field;
    const y = yToPx(field, bounds.eMin, bounds.eMax, box.top, box.bottom);
    const px0 = graphXToPx(x0, box.left, box.right);
    const px1 = graphXToPx(x1, box.left, box.right);
    if (i === 0) ctx.moveTo(px0, y);
    else ctx.lineTo(px0, y);
    ctx.lineTo(px1, y);
  }
  ctx.stroke();
}

function fillEArea(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  box: PlotBox,
  bounds: ReturnType<typeof graphBounds>,
  p: Palette
): void {
  const zero = yToPx(0, bounds.eMin, bounds.eMax, box.top, box.bottom);
  const x2 = state.probePosition;
  ctx.fillStyle = `${p.blue}33`;
  if (state.params.scenario === 'segments') {
    const knots = [C.xMin, ...C.segmentBreaks, C.xMax];
    ctx.beginPath();
    ctx.moveTo(graphXToPx(C.xMin, box.left, box.right), zero);
    for (let i = 0; i < knots.length - 1; i += 1) {
      const a = knots[i];
      const b = Math.min(knots[i + 1], x2);
      if (b <= a) break;
      const field = potentialAt('segments', a + 1e-4).field;
      const y = yToPx(field, bounds.eMin, bounds.eMax, box.top, box.bottom);
      ctx.lineTo(graphXToPx(a, box.left, box.right), y);
      ctx.lineTo(graphXToPx(b, box.left, box.right), y);
      if (b >= x2) break;
    }
    ctx.lineTo(graphXToPx(x2, box.left, box.right), zero);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(graphXToPx(C.xMin, box.left, box.right), zero);
  const n = 80;
  for (let i = 0; i <= n; i += 1) {
    const x = C.xMin + ((x2 - C.xMin) * i) / n;
    ctx.lineTo(
      graphXToPx(x, box.left, box.right),
      yToPx(
        potentialAt(state.params.scenario, x).field,
        bounds.eMin,
        bounds.eMax,
        box.top,
        box.bottom
      )
    );
  }
  ctx.lineTo(graphXToPx(x2, box.left, box.right), zero);
  ctx.closePath();
  ctx.fill();
}

function drawEPlot(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  box: PlotBox,
  bounds: ReturnType<typeof graphBounds>,
  p: Palette,
  font: (n: number) => number
): void {
  drawPlotFrame(
    ctx,
    box,
    bounds.eMin,
    bounds.eMax,
    'E / (V·m⁻¹)',
    p,
    font,
    true
  );
  if (state.params.showArea) fillEArea(ctx, state, box, bounds, p);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 2.6;
  if (state.params.scenario === 'segments') drawESteps(ctx, box, bounds);
  else drawEPolyline(ctx, state, box, bounds);
  const probeX = graphXToPx(state.probePosition, box.left, box.right);
  ctx.strokeStyle = `${p.teal}99`;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(probeX, box.top);
  ctx.lineTo(probeX, box.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  const eValues = state.kink
    ? [state.fieldLeft, state.fieldRight]
    : state.field === null
      ? []
      : [state.field];
  eValues.forEach((field, index) => {
    const py = yToPx(field, bounds.eMin, bounds.eMax, box.top, box.bottom);
    ctx.fillStyle = p.blue;
    ctx.beginPath();
    ctx.arc(probeX, py, 5, 0, Math.PI * 2);
    ctx.fill();
    if (state.kink) {
      text(
        ctx,
        index === 0 ? 'E₋' : 'E₊',
        probeX + 8,
        py,
        p.blue,
        font(10),
        'left',
        700
      );
    }
  });
  if (state.params.showArea) {
    text(
      ctx,
      '∫E dx',
      box.left + 10,
      box.top + 12,
      p.blue,
      font(11),
      'left',
      700
    );
  }
}

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  width: number,
  height: number,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(0, 0, width, height);
  rounded(ctx, 0, 0, width, height, 8);
  ctx.fill();
  const boxes = plotBoxes(width, height);
  const bounds = graphBounds(state.params.scenario);
  drawPhiPlot(ctx, state, boxes.phi, bounds, p, font);
  drawEPlot(ctx, state, boxes.e, bounds, p, font);
}

export function createPotentialGraphView(
  options: CreatePotentialGraphViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: C.stageFallbackWidth,
      fallbackHeight: C.stageFallbackHeight
    },
    initialWidth: C.stageFallbackWidth,
    initialHeight: C.stageFallbackHeight,
    eagerContext: true
  });
  const graph = {
    canvas: (options.graphCanvas ?? null) as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    cssWidth: C.graphFallbackWidth as number,
    cssHeight: C.graphFallbackHeight as number,
    responsiveScale: 1,
    resize(): void {
      if (!graph.canvas) return;
      const sized = sizeGraphCanvasToHost(graph.canvas);
      graph.ctx = sized.ctx;
      graph.cssWidth = sized.cssWidth;
      graph.cssHeight = sized.cssHeight;
      graph.responsiveScale = sized.responsiveScale;
    },
    attach(canvas: HTMLCanvasElement): void {
      graph.canvas = canvas;
      graph.resize();
    },
    release(): void {
      graph.canvas = null;
      graph.ctx = null;
    }
  };
  if (graph.canvas) graph.resize();
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: PotentialGraphState | null = null;
  let dragging = false;

  function paint(state: PotentialGraphState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 10);
    ctx.clearRect(0, 0, width, height);
    drawApparatus(ctx, state, width, height, PALETTE[env.theme], rs, font);
    if (graph.canvas) {
      if (!graph.ctx) graph.resize();
      const gctx = graph.ctx;
      if (gctx) {
        const gFont = (base: number): number =>
          scaledSize(
            base * typeScale,
            Math.max(graph.responsiveScale, 0.3),
            10
          );
        drawGraphs(
          gctx,
          state,
          graph.cssWidth,
          graph.cssHeight,
          PALETTE[env.theme],
          gFont
        );
      }
    }
  }

  function worldXFromEvent(event: PointerEvent): number | null {
    const canvas = stage.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    const axis = axisLayout(
      stage.cssWidth,
      stage.cssHeight,
      stage.responsiveScale
    );
    if (!dragging && Math.abs(cssY - axis.y) > axis.band) return null;
    return apparatusPxToX(cssX, axis.left, axis.right);
  }

  function handlePointerDown(event: PointerEvent): void {
    const x = worldXFromEvent(event);
    if (x === null) return;
    dragging = true;
    stage.canvas?.setPointerCapture?.(event.pointerId);
    options.onProbePosition?.(x);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!dragging) return;
    const x = worldXFromEvent(event);
    if (x === null) return;
    options.onProbePosition?.(x);
  }

  function handlePointerUp(event: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    try {
      stage.canvas?.releasePointerCapture?.(event.pointerId);
    } catch {
      /* already released */
    }
  }

  function bindPointer(canvas: HTMLCanvasElement): void {
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'ew-resize';
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
  }

  function unbindPointer(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerUp);
  }

  if (stage.canvas) bindPointer(stage.canvas);

  return {
    render(state: PotentialGraphState): void {
      snapshot = state;
      stage.ensureSized();
      paint(state);
    },
    resize(): void {
      stage.resize();
      if (graph.canvas) graph.resize();
      if (snapshot) paint(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) paint(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) paint(snapshot);
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graph.attach(canvas);
      if (snapshot) paint(snapshot);
    },
    dispose(): void {
      if (stage.canvas) unbindPointer(stage.canvas);
      snapshot = null;
      graph.release();
      stage.release();
    }
  };
}
