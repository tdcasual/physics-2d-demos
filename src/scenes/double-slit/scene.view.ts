/**
 * 双缝干涉 — Canvas 渲染器
 *
 * 6 步骤渐进式实验演示动画
 * 逻辑画布尺寸 1000×500，通过 ctx.setTransform 响应式缩放
 * 支持浅色/深色双模式，波色随光源波长自动匹配
 */

import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { DoubleSlitState } from './scene.sim';
import { lambdaToGap, lambdaToRgb, computeFringeSpacingPx, DEFAULT_L, FILTERS, WHITE_LAMBDAS, isWhiteLight, getActiveWavelengths, getEffectiveLambda } from './scene.sim';

export type CreateDoubleSlitViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
};

// ── 波长调色板（深色 / 浅色）──
type WavePalette = {
  wave: string;    // 光波描边色
  solid: string;   // 光源实心 / 曲线描边
  glow: string;    // 光源发光
  screen: string;  // 条纹 RGB（无 # 前缀）
};

function getWavePalette(lambda: number, isDark: boolean): WavePalette {
  const [r, g, b] = lambdaToRgb(lambda);
  const base = `rgb(${r},${g},${b})`;
  const alpha = isDark ? 0.55 : 0.45;
  const glowAlpha = isDark ? 0.85 : 0.75;
  return {
    wave: `rgba(${r},${g},${b},${alpha})`,
    solid: base,
    glow: `rgba(${r},${g},${b},${glowAlpha})`,
    screen: `${r},${g},${b}`,
  };
}

// ── 场景配色（深色 / 浅色）──
const SCENE_PALETTE = {
  dark: {
    bg: '#0f172a',
    tubeBg: 'rgba(255,255,255,0.03)',
    tubeBorder: '#334155',
    instrument: '#94a3b8',
    instrumentDark: '#64748b',
    lens: '#e2e8f0',
    text: '#e2e8f0',
    guide: '#475569',
    eyepiece: '#475569',
  },
  light: {
    bg: '#f1f5f9',
    tubeBg: 'rgba(0,0,0,0.02)',
    tubeBorder: '#cbd5e1',
    instrument: '#64748b',
    instrumentDark: '#475569',
    lens: '#f8fafc',
    text: '#1e293b',
    guide: '#94a3b8',
    eyepiece: '#64748b',
  },
};

// ── 模块级常量 ──
const POS = { light: 80, lens: 180, filter: 230, singleSlit: 280, doubleSlit: 400, screen: 800, eyepiece: 920 } as const;

// ── 模块级缓存 ──
let _paletteKey = '';
let _cachedPalette: WavePalette | null = null;
let _sceneKey = '';
let _cachedScene: typeof SCENE_PALETTE['dark'] | null = null;
let _wlKey = '';
let _cachedWl: number[] = [];

// 色谱条 offscreen 缓存
let _spectrumCvs: HTMLCanvasElement | null = null;
let _spectrumCtx: CanvasRenderingContext2D | null = null;
let _spectrumKey = '';
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
// 白光光源发光 offscreen 缓存
let _glowCvs: HTMLCanvasElement | null = null;
let _glowCtx: CanvasRenderingContext2D | null = null;
let _glowKey = '';

export function createDoubleSlitView(options: CreateDoubleSlitViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx: CanvasRenderingContext2D | null = null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let scale = 1;
  let dpr = 1;
  let modeScale = 1;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rawScale = parseFloat(canvas.dataset.responsiveScale || '1');
    const cssW = parseFloat(canvas.style.width || '1000');
    const cssH = parseFloat(canvas.style.height || '500');
    dpr = canvas.width / cssW;
    // 限制 scale 使 1000×500 逻辑画布始终能 fit 进 CSS 容器，再乘 dpr 利用高分辨率
    const fitScale = Math.min(cssW / 1000, cssH / 500);
    scale = Math.min(rawScale, fitScale);
  }

  // ── 绘图辅助函数（逻辑坐标 1000×500，无手动 scale）──

  const drawSpectrumBar = (
    c: CanvasRenderingContext2D,
    lambda: number,
    isDark: boolean
  ) => {
    const barX = 20;
    const barY = 15;
    const barW = 200;
    const barH = 12;

    // 缓存色谱条背景（静态部分）
    const key = `${isDark ? 1 : 0}`;
    if (!_spectrumCvs || _spectrumKey !== key) {
      if (!_spectrumCvs) {
        _spectrumCvs = document.createElement('canvas');
        _spectrumCvs.width = barW + 2;
        _spectrumCvs.height = barH + 2;
        _spectrumCtx = _spectrumCvs.getContext('2d');
      } else {
        _spectrumCtx!.clearRect(0, 0, _spectrumCvs.width, _spectrumCvs.height);
      }
      const fc = _spectrumCtx!;
      fc.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
      fc.fillRect(0, 0, barW + 2, barH + 2);
      for (let i = 0; i < barW; i += 2) {
        const wl = 400 + (i / barW) * 300;
        const [r, g, b] = lambdaToRgb(wl);
        fc.fillStyle = `rgb(${r},${g},${b})`;
        fc.fillRect(i + 1, 1, 2, barH);
      }
      _spectrumKey = key;
    }
    c.drawImage(_spectrumCvs, barX - 1, barY - 1);

    // 当前波长标记（白色小三角）
    const markerX = barX + ((lambda - 400) / 300) * barW;
    c.fillStyle = isDark ? '#fff' : '#1e293b';
    c.beginPath();
    c.moveTo(markerX, barY - 5);
    c.lineTo(markerX - 4, barY - 1);
    c.lineTo(markerX + 4, barY - 1);
    c.closePath();
    c.fill();

    // 波长数值
    c.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    c.font = `${11 * modeScale}px sans-serif`;
    c.textAlign = 'left';
    c.fillText(`${Math.round(lambda)} nm`, barX + barW + 8, barY + 9);
  };

  const drawWaves = (
    c: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    maxR: number,
    color: string,
    gap: number,
    time: number
  ) => {
    c.strokeStyle = color;
    c.lineWidth = Math.max(2, 3 * Math.min(scale, 1.5));
    // 高分辨率下增加波纹环数，增强视觉丰富度
    const extraWaves = Math.floor(Math.max(0, scale - 0.8) * 2);
    const numWaves = Math.floor(maxR / gap) + 2 + extraWaves;
    for (let i = 0; i < numWaves; i++) {
      const r = (time % gap) + i * gap;
      if (r > 0 && r < maxR) {
        c.beginPath();
        const spreadAngle = Math.PI / 2.2;
        c.arc(cx, cy, r, -spreadAngle, spreadAngle);
        c.stroke();
      }
    }
  };

  const drawInstruments = (
    c: CanvasRenderingContext2D,
    POS: Record<string, number>,
    CY: number,
    d: number,
    palette: WavePalette,
    scene: typeof SCENE_PALETTE['dark'],
    skipTube = false,
    white = false,
    filterColor?: string | null
  ) => {
    const drawLabel = (x: number, y: number, text: string) => {
      c.fillStyle = scene.text;
      const fontSize = Math.max(12, 14 * Math.min(scale, 1.5) * modeScale);
      c.font = `${fontSize}px sans-serif`;
      c.textAlign = 'center';
      c.fillText(text, x, y);
    };

    if (!skipTube) {
      // 遮光筒底色
      c.fillStyle = scene.tubeBg;
      c.fillRect(POS.doubleSlit, CY - 100, POS.screen - POS.doubleSlit, 200);
      c.strokeStyle = scene.tubeBorder;
      c.lineWidth = 2;
      c.strokeRect(POS.doubleSlit, CY - 100, POS.screen - POS.doubleSlit, 200);
    }

    c.fillStyle = scene.instrument;

    // 光源
    c.beginPath();
    c.arc(POS.light, CY, 15, 0, Math.PI * 2);
    c.fillStyle = scene.instrument;
    c.fill();

    if (white) {
      // 白光光源：使用 offscreen 缓存的发光效果
      const gKey = 'w';
      if (!_glowCvs || _glowKey !== gKey) {
        if (!_glowCvs) {
          _glowCvs = document.createElement('canvas');
          _glowCvs.width = 60;
          _glowCvs.height = 60;
          _glowCtx = _glowCvs.getContext('2d');
        } else {
          _glowCtx!.clearRect(0, 0, 60, 60);
        }
        const gc = _glowCtx!;
        gc.fillStyle = '#fff';
        gc.shadowBlur = 20;
        gc.shadowColor = '#fff';
        gc.beginPath();
        gc.arc(30, 30, 12, 0, Math.PI * 2);
        gc.fill();
        const rgbs = [lambdaToRgb(660), lambdaToRgb(530), lambdaToRgb(460)];
        for (let i = 0; i < 6; i++) {
          const [r, g, b] = rgbs[i % 3];
          gc.shadowColor = `rgba(${r},${g},${b},0.4)`;
          gc.shadowBlur = 10 + i * 2;
          gc.beginPath();
          gc.arc(30, 30, 12, 0, Math.PI * 2);
          gc.fill();
        }
        gc.shadowBlur = 0;
        _glowKey = gKey;
      }
      c.drawImage(_glowCvs, POS.light - 30, CY - 30);
      drawLabel(POS.light, CY - 25, '白光光源');
    } else {
      // 发光核心（与波色严格对应）
      c.fillStyle = palette.glow;
      c.shadowBlur = 15;
      c.shadowColor = palette.glow;
      c.fill();
      c.shadowBlur = 0;
      drawLabel(POS.light, CY - 25, '光源');
    }

    // 透镜
    c.beginPath();
    c.ellipse(POS.lens, CY, 8, 40, 0, 0, Math.PI * 2);
    c.fillStyle = scene.lens;
    c.fill();
    c.strokeStyle = scene.instrument;
    c.stroke();
    drawLabel(POS.lens, CY - 50, '透镜');

    // 白光模式下绘制滤光片（在透镜和单缝之间，与 WPS 一致）
    if (white) {
      const isDark = scene === SCENE_PALETTE.dark;
      drawFilterElement(c, POS.filter, CY, filterColor, isDark);
    }

    // 单缝挡板
    c.fillStyle = scene.instrumentDark;
    c.fillRect(POS.singleSlit - 4, CY - 80, 8, 78);
    c.fillRect(POS.singleSlit - 4, CY + 2, 8, 78);
    drawLabel(POS.singleSlit, CY - 90, '单缝');

    // 双缝挡板
    const slitWidth = 4;
    c.fillRect(POS.doubleSlit - 4, CY - 80, 8, 80 - d / 2 - slitWidth / 2);
    c.fillRect(POS.doubleSlit - 4, CY - d / 2 + slitWidth / 2, 8, d - slitWidth);
    c.fillRect(POS.doubleSlit - 4, CY + d / 2 + slitWidth / 2, 8, 80 - d / 2 - slitWidth / 2);
    drawLabel(POS.doubleSlit, CY - 90, '双缝');

    // 毛玻璃屏幕
    c.fillStyle = scene.instrument;
    c.fillRect(POS.screen - 2, CY - 120, 4, 240);
    drawLabel(POS.screen, CY - 130, '毛玻璃');

    // 目镜
    c.fillStyle = scene.eyepiece;
    c.fillRect(POS.eyepiece - 10, CY - 20, 20, 40);
    c.beginPath();
    c.moveTo(POS.eyepiece - 10, CY - 20);
    c.lineTo(POS.eyepiece - 30, CY - 30);
    c.lineTo(POS.eyepiece - 30, CY + 30);
    c.lineTo(POS.eyepiece - 10, CY + 20);
    c.fill();
    drawLabel(POS.eyepiece, CY - 40, '目镜');
  };

  const drawInterferenceOverlay = (
    c: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    CY: number,
    d: number,
    gap: number,
    palette: WavePalette,
    L: number,
    isDark: boolean,
    time: number
  ) => {
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

    // offscreen 缓存（步骤4精度降低：stepY 3-4，脉冲量化8级）
    const key = `${d}_${gap}_${palette.screen}_${L}_${isDark ? 1 : 0}_${pulseQ}`;
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
        const a = (Math.PI * (dy * slitWidthA) / L) / lambdaPx;
        const sinc = a === 0 ? 1 : Math.sin(a) / a;
        const intensity = cos2 * sinc * sinc;
        fc.fillStyle = `rgba(${palette.screen}, ${intensity * baseAlpha})`;
        fc.fillRect(0, py, cw, stepY);
      }
      _step4Key = key;
    }
    c.drawImage(_step4Cvs, startX, regionTop);

    // 叠加原理标注
    c.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const labelSize = Math.max(10, 11 * Math.min(scale, 1.5) * modeScale);
    c.font = `${labelSize}px sans-serif`;
    c.textAlign = 'center';
    const midX = startX + regionW * 0.5;
    c.fillText('波峰 + 波峰 → 加强（亮带）', midX, regionTop - 10);
    c.fillText('波峰 + 波谷 → 抵消（暗带）', midX, regionBottom + 18);
  };

  const drawInterferencePattern = (
    c: CanvasRenderingContext2D,
    startX: number,
    CY: number,
    d: number,
    gap: number,
    palette: WavePalette,
    L: number,
    scene: typeof SCENE_PALETTE['dark']
  ) => {
    const lambdaPx = gap * 0.35;
    const slitWidthA = d / 3.5;

    // offscreen 缓存（步骤5精度降低：sample step 2-3）
    const key = `${d}_${gap}_${palette.screen}_${L}`;
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
      fc.lineWidth = Math.max(2.5, 3.5 * Math.min(scale, 1.5));
      for (let y = -120; y <= 120; y += sampleStep) {
        const py = 125 + y;
        const delta = (y * d) / L;
        const phase = (Math.PI * delta) / lambdaPx;
        const cos2 = Math.cos(phase) * Math.cos(phase);
        const a = (Math.PI * (y * slitWidthA) / L) / lambdaPx;
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
    c.drawImage(_step5Cvs, startX - 2, CY - 125);

    // 辅助线
    c.setLineDash([4, 4]);
    c.strokeStyle = scene.guide;
    c.beginPath();
    c.moveTo(startX, CY);
    c.lineTo(startX + 50, CY);
    c.stroke();
    c.setLineDash([]);
  };

  // ── 步骤6：大干涉图样（占满上半部分）──
  const drawStep6Pattern = (
    c: CanvasRenderingContext2D,
    W: number,
    H: number,
    lambda: number,
    slitDistance: number,
    palette: WavePalette,
    scene: typeof SCENE_PALETTE['dark'],
    isDark: boolean,
    L: number
  ) => {
    const topH = H * 0.30;
    const patternX = W * 0.15;
    const patternW = W * 0.55;
    const patternH = topH - 30;
    const patternY = (topH - patternH) / 2;

    const fringeSpacingPx = computeFringeSpacingPx(lambda, slitDistance, L);
    const visualFringePx = fringeSpacingPx * 0.7;
    const envelopeSpacingPx = visualFringePx * 8;

    // offscreen 缓存（步骤6不降低精度）
    const key = `${lambda}_${slitDistance}_${L}_${palette.screen}_${isDark ? 1 : 0}`;
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
      _step6Key = key;
    }
    c.drawImage(_step6Cvs, patternX, patternY);

    // 背景 + 边框
    c.strokeStyle = scene.instrument;
    c.lineWidth = 1;
    c.strokeRect(patternX, patternY, patternW, patternH);

    // 标签
    c.fillStyle = scene.text;
    c.font = `${13 * modeScale}px sans-serif`;
    c.textAlign = 'left';
    c.fillText('干涉条纹', patternX, patternY - 6);

    // 物理参数标注
    c.font = `${11 * modeScale}px sans-serif`;
    c.fillStyle = scene.guide;
    const deltaXmm = (fringeSpacingPx * 0.01).toFixed(3);
    c.fillText(`Δx ≈ ${deltaXmm} mm`, patternX + patternW - 120, patternY - 6);

    // 辅助虚线（分隔上下区域）
    c.setLineDash([6, 6]);
    c.strokeStyle = scene.guide;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, topH);
    c.lineTo(W, topH);
    c.stroke();
    c.setLineDash([]);
  };

  // ── 白光渲染函数 ──

  const drawWhiteLightRays = (
    c: CanvasRenderingContext2D,
    POS: Record<string, number>,
    CY: number,
    time: number,
    filterColor: string | null | undefined
  ) => {
    c.lineWidth = 2.5;
    c.setLineDash([10, 10]);
    c.lineDashOffset = -time;

    // 光源→透镜：白色光线（滤光片前所有波长混叠）
    c.strokeStyle = 'rgba(220,225,235,0.5)';
    for (let a = -0.3; a <= 0.3; a += 0.1) {
      c.beginPath();
      c.moveTo(POS.light, CY);
      c.lineTo(POS.lens, CY + Math.tan(a) * (POS.lens - POS.light));
      c.stroke();
    }

    // 透镜→滤光片：白色
    for (let y = -20; y <= 20; y += 10) {
      c.beginPath();
      c.moveTo(POS.lens, CY + y);
      c.lineTo(POS.filter, CY + y * (POS.filter - POS.lens) / (POS.singleSlit - POS.lens));
      c.stroke();
    }

    // 滤光片→单缝：白光经过滤光片后变色，无滤光片时保持白色
    const hasFC = filterColor && FILTERS[filterColor as keyof typeof FILTERS];
    if (hasFC) {
      const [cr, cg, cb] = lambdaToRgb(FILTERS[filterColor as keyof typeof FILTERS].center);
      c.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
    } else {
      c.strokeStyle = 'rgba(220,225,235,0.5)';
    }
    for (let y = -20; y <= 20; y += 10) {
      const yAtFilter = CY + y * (POS.filter - POS.lens) / (POS.singleSlit - POS.lens);
      c.beginPath();
      c.moveTo(POS.filter, yAtFilter);
      c.lineTo(POS.singleSlit, CY + y * 0.2);
      c.stroke();
    }
    c.setLineDash([]);
  };

  const drawWhiteWaves = (
    c: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    maxR: number,
    time: number,
    filterColor: string | null | undefined
  ) => {
    c.lineWidth = Math.max(2, 3 * Math.min(scale, 1.5));
    const spreadAngle = Math.PI / 2.2;
    const extra = Math.floor(Math.max(0, scale - 0.8) * 2);

    const hasFC = filterColor && FILTERS[filterColor as keyof typeof FILTERS];
    const lambdas = hasFC
      ? [FILTERS[filterColor as keyof typeof FILTERS].center]
      : WHITE_LAMBDAS;

    for (const wl of lambdas) {
      const [wr, wg, wb] = lambdaToRgb(wl);
      // 白光无滤光片时 gap 乘以 8，每种颜色仅 2-3 条弧线
      const gap = lambdaToGap(wl) * (hasFC ? 1 : 8);
      c.strokeStyle = `rgba(${wr},${wg},${wb},0.4)`;
      const numW = Math.floor(maxR / gap) + 2;
      for (let i = 0; i < numW; i++) {
        const rad = (time % gap) + i * gap;
        if (rad > 0 && rad < maxR) {
          c.beginPath();
          c.arc(cx, cy, rad, -spreadAngle, spreadAngle);
          c.stroke();
        }
      }
    }
  };

  const drawFilterElement = (
    c: CanvasRenderingContext2D,
    x: number,
    CY: number,
    filterColor: string | null | undefined,
    isDark: boolean
  ) => {
    const filterH = 85;
    if (filterColor && FILTERS[filterColor as keyof typeof FILTERS]) {
      const f = FILTERS[filterColor as keyof typeof FILTERS];
      const [r, g, b] = lambdaToRgb(f.center);
      c.fillStyle = `rgba(${r},${g},${b},0.25)`;
      c.fillRect(x - 4, CY - filterH, 8, filterH * 2);
      c.strokeStyle = `rgba(${r},${g},${b},0.5)`;
      c.lineWidth = 1.5;
      c.strokeRect(x - 4, CY - filterH, 8, filterH * 2);
      c.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
      const fontSize = Math.max(11, 13 * Math.min(scale, 1.5) * modeScale);
      c.font = `${fontSize}px sans-serif`;
      c.textAlign = 'center';
      c.fillText(`${f.label}色滤光片`, x, CY - filterH - 6);
    } else {
      c.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.4)';
      c.lineWidth = 1;
      c.setLineDash([3, 3]);
      c.strokeRect(x - 4, CY - filterH, 8, filterH * 2);
      c.setLineDash([]);
      c.fillStyle = isDark ? '#475569' : '#94a3b8';
      const fontSize = Math.max(10, 12 * Math.min(scale, 1.5) * modeScale);
      c.font = `${fontSize}px sans-serif`;
      c.textAlign = 'center';
      c.fillText('（可选滤光片）', x, CY - filterH - 6);
    }
  };

  const drawWhiteInterferenceOverlay = (
    c: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    CY: number,
    d: number,
    L: number,
    time: number,
    wavelengths: number[],
    isDark: boolean
  ) => {
    const regionTop = CY - 130;
    const regionBottom = CY + 130;
    const stepY = scale > 1.2 ? 3 : 4;
    const pulse = 0.85 + 0.15 * Math.sin(time * 0.04);
    const baseAlpha = isDark ? 0.22 * pulse : 0.14 * pulse;
    const slitWidthA = d / 3.5;
    // 预计算波长数据
    const wlData = wavelengths.map(wl => {
      const [r, g, b] = lambdaToRgb(wl);
      return { r, g, b, lambdaPx: lambdaToGap(wl) * 0.35 };
    });

    for (let y = regionTop; y <= regionBottom; y += stepY) {
      const dy = y - CY;
      let rr = 0, gg = 0, bb = 0;
      for (const wd of wlData) {
        const delta = (dy * d) / L;
        const phase = (Math.PI * delta) / wd.lambdaPx;
        const cos2 = Math.cos(phase) * Math.cos(phase);
        const a = (Math.PI * (dy * slitWidthA) / L) / wd.lambdaPx;
        const sinc = a === 0 ? 1 : Math.sin(a) / a;
        const intensity = cos2 * sinc * sinc;
        rr += wd.r * intensity / 255;
        gg += wd.g * intensity / 255;
        bb += wd.b * intensity / 255;
      }
      const maxC = Math.max(rr, gg, bb, 0.001);
      const alpha = Math.min(0.85, maxC * baseAlpha * 3);
      c.fillStyle = `rgba(${Math.min(255, Math.round(rr / maxC * 255))},${Math.min(255, Math.round(gg / maxC * 255))},${Math.min(255, Math.round(bb / maxC * 255))},${alpha.toFixed(3)})`;
      c.fillRect(startX, y, endX - startX, stepY);
    }

    c.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const labelSize = Math.max(10, 11 * Math.min(scale, 1.5) * modeScale);
    c.font = `${labelSize}px sans-serif`;
    c.textAlign = 'center';
    const midX = startX + (endX - startX) * 0.5;
    c.fillText('各波长独立干涉后叠加', midX, regionTop - 10);
    c.fillText('中央白色 · 两侧彩虹色', midX, regionBottom + 18);
  };

  const drawWhiteInterferencePattern = (
    c: CanvasRenderingContext2D,
    startX: number,
    CY: number,
    d: number,
    L: number,
    wavelengths: number[],
    scene: typeof SCENE_PALETTE['dark'],
    isDark: boolean
  ) => {
    const slitWidthA = d / 3.5;
    c.beginPath();
    c.lineWidth = Math.max(2.5, 3.5 * Math.min(scale, 1.5));
    const ss = scale > 1.2 ? 2 : 3;
    // 预计算波长数据
    const wlData = wavelengths.map(wl => {
      const [r, g, b] = lambdaToRgb(wl);
      return { r, g, b, lambdaPx: lambdaToGap(wl) * 0.35 };
    });

    for (let y = -120; y <= 120; y += ss) {
      let rr = 0, gg = 0, bb = 0;
      for (const wd of wlData) {
        const delta = (y * d) / L;
        const phase = (Math.PI * delta) / wd.lambdaPx;
        const cos2 = Math.cos(phase) * Math.cos(phase);
        const a = (Math.PI * (y * slitWidthA) / L) / wd.lambdaPx;
        const sinc = a === 0 ? 1 : Math.sin(a) / a;
        const intensity = cos2 * sinc * sinc;
        rr += wd.r * intensity / 255;
        gg += wd.g * intensity / 255;
        bb += wd.b * intensity / 255;
      }
      const maxC = Math.max(rr, gg, bb, 0.01);
      const py = CY + y;
      const total = (rr + gg + bb) / 3;
      const px = startX + 10 + total * 35;
      if (y === -120) c.moveTo(px, py); else c.lineTo(px, py);
      c.fillStyle = `rgb(${Math.min(255, Math.round(rr / maxC * 255))},${Math.min(255, Math.round(gg / maxC * 255))},${Math.min(255, Math.round(bb / maxC * 255))})`;
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
  };

  // 白光条纹面板（离屏 canvas 缓存）
  let _whiteFringeCvs: HTMLCanvasElement | null = null;
  let _whiteFringeCtx: CanvasRenderingContext2D | null = null;
  let _whiteFringeKey = '';

  const drawWhiteFringeDisplay = (
    c: CanvasRenderingContext2D,
    slitDistance: number,
    L: number,
    wavelengths: number[],
    filterColor: string | null | undefined,
    isDark: boolean,
    W: number,
    H: number
  ) => {
    const key = `white:${filterColor || 'none'},${slitDistance},${L},${isDark ? 1 : 0}`;
    if (!_whiteFringeCvs || _whiteFringeKey !== key) {
      if (!_whiteFringeCvs) {
        _whiteFringeCvs = document.createElement('canvas');
        _whiteFringeCvs.width = 382;
        _whiteFringeCvs.height = 155;
        _whiteFringeCtx = _whiteFringeCvs.getContext('2d');
      } else {
        _whiteFringeCtx!.clearRect(0, 0, 382, 155);
      }
      const fc = _whiteFringeCtx!;
      const panelX = 1, panelW = 380, panelH = 135, panelY = 18;
      const scene = SCENE_PALETTE[isDark ? 'dark' : 'light'];

      fc.fillStyle = isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)';
      fc.fillRect(panelX, panelY - 16, panelW, panelH + 20);
      fc.strokeStyle = scene.tubeBorder;
      fc.lineWidth = 1.5;
      fc.strokeRect(panelX, panelY - 16, panelW, panelH + 20);

      const modeLabel = filterColor && FILTERS[filterColor as keyof typeof FILTERS]
        ? `${FILTERS[filterColor as keyof typeof FILTERS].label}色滤光片`
        : '白光（无滤光片）';
      fc.fillStyle = scene.text;
      fc.font = '12px sans-serif';
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
          rgbBuf[off]     += wr * intensity / 255;
          rgbBuf[off + 1] += wg * intensity / 255;
          rgbBuf[off + 2] += wb * intensity / 255;
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
      _whiteFringeKey = key;
    }
    c.drawImage(_whiteFringeCvs, W * 0.6, H * 0.66);
  };

  // ── 主渲染 ──

  function drawScene(next: DoubleSlitState): void {
    const c = ctx;
    if (!c || !canvas) return;

    const isDark = theme === 'dark';
    const time = next.time;
    const step = next.params.step;
    const lambda = next.params.lambda;
    // 缓存 palette
    const pk = `${lambda}_${isDark ? 1 : 0}`;
    if (pk !== _paletteKey) {
      _cachedPalette = getWavePalette(lambda, isDark);
      _paletteKey = pk;
    }
    const palette = _cachedPalette!;
    // 缓存 scene palette
    const sk = isDark ? 'd' : 'l';
    if (sk !== _sceneKey) {
      _cachedScene = SCENE_PALETTE[isDark ? 'dark' : 'light'];
      _sceneKey = sk;
    }
    const scene = _cachedScene!;
    const d = next.params.slitDistance;
    const L = next.params.L ?? DEFAULT_L;
    const gap = lambdaToGap(lambda);

    const W = 1000;
    const H = 500;

    // 以像素坐标清除整个 canvas
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = scene.bg;
    c.fillRect(0, 0, canvas.width, canvas.height);

    // 设置逻辑坐标变换
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

    // 光谱色带（左上角）
    const white = isWhiteLight(next.params);
    const effectiveLambda = getEffectiveLambda(next.params);
    drawSpectrumBar(c, white ? effectiveLambda : lambda, isDark);

    const CY = H * 0.5;

    // 缓存 wavelengths
    const wk = `${next.params.lightMode}_${next.params.filterColor}_${lambda}`;
    if (wk !== _wlKey) {
      _cachedWl = getActiveWavelengths(next.params);
      _wlKey = wk;
    }
    const wavelengths = _cachedWl;

    // 步骤6：上方大干涉图样，下方由仪器组件接管
    if (step === 6) {
      drawStep6Pattern(c, W, H, lambda, d, palette, scene, isDark, L);
    } else {
      // 步骤 1–5：完整光路 + 仪器
      if (step >= 1) {
        if (white) {
          drawWhiteLightRays(c, POS, CY, time, next.params.filterColor);
        } else {
          c.strokeStyle = palette.wave;
          c.lineWidth = 2.5;
          c.setLineDash([10, 10]);
          c.lineDashOffset = -time;
          for (let angle = -0.3; angle <= 0.3; angle += 0.1) {
            c.beginPath();
            c.moveTo(POS.light, CY);
            c.lineTo(POS.lens, CY + Math.tan(angle) * (POS.lens - POS.light));
            c.stroke();
          }
          for (let yOffset = -20; yOffset <= 20; yOffset += 10) {
            c.beginPath();
            c.moveTo(POS.lens, CY + yOffset);
            c.lineTo(POS.singleSlit, CY + yOffset * 0.2);
            c.stroke();
          }
          c.setLineDash([]);
        }
      }

      if (step >= 2) {
        if (white) {
          drawWhiteWaves(c, POS.singleSlit, CY, POS.doubleSlit - POS.singleSlit, time, next.params.filterColor);
        } else {
          drawWaves(c, POS.singleSlit, CY, POS.doubleSlit - POS.singleSlit, palette.wave, gap, time);
        }
      }

      if (step >= 3) {
        const maxRadius = step >= 4 ? (POS.screen - POS.doubleSlit + 50) : 60;
        if (white) {
          drawWhiteWaves(c, POS.doubleSlit, CY - d / 2, maxRadius, time, next.params.filterColor);
          drawWhiteWaves(c, POS.doubleSlit, CY + d / 2, maxRadius, time, next.params.filterColor);
        } else {
          drawWaves(c, POS.doubleSlit, CY - d / 2, maxRadius, palette.wave, gap, time);
          drawWaves(c, POS.doubleSlit, CY + d / 2, maxRadius, palette.wave, gap, time);
        }
      }

      // 步骤4：空间干涉与叠加可视化
      if (step === 4) {
        // 先画遮光筒底色
        c.fillStyle = scene.tubeBg;
        c.fillRect(POS.doubleSlit, CY - 100, POS.screen - POS.doubleSlit, 200);
        c.strokeStyle = scene.tubeBorder;
        c.lineWidth = 2;
        c.strokeRect(POS.doubleSlit, CY - 100, POS.screen - POS.doubleSlit, 200);
        // 叠加明暗带
        if (white) {
          drawWhiteInterferenceOverlay(c, POS.doubleSlit, POS.screen, CY, d, POS.screen - POS.doubleSlit, time, wavelengths, isDark);
        } else {
          drawInterferenceOverlay(c, POS.doubleSlit, POS.screen, CY, d, gap, palette, POS.screen - POS.doubleSlit, isDark, time);
        }
      }

      // 绘制仪器
      drawInstruments(c, POS, CY, d, palette, scene, step === 4, white, next.params.filterColor);

      // 干涉条纹与光强曲线
      if (step >= 5) {
        if (white) {
          drawWhiteInterferencePattern(c, POS.screen, CY, d, POS.screen - POS.doubleSlit, wavelengths, scene, isDark);
          drawWhiteFringeDisplay(c, d, L, wavelengths, next.params.filterColor, isDark, W, H);
        } else {
          drawInterferencePattern(c, POS.screen, CY, d, gap, palette, POS.screen - POS.doubleSlit, scene);
        }
      }
    }
  }

  // ── 初始化 ──
  if (canvas) resizeCanvas();

  return {
    render(state: DoubleSlitState) {
      drawScene(state);
    },
    resize() {
      resizeCanvas();
    },
    setTheme(t: TeachingTheme) {
      theme = t;
    },
    setMode(mode: string) {
      modeScale = mode === 'presentation' ? 1.5 : 1;
    },
    dispose() {
      canvas = null;
      ctx = null;
      // 释放 offscreen 缓存
      _spectrumCvs = _spectrumCtx = null; _spectrumKey = '';
      _step6Cvs = _step6Ctx = null; _step6Key = '';
      _step5Cvs = _step5Ctx = null; _step5Key = '';
      _step4Cvs = _step4Ctx = null; _step4Key = '';
      _glowCvs = _glowCtx = null; _glowKey = '';
      _whiteFringeCvs = _whiteFringeCtx = null; _whiteFringeKey = '';
      _paletteKey = ''; _cachedPalette = null;
      _sceneKey = ''; _cachedScene = null;
      _wlKey = ''; _cachedWl = [];
    }
  };
}
