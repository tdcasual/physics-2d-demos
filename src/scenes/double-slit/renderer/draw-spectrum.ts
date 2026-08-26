/**
 * 双缝干涉 — 左上角光谱色带
 */

import { lambdaToRgb } from '../scene.sim';

// 色谱条 offscreen 缓存
let _spectrumCvs: HTMLCanvasElement | null = null;
let _spectrumCtx: CanvasRenderingContext2D | null = null;
let _spectrumKey = '';

export function resetSpectrumCache(): void {
  _spectrumCvs = _spectrumCtx = null;
  _spectrumKey = '';
}

export function drawSpectrumBar(
  c: CanvasRenderingContext2D,
  lambda: number,
  isDark: boolean,
  contentScale: number
): void {
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
  c.font = `${11 * contentScale}px sans-serif`;
  c.textAlign = 'left';
  c.fillText(`${Math.round(lambda)} nm`, barX + barW + 8, barY + 9);
}
