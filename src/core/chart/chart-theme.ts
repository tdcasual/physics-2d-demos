/**
 * ChartTheme - 统一图表主题配置
 *
 * 设计目标：
 * 1. 与项目现有的 light/dark 主题体系无缝对接
 * 2. 提供足够的信息，供未来条形图/柱状图/饼图等复用
 */

export interface ChartTheme {
  mode: 'light' | 'dark';
  /** 图表背景色 */
  bg: string;
  /** 面板/卡片背景色 */
  panelBg: string;
  /** 主文字颜色 */
  text: string;
  /** 次要文字颜色 */
  textSecondary: string;
  /** 网格线颜色 */
  grid: string;
  /** 坐标轴颜色 */
  axis: string;
  /** 边框颜色 */
  border: string;
  /** 数据系列默认颜色环 */
  seriesColors: string[];
}

export const defaultChartThemes: Record<'light' | 'dark', ChartTheme> = {
  light: {
    mode: 'light',
    bg: '#f8fafc',
    panelBg: '#f1f5f9',
    text: '#1e293b',
    textSecondary: '#64748b',
    grid: 'rgba(100, 116, 139, 0.12)',
    axis: '#3b82f6',
    border: '#cbd5e1',
    seriesColors: [
      '#ef4444',
      '#3b82f6',
      '#22c55e',
      '#f59e0b',
      '#a855f7',
      '#06b6d4'
    ]
  },
  dark: {
    mode: 'dark',
    bg: '#0f172a',
    panelBg: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    grid: 'rgba(148, 163, 184, 0.15)',
    axis: '#38bdf8',
    border: 'rgba(148, 163, 184, 0.2)',
    seriesColors: [
      '#f87171',
      '#60a5fa',
      '#4ade80',
      '#fbbf24',
      '#c084fc',
      '#22d3ee'
    ]
  }
};

export function getChartTheme(mode: 'light' | 'dark'): ChartTheme {
  return defaultChartThemes[mode];
}
