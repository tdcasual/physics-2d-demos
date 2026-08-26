/**
 * 劈尖干涉 — 主 canvas 底部的竖直干涉条纹
 */

import type { WedgeState } from '../scene.sim';
import type { WedgeViewContext } from './types';
import { hexToRgb } from './view-utils';

export function drawFringeOnMainCanvas(
  vc: WedgeViewContext,
  next: WedgeState,
  g: {
    text: string;
    dim: string;
    accent: string;
    leftX: number;
    rightX: number;
    scale: number;
    modeScale: number;
  }
): void {
  const c = vc.ctx;
  if (!c) return;
  const { text, accent, leftX, rightX, scale, modeScale } = g;
  const h = vc.cssHeight;

  const stripeTop = h * 0.6;
  const stripeH = h * 0.18;
  const stripeW = rightX - leftX;

  c.save();

  // 标题
  c.fillStyle = text;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'left';
  c.fillText('干涉条纹（等厚线）', leftX, stripeTop - 6 * scale);

  // 物理参数
  const lambda = next.params.lambda;
  const thetaRad = next.params.theta * (Math.PI / 180);
  const fringeSpacing = (lambda * 1e-6) / (2 * Math.sin(thetaRad)); // mm
  const L = next.params.L * 10; // cm -> mm

  // 自适应显示范围：保证约 6~15 条亮纹可见
  const rawFringes = L / fringeSpacing;
  let displayL: number;
  if (rawFringes < 6) {
    displayL = fringeSpacing * 8;
  } else if (rawFringes > 15) {
    displayL = fringeSpacing * 12;
  } else {
    displayL = L;
  }
  const color = hexToRgb(accent);

  // 绘制竖直条纹（水平方向对应位置 x，垂直方向为条纹高度）
  for (let px = leftX; px <= rightX; px += 2) {
    const x = ((px - leftX) / stripeW) * displayL; // mm
    const d = x * Math.tan(thetaRad) * 1e6; // nm
    const phase = (2 * Math.PI * d) / lambda;
    const intensity = Math.sin(phase) ** 2;
    const brightness = intensity * 255;

    const r = Math.min(255, color.r + brightness * 0.3);
    const g = Math.min(255, color.g + brightness * 0.3);
    const b = Math.min(255, color.b + brightness * 0.3);

    c.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
    c.fillRect(px, stripeTop, 2, stripeH);
  }

  // 边框
  c.strokeStyle = text;
  c.lineWidth = 1 * scale;
  c.strokeRect(leftX, stripeTop, stripeW, stripeH);

  // 级次标注（竖直条纹：m 标注在条纹下方，密度自适应）
  c.fillStyle = text;
  c.textAlign = 'center';
  c.font = `${Math.max(8, 10 * scale * modeScale)}px sans-serif`;
  const labelStep =
    fringeSpacing < 0.02
      ? 10
      : fringeSpacing < 0.05
        ? 5
        : fringeSpacing < 0.15
          ? 2
          : 1;
  for (let m = 0; m < 100; m++) {
    const xPos = m * fringeSpacing;
    if (xPos > displayL) break;
    if (m % labelStep !== 0) continue;
    const px = leftX + (xPos / displayL) * stripeW;
    c.fillText(`m=${m}`, px, stripeTop + stripeH + 12 * scale);
  }

  // 条纹间距标注
  c.fillStyle = text;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'left';
  c.fillText(
    `显示范围: 0 ~ ${displayL.toFixed(2)} mm   条纹间距 l = ${fringeSpacing.toFixed(3)} mm`,
    leftX,
    stripeTop + stripeH + 26 * scale
  );

  c.restore();
}
