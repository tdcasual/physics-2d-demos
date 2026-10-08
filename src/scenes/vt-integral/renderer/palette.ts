import {
  getRenderTokens,
  type TeachingTheme
} from '../../../platform/standards';

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
  /**
   * 子场景 1 误差块：over = 矩形高出曲线（多算），under = 矩形低于曲线
   * （少算）。琥珀 / 紫罗兰对比在红绿色弱下仍可区分，且与珊瑚、薄荷不冲突。
   */
  over: string;
  overFill: string;
  under: string;
  underFill: string;
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
    over: isDark ? '#FFB454' : '#d97706',
    overFill: isDark ? 'rgba(255,180,84,0.55)' : 'rgba(217,119,6,0.5)',
    under: isDark ? '#A78BFA' : '#6d28d9',
    underFill: isDark ? 'rgba(167,139,250,0.42)' : 'rgba(109,40,217,0.26)',
    text: isDark ? '#e2e8f0' : '#334155',
    textSecondary: isDark ? 'rgba(226,232,240,0.72)' : 'rgba(51,65,85,0.75)',
    textMuted: isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.6)',
    grid: isDark ? 'rgba(148,163,184,0.10)' : 'rgba(100,116,139,0.10)',
    guide: isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.4)'
  };
}

/** 课堂 token 缩放：合并 responsive × content，并封顶以免 1080P 字号翻倍 */
export function tokenScale(s: number, cs: number): number {
  return Math.min(Math.max(0.5, s * Math.min(cs, 1.6)), 1.6);
}

export function resolveTypeScale(s: number, cs: number) {
  const rs = getRenderTokens(tokenScale(s, cs)).rightStage;
  return {
    titlePx: Math.max(14, Math.round(rs.primaryFontPx * 0.68)),
    labelPx: Math.max(12, Math.round(rs.secondaryFontPx * 0.58)),
    tickPx: Math.max(11, Math.round(rs.secondaryFontPx * 0.52)),
    stroke: Math.max(1.2, rs.majorStrokePx * 0.42),
    minorStroke: Math.max(1, rs.minorStrokePx * 0.38),
    marker: Math.max(4, rs.markerRadiusPx * 0.42)
  };
}

/** 字体（含响应式与演示放大），返回可直接用于 ctx.font 的像素值 */
export function fontPx(base: number, s: number, cs: number): number {
  const t = resolveTypeScale(s, cs);
  if (base >= 14) return t.titlePx;
  if (base >= 12) return t.labelPx;
  return t.tickPx;
}

/** 线宽（演示放大幅度更柔和） */
export function lineW(base: number, s: number, cs: number): number {
  const t = resolveTypeScale(s, cs);
  return Math.max(1, t.stroke * (base / 2.8));
}

/** 标记半径 */
export function markR(base: number, s: number, cs: number): number {
  const t = resolveTypeScale(s, cs);
  return Math.max(2, t.marker * (base / 6));
}

/** 通用字体族 */
export const FONT_FAMILY = '"Noto Sans SC", system-ui, sans-serif';
