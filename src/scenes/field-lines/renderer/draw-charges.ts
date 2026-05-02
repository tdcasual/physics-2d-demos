import type { PixelCharge } from './types';

export function drawCharges(
  ctx: CanvasRenderingContext2D,
  charges: PixelCharge[],
  chargeFontPx: number,
  responsiveScale: number,
  isDark: boolean
): void {
  for (const charge of charges) {
    drawChargeBall(ctx, charge, chargeFontPx, responsiveScale, isDark);
  }
}

function drawChargeBall(
  ctx: CanvasRenderingContext2D,
  charge: PixelCharge,
  chargeFontPx: number,
  responsiveScale: number,
  isDark: boolean
): void {
  const { x, y, radius, q } = charge;
  const isPositive = q > 0;

  ctx.save();

  // 外发光（暗色背景下略微增强）
  const glowAlpha = isDark ? 0.4 : 0.3;
  const glowColor = isPositive
    ? `rgba(230, 81, 0, ${glowAlpha})`
    : `rgba(0, 150, 136, ${glowAlpha})`;
  ctx.shadowBlur = Math.round(20 * responsiveScale);
  ctx.shadowColor = glowColor;

  // 主体径向渐变
  const gradient = ctx.createRadialGradient(
    x - radius * 0.25,
    y - radius * 0.25,
    radius * 0.1,
    x,
    y,
    radius
  );

  if (isPositive) {
    gradient.addColorStop(0, '#FFF8E1');
    gradient.addColorStop(0.4, '#FFB74D');
    gradient.addColorStop(1, '#E65100');
  } else {
    gradient.addColorStop(0, '#E0F7FA');
    gradient.addColorStop(0.4, '#4DD0E1');
    gradient.addColorStop(1, '#006064');
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // 重置阴影，避免影响后续绘制
  ctx.shadowBlur = 0;

  // 边缘描边（更细更精致）
  ctx.strokeStyle = isPositive
    ? 'rgba(230, 81, 0, 0.6)'
    : 'rgba(0, 96, 100, 0.6)';
  ctx.lineWidth = Math.max(1, 1.5 * responsiveScale);
  ctx.stroke();

  // 高光
  const highlightRadius = radius * 0.22;
  const highlightGradient = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.3,
    0,
    x - radius * 0.3,
    y - radius * 0.3,
    highlightRadius
  );
  highlightGradient.addColorStop(0, 'rgba(255,255,255,0.7)');
  highlightGradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, highlightRadius, 0, Math.PI * 2);
  ctx.fillStyle = highlightGradient;
  ctx.fill();

  // 符号
  const fontSize = Math.max(12, Math.round(chargeFontPx * responsiveScale));
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px "Noto Sans SC", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 符号轻微阴影增强可读性
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 3;
  ctx.fillText(isPositive ? '+' : '−', x, y + 1);
  ctx.shadowBlur = 0;

  // 电量数值（小字号，位于电荷下方）
  const valueFontSize = Math.max(8, Math.round(fontSize * 0.55));
  ctx.font = `600 ${valueFontSize}px "Noto Sans SC", Arial, sans-serif`;
  ctx.fillStyle = isPositive
    ? 'rgba(230, 81, 0, 0.85)'
    : 'rgba(0, 150, 136, 0.85)';
  ctx.fillText(`${q > 0 ? '+' : ''}${q.toFixed(1)}`, x, y + radius + valueFontSize + 2);

  ctx.restore();
}
