/**
 * 电荷粒子绘制
 */

/** 在物体表面/内部绘制净电荷粒子 */
export function drawNetCharges(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  charge: number,
  spreadRadius: number,
  isDark: boolean
): void {
  const absQ = Math.abs(charge);
  if (absQ === 0) {
    // 中性：各画 2 个正负粒子示意
    drawChargeParticle(ctx, centerX - 6, centerY, 1, isDark);
    drawChargeParticle(ctx, centerX + 6, centerY, -1, isDark);
    return;
  }

  const count = Math.min(12, Math.max(3, absQ * 3));
  const isPositive = charge > 0;

  // 在圆形区域内均匀分布
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.PI / count);
    const dist = spreadRadius * (0.4 + Math.random() * 0.4);
    const px = centerX + Math.cos(angle) * dist;
    const py = centerY + Math.sin(angle) * dist;
    drawChargeParticle(ctx, px, py, isPositive ? 1 : -1, isDark);
  }
}

/** 绘制单个电荷粒子 */
function drawChargeParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sign: number,
  isDark: boolean
): void {
  const isPositive = sign > 0;
  const r = 5;

  ctx.save();

  // 微弱 glow
  ctx.shadowBlur = 6;
  ctx.shadowColor = isPositive
    ? isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'
    : isDark ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.3)';

  // 主体
  ctx.fillStyle = isPositive
    ? isDark ? 'rgba(239,68,68,0.9)' : 'rgba(220,50,50,0.85)'
    : isDark ? 'rgba(59,130,246,0.9)' : 'rgba(40,100,220,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // 符号
  ctx.fillStyle = 'white';
  ctx.font = `bold 7px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isPositive ? '+' : '−', x, y + 0.5);

  ctx.restore();
}

/** 在矩形区域内绘制正负粒子对（用于原子级视图） */
export function drawAtomCharges(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  netCharge: number,
  isDark: boolean
): void {
  const baseCount = 4;
  const posCount = baseCount + Math.max(0, netCharge);
  const negCount = baseCount + Math.max(0, -netCharge);

  const cols = 3;
  const rows = Math.max(posCount, negCount);
  const spacingX = w / (cols + 1);
  const spacingY = h / (rows + 1);

  // 正电荷（左侧）
  for (let i = 0; i < posCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = x + spacingX * (col + 0.5);
    const py = y + spacingY * (row + 0.5);
    if (py < y + h - 5) {
      drawChargeParticle(ctx, px, py, 1, isDark);
    }
  }

  // 负电荷（右侧）
  for (let i = 0; i < negCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = x + w - spacingX * (col + 0.5);
    const py = y + spacingY * (row + 0.5);
    if (py < y + h - 5) {
      drawChargeParticle(ctx, px, py, -1, isDark);
    }
  }
}

/** 绘制电荷转移箭头 */
export function drawTransferArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  isDark: boolean
): void {
  ctx.save();
  ctx.strokeStyle = isDark
    ? 'rgba(250,204,21,0.7)'
    : 'rgba(202,138,4,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // 箭头
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLen = 10;
  const arrowAngle = Math.PI / 6;

  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - arrowLen * Math.cos(angle - arrowAngle),
    toY - arrowLen * Math.sin(angle - arrowAngle)
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - arrowLen * Math.cos(angle + arrowAngle),
    toY - arrowLen * Math.sin(angle + arrowAngle)
  );
  ctx.stroke();

  // 标签
  ctx.fillStyle = isDark
    ? 'rgba(250,204,21,0.9)'
    : 'rgba(202,138,4,0.9)';
  ctx.font = 'bold 11px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const midX = (fromX + toX) * 0.5;
  const midY = (fromY + toY) * 0.5 - 10;
  ctx.fillText('e⁻ 转移', midX, midY);

  ctx.restore();
}
