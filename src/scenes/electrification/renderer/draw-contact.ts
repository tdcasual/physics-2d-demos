import type { ElectrificationSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawConductor, drawChargedSphere } from './draw-objects';
import { drawNetCharges } from './draw-charges';
import { drawFieldLinesFromPoint, drawFieldLinesBetween } from './draw-field-lines';
import { drawStepIndicator } from './draw-step-indicator';

/**
 * 接触起电：2 个步骤
 */
export function drawContact(
  context: DrawContext,
  snapshot: ElectrificationSnapshot
): void {
  const { ctx, width, height, theme, responsiveScale } = context;
  const { state } = snapshot;
  const isDark = theme === 'dark';
  const s = responsiveScale;

  const cx = width * 0.5;
  const cy = height * 0.4;

  if (state.stepIndex === 0) {
    drawContactStep0(ctx, cx, cy, s, isDark, state);
  } else {
    drawContactStep1(ctx, cx, cy, s, isDark, state);
  }

  // 步骤指示器
  drawStepIndicator(ctx, width, height, state.stepIndex, 2,
    ['接触前', '接触后'], isDark, s);
}

/** step 0: 接触前 — 两个带电球 */
function drawContactStep0(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  isDark: boolean,
  state: ElectrificationSnapshot['state']
): void {
  const gap = Math.max(80, 130 * s);
  const leftX = cx - gap * 0.5;
  const rightX = cx + gap * 0.5;
  const sphereR = Math.max(35, 55 * s);

  // 左侧导体（+3）
  drawChargedSphere(ctx, leftX, cy, sphereR, state.leftCharge, isDark, s);

  // 右侧导体（-1）
  drawChargedSphere(ctx, rightX, cy, sphereR, state.rightCharge, isDark, s);

  // 电场线
  drawFieldLinesFromPoint(ctx, leftX, cy, state.leftCharge, sphereR * 2.2, isDark, s);
  drawFieldLinesFromPoint(ctx, rightX, cy, state.rightCharge, sphereR * 2.2, isDark, s);
  drawFieldLinesBetween(ctx, leftX, cy, state.leftCharge, rightX, cy, state.rightCharge, isDark, s);

  // 即将接触提示
  ctx.strokeStyle = isDark
    ? 'rgba(148,163,184,0.25)'
    : 'rgba(71,85,105,0.2)';
  ctx.lineWidth = Math.max(0.5, 1 * s);
  ctx.setLineDash([5 * s, 5 * s]);
  ctx.beginPath();
  ctx.moveTo(leftX + sphereR, cy);
  ctx.lineTo(rightX - sphereR, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // 标签
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.font = `600 ${Math.max(11, Math.round(14 * s))}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelGap = 12 * s;
  ctx.fillText('A', leftX, cy + sphereR + labelGap);
  ctx.fillText('B', rightX, cy + sphereR + labelGap);
}

/** step 1: 接触后 — 电荷重新分配 */
function drawContactStep1(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  isDark: boolean,
  state: ElectrificationSnapshot['state']
): void {
  const sphereR = Math.max(35, 55 * s);
  const gap = sphereR * 0.1; // 紧密接触

  const leftX = cx - gap * 0.5 - sphereR * 0.5;
  const rightX = cx + gap * 0.5 + sphereR * 0.5;

  // 两个导体用导体球绘制（颜色相同，表示电荷平衡）
  drawConductor(ctx, leftX, cy, sphereR, isDark, s);
  drawConductor(ctx, rightX, cy, sphereR, isDark, s);

  // 电荷重新分配可视化
  const avgCharge = (state.leftCharge + state.rightCharge) / 2;

  // 在两个球上都显示相同的净电荷
  drawNetCharges(ctx, leftX, cy, avgCharge, sphereR * 0.4, isDark, s);
  drawNetCharges(ctx, rightX, cy, avgCharge, sphereR * 0.4, isDark, s);

  // 电场线（从每个球向外辐射）
  drawFieldLinesFromPoint(ctx, leftX, cy, avgCharge, sphereR * 2.2, isDark, s);
  drawFieldLinesFromPoint(ctx, rightX, cy, avgCharge, sphereR * 2.2, isDark, s);

  // 电荷流动箭头（从左向右，示意正电荷流动方向）
  ctx.save();
  ctx.strokeStyle = isDark
    ? 'rgba(250,204,21,0.5)'
    : 'rgba(202,138,4,0.45)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.setLineDash([5 * s, 4 * s]);

  // 上方流动箭头
  ctx.beginPath();
  ctx.moveTo(leftX + sphereR * 0.5, cy - sphereR * 0.6);
  ctx.lineTo(rightX - sphereR * 0.5, cy - sphereR * 0.6);
  ctx.stroke();

  // 箭头头
  const arrowY = cy - sphereR * 0.6;
  ctx.setLineDash([]);
  ctx.fillStyle = isDark
    ? 'rgba(250,204,21,0.6)'
    : 'rgba(202,138,4,0.55)';
  const arrowTipX = rightX - sphereR * 0.5;
  const arrowH = 4 * s;
  const arrowW = 8 * s;
  ctx.beginPath();
  ctx.moveTo(arrowTipX, arrowY);
  ctx.lineTo(arrowTipX - arrowW, arrowY - arrowH);
  ctx.lineTo(arrowTipX - arrowW, arrowY + arrowH);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // 接触标记（实线）
  ctx.strokeStyle = isDark
    ? 'rgba(148,163,184,0.4)'
    : 'rgba(71,85,105,0.3)';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(leftX + sphereR, cy);
  ctx.lineTo(rightX - sphereR, cy);
  ctx.stroke();

  // 标签
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.font = `600 ${Math.max(11, Math.round(14 * s))}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelGap = 12 * s;
  ctx.fillText('A', leftX, cy + sphereR + labelGap);
  ctx.fillText('B', rightX, cy + sphereR + labelGap);
}
