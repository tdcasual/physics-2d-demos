/**
 * 电荷粒子绘制
 */

// Pre-computed random offsets to avoid per-frame jitter
const RANDOM_CACHE_SIZE = 32;
const randomDistCache: number[] = Array.from(
  { length: RANDOM_CACHE_SIZE },
  () => 0.4 + Math.random() * 0.4
);

/** 在物体表面/内部绘制净电荷粒子 */
export function drawNetCharges(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  charge: number,
  spreadRadius: number,
  isDark: boolean,
  s: number
): void {
  const absQ = Math.abs(charge);
  if (absQ === 0) {
    const offset = Math.max(3, 6 * s);
    drawChargeParticle(ctx, centerX - offset, centerY, 1, isDark, s);
    drawChargeParticle(ctx, centerX + offset, centerY, -1, isDark, s);
    return;
  }

  const count = Math.min(12, Math.max(3, absQ * 3));
  const isPositive = charge > 0;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.PI / count);
    const dist = spreadRadius * randomDistCache[i % RANDOM_CACHE_SIZE];
    const px = centerX + Math.cos(angle) * dist;
    const py = centerY + Math.sin(angle) * dist;
    drawChargeParticle(ctx, px, py, isPositive ? 1 : -1, isDark, s);
  }
}

/** 绘制单个电荷粒子 */
function drawChargeParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sign: number,
  isDark: boolean,
  s: number
): void {
  const isPositive = sign > 0;
  const r = Math.max(3, 5 * s);

  ctx.save();

  // 微弱 glow
  ctx.shadowBlur = 6 * s;
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
  ctx.font = `bold ${Math.max(6, Math.round(7 * s))}px Arial, sans-serif`;
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
  isDark: boolean,
  s: number
): void {
  const baseCount = 4;
  const posCount = baseCount + Math.max(0, netCharge);
  const negCount = baseCount + Math.max(0, -netCharge);

  const cols = 3;
  const rows = Math.max(posCount, negCount);
  const spacingX = w / (cols + 1);
  const spacingY = h / (rows + 1);

  const margin = 5 * s;

  // 正电荷（左侧）
  for (let i = 0; i < posCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = x + spacingX * (col + 0.5);
    const py = y + spacingY * (row + 0.5);
    if (py < y + h - margin) {
      drawChargeParticle(ctx, px, py, 1, isDark, s);
    }
  }

  // 负电荷（右侧）
  for (let i = 0; i < negCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = x + w - spacingX * (col + 0.5);
    const py = y + spacingY * (row + 0.5);
    if (py < y + h - margin) {
      drawChargeParticle(ctx, px, py, -1, isDark, s);
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
  isDark: boolean,
  s: number
): void {
  ctx.save();
  ctx.strokeStyle = isDark
    ? 'rgba(250,204,21,0.7)'
    : 'rgba(202,138,4,0.7)';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.setLineDash([6 * s, 4 * s]);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // 箭头
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLen = Math.max(6, 10 * s);
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
  ctx.font = `bold ${Math.max(9, Math.round(11 * s))}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const midX = (fromX + toX) * 0.5;
  const midY = (fromY + toY) * 0.5 - 10 * s;
  ctx.fillText('e⁻ 转移', midX, midY);

  ctx.restore();
}
