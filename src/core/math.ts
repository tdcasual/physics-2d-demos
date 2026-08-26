/**
 * 通用数学工具
 */

/** 将 value 限制在 [min, max] 区间内 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
