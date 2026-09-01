/**
 * 双缝干涉 — 图表区干涉条纹绘制（常驻）
 *
 * 原 scene.view.ts 中依赖闭包状态（graphCtx / graphCanvas / theme）的
 * drawFringeGraph，此处改为显式参数传递，绘制逻辑逐行不变。
 *
 * 尺寸与 scale 由调用方持有的 CanvasViewport 记录值传入（resize 时更新），
 * 渲染热路径不再读 getBoundingClientRect / dataset。
 * 条纹图案按（λ, d, L, 尺寸, 步长, 主题）key 缓存在离屏 canvas 中，
 * 避免每帧逐像素 fillRect + rgb 字符串分配（参考 thin-film 的参数 key 缓存）。
 */

import type { TeachingTheme } from '../../../platform/standards';
import { wavelengthToColor, lambdaToRgb } from '../../../core/wavelength';
import type { InterferenceFormulaState } from '../scene.sim';
import { drawArrowLine } from './view-utils';

/** 条纹绘制所需的 viewport 记录值（与 CanvasViewport 对应字段结构兼容） */
export type FringeGraphMetrics = {
  /** 记录的 CSS 宽（resize 时 clamp 记录） */
  cssWidth: number;
  /** 记录的 CSS 高 */
  cssHeight: number;
  /** 记录的响应式缩放因子 */
  responsiveScale: number;
  /** 记录的设备像素比 canvas.width / max(1, cssWidth) */
  dpr: number;
};

// 条纹离屏缓存：内容仅随 key 变化，key 未变时直接 drawImage 复用
let fringeCache: {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  key: string;
} | null = null;

/**
 * 逐列计算条纹强度并填入目标上下文（x 从 0 起，对应主画布 stripeX 偏移）。
 * 离屏缓存重绘与（理论上的）直绘兜底共用同一实现，保证像素一致。
 */
function paintFringeColumns(
  target: CanvasRenderingContext2D,
  stripeW: number,
  stripeH: number,
  stepPx: number,
  range: number,
  lambdaM: number,
  dM: number,
  L: number,
  lambdaNm: number,
  isDark: boolean
): void {
  const [cr, cg, cb] = lambdaToRgb(lambdaNm);
  const bgR = isDark ? 15 : 248;
  const bgG = isDark ? 23 : 250;
  const bgB = isDark ? 42 : 252;

  for (let px = 0; px < stripeW; px += stepPx) {
    const xPhysical = ((px - stripeW / 2) / (stripeW / 2)) * range;
    const phase = (Math.PI * dM * xPhysical) / (lambdaM * L);
    const intensity = Math.cos(phase) ** 2;
    const rr = Math.round(bgR + (cr - bgR) * intensity);
    const rg = Math.round(bgG + (cg - bgG) * intensity);
    const rb = Math.round(bgB + (cb - bgB) * intensity);
    target.fillStyle = `rgb(${rr},${rg},${rb})`;
    target.fillRect(px, 0, stepPx, stripeH);
  }
}

export function drawFringeGraph(
  graphCtx: CanvasRenderingContext2D | null,
  graphCanvas: HTMLCanvasElement | null,
  metrics: FringeGraphMetrics,
  next: InterferenceFormulaState,
  modeScale: number,
  theme: TeachingTheme
): void {
  const gc = graphCtx;
  const gCanvas = graphCanvas;
  if (!gc || !gCanvas) return;

  // 使用 resize 记录的尺寸/scale/dpr，避免每帧同步布局查询
  const gw = metrics.cssWidth;
  const gh = metrics.cssHeight;
  const gScale = metrics.responsiveScale;
  const isDark = theme === 'dark';
  const text = isDark ? '#e2e8f0' : '#1e293b';
  const dim = isDark ? '#94a3b8' : '#64748b';
  const accent = wavelengthToColor(next.params.lambda);

  // DPR-aware clear: pixel-space fillRect before setTransform
  const gDpr = metrics.dpr;
  gc.clearRect(0, 0, gCanvas.width, gCanvas.height);
  gc.fillStyle = isDark ? '#0f172a' : '#f8fafc';
  gc.fillRect(0, 0, gCanvas.width, gCanvas.height);
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

    // 条纹图案离屏缓存：参数/尺寸/主题/DPR 未变时跳过重绘。
    // 离屏按设备像素创建，在离屏 ctx 上 setTransform(gDpr) 后按 CSS
    // 坐标逐列绘制；主画布 drawImage 显式源/目标矩形缩回 CSS 尺寸，
    // 避免当前 gDpr transform 把 CSS 尺寸离屏图再放大一遍导致模糊。
    const offW = Math.max(1, Math.ceil(stripeW * gDpr));
    const offH = Math.max(1, Math.ceil(stripeH * gDpr));
    const offKey = `${params.lambda}_${params.d}_${params.L}_${offW}_${offH}_${stepPx}_${isDark ? 1 : 0}_${gDpr}`;
    if (
      !fringeCache ||
      fringeCache.canvas.width !== offW ||
      fringeCache.canvas.height !== offH
    ) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = offW;
      offCanvas.height = offH;
      const offCtx = offCanvas.getContext('2d');
      fringeCache = offCtx ? { canvas: offCanvas, ctx: offCtx, key: '' } : null;
    }
    if (fringeCache) {
      if (fringeCache.key !== offKey) {
        fringeCache.key = offKey;
        const offCtx = fringeCache.ctx;
        offCtx.setTransform(1, 0, 0, 1, 0, 0);
        offCtx.clearRect(0, 0, offW, offH);
        offCtx.setTransform(gDpr, 0, 0, gDpr, 0, 0);
        paintFringeColumns(
          offCtx,
          stripeW,
          stripeH,
          stepPx,
          range,
          lambdaM,
          dM,
          params.L,
          params.lambda,
          isDark
        );
      }
      gc.drawImage(
        fringeCache.canvas,
        0,
        0,
        fringeCache.canvas.width,
        fringeCache.canvas.height,
        stripeX,
        stripeY,
        stripeW,
        stripeH
      );
    } else {
      // 离屏上下文不可用（理论上不发生）时退回直绘，保证图案不缺失；
      // paintFringeColumns 的 x 从 0 起，平移到条纹区原点以复用同一实现
      gc.save();
      gc.translate(stripeX, stripeY);
      paintFringeColumns(
        gc,
        stripeW,
        stripeH,
        stepPx,
        range,
        lambdaM,
        dM,
        params.L,
        params.lambda,
        isDark
      );
      gc.restore();
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
