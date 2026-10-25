/**
 * 读数契约与格式化（场景 → 读数面板 / 演示 HUD）
 *
 * 场景返回**数值 + 精度 + 单位**，由平台统一格式化：负零、非有限数、有效数字与
 * 单位拼接只在这里处理。迁移期仍接受已格式化的字符串（会做负零清洗）。
 */

export type ReadoutPrecision = {
  /** 固定小数位（缺省 2）；与 sigFigs 二选一 */
  digits?: number;
  /** 有效数字位数；优先于 digits */
  sigFigs?: number;
  /** 正数前加 '+'（方向量） */
  signed?: boolean;
};

export interface ReadoutItem extends ReadoutPrecision {
  /** 投影 HUD 过滤键；有 readoutKeys 的场景必须带 */
  key?: string;
  label: string;
  /** number 由平台格式化；string 视为已格式化（迁移期兼容） */
  value: string | number;
  unit?: string;
  layout?: 'half' | 'full';
}

const DEFAULT_DIGITS = 2;
const NON_FINITE_TEXT = '—';

function decimalsForSigFigs(value: number, sigFigs: number): number {
  if (value === 0) return Math.max(0, sigFigs - 1);
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  return Math.max(0, sigFigs - 1 - magnitude);
}

/** 数值 → 文本（不含单位） */
export function formatReadoutNumber(
  value: number,
  precision: ReadoutPrecision = {}
): string {
  if (!Number.isFinite(value)) return NON_FINITE_TEXT;
  let decimals =
    precision.sigFigs != null
      ? decimalsForSigFigs(value, precision.sigFigs)
      : (precision.digits ?? DEFAULT_DIGITS);
  let text = value.toFixed(decimals);
  // 四舍五入进位后量级变化（9.995 → 10.00）时按新量级重算有效数字
  if (precision.sigFigs != null) {
    const rounded = Number(text);
    const again = decimalsForSigFigs(rounded, precision.sigFigs);
    if (again !== decimals) {
      decimals = again;
      text = rounded.toFixed(decimals);
    }
  }
  text = stripNegativeZero(text);
  if (precision.signed && value > 0 && Number(text) !== 0) text = `+${text}`;
  return text;
}

/**
 * 去掉文本中「负零」的负号：-0、-0.0、−0.00（含 Unicode 减号），不影响 -0.001。
 */
export function stripNegativeZero(text: string): string {
  return text.replace(/(^|[^\d.])[-−](0(?:\.0+)?)(?![\d.])/g, '$1$2');
}

/** 读数项 → 显示文本（含单位） */
export function formatReadoutValue(item: ReadoutItem): string {
  const body =
    typeof item.value === 'number'
      ? formatReadoutNumber(item.value, item)
      : stripNegativeZero(item.value);
  return item.unit ? `${body} ${item.unit}` : body;
}

/** 读数项规范化：value 变为最终文本，单位并入，精度字段移除 */
export function normalizeReadoutItem(item: ReadoutItem): ReadoutItem {
  const normalized: ReadoutItem = {
    label: item.label,
    value: formatReadoutValue(item)
  };
  if (item.key !== undefined) normalized.key = item.key;
  if (item.layout !== undefined) normalized.layout = item.layout;
  return normalized;
}
