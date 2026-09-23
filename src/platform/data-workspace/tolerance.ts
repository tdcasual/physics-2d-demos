type ReadingStrategy =
  | { kind: 'exact-discrete'; stepMm: number }
  | {
      kind: 'estimated-range';
      halfRangeMm: number;
      minMm?: number;
      maxMm?: number;
    };
type MeasurementSnapshot = {
  precisionMm: number;
  readingStrategy?: ReadingStrategy;
};

/**
 * 数值比较的 epsilon 纪律：本模块内三个既有常量各自内聚在唯一函数里，
 * 不得新增散落的 epsilon ——
 * - exactDiscreteEqual：5e-7（离散刻度等值）
 * - estimatedRangeContains：1e-9（闭区间端点）
 * - readingsAgree：1e-12（仪器读数一致）
 * 场景层判分一律改用 withinTickTolerance（网格量）或 withinEpsilon（绝对量），
 * 不允许再手写 `<= tol + 1e-9` 之类的比较。
 */

/**
 * Derived-row rounding window: half of the last kept fractional digit.
 * Derived quantities (differences, quotients, means of already-checked
 * readings) carry no reading error of their own — the only legitimate
 * deviation from the exact expectation is the student's final rounding to
 * the display precision, which never exceeds half a unit of that digit.
 */
export function calculationTolerance(displayDigits: number): number {
  const digits = Number.isFinite(displayDigits)
    ? Math.max(0, Math.min(6, Math.round(displayDigits)))
    : 3;
  return 0.5 * 10 ** -digits;
}

/** Round to `significant` significant digits (half away from zero). */
export function roundToSignificantDigits(
  value: number,
  significant: number
): number {
  if (!Number.isFinite(value) || value === 0) return value;
  const digits = Math.max(1, Math.min(12, Math.round(significant)));
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (digits - 1 - exponent);
  return Math.round(value * factor) / factor;
}

/** Half-unit window implied by rounding `value` to `significant` digits. */
export function significantRoundingHalfUnit(
  value: number,
  significant: number
): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const digits = Math.max(1, Math.min(12, Math.round(significant)));
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  return 0.5 * 10 ** (exponent - digits + 1);
}

/**
 * Compare two values that both live on a fixed tick grid (e.g. 0.01 cm) by
 * rounding each onto integer ticks first. Exact on-grid; never use this for
 * quantities that are not guaranteed to be multiples of 1/ticksPerUnit.
 */
export function withinTickTolerance(
  value: number,
  expected: number,
  toleranceTicks: number,
  ticksPerUnit: number
): boolean {
  const scale =
    ticksPerUnit > 0 && Number.isFinite(ticksPerUnit) ? ticksPerUnit : 100;
  const tolerance =
    Number.isFinite(toleranceTicks) && toleranceTicks > 0 ? toleranceTicks : 0;
  return (
    Math.abs(Math.round(value * scale) - Math.round(expected * scale)) <=
    tolerance
  );
}

/**
 * Absolute-boundary comparison with the single epsilon used by scene graders
 * (matches the historical `<= tolerance + 1e-9` semantics). Values need not
 * live on a tick grid. Non-finite tolerance rejects, mirroring the old
 * `<= NaN` behaviour.
 */
export function withinEpsilon(
  value: number,
  expected: number,
  tolerance: number
): boolean {
  if (!Number.isFinite(tolerance)) return false;
  const toleranceAbs = tolerance > 0 ? tolerance : 0;
  return Math.abs(value - expected) <= toleranceAbs + 1e-9;
}

export function instrumentToleranceMm(precisionMm: number): number {
  return Number.isFinite(precisionMm) && precisionMm > 0 ? precisionMm : 0.02;
}

export function quantizeExactDiscreteMm(rawMm: number, stepMm: number): number {
  const step = stepMm > 0 && Number.isFinite(stepMm) ? stepMm : 0.02;
  const q = Math.round(rawMm / step) * step;
  const decimals = Math.max(0, Math.min(8, Math.ceil(-Math.log10(step)) + 1));
  return Number(q.toFixed(decimals));
}

export function exactDiscreteEqual(
  submittedMm: number,
  canonicalMm: number
): boolean {
  return Math.abs(submittedMm - canonicalMm) < 5e-7;
}

export function estimatedRangeContains(
  submittedMm: number,
  centerMm: number,
  halfRangeMm: number,
  minMm?: number,
  maxMm?: number
): boolean {
  const half = halfRangeMm > 0 ? halfRangeMm : 0;
  let low = centerMm - half;
  let high = centerMm + half;
  if (typeof minMm === 'number') low = Math.max(low, minMm);
  if (typeof maxMm === 'number') high = Math.min(high, maxMm);
  const eps = 1e-9;
  return submittedMm + eps >= low && submittedMm - eps <= high;
}

export function readingStrategyOf(
  snapshot: MeasurementSnapshot
): ReadingStrategy {
  if (snapshot.readingStrategy) return snapshot.readingStrategy;
  return {
    kind: 'exact-discrete',
    stepMm: instrumentToleranceMm(snapshot.precisionMm)
  };
}

export function readingsAgree(
  submittedMm: number,
  actualMm: number,
  precisionMm: number
): boolean {
  return (
    Math.abs(submittedMm - actualMm) <=
    instrumentToleranceMm(precisionMm) + 1e-12
  );
}

export function looksLikeWrongUnit(
  submitted: number,
  actualMm: number,
  precisionMm: number
): boolean {
  const tol = instrumentToleranceMm(precisionMm);
  if (readingsAgree(submitted, actualMm, precisionMm)) return false;
  if (readingsAgree(submitted * 10, actualMm, precisionMm)) return true;
  if (readingsAgree(submitted / 10, actualMm, precisionMm)) return true;
  if (Math.abs(actualMm) > tol && Math.abs(submitted / actualMm - 0.1) < 0.05) {
    return true;
  }
  if (Math.abs(actualMm) > tol && Math.abs(submitted / actualMm - 10) < 0.05) {
    return true;
  }
  return false;
}
