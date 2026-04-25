/**
 * 视口布局计算 — 根据响应式缩放因子决定网格列数
 */

/** 获取设备类型（基于 responsiveScale 的连续判断，避免像素边界跳变） */
export function getDeviceType(responsiveScale: number): 'mobile' | 'tablet' | 'desktop' {
  if (responsiveScale < 0.7) return 'mobile';
  if (responsiveScale < 1.0) return 'tablet';
  return 'desktop';
}

/** 计算网格布局（按设备类型与振子总数决定列数/行数） */
export function calculateGridLayout(
  total: number,
  _stageWidth: number,
  scale: number
): { cols: number; rows: number } {
  const deviceType = getDeviceType(scale);

  if (deviceType === 'mobile') {
    return { cols: 1, rows: total };
  }

  if (deviceType === 'tablet') {
    if (total <= 2) return { cols: 1, rows: total };
    return { cols: 2, rows: Math.ceil(total / 2) };
  }

  if (total <= 3) return { cols: 1, rows: total };
  if (total <= 6) return { cols: 2, rows: Math.ceil(total / 2) };
  return { cols: 3, rows: Math.ceil(total / 3) };
}
