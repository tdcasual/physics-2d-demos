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
const SIGFIGS_MIN = 1;
const SIGFIGS_MAX = 21;
const EXPONENTIAL_BELOW_DECIMALS = 10;

function isValidSigFigs(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= SIGFIGS_MIN &&
    value <= SIGFIGS_MAX
  );
}

function clampFixedDigits(decimals: number): number {
  return Math.min(100, Math.max(0, decimals));
}

function roundHalfAwayFromZero(value: number, place: number): number {
  const sign = value < 0 ? -1 : 1;
  return sign * Math.floor(Math.abs(value) / place + 0.5) * place;
}

function formatWithDigits(value: number, digits: number): string {
  return value.toFixed(digits);
}

function formatWithSigFigs(value: number, sigFigs: number): string {
  if (value === 0) return formatWithDigits(0, clampFixedDigits(sigFigs - 1));
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const decimals = sigFigs - 1 - magnitude;
  if (decimals > EXPONENTIAL_BELOW_DECIMALS) {
    return value.toExponential(clampFixedDigits(sigFigs - 1));
  }
  if (decimals < 0) {
    const place = 10 ** -decimals;
    const rounded = roundHalfAwayFromZero(value, place);
    if (!Number.isFinite(rounded) || rounded === 0) {
      return Number.isFinite(rounded)
        ? formatWithSigFigs(0, sigFigs)
        : NON_FINITE_TEXT;
    }
    const nextMagnitude = Math.floor(Math.log10(Math.abs(rounded)));
    if (nextMagnitude !== magnitude) return formatWithSigFigs(rounded, sigFigs);
    return String(rounded);
  }
  let text = formatWithDigits(value, clampFixedDigits(decimals));
  const rounded = Number(text);
  if (Number.isFinite(rounded) && rounded !== 0) {
    const again = sigFigs - 1 - Math.floor(Math.log10(Math.abs(rounded)));
    if (again !== decimals) {
      text = formatWithDigits(rounded, clampFixedDigits(again));
    }
  }
  return text;
}

/** 数值 → 文本（不含单位） */
export function formatReadoutNumber(
  value: number,
  precision: ReadoutPrecision = {}
): string {
  if (!Number.isFinite(value)) return NON_FINITE_TEXT;
  const text =
    precision.sigFigs != null
      ? isValidSigFigs(precision.sigFigs)
        ? formatWithSigFigs(value, precision.sigFigs)
        : formatWithDigits(value, DEFAULT_DIGITS)
      : formatWithDigits(value, precision.digits ?? DEFAULT_DIGITS);
  const cleaned = stripNegativeZero(text);
  const numeric = Number(cleaned);
  if (
    precision.signed &&
    value > 0 &&
    Number.isFinite(numeric) &&
    numeric !== 0
  ) {
    return `+${cleaned}`;
  }
  return cleaned;
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
