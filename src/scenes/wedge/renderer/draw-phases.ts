/**
 * 劈尖干涉 — 教学阶段叠加层绘制（path-diff / equal-thickness / result）
 */

import type { WedgeState } from '../scene.sim';

// ── path-diff 阶段 ──
export function drawPathDiffPhase(
  c: CanvasRenderingContext2D,
  g: {
    w: number;
    h: number;
    text: string;
    dim: string;
    accent: string;
    px: number;
    py: number;
    botY: number;
    leftX: number;
    rightX: number;
    scale: number;
    modeScale: number;
    state: WedgeState;
  }
): void {
  const { text, dim, accent, px, py, botY, scale, modeScale } = g;
  c.save();
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;

  // 两束反射光示意（在 P 点上方）
  const rayY = py - 40 * scale;
  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale * modeScale;
  c.globalAlpha = 0.6;

  // 第一束：上表面反射（直接从 P 点向上）
  c.beginPath();
  c.moveTo(px, py);
  c.lineTo(px, rayY);
  c.stroke();

  // 第二束：下表面反射（从 P 点向下到 botY，再向上）
  c.setLineDash([3 * scale, 2 * scale]);
  c.beginPath();
  c.moveTo(px, py);
  c.lineTo(px, botY);
  c.stroke();
  c.setLineDash([]);
  c.beginPath();
  c.moveTo(px, botY);
  c.lineTo(px + 8 * scale, rayY);
  c.stroke();

  c.globalAlpha = 1;

  // 光程差标注
  c.fillStyle = text;
  c.textAlign = 'center';
  c.font = `${Math.max(11, 14 * scale * modeScale)}px sans-serif`;
  c.fillText('Δ = 2d + λ/2', g.w / 2, g.h * 0.88);

  // 半波损失标注
  c.fillStyle = dim;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.fillText('下表面反射有 λ/2 附加光程差（半波损失）', g.w / 2, g.h * 0.93);

  c.restore();
}

// ── equal-thickness 阶段 ──
export function drawEqualThicknessPhase(
  c: CanvasRenderingContext2D,
  g: {
    w: number;
    h: number;
    text: string;
    dim: string;
    accent: string;
    leftX: number;
    rightX: number;
    botY: number;
    topY: number;
    scale: number;
    modeScale: number;
    state: WedgeState;
  }
): void {
  const { text, dim, leftX, rightX, botY, topY, scale, modeScale, state } = g;
  c.save();
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;

  const lambda = state.params.lambda;
  const thetaRad = state.params.theta * (Math.PI / 180);
  const L = state.params.L * 10; // mm

  // 等厚线（竖线标注各级条纹位置）
  c.strokeStyle = dim;
  c.lineWidth = 1 * scale;
  c.setLineDash([2 * scale, 3 * scale]);

  for (let m = 0; m < 8; m++) {
    // 暗纹位置：d = mλ/2 → x = mλ/(2tanθ)
    const xPos = (m * lambda) / 2 / (Math.tan(thetaRad) * 1e6); // mm
    if (xPos > L) break;
    const px = leftX + (xPos / L) * (rightX - leftX);
    c.beginPath();
    c.moveTo(px, topY - 10 * scale);
    c.lineTo(px, botY + 10 * scale);
    c.stroke();

    c.fillStyle = dim;
    c.textAlign = 'center';
    c.font = `${Math.max(8, 10 * scale * modeScale)}px sans-serif`;
    c.fillText(`m=${m}`, px, topY - 14 * scale);
  }
  c.setLineDash([]);

  // 公式
  c.fillStyle = text;
  c.font = `${Math.max(11, 14 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('暗纹：2d = mλ   明纹：2d = (m+1/2)λ', g.w / 2, g.h * 0.88);

  c.restore();
}

// ── result 阶段 ──
export function drawResultPhase(
  c: CanvasRenderingContext2D,
  g: {
    w: number;
    h: number;
    text: string;
    dim: string;
    accent: string;
    leftX: number;
    rightX: number;
    botY: number;
    topY: number;
    scale: number;
    modeScale: number;
    state: WedgeState;
  }
): void {
  const { text, accent, scale, modeScale, state } = g;
  c.save();

  const fy = g.h * 0.88;
  c.fillStyle = accent;
  c.font = `bold ${Math.max(14, 20 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('l = λ / (2 sin θ) ≈ λ / (2θ)', g.w / 2, fy);

  c.fillStyle = text;
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;
  c.fillText(
    `= ${state.fringeSpacing.toFixed(3)} mm = ${(state.fringeSpacing * 1e3).toFixed(1)} μm`,
    g.w / 2,
    fy + 24 * scale
  );

  c.fillStyle = g.dim;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.fillText(
    `λ = ${state.params.lambda} nm   θ = ${state.params.theta.toFixed(3)}°`,
    g.w / 2,
    fy + 44 * scale
  );

  c.restore();
}
