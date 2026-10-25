/**
 * 数据处理评分规则（声明式）
 *
 * 各实验的数值校对都是同一条流水线：格式（小数位 / 有效数字）→ 解析单位
 * → 期望值（可能尚不可求）→ 容差匹配 → 误差诊断（单位倍率、正负号）→
 * 反馈文案。场景只声明规则，流水线与文案层级在此统一。
 */

import { checkNumericFormat, parseStudentNumber } from './numeric-format';
import type { NumericFormatOptions } from './numeric-format';
import { withinEpsilon, withinTickTolerance } from './tolerance';
import type { FieldFeedback } from './types';

export type NumericRange = { min: number; max: number };

export type GradeTolerance =
  /** |value − expected| ≤ value（区间期望时作用于两端） */
  | { kind: 'epsilon'; value: number }
  /** 按刻度量化比较：容差 tolerance（单位）× ticksPerUnit 个刻度 */
  | { kind: 'ticks'; tolerance: number; ticksPerUnit: number };

export type GradeValueRule = {
  /** 单位（解析与单位倍率提示用） */
  unit: string;
  /** 期望值或可接受区间；null 表示依赖量尚未就绪 */
  expected: number | NumericRange | null;
  /** expected 为 null 时的 relation 层提示 */
  unavailableMessage?: string;
  tolerance: GradeTolerance;
  /** 单位倍率误差诊断（如 cm 写成 mm：[10, 100]） */
  unitRatios?: readonly number[];
  /**
   * 期望值量级不超过容差时跳过倍率诊断（「10 倍的 0 仍是 0」会误标）。
   * 默认 true。
   */
  slipNearZeroGuard?: boolean;
  /** 取相反数后能匹配时的提示（正负号错误） */
  signFlipMessage?: string;
  /** 不匹配时的 range 层提示 */
  rangeMessage: string;
  okMessage?: string;
};

export type GradeRule = GradeValueRule & {
  /** 格式要求（formatMessage 必填，作为 format 层提示） */
  format: NumericFormatOptions;
};

export type GradeResult = { value: number; feedback: FieldFeedback };

const DEFAULT_OK_MESSAGE = '校对通过';

/** 有限数集合的区间；为空时 null */
export function rangeOf(values: readonly number[]): NumericRange | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return { min: Math.min(...finite), max: Math.max(...finite) };
}

function toleranceValue(tolerance: GradeTolerance): number {
  return tolerance.kind === 'epsilon' ? tolerance.value : tolerance.tolerance;
}

/** value 是否落在期望（数值或区间）的容差内 */
export function matchesExpected(
  value: number,
  expected: number | NumericRange,
  tolerance: GradeTolerance
): boolean {
  if (typeof expected !== 'number') {
    const slack = toleranceValue(tolerance);
    if (value < expected.min) return withinEpsilon(value, expected.min, slack);
    if (value > expected.max) return withinEpsilon(value, expected.max, slack);
    return true;
  }
  if (tolerance.kind === 'ticks') {
    return withinTickTolerance(
      value,
      expected,
      Math.round(tolerance.tolerance * tolerance.ticksPerUnit),
      tolerance.ticksPerUnit
    );
  }
  return withinEpsilon(value, expected, tolerance.value);
}

function magnitude(expected: number | NumericRange): number {
  return typeof expected === 'number'
    ? Math.abs(expected)
    : Math.max(Math.abs(expected.min), Math.abs(expected.max));
}

/** 已解析数值的比对与诊断（格式/解析由调用方或 gradeNumber 负责） */
export function gradeValue(value: number, rule: GradeValueRule): FieldFeedback {
  const { expected } = rule;
  if (expected === null) {
    return {
      ok: false,
      layer: 'relation',
      message: rule.unavailableMessage ?? '依赖的数据尚未校对通过'
    };
  }
  const matches = (candidate: number): boolean =>
    matchesExpected(candidate, expected, rule.tolerance);
  if (matches(value)) {
    return { ok: true, message: rule.okMessage ?? DEFAULT_OK_MESSAGE };
  }
  const guard = rule.slipNearZeroGuard ?? true;
  if (
    rule.unitRatios &&
    (!guard || magnitude(expected) > toleranceValue(rule.tolerance))
  ) {
    for (const ratio of rule.unitRatios) {
      if (matches(value * ratio) || matches(value / ratio)) {
        return {
          ok: false,
          layer: 'unit',
          message: `数值与答案相差 ${ratio} 倍，请确认单位是 ${rule.unit}`
        };
      }
    }
  }
  if (rule.signFlipMessage && matches(-value)) {
    return { ok: false, layer: 'range', message: rule.signFlipMessage };
  }
  return { ok: false, layer: 'range', message: rule.rangeMessage };
}

/** 学生原始输入的完整校对：格式 → 解析 → 比对与诊断 */
export function gradeNumber(raw: string, rule: GradeRule): GradeResult {
  const parsed = parseStudentNumber(raw, rule.unit);
  const value = parsed.ok ? parsed.value : Number.NaN;
  const formatFeedback = checkNumericFormat(raw, rule.format);
  if (formatFeedback) return { value, feedback: formatFeedback };
  if (!parsed.ok) return { value, feedback: parsed };
  return { value, feedback: gradeValue(value, rule) };
}
