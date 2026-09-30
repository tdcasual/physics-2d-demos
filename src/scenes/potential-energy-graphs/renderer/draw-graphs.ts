import {
  axisTicks,
  graphBounds,
  potentialAt,
  potentialGraphConstants as C,
  type PotentialGraphState
} from '../scene.sim';
import {
  graphXToPx,
  rounded,
  text,
  yToPx,
  type Palette,
  type PlotBox
} from './draw-helpers';

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

export function drawGraphs(
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
