/**
 * Double-slit wavelength / spacing checkers. Scene-owned physics, not panel.
 */

import {
  calculationTolerance,
  exactDiscreteEqual,
  instrumentToleranceMm,
  type FieldFeedback
} from '../../platform/data-workspace';

export function checkSameInstrument(
  first: { instrumentId: string } | undefined,
  second: { instrumentId: string } | undefined
): FieldFeedback | null {
  if (!first || !second) return null;
  if (first.instrumentId !== second.instrumentId) {
    return {
      ok: false,
      layer: 'instrument',
      message: 'x1 与 x2 须用同一台仪器、同一单位基准'
    };
  }
  return null;
}

export function checkIntervalCountFromOrders(
  n: number,
  order1: number,
  order2: number
): FieldFeedback {
  if (!Number.isInteger(n) || n <= 0) {
    return { ok: false, layer: 'format', message: 'n 应为正整数' };
  }
  const expected = Math.abs(order2 - order1);
  if (expected === 0) {
    return {
      ok: false,
      layer: 'range',
      message: '两端点是同一条亮纹，请再测一条不同的亮纹'
    };
  }
  if (n === expected) {
    return { ok: true, message: '间隔数已校对' };
  }
  if (n === expected + 1 || n === expected - 1) {
    return {
      ok: false,
      layer: 'relation',
      message: 'n 是两端点之间的亮纹间隔数，不是亮纹个数'
    };
  }
  return {
    ok: false,
    layer: 'relation',
    message: '间隔数与两端点间距不符，请重新数两端之间的间隔'
  };
}

export function checkIntervalCount(
  n: number,
  x1Mm: number,
  x2Mm: number,
  theoreticalDeltaXmm: number,
  precisionMm: number
): FieldFeedback {
  if (!Number.isInteger(n) || n <= 0) {
    return { ok: false, layer: 'format', message: 'n 应为正整数' };
  }
  const span = Math.abs(x2Mm - x1Mm);
  if (span <= instrumentToleranceMm(precisionMm)) {
    return {
      ok: false,
      layer: 'range',
      message: '两端点几乎重合，请再测一条不同的亮纹'
    };
  }
  const expected = span / theoreticalDeltaXmm;
  const err = Math.abs(n - expected);
  if (err <= 0.35) {
    return { ok: true, message: '间隔数已校对' };
  }
  if (
    Math.abs(n - 1 - expected) <= 0.35 ||
    Math.abs(n + 1 - expected) <= 0.35
  ) {
    return {
      ok: false,
      layer: 'relation',
      message: 'n 是两端点之间的亮纹间隔数，不是亮纹个数'
    };
  }
  return {
    ok: false,
    layer: 'relation',
    message: '间隔数与两端点间距不符，请重新数两端之间的间隔'
  };
}

export function checkDifference(
  D: number,
  x1Mm: number,
  x2Mm: number
): FieldFeedback {
  const expected = x2Mm - x1Mm;
  if (expected <= 0 && D > 0) {
    return {
      ok: false,
      layer: 'relation',
      message: 'D = x2 − x1，请保证 x2 大于 x1'
    };
  }
  // D 是两笔已校对读数的纯减法，不存在独立读数误差：无论卡尺（0.02 mm
  // 网格）还是测微仪（0.001 mm 估读），x1/x2 在校对通过时即已定格，差值
  // 唯一。提交值须与其浮点相等（5e-7 只吸收二进制减法尾差），
  // 0.001 量级的凑数也会被拒。
  if (!exactDiscreteEqual(D, expected)) {
    return { ok: false, layer: 'relation', message: 'D 应为 x2 减去 x1' };
  }
  if (D <= 0) {
    return {
      ok: false,
      layer: 'range',
      message: 'D 应为正值，请先测较小位置为 x1'
    };
  }
  return { ok: true, message: '间距 D 已校对' };
}

export function checkFringeSpacing(
  deltaX: number,
  D: number,
  n: number,
  displayDigits: number
): FieldFeedback {
  if (n <= 0) {
    return { ok: false, layer: 'format', message: '请先得到有效的间隔数 n' };
  }
  const expected = D / n;
  // calculationTolerance = 半单位舍入界（0.5×10^-displayDigits）：
  // Δx = D/n 的唯一合法偏差是末位舍入。
  const tol = calculationTolerance(displayDigits);
  if (Math.abs(deltaX - expected) > tol) {
    return { ok: false, layer: 'relation', message: 'Δx 应为 D 除以 n' };
  }
  if (deltaX <= 0) {
    return { ok: false, layer: 'range', message: '条纹间距应为正值' };
  }
  return { ok: true, message: 'Δx 已校对' };
}

export function checkAverageSpacing(
  average: number,
  deltaXs: readonly number[],
  displayDigits: number
): FieldFeedback {
  if (deltaXs.length === 0) {
    return { ok: false, layer: 'range', message: '请先完成各组 Δx' };
  }
  const expected = deltaXs.reduce((sum, v) => sum + v, 0) / deltaXs.length;
  // 各组 Δx 都已按 displayDigits 舍入，均值的合法偏差仍是半单位。
  const tol = calculationTolerance(displayDigits);
  if (Math.abs(average - expected) > tol) {
    return {
      ok: false,
      layer: 'relation',
      message: '请对已校对的各组 Δx 取算术平均'
    };
  }
  return { ok: true, message: '平均间距已校对' };
}

export function wavelengthNmFromAverage(
  dMm: number,
  averageDeltaXmm: number,
  L_m: number
): number {
  return (1000 * dMm * averageDeltaXmm) / L_m;
}

export function checkWavelengthNm(
  submittedNm: number,
  dMm: number,
  averageDeltaXmm: number,
  L_m: number,
  precisionMm: number
): FieldFeedback {
  if (submittedNm <= 0) {
    return { ok: false, layer: 'range', message: '波长应为正值' };
  }
  if (submittedNm < 10) {
    return {
      ok: false,
      layer: 'unit',
      message: '请用 nm 填写波长，不要写成 mm 或 m'
    };
  }
  if (submittedNm > 2000) {
    return {
      ok: false,
      layer: 'unit',
      message: '数值过大，请确认波长单位是 nm'
    };
  }
  const expected = wavelengthNmFromAverage(dMm, averageDeltaXmm, L_m);
  const deltaTol = instrumentToleranceMm(precisionMm);
  const lambdaTol = Math.max(
    1,
    Math.abs(
      wavelengthNmFromAverage(dMm, averageDeltaXmm + deltaTol, L_m) - expected
    )
  );
  if (Math.abs(submittedNm - expected) > lambdaTol + 0.5) {
    return {
      ok: false,
      layer: 'relation',
      message: '请用 λ = d·平均Δx / L，并统一 mm 与 m 的换算'
    };
  }
  return { ok: true, message: '波长已校对' };
}
