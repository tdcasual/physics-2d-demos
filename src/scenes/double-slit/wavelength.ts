/**
 * Double-slit wavelength / spacing checkers. Scene-owned physics, not panel.
 */

import {
  checkNumericFormat,
  exactDiscreteEqual,
  instrumentToleranceMm,
  readingStrategyOf,
  significantRoundingHalfUnit,
  withinEpsilon,
  type FieldFeedback,
  type MeasurementSnapshot,
  type ReadingStrategy
} from '../../platform/data-workspace';

/**
 * 计算量（Δx、平均 Δx、λ）的教学有效位数：乘除法结果按有效数字保留。
 * 读数（x₁/x₂）走仪器格式闸（卡尺 2 位小数、测微仪 3 位小数），D 是两次
 * 读数之差、走加减法规则（与读数同小数位），只有乘除法结果用本常量。
 */
export const CALC_SIG_FIGS = 3;

export function calcSigFigsHint(): string {
  return `${CALC_SIG_FIGS} 位有效数字`;
}

export function calcFormatMessage(what: string): string {
  return `${what}应为恰好 ${CALC_SIG_FIGS} 位有效数字，不支持指数记法`;
}

/** 计算量格式闸：恰好 N 位有效数字的普通小数（可用单位后缀）。 */
export function checkCalculatedFormat(
  raw: string,
  what: string
): FieldFeedback | null {
  return checkNumericFormat(raw, {
    significantDigits: CALC_SIG_FIGS,
    formatMessage: calcFormatMessage(what)
  });
}

/**
 * 计算量数值比较：唯一合法偏差是学生按 N 位有效数字舍入的半末位。
 * 顺带识别 mm/cm、mm/m 的倍率混淆并落到 unit 层。`withinEpsilon` 的
 * 1e-9 只吸收二进制尾差，保证恰好落在半末位边界的答案不被误拒。
 */
function compareCalculated(options: {
  submitted: number;
  expected: number;
  what: string;
  unit: string;
  relationMessage: string;
}): FieldFeedback {
  const { submitted, expected, what, unit, relationMessage } = options;
  if (!(submitted > 0)) {
    return { ok: false, layer: 'range', message: `${what}应为正值` };
  }
  const tol = significantRoundingHalfUnit(expected, CALC_SIG_FIGS);
  if (withinEpsilon(submitted, expected, tol)) {
    return { ok: true, message: `${what}已校对` };
  }
  for (const ratio of [10, 1000]) {
    if (
      withinEpsilon(submitted * ratio, expected, tol) ||
      withinEpsilon(submitted / ratio, expected, tol)
    ) {
      return {
        ok: false,
        layer: 'unit',
        message: `数值与答案相差 ${ratio} 倍，请确认${what}的单位是 ${unit}`
      };
    }
  }
  return { ok: false, layer: 'relation', message: relationMessage };
}

const BASELINE_MISMATCH: FieldFeedback = {
  ok: false,
  layer: 'instrument',
  message: 'x1 与 x2 须用同一台仪器、同一单位基准'
};

function readingStrategiesCompatible(
  first: ReadingStrategy,
  second: ReadingStrategy
): boolean {
  if (first.kind !== second.kind) return false;
  if (first.kind === 'exact-discrete' && second.kind === 'exact-discrete') {
    return first.stepMm === second.stepMm;
  }
  if (first.kind === 'estimated-range' && second.kind === 'estimated-range') {
    return (
      first.halfRangeMm === second.halfRangeMm &&
      first.minMm === second.minMm &&
      first.maxMm === second.maxMm
    );
  }
  return false;
}

export function checkSameInstrument(
  first: { instrumentId: string } | undefined,
  second: { instrumentId: string } | undefined
): FieldFeedback | null {
  if (!first || !second) return null;
  if (first.instrumentId !== second.instrumentId) return BASELINE_MISMATCH;
  return null;
}

/** x1/x2 must share instrument, precision, display digits, and reading strategy. */
export function checkPositionBaseline(
  first: MeasurementSnapshot | undefined,
  second: MeasurementSnapshot | undefined
): FieldFeedback | null {
  if (!first || !second) {
    return { ok: false, layer: 'relation', message: '请先校对 x1' };
  }
  if (
    first.instrumentId !== second.instrumentId ||
    first.precisionMm !== second.precisionMm ||
    first.displayDigits !== second.displayDigits ||
    !readingStrategiesCompatible(
      readingStrategyOf(first),
      readingStrategyOf(second)
    )
  ) {
    return BASELINE_MISMATCH;
  }
  return null;
}

export function positionBaselinesCompatible(
  snapshots: readonly MeasurementSnapshot[]
): MeasurementSnapshot | undefined {
  const first = snapshots[0];
  if (!first) return undefined;
  for (const snapshot of snapshots.slice(1)) {
    if (checkPositionBaseline(first, snapshot)) return undefined;
  }
  return first;
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
  n: number
): FieldFeedback {
  if (n <= 0) {
    return { ok: false, layer: 'format', message: '请先得到有效的间隔数 n' };
  }
  if (!(D > 0)) {
    return { ok: false, layer: 'range', message: '请先得到有效的间距 D' };
  }
  return compareCalculated({
    submitted: deltaX,
    expected: D / n,
    what: 'Δx',
    unit: 'mm',
    relationMessage: `Δx 应为 D ÷ n，按 ${calcSigFigsHint()}填写`
  });
}

export function checkAverageSpacing(
  average: number,
  deltaXs: readonly number[]
): FieldFeedback {
  if (deltaXs.length === 0) {
    return { ok: false, layer: 'range', message: '请先完成各组 Δx' };
  }
  const expected = deltaXs.reduce((sum, v) => sum + v, 0) / deltaXs.length;
  return compareCalculated({
    submitted: average,
    expected,
    what: '平均 Δx',
    unit: 'mm',
    relationMessage: `平均 Δx 应为各组 Δx 的算术平均，按 ${calcSigFigsHint()}填写`
  });
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
  L_m: number
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
  // 合法偏差 = max(λ 自身的半末位, 平均 Δx 半末位经 λ = d·平均Δx/L 放大)。
  // 后者覆盖「直接用未舍入的 Δx 求 λ」这条同样合法的路径：平均 Δx 已按
  // N 位有效数字定格，学生手上任何一条推导链的偏差都不会超过这个窗口。
  const roundTol = significantRoundingHalfUnit(expected, CALC_SIG_FIGS);
  const averageWindow = significantRoundingHalfUnit(
    averageDeltaXmm,
    CALC_SIG_FIGS
  );
  const propagated = Math.abs(
    wavelengthNmFromAverage(dMm, averageDeltaXmm + averageWindow, L_m) -
      expected
  );
  const tol = Math.max(roundTol, propagated);
  if (!withinEpsilon(submittedNm, expected, tol)) {
    return {
      ok: false,
      layer: 'relation',
      message: `请用 λ = d·平均Δx / L 计算并统一 mm 与 m 的换算，按 ${calcSigFigsHint()}填写 nm`
    };
  }
  return { ok: true, message: '波长已校对' };
}
