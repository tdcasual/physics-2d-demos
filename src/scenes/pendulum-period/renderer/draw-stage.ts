import { pendulumConstants, type PendulumState } from '../scene.sim';
import { arrow, roundedCard, text, type Palette } from './draw-helpers';

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const fieldW = pendulumConstants.fieldWidth * scale;
  const height = pendulumConstants.baseHeight * scale;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, fieldW, height);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = scale;
  for (let x = 0; x <= fieldW; x += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(fieldW, y);
    ctx.stroke();
  }
}

export function drawRuler(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const x = 120 * scale;
  const top = pendulumConstants.rulerTop * scale;
  const bottom = pendulumConstants.rulerBottom * scale;
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.roundRect(x, top, 48 * scale, bottom - top, 5 * scale);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '刻度尺 (cm)',
    x - 24 * scale,
    top - 22 * scale,
    p.muted,
    14 * scale,
    'left',
    600
  );
  for (let cm = 0; cm <= 150; cm += 10) {
    const y = top + (cm / 150) * (bottom - top);
    const tick = cm % 20 === 0 ? 22 : 13;
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tick * scale, y);
    ctx.stroke();
    if (cm % 20 === 0)
      text(ctx, `${cm}`, x + 32 * scale, y, p.muted, 12 * scale, 'left', 500);
  }
}

export function drawStand(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const pivotX = pendulumConstants.pivotX * scale;
  const pivotY = pendulumConstants.pivotY * scale;
  ctx.fillStyle = '#59636e';
  ctx.fillRect(318 * scale, 142 * scale, 28 * scale, 535 * scale);
  ctx.fillRect(318 * scale, 110 * scale, 610 * scale, 28 * scale);
  ctx.fillStyle = '#454d57';
  ctx.fillRect(
    pivotX - 24 * scale,
    pivotY - 10 * scale,
    48 * scale,
    22 * scale
  );
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.5 * scale;
  ctx.setLineDash([5 * scale, 7 * scale]);
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY + 5 * scale);
  ctx.lineTo(pivotX, 600 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '平衡位置 (O)',
    pivotX - 96 * scale,
    404 * scale,
    p.muted,
    13 * scale,
    'left',
    500
  );
}

export function drawPendulum(
  ctx: CanvasRenderingContext2D,
  state: PendulumState,
  p: Palette,
  scale: number
): void {
  const pivotX = pendulumConstants.pivotX * scale;
  const pivotY = pendulumConstants.pivotY * scale;
  // Keep the full bob, sensor and force vectors inside the fixed teaching
  // canvas while preserving the calibrated default length appearance.
  const length =
    Math.min(state.length * pendulumConstants.lengthPixelsPerMeter, 500) *
    scale;
  const theta = state.angleRad;
  const bobX = pivotX + Math.sin(theta) * length;
  const bobY = pivotY + Math.cos(theta) * length;
  const bottomY = pivotY + length;

  ctx.strokeStyle = '#c7ced6';
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([4 * scale, 6 * scale]);
  ctx.beginPath();
  const smallAngle = Math.PI / 36;
  ctx.arc(
    pivotX,
    pivotY,
    length,
    Math.PI / 2 - smallAngle,
    Math.PI / 2 + smallAngle
  );
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '-5°',
    pivotX - 74 * scale,
    pivotY + length * 0.68,
    p.teal,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    '+5°',
    pivotX + 44 * scale,
    pivotY + length * 0.68,
    p.teal,
    13 * scale,
    'left',
    600
  );

  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();
  ctx.fillStyle = '#4d5965';
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(bobX, bobY, pendulumConstants.bobRadius * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(bobX + 3 * scale, bobY - 4 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.fill();

  const beamX = pivotX;
  ctx.strokeStyle = `${p.teal}88`;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(634 * scale, bottomY);
  ctx.lineTo(726 * scale, bottomY);
  ctx.stroke();
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(beamX, bottomY, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(642 * scale, bottomY + 2 * scale);
  ctx.lineTo(642 * scale, bottomY + 29 * scale);
  ctx.lineTo(624 * scale, bottomY + 29 * scale);
  ctx.moveTo(718 * scale, bottomY + 2 * scale);
  ctx.lineTo(718 * scale, bottomY + 29 * scale);
  ctx.lineTo(736 * scale, bottomY + 29 * scale);
  ctx.stroke();
  text(
    ctx,
    '光电门（最低点）',
    700 * scale,
    bottomY + 34 * scale,
    p.ink,
    13 * scale,
    'left',
    600
  );

  if (state.showForces) {
    arrow(
      ctx,
      bobX,
      bobY,
      -Math.sin(theta) * 72 * scale,
      -Math.cos(theta) * 72 * scale,
      p.blue,
      4 * scale
    );
    text(
      ctx,
      'F_T',
      bobX - Math.sin(theta) * 80 * scale - 3 * scale,
      bobY - Math.cos(theta) * 80 * scale,
      p.blue,
      14 * scale,
      'center',
      700
    );
    arrow(ctx, bobX, bobY, 0, 78 * scale, p.red, 4 * scale);
    text(
      ctx,
      'G=mg',
      bobX + 12 * scale,
      bobY + 88 * scale,
      p.red,
      13 * scale,
      'left',
      700
    );
  }
  if (state.showComponents) {
    const tangentX = Math.cos(theta) * state.tangentialGravity * 4.2 * scale;
    const tangentY = -Math.sin(theta) * state.tangentialGravity * 4.2 * scale;
    arrow(ctx, bobX, bobY, tangentX, tangentY, p.teal, 3 * scale);
    text(
      ctx,
      'Gₜ',
      bobX + tangentX + 10 * scale,
      bobY + tangentY,
      p.teal,
      12 * scale,
      'left',
      700
    );
    arrow(
      ctx,
      bobX,
      bobY,
      -Math.sin(theta) * 42 * scale,
      -Math.cos(theta) * 42 * scale,
      p.gold,
      2 * scale
    );
    text(
      ctx,
      'Gₙ',
      bobX - Math.sin(theta) * 50 * scale,
      bobY - Math.cos(theta) * 50 * scale,
      p.gold,
      12 * scale,
      'center',
      700
    );
  }
}

export function drawEnergyCard(
  ctx: CanvasRenderingContext2D,
  state: PendulumState,
  p: Palette,
  scale: number
): void {
  const x = 40 * scale;
  const y = 650 * scale;
  const width = 352 * scale;
  roundedCard(ctx, x, y, width, 102 * scale, p, p.panel);
  text(
    ctx,
    '机械能转化监控',
    x + 18 * scale,
    y + 23 * scale,
    p.ink,
    15 * scale,
    'left',
    700
  );
  const kineticRatio = Math.min(
    1,
    state.speed / Math.max(0.01, state.length * 1.2)
  );
  const potentialRatio = Math.min(
    1,
    Math.abs(1 - Math.cos(state.angleRad)) * 90
  );
  const rows: Array<[string, number, string, number]> = [
    ['动能 Eₖ', kineticRatio, p.red, 52],
    ['势能 Eₚ', potentialRatio, p.teal, 74],
    ['总能 E', 0.82, p.blue, 96]
  ];
  rows.forEach(([label, ratio, color, rowY]) => {
    text(
      ctx,
      label,
      x + 18 * scale,
      y + rowY * scale,
      p.muted,
      12 * scale,
      'left',
      600
    );
    ctx.fillStyle = p.soft;
    ctx.beginPath();
    ctx.roundRect(
      x + 92 * scale,
      y + (rowY - 7) * scale,
      206 * scale,
      14 * scale,
      7 * scale
    );
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(
      x + 92 * scale,
      y + (rowY - 7) * scale,
      206 * ratio * scale,
      14 * scale,
      7 * scale
    );
    ctx.fill();
  });
}
