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

export function calculationTolerance(displayDigits: number): number {
  const digits = Number.isFinite(displayDigits)
    ? Math.max(0, Math.min(6, Math.round(displayDigits)))
    : 3;
  return 2 * 10 ** -digits;
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
