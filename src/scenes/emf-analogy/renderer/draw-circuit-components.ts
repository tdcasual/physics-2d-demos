import type { CircuitColors } from './circuit-colors';

/** 电池符号 (长线正极 + 短线负极) */
export function drawBattery(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: CircuitColors
): void {
  const longW = size * 0.7;
  const shortW = size * 0.35;
  const gap = size * 0.12;

  ctx.strokeStyle = colors.component;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = 'round';

  // 正极（长线）
  ctx.beginPath();
  ctx.moveTo(x - longW / 2, y - gap);
  ctx.lineTo(x + longW / 2, y - gap);
  ctx.stroke();

  // 负极（短线）
  ctx.beginPath();
  ctx.moveTo(x - shortW / 2, y + gap);
  ctx.lineTo(x + shortW / 2, y + gap);
  ctx.stroke();

  // 引线
  ctx.lineWidth = Math.max(1.5, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.6);
  ctx.lineTo(x, y - gap);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + gap);
  ctx.lineTo(x, y + size * 0.6);
  ctx.stroke();

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, size * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('E', x + longW / 2 + size * 0.15, y - gap);
}

/** 电阻符号 (锯齿矩形) */
export function drawResistor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: CircuitColors,
  label: string
): void {
  const zigzagH = h * 0.35;
  const zigzagCount = 8;
  const step = w / zigzagCount;

  ctx.strokeStyle = colors.component;
  ctx.lineWidth = Math.max(2, h * 0.06);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= zigzagCount; i++) {
    const px = x + i * step;
    const py = y + (i % 2 === 0 ? 0 : zigzagH);
    ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 引线
  ctx.lineWidth = Math.max(1.5, h * 0.04);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - zigzagH * 0.3);
  ctx.lineTo(x + w / 2, y - h * 0.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + zigzagH * 0.3);
  ctx.lineTo(x + w / 2, y + h * 0.45);
  ctx.stroke();

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, h * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x + w / 2, y + h * 0.5);
}

/** 开关符号 */
export function drawSwitch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isOn: boolean,
  colors: CircuitColors
): void {
  const gap = size * 0.08;

  ctx.strokeStyle = colors.component;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.lineCap = 'round';

  // 左触点
  ctx.beginPath();
  ctx.moveTo(x - size * 0.35, y);
  ctx.lineTo(x - gap, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - gap, y, size * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = colors.component;
  ctx.fill();

  // 右触点
  ctx.beginPath();
  ctx.moveTo(x + gap, y);
  ctx.lineTo(x + size * 0.35, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + gap, y, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // 闸刀
  ctx.beginPath();
  ctx.moveTo(x - gap, y);
  if (isOn) {
    ctx.lineTo(x + gap, y);
    ctx.strokeStyle = colors.accent;
  } else {
    ctx.lineTo(x + gap, y - size * 0.35);
    ctx.strokeStyle = colors.danger;
  }
  ctx.stroke();

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, size * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(isOn ? 'S (闭合)' : 'S (断开)', x, y + size * 0.25);
}

/** 电表（圆形表盘 + 指针） */
export function drawMeter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  value: number,
  maxValue: number,
  label: string,
  unit: string,
  colors: CircuitColors
): void {
  // 表盘背景
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = colors.componentFill;
  ctx.fill();
  ctx.strokeStyle = colors.component;
  ctx.lineWidth = Math.max(1.5, radius * 0.06);
  ctx.stroke();

  // 刻度弧
  ctx.strokeStyle = colors.textSecondary;
  ctx.lineWidth = Math.max(1, radius * 0.03);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  // 指针
  const ratio = Math.min(1, Math.max(0, value / maxValue));
  const angle = Math.PI * (0.75 + ratio * 1.5);
  const nx = cx + Math.cos(angle) * radius * 0.65;
  const ny = cy + Math.sin(angle) * radius * 0.65;

  ctx.strokeStyle = colors.danger;
  ctx.lineWidth = Math.max(2, radius * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.stroke();

  // 中心点
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = colors.component;
  ctx.fill();

  // 数值
  ctx.fillStyle = colors.text;
  ctx.font = `700 ${Math.max(10, radius * 0.28)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value.toFixed(2), cx, cy + radius * 0.15);

  // 单位标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `500 ${Math.max(8, radius * 0.18)}px sans-serif`;
  ctx.fillText(`${label} (${unit})`, cx, cy + radius * 0.42);
}
