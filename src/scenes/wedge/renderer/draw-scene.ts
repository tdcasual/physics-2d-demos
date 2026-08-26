/**
 * 劈尖干涉 — 主 canvas 场景绘制（几何图 + 光强曲线 + 条纹 + 波叠加）
 */

import { wavelengthToColor } from '../../../core/wavelength';
import type { WedgeState } from '../scene.sim';
import type { WedgeViewContext } from './types';
import { drawArrow } from './view-utils';
import {
  drawPathDiffPhase,
  drawEqualThicknessPhase,
  drawResultPhase
} from './draw-phases';
import { drawIntensityCurve } from './draw-intensity';
import { drawFringeOnMainCanvas } from './draw-fringe';
import { drawWaveSuperpositionGraph } from './draw-wave';

export function drawScene(vc: WedgeViewContext, next: WedgeState): void {
  const c = vc.ctx;
  if (!c) return;
  const w = vc.cssWidth;
  const h = vc.cssHeight;
  const scale = vc.scale;
  const mode = vc.mode;
  const demoHints = vc.demoHints;
  const theme = vc.theme;
  // 演示模式内容放大系数（normal=1，presentation=renderHints.contentScale）
  const modeScale =
    mode === 'presentation' ? (demoHints?.contentScale ?? 1.5) : 1.0;
  const isDark = theme === 'dark';
  const text = isDark ? '#e2e8f0' : '#1e293b';
  const dim = isDark ? '#94a3b8' : '#64748b';
  const accent = wavelengthToColor(next.params.lambda);
  const bg = isDark ? '#0f172a' : '#f8fafc';

  c.clearRect(0, 0, w, h);
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);

  const step = next.params.step;

  // 几何基线 — 劈尖角 θ 映射到可视化高度（缩小比例，更接近真实视觉）
  const leftX = w * 0.12;
  const rightX = w * 0.88;
  const botY = h * 0.36;

  // slider 范围 [0.001°, 1.0°] 线性映射到可视化高度 [2%, 12%]
  const minTheta = 0.001;
  const maxTheta = 1.0;
  const minWedgeH = h * 0.02;
  const maxWedgeH = h * 0.12;
  const t = Math.max(
    0,
    Math.min(1, (next.params.theta - minTheta) / (maxTheta - minTheta))
  );
  const wedgeH = minWedgeH + t * (maxWedgeH - minWedgeH);
  const topY = botY - wedgeH;

  // 玻璃板厚度（远大于空气膜）
  const glassH = 24 * scale;

  c.save();
  c.lineWidth = 2 * scale;
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;

  // 空气层填充（半透明，先画在玻璃板下面）
  c.fillStyle = isDark ? 'rgba(56,189,248,0.10)' : 'rgba(56,189,248,0.15)';
  c.beginPath();
  c.moveTo(leftX, botY);
  c.lineTo(rightX, topY);
  c.lineTo(rightX, botY);
  c.closePath();
  c.fill();

  // 下玻璃板（水平厚矩形）
  const glassGrad1 = c.createLinearGradient(0, botY, 0, botY + glassH);
  glassGrad1.addColorStop(
    0,
    isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.25)'
  );
  glassGrad1.addColorStop(
    1,
    isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.10)'
  );
  c.fillStyle = glassGrad1;
  c.fillRect(leftX - 10 * scale, botY, rightX - leftX + 20 * scale, glassH);
  c.strokeStyle = text;
  c.lineWidth = 1.5 * scale;
  c.strokeRect(leftX - 10 * scale, botY, rightX - leftX + 20 * scale, glassH);

  // 上玻璃板（倾斜平行四边形）
  const glassGrad2 = c.createLinearGradient(0, topY - glassH, 0, topY);
  glassGrad2.addColorStop(
    0,
    isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.10)'
  );
  glassGrad2.addColorStop(
    1,
    isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.25)'
  );
  c.fillStyle = glassGrad2;
  c.beginPath();
  c.moveTo(leftX, botY);
  c.lineTo(rightX, topY);
  c.lineTo(rightX, topY - glassH);
  c.lineTo(leftX, botY - glassH);
  c.closePath();
  c.fill();
  c.strokeStyle = text;
  c.lineWidth = 1.5 * scale;
  c.stroke();

  // 左端接触点标记
  c.fillStyle = accent;
  c.beginPath();
  c.arc(leftX, botY, 3 * scale * modeScale, 0, Math.PI * 2);
  c.fill();

  // 玻璃板标签
  c.fillStyle = dim;
  c.textAlign = 'center';
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.fillText('玻璃板', rightX + 30 * scale, topY - glassH / 2);
  c.fillText('玻璃板', rightX + 30 * scale, botY + glassH / 2 + 4 * scale);
  c.fillText('空气劈尖', (leftX + rightX) / 2, (botY + topY) / 2 + 6 * scale);

  // 入射光线（穿过上玻璃板，到达空气膜表面）
  const rayCount = 5;
  const rayStartY = h * 0.03;
  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale * modeScale;
  c.globalAlpha = 0.5;
  for (let i = 0; i < rayCount; i++) {
    const rx = leftX + (rightX - leftX) * (0.15 + i * 0.18);
    // 上板表面 y 坐标
    const plateY = botY - ((rx - leftX) / (rightX - leftX)) * wedgeH;
    // 入射光：从顶部到上板顶面
    c.beginPath();
    c.moveTo(rx, rayStartY);
    c.lineTo(rx, plateY - glassH);
    c.stroke();
    drawArrow(c, rx, rayStartY, rx, plateY - glassH, 4 * scale * modeScale);
    // 穿过上玻璃板（玻璃内部半透明线）
    c.globalAlpha = 0.25;
    c.beginPath();
    c.moveTo(rx, plateY - glassH);
    c.lineTo(rx, plateY);
    c.stroke();
    c.globalAlpha = 0.5;
  }
  c.globalAlpha = 1;

  // 光标 P（可移动竖线）
  const px = leftX + (rightX - leftX) * next.cursorX;
  const py = botY - ((px - leftX) / (rightX - leftX)) * wedgeH;
  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale * modeScale;
  c.setLineDash([3 * scale, 2 * scale]);
  c.beginPath();
  c.moveTo(px, botY + 15 * scale);
  c.lineTo(px, py - 15 * scale);
  c.stroke();
  c.setLineDash([]);

  // P 点
  c.fillStyle = accent;
  c.beginPath();
  c.arc(px, py, 4 * scale * modeScale, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = text;
  c.textAlign = 'left';
  c.fillText('P', px + 8 * scale, py - 6 * scale);

  // 厚度标注
  if (step !== 'geometry') {
    c.strokeStyle = dim;
    c.lineWidth = 1 * scale;
    c.beginPath();
    c.moveTo(px + 12 * scale, botY);
    c.lineTo(px + 12 * scale, py);
    c.stroke();
    c.fillStyle = text;
    c.textAlign = 'left';
    c.font = `italic ${Math.max(10, 12 * scale * modeScale)}px sans-serif`;
    c.fillText('d', px + 16 * scale, (botY + py) / 2 + 3 * scale);
  }

  // 位置 x 标注
  if (step !== 'geometry') {
    c.strokeStyle = dim;
    c.lineWidth = 1 * scale;
    c.beginPath();
    c.moveTo(leftX, botY + 25 * scale);
    c.lineTo(px, botY + 25 * scale);
    c.stroke();
    c.fillStyle = text;
    c.textAlign = 'center';
    c.font = `${Math.max(10, 12 * scale * modeScale)}px sans-serif`;
    c.fillText('x', (leftX + px) / 2, botY + 38 * scale);
  }

  // 劈尖角 θ（用视觉角度绘制弧线，物理角太小看不到）
  if (step !== 'geometry') {
    const thetaR = 18 * scale;
    const visualAngle = Math.atan2(wedgeH, rightX - leftX);
    c.strokeStyle = dim;
    c.lineWidth = 1 * scale;
    c.beginPath();
    c.arc(leftX, botY, thetaR, -visualAngle * 0.9, 0);
    c.stroke();
    c.fillStyle = text;
    c.textAlign = 'left';
    c.fillText(
      'θ',
      leftX + thetaR * Math.cos(-visualAngle * 0.5) + 4 * scale,
      botY + thetaR * Math.sin(-visualAngle * 0.5) - 2 * scale
    );
  }

  // 阶段特定内容
  if (step === 'path-diff') {
    drawPathDiffPhase(c, {
      w,
      h,
      text,
      dim,
      accent,
      px,
      py,
      botY,
      leftX,
      rightX,
      scale,
      modeScale,
      state: next
    });
  } else if (step === 'equal-thickness') {
    drawEqualThicknessPhase(c, {
      w,
      h,
      text,
      dim,
      accent,
      leftX,
      rightX,
      botY,
      topY,
      scale,
      modeScale,
      state: next
    });
  } else if (step === 'result') {
    drawResultPhase(c, {
      w,
      h,
      text,
      dim,
      accent,
      leftX,
      rightX,
      botY,
      topY,
      scale,
      modeScale,
      state: next
    });
  }

  // 底部公式（放在几何图和曲线之间）
  if (step === 'geometry') {
    const fy = botY + 18 * scale;
    c.fillStyle = dim;
    c.font = `${Math.max(11, 14 * scale * modeScale)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('d = x·tanθ', w / 2, fy);
  }

  c.restore();

  // 光强曲线（几何图下方，紧凑）
  drawIntensityCurve(vc, next, {
    text,
    dim,
    accent,
    bg,
    leftX,
    rightX,
    botY,
    scale,
    modeScale
  });

  // 干涉条纹（主 canvas 底部）
  drawFringeOnMainCanvas(vc, next, {
    text,
    dim,
    accent,
    leftX,
    rightX,
    scale,
    modeScale
  });

  // 图表区（右侧，仅波叠加）
  drawWaveSuperpositionGraph(vc, next);
}
