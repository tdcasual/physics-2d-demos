/**
 * 双缝干涉 — 图表区干涉条纹绘制（常驻）
 *
 * 原 scene.view.ts 中依赖闭包状态（graphCtx / graphCanvas / theme）的
 * drawFringeGraph，此处改为显式参数传递，绘制逻辑逐行不变。
 */

import type { TeachingTheme } from '../../../platform/standards';
import { wavelengthToColor, lambdaToRgb } from '../../../core/wavelength';
import type { InterferenceFormulaState } from '../scene.sim';
import { drawArrowLine } from './view-utils';

export function drawFringeGraph(
  graphCtx: CanvasRenderingContext2D | null,
  graphCanvas: HTMLCanvasElement | null,
  next: InterferenceFormulaState,
  modeScale: number,
  theme: TeachingTheme
): void {
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

  // DPR-aware clear: pixel-space fillRect before setTransform
  const gDpr = gCanvas ? gCanvas.width / Math.max(1, gw) : 1;
  gc.clearRect(0, 0, gCanvas?.width ?? gw, gCanvas?.height ?? gh);
  gc.fillStyle = isDark ? '#0f172a' : '#f8fafc';
  gc.fillRect(0, 0, gCanvas?.width ?? gw, gCanvas?.height ?? gh);
  gc.setTransform(gDpr, 0, 0, gDpr, 0, 0);

  const { params, deltaX } = next;
  const lambdaM = params.lambda * 1e-9;
  const dM = params.d * 1e-3;

  const margin = 16 * gScale;
  const stripeX = margin;
  const stripeY = margin + 20 * gScale;
  const stripeW = gw - margin * 2;
  const stripeH = gh - stripeY - margin - 30 * gScale;

  if (stripeW > 10 && stripeH > 10) {
    gc.strokeStyle = text;
    gc.lineWidth = 1.5 * gScale;
    gc.strokeRect(stripeX, stripeY, stripeW, stripeH);

    // Fixed physical range so fringe pattern changes visibly with λ/d
    const defaultDeltaX = (650e-9 * 1.0) / 0.5e-3; // Δx at defaults: 1.3mm
    const range = 6 * defaultDeltaX;
    const stripeCenterX = stripeX + stripeW / 2;
    const stepPx = Math.max(1, gScale);

    const [cr, cg, cb] = lambdaToRgb(next.params.lambda);
    const bgR = isDark ? 15 : 248;
    const bgG = isDark ? 23 : 250;
    const bgB = isDark ? 42 : 252;

    for (let px = 0; px < stripeW; px += stepPx) {
      const xPhysical = ((px - stripeW / 2) / (stripeW / 2)) * range;
      const phase = (Math.PI * dM * xPhysical) / (lambdaM * params.L);
      const intensity = Math.cos(phase) ** 2;
      const rr = Math.round(bgR + (cr - bgR) * intensity);
      const rg = Math.round(bgG + (cg - bgG) * intensity);
      const rb = Math.round(bgB + (cb - bgB) * intensity);
      gc.fillStyle = `rgb(${rr},${rg},${rb})`;
      gc.fillRect(stripeX + px, stripeY, stepPx, stripeH);
    }

    // 中央亮纹
    gc.fillStyle = text;
    gc.textAlign = 'center';
    gc.font = `${Math.max(10, 12 * gScale)}px sans-serif`;
    gc.fillText('中央亮纹', stripeCenterX, stripeY + stripeH + 14 * gScale);

    // m=1 标注
    const firstStripeX = stripeCenterX + (stripeW / 2) * (deltaX / range);
    gc.strokeStyle = dim;
    gc.lineWidth = 1 * gScale;
    gc.setLineDash([3 * gScale, 3 * gScale]);
    gc.beginPath();
    gc.moveTo(firstStripeX, stripeY - 4 * gScale);
    gc.lineTo(firstStripeX, stripeY + stripeH + 4 * gScale);
    gc.stroke();
    gc.setLineDash([]);
    gc.fillStyle = dim;
    gc.fillText('m=1', firstStripeX, stripeY - 8 * gScale);

    // Δx 标注
    gc.strokeStyle = accent;
    gc.lineWidth = 1.5 * gScale;
    const ay = stripeY + stripeH + 26 * gScale;
    drawArrowLine(gc, stripeCenterX, ay, firstStripeX, ay, gScale);
    gc.fillStyle = accent;
    gc.font = `${Math.max(10, 12 * gScale)}px sans-serif`;
    gc.fillText(
      `Δx = ${(deltaX * 1e3).toFixed(2)} mm`,
      (stripeCenterX + firstStripeX) / 2,
      ay + 12 * gScale
    );
  }

  // 标题
  gc.fillStyle = text;
  gc.font = `bold ${Math.max(11, 13 * gScale * modeScale)}px sans-serif`;
  gc.textAlign = 'left';
  gc.fillText(
    `λ=${params.lambda}nm  L=${params.L.toFixed(1)}m  d=${params.d.toFixed(1)}mm`,
    margin,
    margin + 4 * gScale
  );
}
