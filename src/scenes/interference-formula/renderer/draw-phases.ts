/**
 * 双缝干涉 — 主画布各阶段绘制
 *
 * 包含公共几何结构（drawGeometryBase）与四个教学阶段
 * （geometry / path-diff / small-angle / result）的绘制函数。
 * 所有函数均为纯参数传递，不捕获外部状态。
 */

import { drawArrowLine } from './view-utils';
import type {
  GeoBase,
  GeoPhase,
  PathDiffPhase,
  SmallAnglePhase
} from './types';

export function drawGeometryBase(
  c: CanvasRenderingContext2D,
  g: GeoBase
): void {
  const {
    text,
    dim,
    accent,
    plateX,
    screenX,
    centerY,
    slitTop,
    slitBot,
    screenTop,
    screenBot,
    pY,
    scale,
    modeScale
  } = g;

  c.save();
  c.lineWidth = 2 * scale * modeScale;
  c.font = `${Math.max(10, 14 * scale * modeScale)}px sans-serif`;

  // 双缝板
  c.strokeStyle = text;
  c.beginPath();
  c.moveTo(plateX, screenTop);
  c.lineTo(plateX, slitTop - 6 * scale);
  c.moveTo(plateX, slitTop + 6 * scale);
  c.lineTo(plateX, slitBot - 6 * scale);
  c.moveTo(plateX, slitBot + 6 * scale);
  c.lineTo(plateX, screenBot);
  c.stroke();

  // 缝口
  c.fillStyle = accent;
  c.beginPath();
  c.arc(plateX, slitTop, 3 * scale * modeScale, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(plateX, slitBot, 3 * scale * modeScale, 0, Math.PI * 2);
  c.fill();

  // 屏幕
  c.strokeStyle = text;
  c.lineWidth = 2.5 * scale * modeScale;
  c.beginPath();
  c.moveTo(screenX, screenTop);
  c.lineTo(screenX, screenBot);
  c.stroke();

  // 屏幕中心标记
  c.strokeStyle = dim;
  c.lineWidth = 1 * scale;
  c.setLineDash([4 * scale, 4 * scale]);
  c.beginPath();
  c.moveTo(screenX - 8 * scale, centerY);
  c.lineTo(screenX + 8 * scale, centerY);
  c.stroke();
  c.setLineDash([]);

  // P 点
  c.fillStyle = accent;
  c.beginPath();
  c.arc(screenX, pY, 4 * scale * modeScale, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = text;
  c.textAlign = 'left';
  c.fillText('P', screenX + 8 * scale, pY + 4 * scale);

  // 光线
  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale;
  c.globalAlpha = 0.6;
  c.beginPath();
  c.moveTo(plateX, slitTop);
  c.lineTo(screenX, pY);
  c.stroke();
  c.beginPath();
  c.moveTo(plateX, slitBot);
  c.lineTo(screenX, pY);
  c.stroke();
  c.globalAlpha = 1;

  c.restore();
}

// ── geometry 阶段 ── 只标注几何量，无文字说明

export function drawGeometryPhase(
  c: CanvasRenderingContext2D,
  g: GeoPhase
): void {
  const {
    text,
    dim,
    plateX,
    screenX,
    centerY,
    slitTop,
    slitBot,
    pY,
    scale,
    modeScale,
    params
  } = g;

  c.save();
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;

  // L
  const ly =
    screenX - plateX > 60 * scale
      ? plateX + (screenX - plateX) * 0.5
      : (plateX + screenX) / 2;
  c.strokeStyle = dim;
  c.lineWidth = 1 * scale;
  drawArrowLine(
    c,
    plateX,
    centerY + 50 * scale,
    screenX,
    centerY + 50 * scale,
    scale
  );
  c.fillStyle = text;
  c.textAlign = 'center';
  c.fillText(`L = ${params.L.toFixed(1)} m`, ly, centerY + 66 * scale);

  // d
  const dx = plateX - 28 * scale;
  drawArrowLine(c, dx, slitTop, dx, slitBot, scale);
  c.textAlign = 'right';
  c.fillText(
    `d = ${params.d.toFixed(1)} mm`,
    dx - 6 * scale,
    (slitTop + slitBot) / 2 + 4 * scale
  );

  // x
  c.textAlign = 'left';
  const xx = screenX + 16 * scale;
  drawArrowLine(c, xx, centerY, xx, pY, scale);
  c.fillText('x', xx + 6 * scale, (centerY + pY) / 2 + 4 * scale);

  // θ（在 P 点处标注光线与水平方向夹角）
  c.strokeStyle = dim;
  c.lineWidth = 1 * scale;
  const thetaR = 22 * scale;
  c.beginPath();
  c.arc(
    screenX,
    pY,
    thetaR,
    Math.PI,
    Math.PI + Math.atan2(centerY - pY, screenX - plateX) * 0.8
  );
  c.stroke();
  c.fillStyle = dim;
  c.fillText('θ', screenX - 34 * scale, pY + 4 * scale);

  c.restore();
}

// ── path-diff 阶段 ── 只画辅助线和核心公式

export function drawPathDiffPhase(
  c: CanvasRenderingContext2D,
  g: PathDiffPhase
): void {
  const {
    w,
    h,
    text,
    dim,
    accent,
    plateX,
    screenX,
    slitTop,
    slitBot,
    pY,
    scale,
    modeScale
  } = g;

  c.save();
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;

  // 几何量
  const r1 = Math.hypot(screenX - plateX, pY - slitTop); // 上缝→P（较短）
  const r2 = Math.hypot(screenX - plateX, pY - slitBot); // 下缝→P（较长）

  // ── 1. 以 P 为圆心，r1 为半径画虚线圆弧 ──
  // 圆弧覆盖 P→slitBot 到 P→slitTop 的角度范围
  const angleToBot = Math.atan2(slitBot - pY, plateX - screenX);
  const angleToTop = Math.atan2(slitTop - pY, plateX - screenX);

  c.strokeStyle = dim;
  c.lineWidth = 1 * scale;
  c.setLineDash([3 * scale, 3 * scale]);
  c.beginPath();
  c.arc(screenX, pY, r1, angleToBot, angleToTop);
  c.stroke();
  c.setLineDash([]);

  // ── 2. 圆弧与下缝光线交点 Q ──
  // Q 在下缝光线上，且 PQ = r1
  const qx = screenX + Math.cos(angleToBot) * r1;
  const qy = pY + Math.sin(angleToBot) * r1;

  c.fillStyle = accent;
  c.beginPath();
  c.arc(qx, qy, 3 * scale, 0, Math.PI * 2);
  c.fill();

  // ── 3. 从上缝 slitTop 向下缝光线引垂线，垂足 H ──
  // 下缝光线方向（slitBot → P）
  const dx = screenX - plateX;
  const dy = pY - slitBot;
  const r2Inv = 1 / r2;
  const duX = dx * r2Inv;
  const duY = dy * r2Inv;
  // slitTop 相对于 slitBot 的向量在 d 上的投影 = Δr
  const deltaR = (slitTop - slitBot) * dy * r2Inv; // = gap * sinθ
  const hx = plateX + duX * deltaR;
  const hy = slitBot + duY * deltaR;

  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale;
  c.setLineDash([3 * scale, 3 * scale]);
  c.beginPath();
  c.moveTo(plateX, slitTop);
  c.lineTo(hx, hy);
  c.stroke();
  c.setLineDash([]);

  // 垂足标记
  c.fillStyle = accent;
  c.beginPath();
  c.arc(hx, hy, 2.5 * scale, 0, Math.PI * 2);
  c.fill();

  // ── 4. 标注 Δr ──
  // 在下缝光线上 slitBot 与 Q（或 H）之间标注
  c.fillStyle = accent;
  c.textAlign = 'center';
  c.font = `italic ${Math.max(10, 13 * scale * modeScale)}px sans-serif`;
  const midX = (plateX + qx) / 2;
  const midY = (slitBot + qy) / 2;
  c.fillText(`|Δr|`, midX - 8 * scale, midY - 6 * scale);

  // ── 5. 标注 r₁ 与 r₂ 的关系 ──
  c.fillStyle = dim;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  const rRelation =
    pY < (slitTop + slitBot) / 2 ? `r₁ = r₂ − |Δr|` : `r₂ = r₁ − |Δr|`;
  c.fillText(rRelation, screenX + 10 * scale, pY - r1 * 0.5);

  // 核心公式
  const fy = h * 0.9;
  c.fillStyle = text;
  c.font = `${Math.max(12, 16 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('Δr = d·sinθ = mλ', w / 2, fy);

  c.restore();
}

// ── small-angle 阶段 ── 修正辅助三角形，仅保留关键公式

export function drawSmallAnglePhase(
  c: CanvasRenderingContext2D,
  g: SmallAnglePhase
): void {
  const {
    w,
    h,
    text,
    dim,
    accent,
    plateX,
    screenX,
    centerY,
    pY,
    scale,
    modeScale
  } = g;

  c.save();
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;

  // 直接在主几何图上叠加直角三角形：双缝中心 → 屏幕中心 → P 点
  // A = 双缝中心(plateX, centerY), B = 屏幕中心(screenX, centerY), C = P点(screenX, pY)
  const ax = plateX;
  const ay = centerY;
  const bx = screenX;
  const by = centerY;
  const cx = screenX;
  const cy = pY;

  // 1. 水平边 L（双缝中心 → 屏幕中心，虚线）
  c.strokeStyle = dim;
  c.lineWidth = 1.5 * scale;
  c.setLineDash([4 * scale, 3 * scale]);
  c.beginPath();
  c.moveTo(ax, ay);
  c.lineTo(bx, by);
  c.stroke();

  // 2. 竖直边 x（屏幕中心 → P 点，实线）
  c.setLineDash([]);
  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale;
  c.beginPath();
  c.moveTo(bx, by);
  c.lineTo(cx, cy);
  c.stroke();

  // 3. 斜边 r（双缝中心 → P 点，虚线）
  c.strokeStyle = dim;
  c.lineWidth = 1.5 * scale;
  c.setLineDash([4 * scale, 3 * scale]);
  c.beginPath();
  c.moveTo(ax, ay);
  c.lineTo(cx, cy);
  c.stroke();
  c.setLineDash([]);

  // 4. 直角标记（在屏幕中心 B）
  c.strokeStyle = text;
  c.lineWidth = 1 * scale;
  const rc = 7 * scale;
  const rightDir = cy < by ? -1 : 1; // P 点在中心上方还是下方
  c.beginPath();
  c.moveTo(bx - rc, by);
  c.lineTo(bx - rc, by + rc * rightDir);
  c.lineTo(bx, by + rc * rightDir);
  c.stroke();

  // 5. 标注 L / x / r
  c.fillStyle = text;
  c.textAlign = 'center';
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;
  // L 标在水平边下方
  c.fillText('L', (ax + bx) / 2, ay + 16 * scale);
  // x 标在竖直边右侧
  c.textAlign = 'left';
  c.fillText('x', bx + 8 * scale, (by + cy) / 2);
  // r 标在斜边旁边
  c.textAlign = 'center';
  c.fillStyle = dim;
  c.fillText('r', (ax + cx) / 2 - 10 * scale, (ay + cy) / 2);

  // 6. θ 标注在双缝中心 A
  const thetaAngle = Math.atan2(Math.abs(cy - ay), cx - ax); // 实际角度（正值）
  const thetaR = 18 * scale;
  c.strokeStyle = text;
  c.lineWidth = 1 * scale;
  c.beginPath();
  // P 在上方 → 逆时针从 0 画到 -thetaAngle；P 在下方 → 顺时针从 0 画到 +thetaAngle
  if (cy < by) {
    c.arc(ax, ay, thetaR, 0, -thetaAngle * 0.85, true);
  } else {
    c.arc(ax, ay, thetaR, 0, thetaAngle * 0.85, false);
  }
  c.stroke();
  c.fillStyle = text;
  c.font = `italic ${Math.max(11, 14 * scale * modeScale)}px sans-serif`;
  c.fillText('θ', ax + thetaR + 8 * scale, ay - 4 * scale);

  // 7. 公式（仅一行）
  const fy = h * 0.9;
  c.fillStyle = accent;
  c.font = `${Math.max(12, 16 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('sinθ ≈ tanθ = x/L  →  Δr ≈ d·x/L = mλ', w / 2, fy);

  c.restore();
}

// ── result 阶段 ── 展示相邻亮纹 + Δx 测量 + 反推波长

export function drawResultPhase(
  c: CanvasRenderingContext2D,
  g: {
    w: number;
    h: number;
    text: string;
    dim: string;
    accent: string;
    plateX: number;
    screenX: number;
    centerY: number;
    slitTop: number;
    slitBot: number;
    pY: number;
    params: { lambda: number; L: number; d: number };
    deltaX: number;
    scale: number;
    modeScale: number;
  }
): void {
  const {
    w,
    h,
    text,
    dim,
    accent,
    plateX,
    screenX,
    centerY,
    slitTop,
    slitBot,
    pY,
    deltaX,
    scale,
    modeScale
  } = g;

  c.save();
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;

  const brightR = 6.5 * scale * modeScale;

  // 1. 额外光线：从双缝到中央亮纹（虚线，表示这也是一条光路）
  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale;
  c.setLineDash([4 * scale, 3 * scale]);
  c.globalAlpha = 0.5;
  c.beginPath();
  c.moveTo(plateX, slitTop);
  c.lineTo(screenX, centerY);
  c.stroke();
  c.beginPath();
  c.moveTo(plateX, slitBot);
  c.lineTo(screenX, centerY);
  c.stroke();
  c.setLineDash([]);
  c.globalAlpha = 1;

  // 2. 中央亮纹（大圆点 + 边框）
  c.fillStyle = accent;
  c.beginPath();
  c.arc(screenX, centerY, brightR, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = text;
  c.lineWidth = 1.5 * scale;
  c.stroke();

  // 3. 第一级亮纹（P 点位置，重画更大 + 边框）
  c.fillStyle = accent;
  c.beginPath();
  c.arc(screenX, pY, brightR, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = text;
  c.lineWidth = 1.5 * scale;
  c.stroke();

  // 4. 亮纹标注（与 P 标签错开，避免重叠）
  c.fillStyle = text;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'left';
  c.fillText('中央亮纹', screenX + 16 * scale, centerY + 16 * scale);
  c.fillText('相邻亮纹', screenX + 16 * scale, pY + 16 * scale);

  // 5. Δx 双向箭头标注
  const arrowX = screenX + 55 * scale;
  const ah = 4 * scale;
  c.strokeStyle = text;
  c.lineWidth = 1.2 * scale;
  c.beginPath();
  c.moveTo(arrowX, centerY);
  c.lineTo(arrowX, pY);
  c.stroke();
  // 上箭头（指向 centerY）
  c.beginPath();
  c.moveTo(arrowX - ah, centerY + ah);
  c.lineTo(arrowX, centerY);
  c.lineTo(arrowX + ah, centerY + ah);
  c.stroke();
  // 下箭头（指向 pY）
  c.beginPath();
  c.moveTo(arrowX - ah, pY - ah);
  c.lineTo(arrowX, pY);
  c.lineTo(arrowX + ah, pY - ah);
  c.stroke();

  // Δx 文字
  c.fillStyle = accent;
  c.font = `bold ${Math.max(11, 14 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'left';
  c.fillText('Δx', arrowX + 10 * scale, (centerY + pY) / 2 + 4 * scale);

  // 6. 底部公式
  const fy = h * 0.88;
  c.fillStyle = accent;
  c.font = `bold ${Math.max(16, 24 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('Δx = λL / d', w / 2, fy);

  c.fillStyle = text;
  c.font = `${Math.max(11, 14 * scale * modeScale)}px sans-serif`;
  c.fillText(`= ${(deltaX * 1e3).toFixed(2)} mm`, w / 2, fy + 24 * scale);

  // 反推公式（强调测量应用）
  c.fillStyle = dim;
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;
  c.fillText(`→ 测得 Δx，反推波长  λ = d·Δx / L`, w / 2, fy + 46 * scale);

  c.restore();
}
