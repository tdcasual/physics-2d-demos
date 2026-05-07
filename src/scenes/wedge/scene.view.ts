/**
 * 劈尖干涉 — Canvas 渲染
 */

import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { WedgeState } from './scene.sim';
import { wavelengthToColor } from '../../core/wavelength';

export type CreateWedgeViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
};

export function createWedgeView(options: CreateWedgeViewOptions = {}) {
  const canvas = options.canvas ?? null;
  let ctx: CanvasRenderingContext2D | null = null;
  let graphCanvas = options.graphCanvas ?? null;
  let graphCtx: CanvasRenderingContext2D | null = null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let cssWidth = 800;
  let cssHeight = 600;
  let scale = 1;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(200, Math.floor(rect.width || 800));
    cssHeight = Math.max(150, Math.floor(rect.height || 600));
    scale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  function resizeGraphCanvas(): void {
    if (!graphCanvas) return;
    const newCtx = sizeCanvasToFill(graphCanvas);
    if (newCtx) graphCtx = newCtx;
  }

  function drawScene(next: WedgeState): void {
    const c = ctx;
    if (!c) return;
    const w = cssWidth;
    const h = cssHeight;
    const isDark = theme === 'dark';
    const text = isDark ? '#e2e8f0' : '#1e293b';
    const dim = isDark ? '#94a3b8' : '#64748b';
    const accent = wavelengthToColor(next.params.lambda);
    const bg = isDark ? '#0f172a' : '#f8fafc';

    c.clearRect(0, 0, w, h);
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    const step = next.params.step;

    // 几何基线（紧凑布局）— 劈尖角 θ 均匀映射到可视化高度
    const leftX = w * 0.12;
    const rightX = w * 0.88;
    const botY = h * 0.36;

    const thetaRad = next.params.theta * (Math.PI / 180);
    // slider 范围 [0.001°, 1.0°] 线性映射到可视化高度 [6%, 30%]
    // 避免 tan(θ) 放大导致小角度就触顶
    const minTheta = 0.001;
    const maxTheta = 1.0;
    const minWedgeH = h * 0.06;
    const maxWedgeH = h * 0.30;
    const t = Math.max(0, Math.min(1, (next.params.theta - minTheta) / (maxTheta - minTheta)));
    const wedgeH = minWedgeH + t * (maxWedgeH - minWedgeH);
    const topY = botY - wedgeH;

    c.save();
    c.lineWidth = 2 * scale;
    c.font = `${Math.max(10, 13 * scale)}px sans-serif`;

    // 下玻璃板（水平）
    c.strokeStyle = text;
    c.lineWidth = 2.5 * scale;
    c.beginPath();
    c.moveTo(leftX - 10 * scale, botY);
    c.lineTo(rightX + 10 * scale, botY);
    c.stroke();

    // 上玻璃板（倾斜）
    c.beginPath();
    c.moveTo(leftX, botY);
    c.lineTo(rightX, topY);
    c.stroke();

    // 左端面（玻璃）
    c.strokeStyle = dim;
    c.lineWidth = 1 * scale;
    c.beginPath();
    c.moveTo(leftX, botY - 25 * scale);
    c.lineTo(leftX, botY + 8 * scale);
    c.stroke();

    // 空气层填充（半透明）
    c.fillStyle = isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.12)';
    c.beginPath();
    c.moveTo(leftX, botY);
    c.lineTo(rightX, topY);
    c.lineTo(rightX, botY);
    c.closePath();
    c.fill();

    // 玻璃板标签
    c.fillStyle = dim;
    c.textAlign = 'center';
    c.font = `${Math.max(9, 11 * scale)}px sans-serif`;
    c.fillText('玻璃板', rightX + 30 * scale, topY + 8 * scale);
    c.fillText('玻璃板', rightX + 30 * scale, botY + 16 * scale);
    c.fillText('空气劈尖', (leftX + rightX) / 2, (botY + topY) / 2 + 10 * scale);

    // 入射光线（多条垂直箭头）
    const rayCount = 5;
    const rayStartY = h * 0.03;
    c.strokeStyle = accent;
    c.lineWidth = 1.5 * scale;
    c.globalAlpha = 0.5;
    for (let i = 0; i < rayCount; i++) {
      const rx = leftX + (rightX - leftX) * (0.15 + i * 0.18);
      // 找到上板对应的 y 坐标
      const plateY = botY - (rx - leftX) / (rightX - leftX) * wedgeH;
      c.beginPath();
      c.moveTo(rx, rayStartY);
      c.lineTo(rx, plateY - 5 * scale);
      c.stroke();
      // 箭头
      drawArrow(c, rx, rayStartY, rx, plateY - 8 * scale, 4 * scale);
    }
    c.globalAlpha = 1;

    // 光标 P（可移动竖线）
    const px = leftX + (rightX - leftX) * next.cursorX;
    const py = botY - (px - leftX) / (rightX - leftX) * wedgeH;
    c.strokeStyle = accent;
    c.lineWidth = 1.5 * scale;
    c.setLineDash([3 * scale, 2 * scale]);
    c.beginPath();
    c.moveTo(px, botY + 15 * scale);
    c.lineTo(px, py - 15 * scale);
    c.stroke();
    c.setLineDash([]);

    // P 点
    c.fillStyle = accent;
    c.beginPath();
    c.arc(px, py, 4 * scale, 0, Math.PI * 2);
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
      c.font = `italic ${Math.max(10, 12 * scale)}px sans-serif`;
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
      c.font = `${Math.max(10, 12 * scale)}px sans-serif`;
      c.fillText('x', (leftX + px) / 2, botY + 38 * scale);
    }

    // 劈尖角 θ（用真实物理角度绘制弧线）
    if (step !== 'geometry') {
      const thetaR = 18 * scale;
      c.strokeStyle = dim;
      c.lineWidth = 1 * scale;
      c.beginPath();
      c.arc(leftX, botY, thetaR, -thetaRad * 0.9, 0);
      c.stroke();
      c.fillStyle = text;
      c.textAlign = 'left';
      c.fillText('θ', leftX + thetaR + 4 * scale, botY - thetaR * 0.3);
    }

    // 阶段特定内容
    if (step === 'path-diff') {
      drawPathDiffPhase(c, { w, h, text, dim, accent, px, py, botY, leftX, rightX, scale, state: next });
    } else if (step === 'equal-thickness') {
      drawEqualThicknessPhase(c, { w, h, text, dim, accent, leftX, rightX, botY, topY, scale, state: next });
    } else if (step === 'result') {
      drawResultPhase(c, { w, h, text, dim, accent, leftX, rightX, botY, topY, scale, state: next });
    }

    // 底部公式（放在几何图和曲线之间）
    if (step === 'geometry') {
      const fy = botY + 18 * scale;
      c.fillStyle = dim;
      c.font = `${Math.max(11, 14 * scale)}px sans-serif`;
      c.textAlign = 'center';
      c.fillText('d = x·tanθ', w / 2, fy);
    }

    c.restore();

    // 光强曲线（几何图下方，紧凑）
    drawIntensityCurve(next, { text, dim, accent, bg, leftX, rightX, botY, scale });

    // 干涉条纹（主 canvas 底部）
    drawFringeOnMainCanvas(next, { text, dim, accent, leftX, rightX, scale });

    // 图表区（右侧，仅波叠加）
    drawWaveSuperpositionGraph(next);
  }

  function drawIntensityCurve(
    state: WedgeState,
    g: { text: string; dim: string; accent: string; bg: string; leftX: number; rightX: number; botY: number; scale: number }
  ): void {
    const c = ctx;
    if (!c) return;
    const { text, dim, accent, leftX, rightX, botY, scale } = g;
    const h = cssHeight;

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
    c.lineWidth = 1.5 * scale;
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
    c.font = `${Math.max(9, 11 * scale)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('x', (leftX + rightX) / 2, curveBot + 14 * scale);
    c.textAlign = 'right';
    c.fillText('I', leftX - 6 * scale, curveTop + 10 * scale);

    c.restore();
  }

  // ── 在主 canvas 底部绘制竖直干涉条纹 ──
  function drawFringeOnMainCanvas(
    next: WedgeState,
    g: { text: string; dim: string; accent: string; leftX: number; rightX: number; scale: number }
  ): void {
    const c = ctx;
    if (!c) return;
    const { text, accent, leftX, rightX, scale } = g;
    const h = cssHeight;

    const stripeTop = h * 0.60;
    const stripeH = h * 0.18;
    const stripeW = rightX - leftX;

    c.save();

    // 标题
    c.fillStyle = text;
    c.font = `${Math.max(9, 11 * scale)}px sans-serif`;
    c.textAlign = 'left';
    c.fillText('干涉条纹（等厚线）', leftX, stripeTop - 6 * scale);

    // 物理参数
    const lambda = next.params.lambda;
    const thetaRad = next.params.theta * (Math.PI / 180);
    const fringeSpacing = (lambda * 1e-6) / (2 * Math.sin(thetaRad)); // mm

    // 固定显示范围 2 mm，让 θ 变化时条纹密度在视觉上明显变化
    const displayL = 2.0; // mm
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
    c.font = `${Math.max(8, 10 * scale)}px sans-serif`;
    const labelStep = fringeSpacing < 0.02 ? 10 : fringeSpacing < 0.05 ? 5 : fringeSpacing < 0.15 ? 2 : 1;
    for (let m = 0; m < 100; m++) {
      const xPos = m * fringeSpacing;
      if (xPos > displayL) break;
      if (m % labelStep !== 0) continue;
      const px = leftX + (xPos / displayL) * stripeW;
      c.fillText(`m=${m}`, px, stripeTop + stripeH + 12 * scale);
    }

    // 条纹间距标注
    c.fillStyle = text;
    c.font = `${Math.max(9, 11 * scale)}px sans-serif`;
    c.textAlign = 'left';
    c.fillText(`显示范围: 0 ~ ${displayL.toFixed(2)} mm   条纹间距 l = ${fringeSpacing.toFixed(3)} mm`, leftX, stripeTop + stripeH + 26 * scale);

    c.restore();
  }

  // ── 右侧图表区：仅波叠加示波器 ──
  function drawWaveSuperpositionGraph(next: WedgeState): void {
    const gc = graphCtx;
    const gCanvas = graphCanvas;
    if (!gc || !gCanvas) return;

    const rect = gCanvas.getBoundingClientRect();
    const gw = Math.max(200, Math.floor(rect.width || 400));
    const gh = Math.max(100, Math.floor(rect.height || 200));
    const gScale = parseFloat(gCanvas.dataset.responsiveScale || '1');
    const isDark = theme === 'dark';
    const text = isDark ? '#e2e8f0' : '#1e293b';
    const dim = isDark ? '#94a3b8' : '#64748b';

    gc.clearRect(0, 0, gw, gh);
    gc.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    gc.fillRect(0, 0, gw, gh);

    gc.save();
    // 波叠加占满整个 graphCanvas（全高）
    drawWaveSuperposition(gc, next, { gw, gh, gScale, text, dim, waveTop: gh * 0.06, waveBot: gh * 0.92 });
    gc.restore();
  }

  function drawWaveSuperposition(
    gc: CanvasRenderingContext2D,
    state: WedgeState,
    g: { gw: number; gh: number; gScale: number; text: string; dim: string; waveTop?: number; waveBot?: number }
  ): void {
    const { gw, gh, gScale, text, dim } = g;

    const waveTop = g.waveTop ?? gh * 0.58;
    const waveBot = g.waveBot ?? gh * 0.94;
    const waveH = waveBot - waveTop;
    const waveMid = waveTop + waveH / 2;

    // 标题
    gc.fillStyle = text;
    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    gc.fillText('P 点处两束光的叠加', 8 * gScale, waveTop + 12 * gScale);

    // 图例
    const legendY = waveTop + 12 * gScale;
    gc.strokeStyle = '#38bdf8';
    gc.lineWidth = 2 * gScale;
    gc.beginPath();
    gc.moveTo(gw * 0.55, legendY - 3 * gScale);
    gc.lineTo(gw * 0.65, legendY - 3 * gScale);
    gc.stroke();
    gc.fillStyle = '#38bdf8';
    gc.font = `${Math.max(8, 10 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    gc.fillText('光束1', gw * 0.67, legendY);

    gc.strokeStyle = '#fb7185';
    gc.beginPath();
    gc.moveTo(gw * 0.75, legendY - 3 * gScale);
    gc.lineTo(gw * 0.85, legendY - 3 * gScale);
    gc.stroke();
    gc.fillStyle = '#fb7185';
    gc.fillText('光束2', gw * 0.87, legendY);

    // 坐标轴
    gc.strokeStyle = dim;
    gc.lineWidth = 1 * gScale;
    gc.beginPath();
    gc.moveTo(40 * gScale, waveBot);
    gc.lineTo(gw - 10 * gScale, waveBot);
    gc.stroke();
    gc.beginPath();
    gc.moveTo(50 * gScale, waveTop + 16 * gScale);
    gc.lineTo(50 * gScale, waveBot);
    gc.stroke();

    const plotLeft = 52 * gScale;
    const plotRight = gw - 15 * gScale;
    const plotW = plotRight - plotLeft;
    const amp = waveH * 0.30;

    const t = state.time;
    const delta = state.phaseDiff;

    // 光束1：蓝色
    gc.strokeStyle = '#38bdf8';
    gc.lineWidth = 1.5 * gScale;
    gc.beginPath();
    for (let px = plotLeft; px <= plotRight; px += 1) {
      const x = ((px - plotLeft) / plotW) * 4 * Math.PI;
      const y = Math.cos(x + t);
      const py = waveMid - y * amp;
      if (px === plotLeft) gc.moveTo(px, py);
      else gc.lineTo(px, py);
    }
    gc.stroke();

    // 光束2：红色
    gc.strokeStyle = '#fb7185';
    gc.lineWidth = 1.5 * gScale;
    gc.beginPath();
    for (let px = plotLeft; px <= plotRight; px += 1) {
      const x = ((px - plotLeft) / plotW) * 4 * Math.PI;
      const y = Math.cos(x + t + delta);
      const py = waveMid - y * amp;
      if (px === plotLeft) gc.moveTo(px, py);
      else gc.lineTo(px, py);
    }
    gc.stroke();

    // 合成波：黄色
    gc.strokeStyle = '#fbbf24';
    gc.lineWidth = 2 * gScale;
    gc.beginPath();
    for (let px = plotLeft; px <= plotRight; px += 1) {
      const x = ((px - plotLeft) / plotW) * 4 * Math.PI;
      const y1 = Math.cos(x + t);
      const y2 = Math.cos(x + t + delta);
      const y = (y1 + y2) * 0.5;
      const py = waveMid - y * amp;
      if (px === plotLeft) gc.moveTo(px, py);
      else gc.lineTo(px, py);
    }
    gc.stroke();

    // 光强指示条
    const intensity = Math.cos(delta / 2) ** 2;
    const barX = gw - 28 * gScale;
    const barTop = waveTop + 22 * gScale;
    const barBot = waveBot - 5 * gScale;
    const barH = barBot - barTop;

    gc.fillStyle = dim;
    gc.globalAlpha = 0.3;
    gc.fillRect(barX, barTop, 10 * gScale, barH);
    gc.globalAlpha = 1;

    const fillH = intensity * barH;
    gc.fillStyle = `rgba(251, 191, 36, ${0.4 + intensity * 0.6})`;
    gc.fillRect(barX, barBot - fillH, 10 * gScale, fillH);

    gc.fillStyle = text;
    gc.font = `${Math.max(8, 10 * gScale)}px sans-serif`;
    gc.textAlign = 'center';
    gc.fillText('I', barX + 5 * gScale, barTop - 4 * gScale);

    // 相位差 + 光强文字
    gc.fillStyle = text;
    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    const deg = ((delta * 180 / Math.PI) % 360 + 360) % 360;
    gc.fillText(`δ = ${deg.toFixed(0)}°`, plotLeft, waveBot + 14 * gScale);
    gc.fillText(`I = ${(intensity * 100).toFixed(0)}%`, plotLeft + 70 * gScale, waveBot + 14 * gScale);
    gc.fillText(state.intensity > 0.5 ? '明纹' : '暗纹', plotLeft + 140 * gScale, waveBot + 14 * gScale);
  }

  function drawArrow(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
    c.moveTo(x2, y2);
    c.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
    c.stroke();
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 200, g: 200, b: 200 };
  }

  return {
    render(next: WedgeState): void {
      resizeCanvas();
      resizeGraphCanvas();
      drawScene(next);
    },
    resize(): void {
      resizeCanvas();
      resizeGraphCanvas();
    },
    setTheme(t: TeachingTheme): void {
      theme = t;
    },
    setMode(): void {},
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graphCanvas = canvas;
      resizeGraphCanvas();
    },
    dispose(): void {}
  };
}

// ── path-diff 阶段 ──
function drawPathDiffPhase(
  c: CanvasRenderingContext2D,
  g: { w: number; h: number; text: string; dim: string; accent: string; px: number; py: number; botY: number; leftX: number; rightX: number; scale: number; state: WedgeState }
): void {
  const { text, dim, accent, px, py, botY, scale } = g;
  c.save();
  c.font = `${Math.max(10, 13 * scale)}px sans-serif`;

  // 两束反射光示意（在 P 点上方）
  const rayY = py - 40 * scale;
  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale;
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
  c.font = `${Math.max(11, 14 * scale)}px sans-serif`;
  c.fillText('Δ = 2d + λ/2', g.w / 2, g.h * 0.88);

  // 半波损失标注
  c.fillStyle = dim;
  c.font = `${Math.max(9, 11 * scale)}px sans-serif`;
  c.fillText('下表面反射有 λ/2 附加光程差（半波损失）', g.w / 2, g.h * 0.93);

  c.restore();
}

// ── equal-thickness 阶段 ──
function drawEqualThicknessPhase(
  c: CanvasRenderingContext2D,
  g: { w: number; h: number; text: string; dim: string; accent: string; leftX: number; rightX: number; botY: number; topY: number; scale: number; state: WedgeState }
): void {
  const { text, dim, leftX, rightX, botY, topY, scale, state } = g;
  c.save();
  c.font = `${Math.max(10, 13 * scale)}px sans-serif`;

  const lambda = state.params.lambda;
  const thetaRad = state.params.theta * (Math.PI / 180);
  const L = state.params.L * 10; // mm

  // 等厚线（竖线标注各级条纹位置）
  c.strokeStyle = dim;
  c.lineWidth = 1 * scale;
  c.setLineDash([2 * scale, 3 * scale]);

  for (let m = 0; m < 8; m++) {
    // 暗纹位置：d = mλ/2 → x = mλ/(2tanθ)
    const xPos = (m * lambda / 2) / (Math.tan(thetaRad) * 1e6); // mm
    if (xPos > L) break;
    const px = leftX + (xPos / L) * (rightX - leftX);
    c.beginPath();
    c.moveTo(px, topY - 10 * scale);
    c.lineTo(px, botY + 10 * scale);
    c.stroke();

    c.fillStyle = dim;
    c.textAlign = 'center';
    c.font = `${Math.max(8, 10 * scale)}px sans-serif`;
    c.fillText(`m=${m}`, px, topY - 14 * scale);
  }
  c.setLineDash([]);

  // 公式
  c.fillStyle = text;
  c.font = `${Math.max(11, 14 * scale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('暗纹：2d = mλ   明纹：2d = (m+1/2)λ', g.w / 2, g.h * 0.88);

  c.restore();
}

// ── result 阶段 ──
function drawResultPhase(
  c: CanvasRenderingContext2D,
  g: { w: number; h: number; text: string; dim: string; accent: string; leftX: number; rightX: number; botY: number; topY: number; scale: number; state: WedgeState }
): void {
  const { text, accent, scale, state } = g;
  c.save();

  const fy = g.h * 0.88;
  c.fillStyle = accent;
  c.font = `bold ${Math.max(14, 20 * scale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('l = λ / (2 sin θ) ≈ λ / (2θ)', g.w / 2, fy);

  c.fillStyle = text;
  c.font = `${Math.max(10, 13 * scale)}px sans-serif`;
  c.fillText(`= ${state.fringeSpacing.toFixed(3)} mm = ${(state.fringeSpacing * 1e3).toFixed(1)} μm`, g.w / 2, fy + 24 * scale);

  c.fillStyle = g.dim;
  c.font = `${Math.max(9, 11 * scale)}px sans-serif`;
  c.fillText(`λ = ${state.params.lambda} nm   θ = ${state.params.theta.toFixed(3)}°`, g.w / 2, fy + 44 * scale);

  c.restore();
}
