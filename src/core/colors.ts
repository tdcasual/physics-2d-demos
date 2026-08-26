/**
 * Canvas 渲染专用调色板 - 清新活泼主题
 * 珊瑚橙 x 薄荷青
 *
 * ⚠️ 定位说明（与 themes.css 的关系）：
 * 本模块是 canvas 像素渲染的历史调色板，与 src/styles/themes.css 的
 * DOM 语义 token 是两套体系。部分值与 design token 等值
 * （如 coral=#FF6B6B 与 --token-color-coral 一致），但也有意保留了
 * 与主题 token 不同的值（如 dark=#2C3E50、bg=#FFFEF7）。
 *
 * Canvas fillStyle/strokeStyle 需要字面颜色字符串，无法直接引用 CSS var；
 * 任何"对齐 token"的改值都会改变场景渲染像素，违反视觉回归基线。
 * 因此本文件保持现状，仅作为场景绘制的等值颜色来源；DOM 侧一律使用
 * themes.css 语义变量，不要反向引用本文件。
 */

export const Colors = {
  /* 主色调 - 温暖珊瑚 */
  coral: '#FF6B6B',
  coralLight: '#FF8E72',
  coralDark: '#E85D5D',

  /* 辅助色 - 清新薄荷 */
  mint: '#4ECDC4',
  mintLight: '#95E1D3',
  mintDark: '#3DBDB5',

  /* 点缀色 - 活泼明黄 */
  yellow: '#FFE66D',
  salmon: '#FFA07A',

  /* 中性色 */
  dark: '#2C3E50',
  gray: '#5D6D7E',
  grayLight: '#BDC3C7',
  bg: '#FFFEF7',
  cream: '#FFF8E7',
  white: '#FFFFFF',

  /* 深色模式 - 新主题系统 */
  darkBg: '#0f172a',
  darkCard: '#1e293b',
  darkText: '#f1f5f9'
} as const;

/**
 * 带透明度的颜色
 */
export function alpha(color: string, opacity: number): string {
  // 转换 hex 到 rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * 获取主题颜色
 * @param theme 主题名称
 */
export function getThemeColors(theme: 'light' | 'dark') {
  const isDark = theme === 'dark';

  return {
    /* 背景 */
    background: isDark ? Colors.darkBg : Colors.bg,
    cardBg: isDark ? Colors.darkCard : Colors.white,

    /* 文字 */
    text: isDark ? Colors.darkText : Colors.dark,
    textSecondary: isDark ? Colors.gray : Colors.gray,
    textMuted: isDark ? Colors.grayLight : Colors.grayLight,

    /* 强调 */
    primary: Colors.coral,
    secondary: Colors.mint,
    accent: Colors.yellow,

    /* 边框 */
    border: isDark ? 'rgba(148, 163, 184, 0.2)' : Colors.grayLight,

    /* Canvas */
    canvasBg: isDark ? Colors.darkBg : Colors.bg,
    canvasGrid: isDark
      ? 'rgba(148, 163, 184, 0.12)'
      : 'rgba(189, 195, 199, 0.25)',
    canvasText: isDark ? Colors.darkText : Colors.dark
  };
}
