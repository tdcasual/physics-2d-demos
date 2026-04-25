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

/** 检测当前视口是否为移动端（宽度 < mobile 断点） */
export function detectMobile(breakpoints: Breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints.mobile;
}

/** 检测当前视口是否为平板（mobile ≤ 宽度 < tablet 断点） */
export function detectTablet(breakpoints: Breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  return w >= breakpoints.mobile && w < breakpoints.tablet;
}

/** 检测当前视口是否为桌面端（宽度 ≥ tablet 断点） */
export function detectDesktop(breakpoints: Breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints.tablet;
}
