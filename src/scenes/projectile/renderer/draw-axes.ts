import type { DrawContext } from './types';
import { getThemeColors } from '../../../core/colors';

export function drawAxes(
  context: DrawContext,
  originX: number,
  originY: number
): void {
  const { ctx, width, theme, responsiveScale, contentScale } = context;
  const colors = getThemeColors(theme);
  // 演示模式放大可读元素（线宽/字号/箭头），几何位置仍由坐标系统决定
  const s = responsiveScale * contentScale;

  const lineWidth = Math.max(1.5, 2 * s);
  const fontSize = Math.max(10, Math.round(12 * s));
  const labelOffset = Math.max(14, Math.round(20 * s));
  const arrowSize = Math.max(5, Math.round(8 * s));

  ctx.save();
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = lineWidth;

  // Y 轴
  ctx.beginPath();
  ctx.moveTo(originX, Math.max(10, 20 * s));
  ctx.lineTo(originX, originY);
  ctx.stroke();

  // X 轴
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(width - Math.max(10, 20 * s), originY);
  ctx.stroke();

  // 箭头
  ctx.fillStyle = colors.secondary;

  // X 轴箭头
  const xArrowX = width - Math.max(10, 20 * s);
  ctx.beginPath();
  ctx.moveTo(xArrowX, originY);
  ctx.lineTo(xArrowX - arrowSize, originY - arrowSize * 0.6);
  ctx.lineTo(xArrowX - arrowSize, originY + arrowSize * 0.6);
  ctx.fill();

  // Y 轴箭头
  const yArrowY = Math.max(10, 20 * s);
  ctx.beginPath();
  ctx.moveTo(originX, yArrowY);
  ctx.lineTo(originX - arrowSize * 0.6, yArrowY + arrowSize);
  ctx.lineTo(originX + arrowSize * 0.6, yArrowY + arrowSize);
  ctx.fill();

  // 标签
  ctx.font = `500 ${fontSize}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.fillText('x', xArrowX, originY + labelOffset);
  ctx.fillText('y', originX - labelOffset * 0.6, yArrowY + labelOffset * 0.4);

  ctx.restore();
}
