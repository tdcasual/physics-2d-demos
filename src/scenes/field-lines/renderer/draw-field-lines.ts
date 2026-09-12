import type { FieldLinePath } from './types';
import { getFieldLineColors, type FieldLineColors } from './colors';

export type DrawFieldLinesOptions = {
  strokeAlpha?: number;
  showTicks?: boolean;
};

/**
 * 绘制连续电场线
 */
export function drawFieldLines(
  ctx: CanvasRenderingContext2D,
  paths: FieldLinePath[],
  responsiveScale: number,
  isDark: boolean,
  options: DrawFieldLinesOptions = {}
): void {
  if (paths.length === 0) return;
  const strokeAlpha = options.strokeAlpha ?? 1;
  const showTicks = options.showTicks ?? true;
  if (strokeAlpha <= 0.01) return;

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
  ctx.globalAlpha = strokeAlpha;

  for (const path of paths) {
    drawSingleFieldLine(
      ctx,
      path,
      maxField,
      responsiveScale,
      colors,
      showTicks
    );
  }

  ctx.restore();
}

function drawSingleFieldLine(
  ctx: CanvasRenderingContext2D,
  path: FieldLinePath,
  maxField: number,
  responsiveScale: number,
  colors: FieldLineColors,
  showTicks: boolean
): void {
  const { points, fieldMagnitudes } = path;
  if (points.length < 2) return;

  // 全部电场线同一颜色：叠加后是一个场，不是正/负两套线
  const baseColor = colors.fieldLineWarm.base;

  // 电场线带微妙的外发光效果
  ctx.shadowBlur = Math.round(6 * responsiveScale);
  ctx.shadowColor = `rgba(${baseColor}, 0.25)`;

  // 分段绘制，每段根据局部场强调整线宽和透明度
  const minWidth = Math.max(1, 1.4 * responsiveScale);
  const maxWidth = Math.max(1.6, 2.2 * responsiveScale);

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const fieldRatio = maxField > 0 ? (fieldMagnitudes[i] || 0) / maxField : 0;

    // 电场线以条数/间距表示 |E|，线宽只做轻微变化，避免远场淡到看不见
    const width = minWidth + (maxWidth - minWidth) * Math.min(1, fieldRatio);
    const alpha = 0.62 + Math.min(0.3, fieldRatio * 0.4);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = `rgba(${baseColor}, ${alpha.toFixed(3)})`;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  if (showTicks) {
    drawArrowAtEnd(ctx, points, responsiveScale, baseColor);
  }
}

/**
 * 在电场线末端（靠近吸收电荷的一端）绘制小箭头
 */
function drawArrowAtEnd(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
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
