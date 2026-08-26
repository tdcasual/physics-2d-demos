import type { PixelCharge } from './types';

/**
 * 绘制电场强度热力图背景
 */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  charges: PixelCharge[],
  width: number,
  height: number,
  responsiveScale: number,
  isDark: boolean
): void {
  // 根据画布尺寸和响应式缩放确定网格分辨率
  const baseGridSize = Math.max(
    15,
    Math.min(35, Math.round(25 * responsiveScale))
  );
  const cellW = width / baseGridSize;
  const cellH = height / baseGridSize;
  const cols = Math.ceil(width / cellW);
  const rows = Math.ceil(height / cellH);

  // 预计算最大场强用于归一化
  let maxField = 0;
  const fieldValues: number[][] = [];

  for (let row = 0; row < rows; row++) {
    fieldValues[row] = [];
    for (let col = 0; col < cols; col++) {
      const px = (col + 0.5) * cellW;
      const py = (row + 0.5) * cellH;
      const field = getFieldMagnitudeAt(px, py, charges);
      fieldValues[row][col] = field;
      maxField = Math.max(maxField, field);
    }
  }

  // 绘制热力图色块
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = col * cellW;
      const py = row * cellH;
      const field = fieldValues[row][col];
      const intensity = Math.min(1, field / (maxField * 0.3 + 0.01));

      if (intensity < 0.03) continue;

      const color = getHeatmapColor(intensity, isDark);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, cellW + 1, cellH + 1);
    }
  }
}

function getFieldMagnitudeAt(
  px: number,
  py: number,
  charges: PixelCharge[]
): number {
  let Ex = 0;
  let Ey = 0;
  for (const charge of charges) {
    const dx = px - charge.x;
    const dy = py - charge.y;
    const rSquared = Math.max(
      charge.radius * charge.radius * 0.5,
      dx * dx + dy * dy
    );
    const r = Math.sqrt(rSquared);
    const magnitude = charge.q / rSquared;
    Ex += magnitude * (dx / r);
    Ey += magnitude * (dy / r);
  }
  return Math.hypot(Ex, Ey);
}

/**
 * 根据场强强度生成颜色
 * 低强度：接近透明
 * 中强度：暖色（正电荷主导）或冷色（负电荷主导）
 * 高强度：更饱和
 */
function getHeatmapColor(intensity: number, isDark: boolean): string {
  // intensity: 0~1
  // 使用非线性映射让低强度区域更 subtle
  const t = Math.pow(intensity, 0.7);

  if (isDark) {
    // Dark 主题：暖色偏橙红，冷色偏青蓝
    // 使用 HSL 色环上的渐变：橙(30°) → 红(0°) → 紫(280°) → 青(180°)
    // 简化：暖色调 rgba(255, 140, 60) → 冷色调 rgba(60, 180, 255)
    const r = Math.round(30 + 180 * t);
    const g = Math.round(60 + 100 * (1 - t));
    const b = Math.round(100 + 155 * (1 - t * 0.5));
    const alpha = 0.04 + t * 0.08;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  } else {
    // Light 主题：更淡雅的色调
    const r = Math.round(255 - 80 * (1 - t));
    const g = Math.round(180 - 60 * t);
    const b = Math.round(120 + 80 * (1 - t));
    const alpha = 0.03 + t * 0.06;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }
}
