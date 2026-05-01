/**
 * 视口断点检测 — 基于窗口宽度的设备类型判断
 */

export type Breakpoints = { mobile: number; tablet: number };

/** 从布局配置中提取断点值（回退到默认值 768 / 1024） */
export function getBreakpoints(
  layoutConfig?: Record<string, unknown>
): Breakpoints {
  const config = layoutConfig || {};
  return {
    mobile: (config.mobileBreakpoint as number) || 768,
    tablet: (config.tabletBreakpoint as number) || 1024
  };
}
