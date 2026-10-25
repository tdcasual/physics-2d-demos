/**
 * 参数值归一化（场景 setParams / URL / 控件回调共用）
 *
 * 此前每个场景各写一份 finite / asBoolean，近百份副本出现了语义漂移
 * （有的解析字符串、有的不解析，还有一份会返回 ±Infinity）。统一在此。
 */

/** 有限数原样返回；NaN / ±Infinity / 非数值类型回退 fallback */
export function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** 同 finiteOr，另接受可解析为有限数的非空字符串 */
export function finiteNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** true / 1 / '1' / 'true'（不分大小写）为真，其余为假 */
export function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

/**
 * 三态布尔：boolean 原样；数值非 0 为真；字符串 0/false/off/no 为假、
 * 1/true/on/yes 为真（不分大小写、去空白）；其余回退 fallback。
 */
export function asBooleanOr(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === '0' || text === 'false' || text === 'off' || text === 'no') {
      return false;
    }
    if (text === '1' || text === 'true' || text === 'on' || text === 'yes') {
      return true;
    }
  }
  return fallback;
}
