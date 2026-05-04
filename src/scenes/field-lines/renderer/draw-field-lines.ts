import type { FieldLinePath } from './types';
import { getFieldLineColors, type FieldLineColors } from './colors';

/**
 * 绘制连续电场线
 */
export function drawFieldLines(
  ctx: CanvasRenderingContext2D,
  paths: FieldLinePath[],
  responsiveScale: number,
  isDark: boolean
): void {
  if (paths.length === 0) return;

  let maxField = 0;
  for (const path of paths) {
    for (const mag of path.fieldMagnitudes) {
      maxField = Math.max(maxField, mag);
    }
  }

  const colors = getFieldLineColors(isDark);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const path of paths) {
    drawSingleFieldLine(ctx, path, maxField, responsiveScale, colors);
  }

  ctx.restore();
}

function drawSingleFieldLine(
  ctx: CanvasRenderingContext2D,
  path: FieldLinePath,
  maxField: number,
  responsiveScale: number,
  colors: FieldLineColors
): void {
  const { points, fieldMagnitudes, direction } = path;
  if (points.length < 2) return;

  const isPositiveFlow = direction === 1;
  const baseColor = isPositiveFlow
    ? colors.fieldLineWarm.base
    : colors.fieldLineCool.base;

  // 电场线带微妙的外发光效果
  ctx.shadowBlur = Math.round(6 * responsiveScale);
  ctx.shadowColor = `rgba(${baseColor}, 0.25)`;

  // 分段绘制，每段根据局部场强调整线宽和透明度
  const minWidth = Math.max(0.5, 0.8 * responsiveScale);
  const maxWidth = Math.max(1.5, 2.2 * responsiveScale);

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const fieldRatio = maxField > 0 ? (fieldMagnitudes[i] || 0) / maxField : 0;

    // 线宽：场强越大线越粗
    const width = minWidth + (maxWidth - minWidth) * Math.min(1, fieldRatio * 2);
    // 透明度：场强越大越不透明
    const alpha = 0.35 + Math.min(0.45, fieldRatio * 0.8);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = `rgba(${baseColor}, ${alpha.toFixed(3)})`;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  // 在电场线末端绘制方向箭头
  drawArrowAtEnd(ctx, points, direction, responsiveScale, baseColor);
}

/**
 * 在电场线末端（靠近吸收电荷的一端）绘制小箭头
 */
function drawArrowAtEnd(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  direction: 1 | -1,
  responsiveScale: number,
  color: string
): void {
  if (points.length < 4) return;

  // 在电场线后 1/3 段每隔一定距离画小箭头
  const startIdx = Math.floor(points.length * 0.6);
  const arrowSpacing = Math.max(8, Math.round(20 * responsiveScale));

  let distanceSinceArrow = 0;

  for (let i = startIdx; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    distanceSinceArrow += Math.hypot(p2.x - p1.x, p2.y - p1.y);

    if (distanceSinceArrow >= arrowSpacing) {
      distanceSinceArrow = 0;

      // 计算该点处的切线方向
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx);

      drawSmallArrow(ctx, p1.x, p1.y, angle, responsiveScale, color);
    }
  }
}

function drawSmallArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  responsiveScale: number,
  color: string
): void {
  const arrowLen = Math.max(4, 7 * responsiveScale);
  const arrowW = Math.max(2.5, 4 * responsiveScale);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(arrowLen, 0);
  ctx.lineTo(arrowLen - arrowW, -arrowW * 0.5);
  ctx.lineTo(arrowLen - arrowW, arrowW * 0.5);
  ctx.closePath();
  ctx.fillStyle = `rgba(${color}, 0.7)`;
  ctx.fill();

  ctx.restore();
}
