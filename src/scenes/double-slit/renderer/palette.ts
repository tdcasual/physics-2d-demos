/**
 * 双缝干涉 — 调色板与共享类型
 */

import { lambdaToRgb } from '../scene.sim';

// ── 波长调色板（深色 / 浅色）──
export type WavePalette = {
  wave: string; // 光波描边色
  solid: string; // 光源实心 / 曲线描边
  glow: string; // 光源发光
  screen: string; // 条纹 RGB（无 # 前缀）
};

export function getWavePalette(lambda: number, isDark: boolean): WavePalette {
  const [r, g, b] = lambdaToRgb(lambda);
  const base = `rgb(${r},${g},${b})`;
  const alpha = isDark ? 0.55 : 0.45;
  const glowAlpha = isDark ? 0.85 : 0.75;
  return {
    wave: `rgba(${r},${g},${b},${alpha})`,
    solid: base,
    glow: `rgba(${r},${g},${b},${glowAlpha})`,
    screen: `${r},${g},${b}`
  };
}

// ── 场景配色（深色 / 浅色）──
export const SCENE_PALETTE = {
  dark: {
    bg: '#0f172a',
    tubeBg: 'rgba(255,255,255,0.03)',
    tubeBorder: '#334155',
    instrument: '#94a3b8',
    instrumentDark: '#64748b',
    lens: '#e2e8f0',
    text: '#e2e8f0',
    guide: '#475569',
    eyepiece: '#475569'
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
    eyepiece: '#64748b'
  }
};

export type ScenePalette = (typeof SCENE_PALETTE)['dark'];
