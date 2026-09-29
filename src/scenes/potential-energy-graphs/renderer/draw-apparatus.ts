import {
  potentialAt,
  potentialGraphConstants as C,
  type PotentialGraphState
} from '../scene.sim';
import {
  apparatusXToPx,
  arrow,
  axisLayout,
  scenarioTitle,
  text,
  type AxisLayout,
  type Palette
} from './draw-helpers';

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

export function drawApparatus(
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
