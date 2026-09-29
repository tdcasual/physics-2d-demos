/**
 * 双缝干涉 — 单色光干涉图样（步骤4 叠加 / 步骤5 曲线 / 步骤6 大图样）
 */

import { computeFringeSpacingPx } from '../scene.sim';
import type { ScenePalette, WavePalette } from './palette';
import { computeWhiteFringeRgb } from './draw-white';
import { DELTA_X_LABEL_SHIFT, STEP5_IMAGE_HALF } from './logical-metrics';

// 步骤6干涉图样 offscreen 缓存
let _step6Cvs: HTMLCanvasElement | null = null;
let _step6Ctx: CanvasRenderingContext2D | null = null;
let _step6Key = '';
// 步骤5干涉图样 offscreen 缓存
let _step5Cvs: HTMLCanvasElement | null = null;
let _step5Ctx: CanvasRenderingContext2D | null = null;
let _step5Key = '';
// 步骤4干涉叠加 offscreen 缓存
let _step4Cvs: HTMLCanvasElement | null = null;
let _step4Ctx: CanvasRenderingContext2D | null = null;
let _step4Key = '';

export function resetInterferenceCaches(): void {
  _step6Cvs = _step6Ctx = null;
  _step6Key = '';
  _step5Cvs = _step5Ctx = null;
  _step5Key = '';
  _step4Cvs = _step4Ctx = null;
  _step4Key = '';
}

export function drawInterferenceOverlay(
  c: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  CY: number,
  d: number,
  gap: number,
  palette: WavePalette,
  L: number,
  isDark: boolean,
  time: number,
  scale: number,
  contentScale: number
): void {
  const lambdaPx = gap * 0.35;
  const slitWidthA = d / 3.5;
  const regionH = 260;
  const regionTop = CY - 130;
  const regionBottom = CY + 130;
  const pulse = 0.85 + 0.15 * Math.sin(time * 0.04);
  const pulseQ = Math.round(pulse * 8) / 8; // 量化到 8 级
  const baseAlpha = isDark ? 0.22 * pulseQ : 0.14 * pulseQ;
  const stepY = scale > 1.2 ? 3 : 4;
  const regionW = endX - startX;

  // offscreen 缓存（key 不含 pulseQ，避免每帧失效；脉冲通过 globalAlpha 叠加）
  const key = `${d}_${gap}_${palette.screen}_${L}_${isDark ? 1 : 0}`;
  if (!_step4Cvs || _step4Key !== key) {
    const cw = Math.ceil(regionW);
    const ch = regionH;
    if (!_step4Cvs) {
      _step4Cvs = document.createElement('canvas');
      _step4Cvs.width = cw;
      _step4Cvs.height = ch;
      _step4Ctx = _step4Cvs.getContext('2d');
    } else if (_step4Cvs.width !== cw || _step4Cvs.height !== ch) {
      _step4Cvs.width = cw;
      _step4Cvs.height = ch;
    } else {
      _step4Ctx!.clearRect(0, 0, cw, ch);
    }
    const fc = _step4Ctx!;
    for (let dy = -130; dy <= 130; dy += stepY) {
      const py = 130 + dy;
      const delta = (dy * d) / L;
      const phase = (Math.PI * delta) / lambdaPx;
      const cos2 = Math.cos(phase) * Math.cos(phase);
      const a = (Math.PI * (dy * slitWidthA)) / L / lambdaPx;
      const sinc = a === 0 ? 1 : Math.sin(a) / a;
      const intensity = cos2 * sinc * sinc;
      fc.fillStyle = `rgba(${palette.screen}, ${intensity})`;
      fc.fillRect(0, py, cw, stepY);
    }
    _step4Key = key;
  }
  c.globalAlpha = baseAlpha;
  c.drawImage(_step4Cvs, startX, regionTop);
  c.globalAlpha = 1.0;

  // 叠加原理标注
  c.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const labelSize = Math.max(10, 11 * Math.min(scale, 1.5) * contentScale);
  c.font = `${labelSize}px sans-serif`;
  c.textAlign = 'center';
  const midX = startX + regionW * 0.5;
  c.fillText('波峰 + 波峰 → 加强（亮带）', midX, regionTop - 10);
  c.fillText('波峰 + 波谷 → 抵消（暗带）', midX, regionBottom + 18);
}

export function drawInterferencePattern(
  c: CanvasRenderingContext2D,
  startX: number,
  CY: number,
  d: number,
  gap: number,
  palette: WavePalette,
  L: number,
  scene: ScenePalette,
  scale: number,
  contentScale: number
): void {
  const lambdaPx = gap * 0.35;
  const slitWidthA = d / 3.5;

  // offscreen 缓存（步骤5精度降低：sample step 2-3）
  const key = `${d}_${gap}_${palette.screen}_${L}_${contentScale}`;
  if (!_step5Cvs || _step5Key !== key) {
    const cw = 60;
    const ch = 250;
    if (!_step5Cvs) {
      _step5Cvs = document.createElement('canvas');
      _step5Cvs.width = cw;
      _step5Cvs.height = ch;
      _step5Ctx = _step5Cvs.getContext('2d');
    } else {
      _step5Ctx!.clearRect(0, 0, cw, ch);
    }
    const fc = _step5Ctx!;
    const sampleStep = scale > 1.2 ? 2 : 3;
    fc.beginPath();
    fc.strokeStyle = palette.solid;
    fc.lineWidth = Math.max(2.5, 3.5 * Math.min(scale, 1.5) * contentScale);
    for (let y = -120; y <= 120; y += sampleStep) {
      const py = 125 + y;
      const delta = (y * d) / L;
      const phase = (Math.PI * delta) / lambdaPx;
      const cos2 = Math.cos(phase) * Math.cos(phase);
      const a = (Math.PI * (y * slitWidthA)) / L / lambdaPx;
      const sinc = a === 0 ? 1 : Math.sin(a) / a;
      const intensity = cos2 * sinc * sinc;
      const px = 12 + intensity * 35;
      if (y === -120) fc.moveTo(px, py);
      else fc.lineTo(px, py);
      fc.fillStyle = `rgba(${palette.screen}, ${intensity * 0.9})`;
      fc.fillRect(0, py, 4, sampleStep);
    }
    fc.stroke();
    _step5Key = key;
  }
  c.drawImage(_step5Cvs, startX - 2, CY - STEP5_IMAGE_HALF);

  // 辅助线
  c.setLineDash([4, 4]);
  c.strokeStyle = scene.guide;
  c.beginPath();
  c.moveTo(startX, CY);
  c.lineTo(startX + 50, CY);
  c.stroke();
  c.setLineDash([]);
}

// ── 步骤6：大干涉图样（占满上半部分）──
export function drawStep6Pattern(
  c: CanvasRenderingContext2D,
  W: number,
  H: number,
  lambda: number,
  slitDistance: number,
  palette: WavePalette,
  scene: ScenePalette,
  isDark: boolean,
  L: number,
  contentScale: number,
  hideNumericLabels = false,
  whiteSpectrum?: { wavelengths: number[] } | null
): void {
  const topH = H * 0.3;
  const patternX = W * 0.15;
  const patternW = W * 0.55;
  const patternH = topH - 30;
  const patternY = (topH - patternH) / 2;

  const fringeSpacingPx = computeFringeSpacingPx(lambda, slitDistance, L);
  const visualFringePx = fringeSpacingPx * 0.7;
  const envelopeSpacingPx = visualFringePx * 8;

  // offscreen 缓存（步骤6不降低精度）
  const spectrumKey = whiteSpectrum
    ? `white:${whiteSpectrum.wavelengths.join(',')}`
    : 'mono';
  const key = `${lambda}_${slitDistance}_${L}_${palette.screen}_${isDark ? 1 : 0}_${spectrumKey}`;
  if (!_step6Cvs || _step6Key !== key) {
    const pw = Math.ceil(patternW);
    const ph = Math.ceil(patternH);
    if (!_step6Cvs) {
      _step6Cvs = document.createElement('canvas');
      _step6Cvs.width = pw;
      _step6Cvs.height = ph;
      _step6Ctx = _step6Cvs.getContext('2d');
    } else if (_step6Cvs.width !== pw || _step6Cvs.height !== ph) {
      _step6Cvs.width = pw;
      _step6Cvs.height = ph;
    } else {
      _step6Ctx!.clearRect(0, 0, pw, ph);
    }
    const fc = _step6Ctx!;
    const n = Math.ceil(pw * 0.5);
    if (whiteSpectrum) {
      const rgb = computeWhiteFringeRgb(
        whiteSpectrum.wavelengths,
        slitDistance,
        L,
        n
      );
      for (let i = 0; i < n * 2 + 1; i++) {
        const x = i - n;
        const px = pw * 0.5 + x;
        if (px < 1 || px > pw - 1) continue;
        const off = i * 3;
        fc.fillStyle = `rgb(${rgb[off]},${rgb[off + 1]},${rgb[off + 2]})`;
        fc.fillRect(px, 2, 1, ph - 4);
      }
    } else {
      let maxI = 1e-6;
      const intensities = new Float64Array(n * 2 + 1);
      for (let x = -n; x <= n; x++) {
        const phase = (Math.PI * x) / visualFringePx;
        const cos2 = Math.cos(phase) * Math.cos(phase);
        const beta = (Math.PI * x) / envelopeSpacingPx;
        const sinc = Math.abs(beta) < 1e-6 ? 1 : Math.sin(beta) / beta;
        const v = cos2 * sinc * sinc;
        intensities[x + n] = v;
        if (v > maxI) maxI = v;
      }
      for (let i = 0; i < intensities.length; i++) {
        const x = i - n;
        const px = pw * 0.5 + x;
        if (px < 1 || px > pw - 1) continue;
        const alpha = Math.min((intensities[i] / maxI) * 0.95, 0.95);
        fc.fillStyle = `rgba(${palette.screen}, ${alpha})`;
        fc.fillRect(px, 2, 1, ph - 4);
      }
    }
    _step6Key = key;
  }
  c.drawImage(_step6Cvs, patternX, patternY);

  // 背景 + 边框
  c.strokeStyle = scene.instrument;
  c.lineWidth = 1;
  c.strokeRect(patternX, patternY, patternW, patternH);

  // 标签
  c.fillStyle = scene.text;
  c.font = `${13 * contentScale}px sans-serif`;
  c.textAlign = 'left';
  c.fillText('干涉条纹', patternX, patternY - 6);

  if (!hideNumericLabels) {
    c.font = `${11 * contentScale}px sans-serif`;
    c.fillStyle = scene.guide;
    const deltaXmm = (fringeSpacingPx * 0.01).toFixed(3);
    c.fillText(
      `Δx ≈ ${deltaXmm} mm`,
      patternX + patternW - DELTA_X_LABEL_SHIFT,
      patternY - 6
    );
  }

  // 辅助虚线（分隔上下区域）
  c.setLineDash([6, 6]);
  c.strokeStyle = scene.guide;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, topH);
  c.lineTo(W, topH);
  c.stroke();
  c.setLineDash([]);
}
