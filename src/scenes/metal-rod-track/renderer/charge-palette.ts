import { Colors, getThemeColors } from '../../../core/colors';
import { getChartTheme } from '../../../core/chart/chart-theme';
import {
  getRenderTokens,
  type TeachingTheme
} from '../../../platform/standards';

/**
 * 微元法求电荷量模式调色板：背景 / 文字 / 网格取设计 token，
 * 强调色与 vt-integral 微元法场景一致（珊瑚 = 真实曲线，薄荷 = 微元）。
 */
export type ChargePalette = {
  bg: string;
  text: string;
  textSecondary: string;
  grid: string;
  border: string;
  /** I–t 曲线 / 电流箭头 */
  curve: string;
  curveSoft: string;
  /** Δt 小矩形（微元） */
  strip: string;
  stripFill: string;
  /** 当前正在累加的那一条 */
  accent: string;
  accentFill: string;
  /** 扫过面积 ΔΦ = BLx */
  sweptFill: string;
  velocity: string;
  force: string;
  rail: string;
  rod: string;
  rodEdge: string;
  field: string;
};

export function chargePalette(theme: TeachingTheme): ChargePalette {
  const isDark = theme === 'dark';
  const base = getThemeColors(theme);
  const chart = getChartTheme(theme);
  return {
    bg: base.canvasBg,
    text: chart.text,
    textSecondary: chart.textSecondary,
    grid: chart.grid,
    border: chart.border,
    curve: isDark ? '#ff8a80' : '#ef5350',
    curveSoft: isDark ? 'rgba(255,138,128,0.45)' : 'rgba(239,83,80,0.4)',
    strip: isDark ? Colors.mint : '#12a594',
    stripFill: isDark ? 'rgba(78,205,196,0.28)' : 'rgba(18,165,148,0.22)',
    accent: isDark ? Colors.yellow : '#ca8a04',
    accentFill: isDark ? 'rgba(255,230,109,0.42)' : 'rgba(234,179,8,0.4)',
    sweptFill: isDark ? 'rgba(78,205,196,0.14)' : 'rgba(18,165,148,0.1)',
    velocity: chart.seriesColors[1] ?? chart.axis,
    force: chart.seriesColors[3] ?? chart.axis,
    rail: isDark ? '#94a3b8' : '#64748b',
    rod: isDark ? '#cbd5e1' : '#94a3b8',
    rodEdge: isDark ? '#e2e8f0' : '#475569',
    field: isDark ? 'rgba(148,163,184,0.42)' : 'rgba(100,116,139,0.38)'
  };
}

/** 课堂 token 缩放：合并 responsive × content，并封顶以免 1080P 字号翻倍 */
export function chargeTokenScale(s: number, cs: number): number {
  return Math.min(Math.max(0.5, s * Math.min(cs, 1.6)), 1.6);
}

export type ChargeTypeScale = {
  titlePx: number;
  labelPx: number;
  tickPx: number;
  stroke: number;
  thinStroke: number;
  marker: number;
};

export function chargeTypeScale(s: number, cs: number): ChargeTypeScale {
  const rs = getRenderTokens(chargeTokenScale(s, cs)).rightStage;
  return {
    titlePx: Math.max(14, Math.round(rs.primaryFontPx * 0.68)),
    labelPx: Math.max(12, Math.round(rs.secondaryFontPx * 0.58)),
    tickPx: Math.max(11, Math.round(rs.secondaryFontPx * 0.52)),
    stroke: Math.max(1.5, rs.majorStrokePx * 0.5),
    thinStroke: Math.max(1, rs.minorStrokePx * 0.4),
    marker: Math.max(3, rs.markerRadiusPx * 0.45)
  };
}

export const CHARGE_FONT_FAMILY = '"Noto Sans SC", system-ui, sans-serif';
