import type { MultimeterState } from '../scene.sim';
import { rounded, text, type Palette } from './draw-helpers';

function drawArcScale(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const cx = 380 * scale;
  const cy = 270 * scale;
  const radius = 194 * scale;
  const start = Math.PI * 1.15;
  const end = Math.PI * 1.85;
  const arcs: Array<[number, string, number]> = [
    [radius, p.teal, 1],
    [radius - 20 * scale, p.blue, 1],
    [radius - 39 * scale, p.red, 1]
  ];
  arcs.forEach(([r, color, width]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * scale * width;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
  });
  const labels = ['∞', '200', '100', '50', '20', '10', '5', '0'];
  labels.forEach((label, index) => {
    const f = index / (labels.length - 1);
    const angle = start + f * (end - start);
    const x = cx + Math.cos(angle) * (radius - 13 * scale);
    const y = cy + Math.sin(angle) * (radius - 13 * scale);
    text(ctx, label, x, y, p.teal, 12 * scale, 'center', 700);
  });
  for (let index = 0; index <= 20; index += 1) {
    const f = index / 20;
    const angle = start + f * (end - start);
    const inner = radius - (index % 5 === 0 ? 18 : 12) * scale;
    const outer = radius + 2 * scale;
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = (index % 5 === 0 ? 2 : 1) * scale;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }
  text(
    ctx,
    '欧姆 (Ω)',
    54 * scale,
    148 * scale,
    p.teal,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '直流/交流\n伏·毫安',
    54 * scale,
    185 * scale,
    p.blue,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '交流 2.5V',
    54 * scale,
    218 * scale,
    p.red,
    13 * scale,
    'left',
    700
  );
}

export function drawMeterFace(
  ctx: CanvasRenderingContext2D,
  state: MultimeterState,
  p: Palette,
  scale: number
): void {
  rounded(
    ctx,
    36 * scale,
    20 * scale,
    714 * scale,
    290 * scale,
    16 * scale,
    p.face,
    '#4c5560',
    4 * scale
  );
  text(
    ctx,
    'J0411 型多用电表',
    392 * scale,
    42 * scale,
    '#334154',
    16 * scale,
    'center',
    700
  );
  drawArcScale(ctx, p, scale);
  const cx = 380 * scale;
  const cy = 270 * scale;
  const pointerLength = 198 * scale;
  const tipX = cx + Math.cos(state.pointerAngle) * pointerLength;
  const tipY = cy + Math.sin(state.pointerAngle) * pointerLength;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.fillStyle = '#364253';
  ctx.strokeStyle = '#aeb9c7';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, 13 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '指针指示刻度',
    cx,
    306 * scale,
    p.muted,
    11 * scale,
    'center',
    600
  );
}

export function drawSelector(
  ctx: CanvasRenderingContext2D,
  state: MultimeterState,
  p: Palette,
  scale: number
): void {
  const cx = 375 * scale;
  const cy = 480 * scale;
  const radius = 128 * scale;
  const segments: Array<[number, number, string]> = [
    [Math.PI * 1.12, Math.PI * 1.42, p.purple],
    [Math.PI * 1.42, Math.PI * 1.72, p.teal],
    [Math.PI * 1.72, Math.PI * 2.02, p.gold],
    [Math.PI * 2.02, Math.PI * 2.32, p.blue],
    [Math.PI * 2.32, Math.PI * 2.65, p.red]
  ];
  segments.forEach(([start, end, color]) => {
    ctx.fillStyle = `${color}aa`;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fill();
  });
  ctx.strokeStyle = '#3b4653';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  const labels = [
    ['Ω×1', 1.27, p.teal],
    ['×10', 1.55, p.teal],
    ['×100', 1.82, p.teal],
    ['×1k', 2.1, p.purple],
    ['V−500', 2.39, p.red],
    ['V−2.5', 2.58, p.blue],
    ['10', 2.87, p.blue],
    ['50', 3.11, p.blue]
  ] as Array<[string, number, string]>;
  labels.forEach(([label, angle, color]) =>
    text(
      ctx,
      label,
      cx + Math.cos(angle) * 93 * scale,
      cy + Math.sin(angle) * 93 * scale,
      color,
      12 * scale,
      'center',
      700
    )
  );
  ctx.fillStyle = '#141a22';
  ctx.strokeStyle = '#64758a';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, 53 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const knobAngle =
    state.mode === 'voltage'
      ? Math.PI * 2.82
      : state.mode === 'diode'
        ? Math.PI * 1.48
        : Math.PI * 1.78;
  ctx.strokeStyle = '#f4f7fb';
  ctx.lineWidth = 7 * scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12 * scale);
  ctx.lineTo(cx, cy - 43 * scale);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(knobAngle);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(0, -18 * scale);
  ctx.lineTo(0, -42 * scale);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#0f1520';
  ctx.beginPath();
  ctx.arc(cx, cy, 14 * scale, 0, Math.PI * 2);
  ctx.fill();
  const zeroX = 610 * scale;
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#55657a';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(zeroX, cy - 20 * scale, 33 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#93a5ba';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(zeroX - 20 * scale, cy - 20 * scale);
  ctx.lineTo(zeroX + 20 * scale, cy - 20 * scale);
  ctx.stroke();
  text(
    ctx,
    '欧姆调零旋钮',
    zeroX,
    cy + 48 * scale,
    p.teal,
    12 * scale,
    'center',
    600
  );
}
