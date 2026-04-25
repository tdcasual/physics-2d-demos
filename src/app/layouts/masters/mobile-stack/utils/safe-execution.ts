/**
 * 安全执行包装器 — 捕获异常并返回默认值
 */

export function safely<T>(
  fn: () => T,
  context: string,
  defaultValue?: T
): T | undefined {
  try {
    return fn();
  } catch (e) {
    console.error(`[MobileStackLayout] Error in ${context}:`, e);
    return defaultValue;
  }
}
