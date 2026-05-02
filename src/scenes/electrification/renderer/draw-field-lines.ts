/**
 * 电场线绘制
 */

/** 从带电体绘制电场线 */
export function drawFieldLinesFromPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  charge: number,
  lineLength: number,
  isDark: boolean,
  s: number
): void {
  const absQ = Math.abs(charge);
  if (absQ === 0) return;

  const isPositive = charge > 0;
  const lineCount = Math.min(12, Math.max(3, absQ * 3));
  const color = isPositive
    ? isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)'
    : isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.25)';
  const arrowColor = isPositive
    ? isDark ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.4)'
    : isDark ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.4)';

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.5, 1 * s);
  ctx.lineCap = 'round';

  const startOffset = Math.max(4, 8 * s);

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2;
    const dir = isPositive ? 1 : -1;

    const startX = x + Math.cos(angle) * startOffset;
    const startY = y + Math.sin(angle) * startOffset;
    const endX = x + Math.cos(angle) * lineLength * dir;
    const endY = y + Math.sin(angle) * lineLength * dir;

    // 电场线
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // 箭头（在末端）
    const arrowAngle = Math.atan2(endY - startY, endX - startX);
    const arrowLen = Math.max(4, 6 * s);
    const arrowSpread = Math.PI / 6;

    ctx.strokeStyle = arrowColor;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLen * Math.cos(arrowAngle - arrowSpread),
      endY - arrowLen * Math.sin(arrowAngle - arrowSpread)
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLen * Math.cos(arrowAngle + arrowSpread),
      endY - arrowLen * Math.sin(arrowAngle + arrowSpread)
    );
    ctx.stroke();
    ctx.strokeStyle = color;
  }

  ctx.restore();
}

/** 在两个带电体之间绘制连接电场线 */
export function drawFieldLinesBetween(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  q1: number,
  x2: number,
  y2: number,
  q2: number,
  isDark: boolean,
  s: number
): void {
  // 异号电荷之间绘制弧线连接
  if (q1 * q2 >= 0) return;

  const midX = (x1 + x2) * 0.5;
  const midY = (y1 + y2) * 0.5;
  const dist = Math.hypot(x2 - x1, y2 - y1);

  ctx.save();
  ctx.strokeStyle = isDark
    ? 'rgba(148,163,184,0.15)'
    : 'rgba(71,85,105,0.12)';
  ctx.lineWidth = Math.max(0.3, 0.5 * s);
  ctx.setLineDash([4 * s, 4 * s]);

  // 绘制几条弧线
  for (let i = -1; i <= 1; i++) {
    const offset = i * dist * 0.15;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(midX, midY + offset, x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}
