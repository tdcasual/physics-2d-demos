/**
 * 双缝干涉 — 白光干涉渲染（叠加 / 曲线 / 条纹面板）
 */

import {
  FILTERS,
  computeFringeSpacingPx,
  lambdaToGap,
  lambdaToRgb
} from '../scene.sim';
import { SCENE_PALETTE, type ScenePalette } from './palette';

// 白光条纹面板离屏缓存（每个 view 实例一份，由工厂创建并传入）
export type WhiteFringeCache = {
  cvs: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  key: string;
};

export function createWhiteFringeCache(): WhiteFringeCache {
  return { cvs: null, ctx: null, key: '' };
}

export function computeWhiteFringeRgb(
  wavelengths: number[],
  slitDistance: number,
  L: number,
  halfWidth: number
): Uint8Array {
  const len = halfWidth * 2 + 1;
  const rgbBuf = new Float32Array(len * 3);

  for (const wl of wavelengths) {
    const [wr, wg, wb] = lambdaToRgb(wl);
    const fringeSpacingPx = computeFringeSpacingPx(wl, slitDistance, L);
    const visualFringePx = fringeSpacingPx * 0.7;
    const envelopeSpacingPx = visualFringePx * 8;
    for (let x = -halfWidth; x <= halfWidth; x++) {
      const phase = (Math.PI * x) / visualFringePx;
      const cos2 = Math.cos(phase) * Math.cos(phase);
      const beta = (Math.PI * x) / envelopeSpacingPx;
      const sinc = Math.abs(beta) < 1e-6 ? 1 : Math.sin(beta) / beta;
      const intensity = cos2 * sinc * sinc;
      const off = (x + halfWidth) * 3;
      rgbBuf[off] += (wr * intensity) / 255;
      rgbBuf[off + 1] += (wg * intensity) / 255;
      rgbBuf[off + 2] += (wb * intensity) / 255;
    }
  }

  let maxI = 0;
  for (let i = 0; i < len * 3; i += 3) {
    maxI = Math.max(maxI, rgbBuf[i], rgbBuf[i + 1], rgbBuf[i + 2]);
  }
  const norm = maxI > 0 ? 1 / maxI : 0;
  const rgb = new Uint8Array(len * 3);
  for (let i = 0; i < rgb.length; i++) {
    rgb[i] = Math.min(255, Math.round(rgbBuf[i] * norm * 255));
  }
  return rgb;
}

export function drawWhiteInterferenceOverlay(
  c: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  CY: number,
  d: number,
  L: number,
  time: number,
  wavelengths: number[],
  isDark: boolean,
  scale: number,
  contentScale: number
): void {
  const regionTop = CY - 130;
  const regionBottom = CY + 130;
  const stepY = scale > 1.2 ? 3 : 4;
  const pulse = 0.85 + 0.15 * Math.sin(time * 0.04);
  const baseAlpha = isDark ? 0.22 * pulse : 0.14 * pulse;
  const slitWidthA = d / 3.5;
  // 预计算波长数据
  const wlData = wavelengths.map((wl) => {
    const [r, g, b] = lambdaToRgb(wl);
    return { r, g, b, lambdaPx: lambdaToGap(wl) * 0.35 };
  });

  for (let y = regionTop; y <= regionBottom; y += stepY) {
    const dy = y - CY;
    let rr = 0,
      gg = 0,
      bb = 0;
    for (const wd of wlData) {
      const delta = (dy * d) / L;
      const phase = (Math.PI * delta) / wd.lambdaPx;
      const cos2 = Math.cos(phase) * Math.cos(phase);
      const a = (Math.PI * (dy * slitWidthA)) / L / wd.lambdaPx;
      const sinc = a === 0 ? 1 : Math.sin(a) / a;
      const intensity = cos2 * sinc * sinc;
      rr += (wd.r * intensity) / 255;
      gg += (wd.g * intensity) / 255;
      bb += (wd.b * intensity) / 255;
    }
    const maxC = Math.max(rr, gg, bb, 0.001);
    const alpha = Math.min(0.85, maxC * baseAlpha * 3);
    c.fillStyle = `rgba(${Math.min(255, Math.round((rr / maxC) * 255))},${Math.min(255, Math.round((gg / maxC) * 255))},${Math.min(255, Math.round((bb / maxC) * 255))},${alpha.toFixed(3)})`;
    c.fillRect(startX, y, endX - startX, stepY);
  }

  c.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const labelSize = Math.max(10, 11 * Math.min(scale, 1.5) * contentScale);
  c.font = `${labelSize}px sans-serif`;
  c.textAlign = 'center';
  const midX = startX + (endX - startX) * 0.5;
  c.fillText('各波长独立干涉后叠加', midX, regionTop - 10);
  c.fillText('中央白色 · 两侧彩虹色', midX, regionBottom + 18);
}

export function drawWhiteInterferencePattern(
  c: CanvasRenderingContext2D,
  startX: number,
  CY: number,
  d: number,
  L: number,
  wavelengths: number[],
  scene: ScenePalette,
  isDark: boolean,
  scale: number,
  contentScale: number
): void {
  const slitWidthA = d / 3.5;
  c.beginPath();
  c.lineWidth = Math.max(2.5, 3.5 * Math.min(scale, 1.5) * contentScale);
  const ss = scale > 1.2 ? 2 : 3;
  // 预计算波长数据
  const wlData = wavelengths.map((wl) => {
    const [r, g, b] = lambdaToRgb(wl);
    return { r, g, b, lambdaPx: lambdaToGap(wl) * 0.35 };
  });

  for (let y = -120; y <= 120; y += ss) {
    let rr = 0,
      gg = 0,
      bb = 0;
    for (const wd of wlData) {
      const delta = (y * d) / L;
      const phase = (Math.PI * delta) / wd.lambdaPx;
      const cos2 = Math.cos(phase) * Math.cos(phase);
      const a = (Math.PI * (y * slitWidthA)) / L / wd.lambdaPx;
      const sinc = a === 0 ? 1 : Math.sin(a) / a;
      const intensity = cos2 * sinc * sinc;
      rr += (wd.r * intensity) / 255;
      gg += (wd.g * intensity) / 255;
      bb += (wd.b * intensity) / 255;
    }
    const maxC = Math.max(rr, gg, bb, 0.01);
    const py = CY + y;
    const total = (rr + gg + bb) / 3;
    const px = startX + 10 + total * 35;
    if (y === -120) c.moveTo(px, py);
    else c.lineTo(px, py);
    c.fillStyle = `rgb(${Math.min(255, Math.round((rr / maxC) * 255))},${Math.min(255, Math.round((gg / maxC) * 255))},${Math.min(255, Math.round((bb / maxC) * 255))})`;
    c.fillRect(startX - 2, py, 4, ss);
  }
  c.strokeStyle = isDark ? 'rgba(200,200,200,0.6)' : 'rgba(120,120,120,0.6)';
  c.stroke();

  c.setLineDash([4, 4]);
  c.strokeStyle = scene.guide;
  c.beginPath();
  c.moveTo(startX, CY);
  c.lineTo(startX + 50, CY);
  c.stroke();
  c.setLineDash([]);
}

// 白光条纹面板（离屏 canvas 缓存）
export function drawWhiteFringeDisplay(
  c: CanvasRenderingContext2D,
  cache: WhiteFringeCache,
  slitDistance: number,
  L: number,
  wavelengths: number[],
  filterColor: string | null | undefined,
  isDark: boolean,
  W: number,
  H: number,
  contentScale: number
): void {
  const key = `white:${filterColor || 'none'},${slitDistance},${L},${isDark ? 1 : 0},${contentScale}`;
  if (!cache.cvs || cache.key !== key) {
    if (!cache.cvs) {
      cache.cvs = document.createElement('canvas');
      cache.cvs.width = 382;
      cache.cvs.height = 155;
      cache.ctx = cache.cvs.getContext('2d');
    } else {
      cache.ctx!.clearRect(0, 0, 382, 155);
    }
    const fc = cache.ctx!;
    const panelX = 1,
      panelW = 380,
      panelH = 135,
      panelY = 18;
    const scene = SCENE_PALETTE[isDark ? 'dark' : 'light'];

    fc.fillStyle = isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)';
    fc.fillRect(panelX, panelY - 16, panelW, panelH + 20);
    fc.strokeStyle = scene.tubeBorder;
    fc.lineWidth = 1.5;
    fc.strokeRect(panelX, panelY - 16, panelW, panelH + 20);

    const modeLabel =
      filterColor && FILTERS[filterColor as keyof typeof FILTERS]
        ? `${FILTERS[filterColor as keyof typeof FILTERS].label}色滤光片`
        : '白光（无滤光片）';
    fc.fillStyle = scene.text;
    fc.font = `${12 * contentScale}px sans-serif`;
    fc.textAlign = 'left';
    fc.fillText(`干涉条纹（${modeLabel}）`, panelX + 6, panelY - 4);

    const n = Math.ceil(panelW * 0.5);
    const len = n * 2 + 1;
    const rgbBuf = new Float32Array(len * 3);

    for (const wl of wavelengths) {
      const [wr, wg, wb] = lambdaToRgb(wl);
      const fringeSpacingPx = computeFringeSpacingPx(wl, slitDistance, L);
      const visualFringePx = fringeSpacingPx * 0.7;
      const envelopeSpacingPx = visualFringePx * 8;
      for (let x = -n; x <= n; x++) {
        const phase = (Math.PI * x) / visualFringePx;
        const cos2 = Math.cos(phase) * Math.cos(phase);
        const beta = (Math.PI * x) / envelopeSpacingPx;
        const sinc = Math.abs(beta) < 1e-6 ? 1 : Math.sin(beta) / beta;
        const intensity = cos2 * sinc * sinc;
        const off = (x + n) * 3;
        rgbBuf[off] += (wr * intensity) / 255;
        rgbBuf[off + 1] += (wg * intensity) / 255;
        rgbBuf[off + 2] += (wb * intensity) / 255;
      }
    }

    let maxI = 0;
    for (let i = 0; i < len * 3; i += 3) {
      maxI = Math.max(maxI, rgbBuf[i], rgbBuf[i + 1], rgbBuf[i + 2]);
    }
    const norm = maxI > 0 ? 1 / maxI : 0;
    for (let i = 0; i < len; i++) {
      const x = i - n;
      const px = panelX + panelW * 0.5 + x;
      if (px < panelX || px > panelX + panelW) continue;
      const off = i * 3;
      const r = Math.min(255, Math.round(rgbBuf[off] * norm * 255));
      const g = Math.min(255, Math.round(rgbBuf[off + 1] * norm * 255));
      const b = Math.min(255, Math.round(rgbBuf[off + 2] * norm * 255));
      fc.fillStyle = `rgb(${r},${g},${b})`;
      fc.fillRect(px, panelY, 1, panelH);
    }
    cache.key = key;
  }
  c.drawImage(cache.cvs, W * 0.6, H * 0.66);
}
