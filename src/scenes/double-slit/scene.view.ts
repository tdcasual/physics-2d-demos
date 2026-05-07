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
import { lambdaToGap, lambdaToRgb, computeFringeSpacingPx } from './scene.sim';

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

    // 色带背景/边框
    c.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    c.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // 连续光谱渐变
    for (let i = 0; i < barW; i++) {
      const wl = 400 + (i / barW) * 300; // 400~700nm
      const [r, g, b] = lambdaToRgb(wl);
      c.fillStyle = `rgb(${r},${g},${b})`;
      c.fillRect(barX + i, barY, 1, barH);
    }

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
    skipTube = false
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

    // 发光核心（与波色严格对应）
    c.fillStyle = palette.glow;
    c.shadowBlur = 15;
    c.shadowColor = palette.glow;
    c.fill();
    c.shadowBlur = 0;
    drawLabel(POS.light, CY - 25, '光源');

    // 透镜
    c.beginPath();
    c.ellipse(POS.lens, CY, 8, 40, 0, 0, Math.PI * 2);
    c.fillStyle = scene.lens;
    c.fill();
    c.strokeStyle = scene.instrument;
    c.stroke();
    drawLabel(POS.lens, CY - 50, '透镜');

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
    const regionTop = CY - 130;
    const regionBottom = CY + 130;
    // 动态脉动效果，增强"动态响应"感
    const pulse = 0.85 + 0.15 * Math.sin(time * 0.04);
    const baseAlpha = isDark ? 0.22 * pulse : 0.14 * pulse;
    const stepY = scale > 1.2 ? 2 : 3;

    for (let y = regionTop; y <= regionBottom; y += stepY) {
      const dy = y - CY;
      const delta = (dy * d) / L;
      const phase = (Math.PI * delta) / lambdaPx;
      const cos2 = Math.pow(Math.cos(phase), 2);

      const alpha = (Math.PI * (dy * slitWidthA) / L) / lambdaPx;
      const sinc = alpha === 0 ? 1 : Math.sin(alpha) / alpha;
      const sinc2 = Math.pow(sinc, 2);

      const intensity = cos2 * sinc2;
      c.fillStyle = `rgba(${palette.screen}, ${intensity * baseAlpha})`;
      c.fillRect(startX, y, endX - startX, stepY);
    }

    // 叠加原理标注
    c.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const labelSize = Math.max(10, 11 * Math.min(scale, 1.5) * modeScale);
    c.font = `${labelSize}px sans-serif`;
    c.textAlign = 'center';
    const midX = startX + (endX - startX) * 0.5;
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
    const lambdaPx = gap * 0.35; // 等比例缩短，使屏幕上波峰更密集清晰
    const slitWidthA = d / 3.5;

    c.beginPath();
    c.strokeStyle = palette.solid;
    c.lineWidth = Math.max(2.5, 3.5 * Math.min(scale, 1.5));

    // 高分辨率下提高采样密度
    const sampleStep = scale > 1.2 ? 1 : 2;
    for (let y = -120; y <= 120; y += sampleStep) {
      const py = CY + y;
      const delta = (y * d) / L;
      const phase = (Math.PI * delta) / lambdaPx;
      const cos2 = Math.pow(Math.cos(phase), 2);

      const alpha = (Math.PI * (y * slitWidthA) / L) / lambdaPx;
      const sinc = alpha === 0 ? 1 : Math.sin(alpha) / alpha;
      const sinc2 = Math.pow(sinc, 2);

      const intensity = cos2 * sinc2;
      const px = startX + 10 + intensity * 35;

      if (y === -120) c.moveTo(px, py);
      else c.lineTo(px, py);

      // 毛玻璃上的条纹（颜色与波色严格对应）
      c.fillStyle = `rgba(${palette.screen}, ${intensity * 0.9})`;
      c.fillRect(startX - 2, py, 4, sampleStep);
    }
    c.stroke();

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
    isDark: boolean
  ) => {
    const topH = H * 0.30;
    const patternX = W * 0.15;
    const patternW = W * 0.55;
    const patternH = topH - 30;
    const patternY = (topH - patternH) / 2;
    // const centerY = patternY + patternH * 0.5;

    // 物理条纹间距（px）
    const fringeSpacingPx = computeFringeSpacingPx(lambda, slitDistance);

    // 衍射包络宽度（单缝衍射，假设单缝宽度 a = d/12）
    const envelopeSpacingPx = fringeSpacingPx * 12;

    // 干涉图样背景
    c.fillStyle = isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.04)';
    c.fillRect(patternX, patternY, patternW, patternH);
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

    // 预计算光强数组（沿 x 方向，用于竖直条纹）
    const n = Math.ceil(patternW * 0.5);
    const intensities: number[] = [];
    for (let x = -n; x <= n; x++) {
      const phase = (Math.PI * x) / fringeSpacingPx;
      const cos2 = Math.pow(Math.cos(phase), 2);

      const beta = (Math.PI * x) / envelopeSpacingPx;
      const sinc = Math.abs(beta) < 1e-6 ? 1 : Math.sin(beta) / beta;
      const sinc2 = Math.pow(sinc, 2);

      intensities.push(cos2 * sinc2);
    }

    // 绘制竖直条纹（明显的明暗相间）
    const maxIntensity = Math.max(...intensities, 1e-6);
    for (let i = 0; i < intensities.length; i++) {
      const x = i - n;
      const px = patternX + patternW * 0.5 + x;
      if (px < patternX + 1 || px > patternX + patternW - 1) continue;
      const intensity = intensities[i] / maxIntensity;
      const alpha = Math.min(intensity * 0.95, 0.95);
      c.fillStyle = `rgba(${palette.screen}, ${alpha})`;
      c.fillRect(px, patternY + 2, 1, patternH - 4);
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

    // （下方仪器区标签已移除，节省视觉空间）
  };

  // ── 主渲染 ──

  function drawScene(next: DoubleSlitState): void {
    const c = ctx;
    if (!c || !canvas) return;

    const isDark = theme === 'dark';
    const time = next.time;
    const step = next.params.step;
    const lambda = next.params.lambda;
    const palette = getWavePalette(lambda, isDark);
    const scene = SCENE_PALETTE[isDark ? 'dark' : 'light'];
    const d = next.params.slitDistance;
    const gap = lambdaToGap(lambda);

    const W = 1000;
    const H = 500;

    // 先以像素坐标清除整个 canvas，彻底消除盲区残留
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = scene.bg;
    c.fillRect(0, 0, canvas.width, canvas.height);

    // 再设置逻辑坐标变换，乘 dpr 以充分利用高分辨率屏幕
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

    // 逻辑画布背景（与上方清除色一致，确保逻辑区域内背景正确）
    c.fillStyle = scene.bg;
    c.fillRect(0, 0, W, H);

    // 光谱色带（左上角）
    drawSpectrumBar(c, lambda, isDark);

    const CY = H * 0.5;
    const POS = {
      light: 80,
      lens: 180,
      singleSlit: 280,
      doubleSlit: 400,
      screen: 800,
      eyepiece: 920
    };

    // 步骤6：上方大干涉图样，下方由仪器组件接管
    if (step === 6) {
      drawStep6Pattern(c, W, H, lambda, d, palette, scene, isDark);
    } else {
      // 步骤 1–5：完整光路 + 仪器
      if (step >= 1) {
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

      if (step >= 2) {
        drawWaves(c, POS.singleSlit, CY, POS.doubleSlit - POS.singleSlit, palette.wave, gap, time);
      }

      if (step >= 3) {
        const maxRadius = step >= 4 ? (POS.screen - POS.doubleSlit + 50) : 60;
        drawWaves(c, POS.doubleSlit, CY - d / 2, maxRadius, palette.wave, gap, time);
        drawWaves(c, POS.doubleSlit, CY + d / 2, maxRadius, palette.wave, gap, time);
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
        drawInterferenceOverlay(c, POS.doubleSlit, POS.screen, CY, d, gap, palette, POS.screen - POS.doubleSlit, isDark, time);
      }

      // 绘制仪器
      drawInstruments(c, POS, CY, d, palette, scene, step === 4);

      // 干涉条纹与光强曲线
      if (step >= 5) {
        drawInterferencePattern(c, POS.screen, CY, d, gap, palette, POS.screen - POS.doubleSlit, scene);
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
    }
  };
}
