import type { ElectrificationSnapshot } from '../scene.sim';
import type { DrawContext } from './types';
import { drawGlassRod, drawSilk, drawChargedSphere } from './draw-objects';
import { drawNetCharges, drawTransferArrow } from './draw-charges';
import { drawFieldLinesFromPoint } from './draw-field-lines';
import { drawStepIndicator } from './draw-step-indicator';

/**
 * 摩擦起电：3 个步骤
 */
export function drawFriction(
  context: DrawContext,
  snapshot: ElectrificationSnapshot
): void {
  const { ctx, width, height, theme, responsiveScale } = context;
  const { state } = snapshot;
  const isDark = theme === 'dark';
  const s = responsiveScale;

  const cx = width * 0.5;
  const cy = height * 0.42;

  if (state.stepIndex === 0) {
    drawFrictionStep0(ctx, cx, cy, width, height, s, isDark);
  } else {
    drawFrictionStep1Plus(ctx, cx, cy, width, height, s, isDark, state);
  }

  // 步骤指示器
  drawStepIndicator(ctx, width, height, state.stepIndex, 3,
    ['初始', '摩擦', '分离'], isDark, s);
}

/** step 0: 初始状态 — 原子级视图 */
function drawFrictionStep0(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  s: number,
  isDark: boolean
): void {
  const rodW = Math.max(80, 140 * s);
  const rodH = Math.max(40, 70 * s);
  const silkW = Math.max(80, 140 * s);
  const silkH = Math.max(40, 70 * s);
  const gap = Math.max(10, 20 * s);

  const rodX = cx - rodW - gap * 0.5;
  const silkX = cx + gap * 0.5;
  const objY = cy - rodH * 0.5;

  // 玻璃棒
  drawGlassRod(ctx, rodX, objY, rodW, rodH, isDark);

  // 丝绸
  drawSilk(ctx, silkX, objY, silkW, silkH, isDark);

  // 接触标记
  ctx.strokeStyle = isDark
    ? 'rgba(148,163,184,0.3)'
    : 'rgba(71,85,105,0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4 * s, 4 * s]);
  ctx.beginPath();
  ctx.moveTo(cx, objY + rodH * 0.3);
  ctx.lineTo(cx, objY + rodH * 0.7);
  ctx.stroke();
  ctx.setLineDash([]);

  // 标签
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.font = `600 ${Math.max(11, Math.round(14 * s))}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('玻璃棒', rodX + rodW * 0.5, objY + rodH + 10);
  ctx.fillText('丝绸', silkX + silkW * 0.5, objY + silkH + 10);

  // 内部电荷示意
  drawInternalCharges(ctx, rodX + rodW * 0.5, objY + rodH * 0.5, rodW * 0.35, 0, isDark);
  drawInternalCharges(ctx, silkX + silkW * 0.5, objY + silkH * 0.5, silkW * 0.35, 0, isDark);
}

/** step 1+ : 分离后带电状态 */
function drawFrictionStep1Plus(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  s: number,
  isDark: boolean,
  state: ElectrificationSnapshot['state']
): void {
  const gap = Math.max(60, 120 * s);
  const sphereR = Math.max(35, 55 * s);

  const leftX = cx - gap * 0.5;
  const rightX = cx + gap * 0.5;
  const objY = cy;

  // 玻璃棒 → 带电球
  drawChargedSphere(ctx, leftX, objY, sphereR, state.leftCharge, isDark);

  // 丝绸 → 带电球
  drawChargedSphere(ctx, rightX, objY, sphereR, state.rightCharge, isDark);

  // 电场线
  drawFieldLinesFromPoint(ctx, leftX, objY, state.leftCharge, sphereR * 2.2, isDark);
  drawFieldLinesFromPoint(ctx, rightX, objY, state.rightCharge, sphereR * 2.2, isDark);

  // 电子转移箭头（step 2 显示最终方向）
  if (state.stepIndex >= 2) {
    drawTransferArrow(ctx, leftX + sphereR, objY, rightX - sphereR, objY, isDark);
  }

  // 标签
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  ctx.font = `600 ${Math.max(11, Math.round(14 * s))}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('玻璃棒', leftX, objY + sphereR + 12);
  ctx.fillText('丝绸', rightX, objY + sphereR + 12);

  // 净电荷粒子
  drawNetCharges(ctx, leftX, objY, state.leftCharge, sphereR * 0.5, isDark);
  drawNetCharges(ctx, rightX, objY, state.rightCharge, sphereR * 0.5, isDark);
}

/** 绘制物体内部的正负电荷示意 */
function drawInternalCharges(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spreadR: number,
  _netCharge: number,
  isDark: boolean
): void {
  const count = 6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = spreadR * 0.6;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;

    // 正电荷（红色）
    ctx.fillStyle = isDark ? 'rgba(239,68,68,0.6)' : 'rgba(220,50,50,0.5)';
    ctx.beginPath();
    ctx.arc(px - 3, py - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // 负电荷（蓝色）
    ctx.fillStyle = isDark ? 'rgba(59,130,246,0.6)' : 'rgba(40,100,220,0.5)';
    ctx.beginPath();
    ctx.arc(px + 3, py + 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
