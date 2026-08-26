/**
 * 劈尖干涉 — 光强曲线（几何图下方，紧凑）
 */

import type { WedgeState } from '../scene.sim';
import type { WedgeViewContext } from './types';

export function drawIntensityCurve(
  vc: WedgeViewContext,
  state: WedgeState,
  g: {
    text: string;
    dim: string;
    accent: string;
    bg: string;
    leftX: number;
    rightX: number;
    botY: number;
    scale: number;
    modeScale: number;
  }
): void {
  const c = vc.ctx;
  if (!c) return;
  const { text, dim, accent, leftX, rightX, botY, scale, modeScale } = g;
  const h = vc.cssHeight;

  const curveTop = botY + 20 * scale;
  const curveBot = h * 0.56;
  const curveH = curveBot - curveTop;

  c.save();
  c.strokeStyle = dim;
  c.lineWidth = 1 * scale;

  // 坐标轴
  c.beginPath();
  c.moveTo(leftX, curveBot);
  c.lineTo(rightX, curveBot);
  c.stroke();
  c.beginPath();
  c.moveTo(leftX, curveTop);
  c.lineTo(leftX, curveBot);
  c.stroke();

  // 光强曲线
  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale * modeScale;
  c.beginPath();
  const lambda = state.params.lambda;
  const thetaRad = state.params.theta * (Math.PI / 180);
  const L = state.params.L * 10; // mm

  for (let px = leftX; px <= rightX; px += 2) {
    const x = ((px - leftX) / (rightX - leftX)) * L; // mm
    const d = x * Math.tan(thetaRad) * 1e6; // nm
    const phase = (2 * Math.PI * d) / lambda;
    const intensity = Math.sin(phase) ** 2;
    const py = curveBot - intensity * curveH * 0.85;
    if (px === leftX) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();

  // 光标位置竖线
  const cursorPx = leftX + (rightX - leftX) * state.cursorX;
  c.strokeStyle = accent;
  c.lineWidth = 1.2 * scale;
  c.setLineDash([3 * scale, 2 * scale]);
  c.beginPath();
  c.moveTo(cursorPx, curveTop);
  c.lineTo(cursorPx, curveBot);
  c.stroke();
  c.setLineDash([]);

  // 标签
  c.fillStyle = text;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('x', (leftX + rightX) / 2, curveBot + 14 * scale);
  c.textAlign = 'right';
  c.fillText('I', leftX - 6 * scale, curveTop + 10 * scale);

  c.restore();
}
