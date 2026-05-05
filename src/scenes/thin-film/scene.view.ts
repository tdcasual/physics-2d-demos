/**
 * 薄膜干涉 — Canvas 渲染
 */

import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { ThinFilmState } from './scene.sim';
import { wavelengthToColor } from '../double-slit/scene.view';

export type CreateThinFilmViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
};

const DEG_TO_RAD = Math.PI / 180;

export function createThinFilmView(options: CreateThinFilmViewOptions = {}) {
  let canvas = options.canvas ?? null;
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

  function drawScene(next: ThinFilmState): void {
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
    const incidence = next.params.incidence;
    const refraction = next.refraction;
    const iRad = incidence * DEG_TO_RAD;
    const rRad = refraction * DEG_TO_RAD;

    // 几何基线
    const filmX = w * 0.35;
    const filmW = w * 0.45;
    const filmTopY = h * 0.42;
    const filmBotY = h * 0.58;
    const d = filmBotY - filmTopY;

    c.save();
    c.lineWidth = 2 * scale;
    c.font = `${Math.max(10, 13 * scale)}px sans-serif`;

    // 薄膜填充
    c.fillStyle = isDark ? 'rgba(56,189,248,0.10)' : 'rgba(56,189,248,0.15)';
    c.fillRect(filmX, filmTopY, filmW, d);

    // 上表面
    c.strokeStyle = text;
    c.lineWidth = 2.5 * scale;
    c.beginPath();
    c.moveTo(filmX - 20 * scale, filmTopY);
    c.lineTo(filmX + filmW + 20 * scale, filmTopY);
    c.stroke();

    // 下表面
    c.beginPath();
    c.moveTo(filmX - 20 * scale, filmBotY);
    c.lineTo(filmX + filmW + 20 * scale, filmBotY);
    c.stroke();

    // 空气区标签
    c.fillStyle = dim;
    c.textAlign = 'center';
    c.font = `${Math.max(9, 11 * scale)}px sans-serif`;
    c.fillText('空气 n=1', filmX + filmW / 2, filmTopY - 30 * scale);
    c.fillText(`薄膜 n=${next.params.n.toFixed(2)}`, filmX + filmW / 2, (filmTopY + filmBotY) / 2 + 4 * scale);
    c.fillText('玻璃/基底', filmX + filmW / 2, filmBotY + 18 * scale);

    // 入射点（上表面）
    const incidentX = filmX + filmW * 0.35;
    const incidentLen = h * 0.28;

    // 入射光线
    c.strokeStyle = accent;
    c.lineWidth = 2 * scale;
    c.beginPath();
    c.moveTo(incidentX - incidentLen * Math.sin(iRad), filmTopY - incidentLen * Math.cos(iRad));
    c.lineTo(incidentX, filmTopY);
    c.stroke();
    drawArrow(c, incidentX - incidentLen * Math.sin(iRad), filmTopY - incidentLen * Math.cos(iRad), incidentX, filmTopY, 5 * scale);

    // 第一束反射光（上表面直接反射）
    c.globalAlpha = 0.7;
    c.beginPath();
    c.moveTo(incidentX, filmTopY);
    c.lineTo(incidentX + incidentLen * Math.sin(iRad) * 0.7, filmTopY - incidentLen * Math.cos(iRad) * 0.7);
    c.stroke();
    drawArrow(c, incidentX, filmTopY, incidentX + incidentLen * Math.sin(iRad) * 0.7, filmTopY - incidentLen * Math.cos(iRad) * 0.7, 5 * scale);
    c.globalAlpha = 1;

    // 折射光线（进入薄膜）
    const refractLen = incidentLen * 0.6;
    const refractX = incidentX + refractLen * Math.sin(rRad);
    const refractY = filmTopY + refractLen * Math.cos(rRad);
    c.strokeStyle = accent;
    c.setLineDash([4 * scale, 3 * scale]);
    c.beginPath();
    c.moveTo(incidentX, filmTopY);
    c.lineTo(refractX, refractY);
    c.stroke();
    c.setLineDash([]);

    // 第二束反射光（下表面反射→折射出面）
    const reflectLen = refractLen * 0.9;
    const reflectX = refractX - reflectLen * Math.sin(rRad);
    const reflectY = refractY + reflectLen * Math.cos(rRad);
    c.setLineDash([4 * scale, 3 * scale]);
    c.beginPath();
    c.moveTo(refractX, refractY);
    c.lineTo(reflectX, reflectY);
    c.stroke();
    c.setLineDash([]);

    // 第二束折射出射
    const emergeLen = incidentLen * 0.7;
    c.globalAlpha = 0.7;
    c.beginPath();
    c.moveTo(reflectX, reflectY);
    c.lineTo(reflectX + emergeLen * Math.sin(iRad) * 0.7, reflectY - emergeLen * Math.cos(iRad) * 0.7);
    c.stroke();
    drawArrow(c, reflectX, reflectY, reflectX + emergeLen * Math.sin(iRad) * 0.7, reflectY - emergeLen * Math.cos(iRad) * 0.7, 5 * scale);
    c.globalAlpha = 1;

    // 入射角 i 标注
    if (step !== 'geometry') {
      const arcR = 22 * scale;
      c.strokeStyle = dim;
      c.lineWidth = 1 * scale;
      c.beginPath();
      c.arc(incidentX, filmTopY, arcR, -Math.PI / 2, -Math.PI / 2 + iRad);
      c.stroke();
      c.fillStyle = text;
      c.textAlign = 'left';
      c.fillText('i', incidentX + 8 * scale, filmTopY - arcR - 4 * scale);
    }

    // 折射角 r 标注
    if (step !== 'geometry') {
      const arcR2 = 20 * scale;
      c.strokeStyle = dim;
      c.lineWidth = 1 * scale;
      c.beginPath();
      c.arc(incidentX, filmTopY, arcR2, Math.PI / 2, Math.PI / 2 + rRad);
      c.stroke();
      c.fillStyle = text;
      c.textAlign = 'left';
      c.fillText('r', incidentX + 8 * scale, filmTopY + arcR2 + 12 * scale);
    }

    // 厚度 d 标注
    if (step !== 'geometry') {
      c.strokeStyle = dim;
      c.lineWidth = 1 * scale;
      const dx = filmX + filmW + 12 * scale;
      c.beginPath();
      c.moveTo(dx, filmTopY);
      c.lineTo(dx, filmBotY);
      c.stroke();
      c.fillStyle = text;
      c.textAlign = 'left';
      c.font = `italic ${Math.max(10, 12 * scale)}px sans-serif`;
      c.fillText('d', dx + 6 * scale, (filmTopY + filmBotY) / 2 + 3 * scale);
    }

    // 阶段特定内容
    if (step === 'path-diff') {
      drawPathDiffPhase(c, { w, h, text, dim, accent, filmX, filmTopY, filmBotY, incidentX, scale, state: next });
    } else if (step === 'half-wave') {
      drawHalfWavePhase(c, { w, h, text, dim, accent, scale, state: next });
    } else if (step === 'result') {
      drawResultPhase(c, { w, h, text, dim, accent, scale, state: next });
    }

    // 底部公式
    if (step === 'geometry') {
      const fy = h * 0.90;
      c.fillStyle = dim;
      c.font = `${Math.max(11, 14 * scale)}px sans-serif`;
      c.textAlign = 'center';
      c.fillText('sin i = n·sin r', w / 2, fy);
    }

    c.restore();

    // 图表区
    drawReflectivityGraph(next);
  }

  function drawReflectivityGraph(next: ThinFilmState): void {
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
    const accent = wavelengthToColor(next.params.lambda);

    gc.clearRect(0, 0, gw, gh);
    gc.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    gc.fillRect(0, 0, gw, gh);

    gc.save();
    gc.font = `${Math.max(10, 12 * gScale)}px sans-serif`;

    // 标题
    gc.fillStyle = text;
    gc.textAlign = 'left';
    gc.fillText(`d = ${next.params.d} nm  n = ${next.params.n.toFixed(2)}  i = ${next.params.incidence}°`, 8 * gScale, 18 * gScale);

    // 反射光强随波长曲线
    const d = next.params.d;
    const n = next.params.n;
    const iRad = next.params.incidence * DEG_TO_RAD;
    const curveTop = gh * 0.22;
    const curveBot = gh * 0.50;
    const curveH = curveBot - curveTop;

    gc.strokeStyle = dim;
    gc.lineWidth = 1 * gScale;
    gc.beginPath();
    gc.moveTo(40 * gScale, curveBot);
    gc.lineTo(gw - 10 * gScale, curveBot);
    gc.stroke();

    // 曲线
    gc.strokeStyle = accent;
    gc.lineWidth = 1.5 * gScale;
    gc.beginPath();
    for (let px = 40 * gScale; px <= gw - 10 * gScale; px += 2) {
      const lambda = 400 + ((px - 40 * gScale) / (gw - 50 * gScale)) * 300; // 400-700 nm
      const rRad = Math.asin(Math.max(-1, Math.min(1, Math.sin(iRad) / n)));
      const opticalPath = 2 * n * d * Math.cos(rRad);
      const pathDiff = opticalPath + lambda / 2;
      const phase = (Math.PI * pathDiff) / lambda;
      const reflectivity = Math.cos(phase) ** 2;
      const py = curveBot - reflectivity * curveH;
      if (px === 40 * gScale) gc.moveTo(px, py);
      else gc.lineTo(px, py);
    }
    gc.stroke();

    // 当前波长标记
    const curPx = 40 * gScale + ((next.params.lambda - 400) / 300) * (gw - 50 * gScale);
    gc.strokeStyle = accent;
    gc.lineWidth = 1.2 * gScale;
    gc.setLineDash([3 * gScale, 2 * gScale]);
    gc.beginPath();
    gc.moveTo(curPx, curveTop);
    gc.lineTo(curPx, curveBot);
    gc.stroke();
    gc.setLineDash([]);

    // 坐标标签
    gc.fillStyle = text;
    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'center';
    gc.fillText('400', 40 * gScale, curveBot + 14 * gScale);
    gc.fillText('700', gw - 10 * gScale, curveBot + 14 * gScale);
    gc.fillText('λ / nm', gw / 2, curveBot + 14 * gScale);
    gc.textAlign = 'right';
    gc.fillText('R', 35 * gScale, curveTop + 10 * gScale);

    // ── 波叠加示波器（下半部分）──
    drawWaveSuperposition(gc, next, { gw, gh, gScale, text, dim });

    gc.restore();
  }

  function drawWaveSuperposition(
    gc: CanvasRenderingContext2D,
    state: ThinFilmState,
    g: { gw: number; gh: number; gScale: number; text: string; dim: string }
  ): void {
    const { gw, gh, gScale, text, dim } = g;

    const waveTop = gh * 0.55;
    const waveBot = gh * 0.94;
    const waveH = waveBot - waveTop;
    const waveMid = waveTop + waveH / 2;

    // 标题
    gc.fillStyle = text;
    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    gc.fillText('反射光两束波的叠加', 8 * gScale, waveTop + 12 * gScale);

    // 图例
    const legendY = waveTop + 12 * gScale;
    gc.strokeStyle = '#38bdf8';
    gc.lineWidth = 2 * gScale;
    gc.beginPath();
    gc.moveTo(gw * 0.52, legendY - 3 * gScale);
    gc.lineTo(gw * 0.62, legendY - 3 * gScale);
    gc.stroke();
    gc.fillStyle = '#38bdf8';
    gc.font = `${Math.max(8, 10 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    gc.fillText('上表面', gw * 0.64, legendY);

    gc.strokeStyle = '#fb7185';
    gc.beginPath();
    gc.moveTo(gw * 0.74, legendY - 3 * gScale);
    gc.lineTo(gw * 0.84, legendY - 3 * gScale);
    gc.stroke();
    gc.fillStyle = '#fb7185';
    gc.fillText('下表面', gw * 0.86, legendY);

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

    // 光束1（上表面反射）：蓝色
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

    // 光束2（下表面反射）：红色
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
    gc.fillText('R', barX + 5 * gScale, barTop - 4 * gScale);

    // 相位差 + 光强文字
    gc.fillStyle = text;
    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    const deg = ((delta * 180 / Math.PI) % 360 + 360) % 360;
    gc.fillText(`δ = ${deg.toFixed(0)}°`, plotLeft, waveBot + 14 * gScale);
    gc.fillText(`R = ${(intensity * 100).toFixed(0)}%`, plotLeft + 70 * gScale, waveBot + 14 * gScale);
    gc.fillText(state.isConstructive ? '相长' : '相消', plotLeft + 140 * gScale, waveBot + 14 * gScale);
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

  return {
    render(next: ThinFilmState): void {
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
  g: { w: number; h: number; text: string; dim: string; accent: string; filmX: number; filmTopY: number; filmBotY: number; incidentX: number; scale: number; state: ThinFilmState }
): void {
  const { text, dim, accent, filmX, filmTopY, filmBotY, incidentX, scale, state } = g;
  c.save();
  c.font = `${Math.max(10, 13 * scale)}px sans-serif`;

  // 光程差路径标注
  c.fillStyle = text;
  c.textAlign = 'center';
  c.font = `${Math.max(11, 14 * scale)}px sans-serif`;
  c.fillText('Δ = 2nd·cos r', g.w / 2, g.h * 0.88);

  c.fillStyle = dim;
  c.font = `${Math.max(9, 11 * scale)}px sans-serif`;
  c.fillText(`n = ${state.params.n.toFixed(2)}   d = ${state.params.d} nm   r = ${state.refraction.toFixed(1)}°`, g.w / 2, g.h * 0.93);

  c.restore();
}

// ── half-wave 阶段 ──
function drawHalfWavePhase(
  c: CanvasRenderingContext2D,
  g: { w: number; h: number; text: string; dim: string; accent: string; scale: number; state: ThinFilmState }
): void {
  const { text, dim, accent, scale, state } = g;
  c.save();
  c.font = `${Math.max(10, 13 * scale)}px sans-serif`;

  // 半波损失说明
  c.fillStyle = text;
  c.textAlign = 'center';
  c.font = `${Math.max(11, 14 * scale)}px sans-serif`;
  c.fillText('上表面（空气→薄膜）：光密→光疏，无半波损失', g.w / 2, g.h * 0.84);
  c.fillText('下表面（薄膜→基底）：光疏→光密，有 λ/2 附加光程差', g.w / 2, g.h * 0.89);

  c.fillStyle = accent;
  c.font = `bold ${Math.max(12, 16 * scale)}px sans-serif`;
  c.fillText('总光程差  Δ = 2nd·cos r + λ/2', g.w / 2, g.h * 0.94);

  c.restore();
}

// ── result 阶段 ──
function drawResultPhase(
  c: CanvasRenderingContext2D,
  g: { w: number; h: number; text: string; dim: string; accent: string; scale: number; state: ThinFilmState }
): void {
  const { text, accent, dim, scale, state } = g;
  c.save();

  const fy = g.h * 0.86;
  const result = state.isConstructive ? '相长干涉（增强）' : '相消干涉（减弱）';

  c.fillStyle = state.isConstructive ? '#22c55e' : accent;
  c.font = `bold ${Math.max(14, 20 * scale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText(result, g.w / 2, fy);

  c.fillStyle = text;
  c.font = `${Math.max(10, 13 * scale)}px sans-serif`;
  c.fillText(`增强：2nd·cos r = (m+1/2)λ    相消：2nd·cos r = mλ`, g.w / 2, fy + 26 * scale);

  c.fillStyle = dim;
  c.font = `${Math.max(9, 11 * scale)}px sans-serif`;
  c.fillText(`Δ = ${(state.pathDiff / 1e3).toFixed(2)} μm   m ≈ ${state.order.toFixed(1)}   R = ${(state.reflectivity * 100).toFixed(1)}%`, g.w / 2, fy + 46 * scale);

  c.restore();
}
