/**
 * 劈尖干涉 — 右侧图表区：波叠加示波器
 */

import type { WedgeState } from '../scene.sim';
import type { WedgeViewContext } from './types';

// ── 右侧图表区：仅波叠加示波器 ──
export function drawWaveSuperpositionGraph(
  vc: WedgeViewContext,
  next: WedgeState
): void {
  const gc = vc.graphCtx;
  const gCanvas = vc.graphCanvas;
  if (!gc || !gCanvas) return;

  const rect = gCanvas.getBoundingClientRect();
  const gw = Math.max(200, Math.floor(rect.width || 400));
  const gh = Math.max(100, Math.floor(rect.height || 200));
  const gScale = parseFloat(gCanvas.dataset.responsiveScale || '1');
  const isDark = vc.theme === 'dark';
  const text = isDark ? '#e2e8f0' : '#1e293b';
  const dim = isDark ? '#94a3b8' : '#64748b';

  gc.clearRect(0, 0, gw, gh);
  gc.fillStyle = isDark ? '#0f172a' : '#f8fafc';
  gc.fillRect(0, 0, gw, gh);

  gc.save();
  // 波叠加占满整个 graphCanvas（全高）
  drawWaveSuperposition(gc, next, {
    gw,
    gh,
    gScale,
    text,
    dim,
    waveTop: gh * 0.06,
    waveBot: gh * 0.92
  });
  gc.restore();
}

function drawWaveSuperposition(
  gc: CanvasRenderingContext2D,
  state: WedgeState,
  g: {
    gw: number;
    gh: number;
    gScale: number;
    text: string;
    dim: string;
    waveTop?: number;
    waveBot?: number;
  }
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
  const amp = waveH * 0.3;

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
  const deg = ((((delta * 180) / Math.PI) % 360) + 360) % 360;
  gc.fillText(`δ = ${deg.toFixed(0)}°`, plotLeft, waveBot + 14 * gScale);
  gc.fillText(
    `I = ${(intensity * 100).toFixed(0)}%`,
    plotLeft + 70 * gScale,
    waveBot + 14 * gScale
  );
  gc.fillText(
    state.intensity > 0.5 ? '明纹' : '暗纹',
    plotLeft + 140 * gScale,
    waveBot + 14 * gScale
  );
}
