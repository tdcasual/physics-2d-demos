import type { ElectrificationSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawConductor, drawChargedSphere, drawGround } from './draw-objects';
import { drawNetCharges } from './draw-charges';
import { drawFieldLinesFromPoint, drawFieldLinesBetween } from './draw-field-lines';
import { drawStepIndicator } from './draw-step-indicator';

/**
 * 感应起电：3 个步骤
 */
export function drawInduction(
  context: DrawContext,
  snapshot: ElectrificationSnapshot
): void {
  const { ctx, width, height, theme, responsiveScale } = context;
  const { state } = snapshot;
  const isDark = theme === 'dark';
  const s = responsiveScale;

  const cx = width * 0.5;
  const cy = height * 0.4;
  const gap = Math.max(100, 160 * s);

  const leftX = cx - gap * 0.5;   // 导体
  const rightX = cx + gap * 0.5;  // 外部带电体
  const objY = cy;

  const conductorR = Math.max(40, 60 * s);
  const sphereR = Math.max(30, 45 * s);

  // 外部带电体（始终存在，step 2 时淡出/移远）
  const externalX = state.stepIndex >= 2 ? rightX + 80 * s : rightX;
  const externalAlpha = state.stepIndex >= 2 ? 0.3 : 1;

  if (externalAlpha > 0.1) {
    ctx.save();
    ctx.globalAlpha = externalAlpha;
    drawChargedSphere(ctx, externalX, objY, sphereR, 2, isDark);
    drawFieldLinesFromPoint(ctx, externalX, objY, 2, sphereR * 2, isDark);
    ctx.restore();
  }

  // 导体
  drawConductor(ctx, leftX, objY, conductorR, isDark);

  // 电荷分离可视化（step 0 和 step 1）
  if (state.stepIndex <= 1) {
    // 左侧（远离带电体）积累正电荷（被排斥）
    drawSeparationCharges(ctx, leftX, objY, conductorR, 1, isDark);
    // 右侧（靠近带电体）积累负电荷（被吸引）
    drawSeparationCharges(ctx, leftX, objY, conductorR, -1, isDark);
  }

  // 净电荷（step 1+）
  if (state.stepIndex >= 1) {
    drawNetCharges(ctx, leftX, objY, state.leftCharge, conductorR * 0.4, isDark);
  }

  // 接地符号（step 1）
  if (state.stepIndex === 1) {
    drawGround(ctx, leftX, objY + conductorR + 5, Math.max(20, 30 * s), isDark);

    // 接地导走正电荷的箭头
    ctx.save();
    ctx.strokeStyle = isDark
      ? 'rgba(250,204,21,0.6)'
      : 'rgba(202,138,4,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(leftX + conductorR * 0.6, objY + conductorR * 0.3);
    ctx.lineTo(leftX + conductorR * 0.6, objY + conductorR + 5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 电场线
  if (state.stepIndex < 2) {
    drawFieldLinesBetween(ctx, leftX, objY, state.leftCharge, externalX, objY, 2, isDark);
  }
  if (state.stepIndex >= 2) {
    drawFieldLinesFromPoint(ctx, leftX, objY, state.leftCharge, conductorR * 2.2, isDark);
  }

  // 标签
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.font = `600 ${Math.max(11, Math.round(14 * s))}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('导体', leftX, objY + conductorR + 12);
  if (externalAlpha > 0.3) {
    ctx.fillText('带电体', externalX, objY + sphereR + 12);
  }

  // 步骤说明文字
  const infoY = height * 0.72;
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.6)' : 'rgba(71,85,105,0.6)';
  ctx.font = `${Math.max(11, Math.round(13 * s))}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const explanations = [
    '带电体靠近 → 导体内部电荷分离',
    '接地导走同号电荷 → 保留异号电荷',
    '移除带电体和接地 → 导体带净电荷'
  ];
  ctx.fillText(explanations[state.stepIndex] || '', cx, infoY);

  // 步骤指示器
  drawStepIndicator(ctx, width, height, state.stepIndex, 3,
    ['靠近', '接地', '移除'], isDark, s);
}

/** 绘制电荷分离效果（在导体边缘聚集） */
function drawSeparationCharges(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  side: number, // -1 = 左侧(负), 1 = 右侧(正)
  isDark: boolean
): void {
  const count = 5;
  const isPositive = side > 0;
  const color = isPositive
    ? isDark ? 'rgba(239,68,68,0.7)' : 'rgba(220,50,50,0.6)'
    : isDark ? 'rgba(59,130,246,0.7)' : 'rgba(40,100,220,0.6)';

  ctx.save();

  for (let i = 0; i < count; i++) {
    const angleBase = side > 0 ? 0 : Math.PI;
    const angle = angleBase + (i - count * 0.5) * 0.25;
    const dist = r * 0.75;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.6;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();

    // 符号
    ctx.fillStyle = 'white';
    ctx.font = 'bold 5px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isPositive ? '+' : '−', px, py + 0.5);
  }

  ctx.restore();
}
