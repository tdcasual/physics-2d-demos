import type { TeachingTheme } from '../../../platform/standards';

/**
 * 微元法场景统一调色板
 *
 * 三个子场景共用，保证风格一致、与项目 coral/mint 主题协调。
 * 语义：curve=被逼近的真实对象（主色），approx=逼近用的微元（辅色），
 * accent=强调/高亮。
 */
export type VtPalette = {
  isDark: boolean;
  /** 真实曲线/圆（被逼近对象）—— 珊瑚主色 */
  curve: string;
  curveSoft: string;
  curveFill: string;
  /** 微元逼近（矩形/折线/多边形）—— 薄荷辅色 */
  approx: string;
  approxSoft: string;
  approxFill: string;
  /** 强调/高亮 —— 明黄点缀 */
  accent: string;
  accentSoft: string;
  /** 文本 */
  text: string;
  textSecondary: string;
  textMuted: string;
  /** 网格/辅助线 */
  grid: string;
  guide: string;
};

export function vtPalette(theme: TeachingTheme): VtPalette {
  const isDark = theme === 'dark';
  return {
    isDark,
    curve: isDark ? '#ff8a80' : '#ef5350',
    curveSoft: isDark ? 'rgba(255,138,128,0.55)' : 'rgba(239,83,80,0.55)',
    curveFill: isDark ? 'rgba(255,107,107,0.10)' : 'rgba(239,83,80,0.07)',
    approx: isDark ? '#4ECDC4' : '#12a594',
    approxSoft: isDark ? 'rgba(78,205,196,0.55)' : 'rgba(18,165,148,0.5)',
    approxFill: isDark ? 'rgba(78,205,196,0.16)' : 'rgba(18,165,148,0.13)',
    accent: isDark ? '#FFE66D' : '#eab308',
    accentSoft: isDark ? 'rgba(255,230,109,0.7)' : 'rgba(234,179,8,0.7)',
    text: isDark ? '#e2e8f0' : '#334155',
    textSecondary: isDark ? 'rgba(226,232,240,0.72)' : 'rgba(51,65,85,0.75)',
    textMuted: isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.6)',
    grid: isDark ? 'rgba(148,163,184,0.10)' : 'rgba(100,116,139,0.10)',
    guide: isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.4)'
  };
}

/** 字体（含响应式与演示放大），返回可直接用于 ctx.font 的像素值 */
export function fontPx(base: number, s: number, cs: number): number {
  return Math.max(9, Math.round(base * s * cs));
}

/** 线宽（演示放大幅度更柔和） */
export function lineW(base: number, s: number, cs: number): number {
  return Math.max(1, base * s * Math.min(cs, 1.6));
}

/** 标记半径 */
export function markR(base: number, s: number, cs: number): number {
  return Math.max(2, base * s * cs);
}

/** 通用字体族 */
export const FONT_FAMILY = '"Noto Sans SC", system-ui, sans-serif';
