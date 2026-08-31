import type { PixelCharge } from './types';
import { getFieldLineColors, type FieldLineColors } from './colors';

// 电荷球渐变只随（几何参数, 电荷符号, 主题）变化，按 key 复用避免
// 每电荷每帧重建（参考 emf-analogy/renderer/draw-pipe-system.ts 的
// Map 缓存模式）；电荷被拖拽时几何变化产生新 key，限制缓存规模防膨胀。
// CanvasGradient 与具体 canvas 上下文无关，可安全跨帧复用。
const gradientCache = new Map<string, CanvasGradient>();

function getCachedGradient(
  key: string,
  create: () => CanvasGradient
): CanvasGradient {
  let gradient = gradientCache.get(key);
  if (!gradient) {
    if (gradientCache.size > 64) gradientCache.clear();
    gradient = create();
    gradientCache.set(key, gradient);
  }
  return gradient;
}

export function drawCharges(
  ctx: CanvasRenderingContext2D,
  charges: PixelCharge[],
  chargeFontPx: number,
  responsiveScale: number,
  isDark: boolean
): void {
  const colors = getFieldLineColors(isDark);
  for (const charge of charges) {
    drawChargeBall(ctx, charge, chargeFontPx, responsiveScale, isDark, colors);
  }
}

function drawChargeBall(
  ctx: CanvasRenderingContext2D,
  charge: PixelCharge,
  chargeFontPx: number,
  responsiveScale: number,
  isDark: boolean,
  colors: FieldLineColors
): void {
  const { x, y, radius, q } = charge;
  const isPositive = q > 0;
  const palette = isPositive ? colors.positive : colors.negative;

  ctx.save();

  // 外发光
  ctx.shadowBlur = Math.round(20 * responsiveScale);
  ctx.shadowColor = palette.glow;

  // 主体径向渐变
  const gradient = getCachedGradient(
    `body|${x}|${y}|${radius}|${isPositive ? 1 : 0}|${isDark ? 1 : 0}`,
    () => {
      const g = ctx.createRadialGradient(
        x - radius * 0.25,
        y - radius * 0.25,
        radius * 0.1,
        x,
        y,
        radius
      );
      g.addColorStop(0, palette.light);
      g.addColorStop(0.4, palette.mid);
      g.addColorStop(1, palette.core);
      return g;
    }
  );

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowBlur = 0;

  // 边缘描边
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = Math.max(1, 1.5 * responsiveScale);
  ctx.stroke();

  // 高光
  const highlightRadius = radius * 0.22;
  const highlightGradient = getCachedGradient(`hl|${x}|${y}|${radius}`, () => {
    const g = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      0,
      x - radius * 0.3,
      y - radius * 0.3,
      highlightRadius
    );
    g.addColorStop(0, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    return g;
  });

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

  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 3;
  ctx.fillText(isPositive ? '+' : '−', x, y + 1);
  ctx.shadowBlur = 0;

  // 电量数值
  const valueFontSize = Math.max(8, Math.round(fontSize * 0.55));
  ctx.font = `600 ${valueFontSize}px "Noto Sans SC", Arial, sans-serif`;
  ctx.fillStyle = palette.text;
  ctx.fillText(
    `${q > 0 ? '+' : ''}${q.toFixed(1)}`,
    x,
    y + radius + valueFontSize + 2
  );

  ctx.restore();
}
