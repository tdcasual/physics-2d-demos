/**
 * 双缝干涉 — 实验仪器绘制（光源 / 透镜 / 滤光片 / 单缝 / 双缝 / 毛玻璃 / 目镜）
 */

import { FILTERS, lambdaToRgb } from '../scene.sim';
import { SCENE_PALETTE, type ScenePalette, type WavePalette } from './palette';
import {
  GLOW_CACHE_PX,
  SCREEN_FULL,
  SCREEN_HALF,
  SINGLE_SLIT_ARM,
  SLIT_BOARD_HALF,
  TUBE_FULL,
  TUBE_HALF
} from './logical-metrics';

// 白光光源发光 offscreen 缓存
let _glowCvs: HTMLCanvasElement | null = null;
let _glowCtx: CanvasRenderingContext2D | null = null;
let _glowKey = '';

export function resetInstrumentCaches(): void {
  _glowCvs = _glowCtx = null;
  _glowKey = '';
}

function drawFilterElement(
  c: CanvasRenderingContext2D,
  x: number,
  CY: number,
  filterColor: string | null | undefined,
  isDark: boolean,
  scale: number,
  contentScale: number
): void {
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
    const fontSize = Math.max(11, 13 * Math.min(scale, 1.5) * contentScale);
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
    const fontSize = Math.max(10, 12 * Math.min(scale, 1.5) * contentScale);
    c.font = `${fontSize}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('（可选滤光片）', x, CY - filterH - 6);
  }
}

export function drawInstruments(
  c: CanvasRenderingContext2D,
  POS: Record<string, number>,
  CY: number,
  d: number,
  palette: WavePalette,
  scene: ScenePalette,
  skipTube = false,
  white = false,
  filterColor: string | null | undefined = undefined,
  scale = 1,
  contentScale = 1
): void {
  const drawLabel = (x: number, y: number, text: string) => {
    c.fillStyle = scene.text;
    const fontSize = Math.max(12, 14 * Math.min(scale, 1.5) * contentScale);
    c.font = `${fontSize}px sans-serif`;
    c.textAlign = 'center';
    c.fillText(text, x, y);
  };

  if (!skipTube) {
    // 遮光筒底色
    c.fillStyle = scene.tubeBg;
    c.fillRect(
      POS.doubleSlit,
      CY - TUBE_HALF,
      POS.screen - POS.doubleSlit,
      TUBE_FULL
    );
    c.strokeStyle = scene.tubeBorder;
    c.lineWidth = 2;
    c.strokeRect(
      POS.doubleSlit,
      CY - TUBE_HALF,
      POS.screen - POS.doubleSlit,
      TUBE_FULL
    );
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
        _glowCvs.width = GLOW_CACHE_PX;
        _glowCvs.height = GLOW_CACHE_PX;
        _glowCtx = _glowCvs.getContext('2d');
      } else {
        _glowCtx!.clearRect(0, 0, GLOW_CACHE_PX, GLOW_CACHE_PX);
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
    drawFilterElement(
      c,
      POS.filter,
      CY,
      filterColor,
      isDark,
      scale,
      contentScale
    );
  }

  // 单缝挡板
  c.fillStyle = scene.instrumentDark;
  c.fillRect(POS.singleSlit - 4, CY - SLIT_BOARD_HALF, 8, SINGLE_SLIT_ARM);
  c.fillRect(POS.singleSlit - 4, CY + 2, 8, SINGLE_SLIT_ARM);
  drawLabel(POS.singleSlit, CY - 90, '单缝');

  // 双缝挡板
  const slitWidth = 4;
  c.fillRect(
    POS.doubleSlit - 4,
    CY - SLIT_BOARD_HALF,
    8,
    SLIT_BOARD_HALF - d / 2 - slitWidth / 2
  );
  c.fillRect(POS.doubleSlit - 4, CY - d / 2 + slitWidth / 2, 8, d - slitWidth);
  c.fillRect(
    POS.doubleSlit - 4,
    CY + d / 2 + slitWidth / 2,
    8,
    SLIT_BOARD_HALF - d / 2 - slitWidth / 2
  );
  drawLabel(POS.doubleSlit, CY - 90, '双缝');

  // 毛玻璃屏幕
  c.fillStyle = scene.instrument;
  c.fillRect(POS.screen - 2, CY - SCREEN_HALF, 4, SCREEN_FULL);
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
}
