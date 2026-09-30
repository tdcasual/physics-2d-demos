/**
 * Student numeric parsing, format gates, and instrument reading graders.
 */
import {
  exactDiscreteEqual,
  estimatedRangeContains,
  looksLikeWrongUnit,
  quantizeExactDiscreteMm,
  readingStrategyOf
} from './tolerance';
import type {
  FieldFeedback,
  MeasurementSnapshot,
  ParsedStudentNumber
} from './types';

const UNIT_ALIASES: Record<string, string> = {
  mm: 'mm',
  cm: 'cm',
  nm: 'nm',
  m: 'm',
  μm: 'μm',
  um: 'μm'
};

export type PositionFormatKind = 'caliper' | 'micrometer';

export function positionFormatKindFromSnapshot(
  snapshot: MeasurementSnapshot | null | undefined
): PositionFormatKind | null {
  if (!snapshot) return null;
  if (snapshot.instrumentId === 'micrometer') return 'micrometer';
  if (snapshot.instrumentId === 'caliper') return 'caliper';
  return null;
}

export function positionFormatDigits(kind: PositionFormatKind): 2 | 3 {
  return kind === 'caliper' ? 2 : 3;
}

const POSITION_FORMAT_MESSAGE: Record<PositionFormatKind, string> = {
  caliper: '游标卡尺读数须恰好两位小数',
  micrometer: '测微仪读数须恰好三位小数'
};

export type NumericFormatOptions = {
  /** Require exactly this many fractional digits (implies a decimal point). */
  decimalPlaces?: number;
  /**
   * Require exactly this many significant digits in the plain decimal
   * literal (e.g. `0.120` = 3 digits, `0.12` = 2). Counted on the raw
   * string, trailing zeros count, leading zeros do not. Incompatible with
   * `integer`.
   */
  significantDigits?: number;
  /** Require an integer literal (`/^[+-]?\d+$/` after trim; leading zeros ok). */
  integer?: boolean;
  /** Allow scientific notation. Default rejects any `e`/`E` anywhere. */
  allowScientific?: boolean;
  /** Allow a trailing letter-like unit suffix (`mm`, `cm`, …). Default true. */
  allowUnitSuffix?: boolean;
  /** Message for empty/blank input. Default 「请输入有效数值」. */
  emptyMessage?: string;
  /** Message for format / decimal-place / scientific failures. */
  formatMessage?: string;
};

const EMPTY_INPUT_MESSAGE = '请输入有效数值';

/**
 * 把看起来是数字的 CJK 字面收成 ASCII，再交给位数规则。
 * 中文输入法常把小数点打成「。」「．」，数字打成全角；半角逗号仍拒绝。
 */
export function normalizeStudentNumericLiteral(raw: string): string {
  return raw
    .trim()
    .replace(/[０-９]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - 0xff10 + 0x30)
    )
    .replace(/＋/g, '+')
    .replace(/[－−]/g, '-')
    .replace(/[，。．｡]/g, '.');
}

/**
 * Declarative numeric format gate for measurement inputs, shared by all
 * data-workspace scenes. Returns null when `raw` passes; otherwise a
 * `format`-layer feedback. Decimal-place counting works on the raw string
 * (never through binary floats). Scenes must not assemble their own regexes.
 */
export function checkNumericFormat(
  raw: string,
  options: NumericFormatOptions = {}
): FieldFeedback | null {
  const emptyMessage = options.emptyMessage ?? EMPTY_INPUT_MESSAGE;
  const formatMessage = options.formatMessage ?? emptyMessage;
  const trimmed = normalizeStudentNumericLiteral(raw);
  if (!trimmed) {
    return { ok: false, layer: 'format', message: emptyMessage };
  }
  if (!options.allowScientific && /[eE]/.test(trimmed)) {
    return { ok: false, layer: 'format', message: formatMessage };
  }
  if (options.integer) {
    const suffix =
      options.allowUnitSuffix === false ? '' : '(?:\\s*[A-Za-zµμ]+)?';
    if (!new RegExp(`^[+-]?\\d+${suffix}$`).test(trimmed)) {
      return { ok: false, layer: 'format', message: formatMessage };
    }
    return null;
  }
  if (options.significantDigits != null) {
    // 统计在去符号、去单位后缀的裸字面量上进行：前导零不算有效数字，
    // 末尾零算（0.120 = 3 位，0.12 = 2 位）。
    const body = trimmed.replace(/^[+-]/, '').replace(/\s*[A-Za-zµμ]+$/, '');
    const match = body.match(/^(0|[1-9]\d*)(?:\.(\d+))?$/);
    if (
      !match ||
      `${match[1]}${match[2] ?? ''}`.replace(/^0+/, '').length !==
        options.significantDigits
    ) {
      return { ok: false, layer: 'format', message: formatMessage };
    }
    if (options.decimalPlaces == null) return null;
    if ((match[2] ?? '').length !== options.decimalPlaces) {
      return { ok: false, layer: 'format', message: formatMessage };
    }
    return null;
  }
  if (options.decimalPlaces == null) {
    // Syntax-only mode: emptiness and scientific notation checked above;
    // remaining grammar is parseStudentNumber's business.
    return null;
  }
  const suffix =
    options.allowUnitSuffix === false ? '' : '(?:\\s*([A-Za-zµμ]+))?';
  const match = trimmed.match(
    new RegExp(`^[+-]?(0|[1-9]\\d*)\\.(\\d+)${suffix}$`)
  );
  if (!match) {
    return { ok: false, layer: 'format', message: formatMessage };
  }
  if (match[2].length !== options.decimalPlaces) {
    return { ok: false, layer: 'format', message: formatMessage };
  }
  return null;
}

/**
 * Strict position raw-string format for instrument-read positions: exactly
 * the instrument's fractional digit count, optional letter-like unit suffix
 * (suffix spelling is NOT validated to be `mm` — historically shape-only),
 * no scientific notation, no leading zeros in the integer part.
 * Thin delegate over {@link checkNumericFormat}; keep behaviour in lockstep.
 */
export function checkPositionRawFormat(
  raw: string,
  kind: PositionFormatKind
): FieldFeedback | null {
  return checkNumericFormat(raw, {
    decimalPlaces: positionFormatDigits(kind),
    formatMessage: POSITION_FORMAT_MESSAGE[kind]
  });
}

export function nextFailedAttempts(
  previous: number | undefined,
  options: { ok: boolean; count: boolean }
): number {
  if (options.ok) return 0;
  if (!options.count) return previous ?? 0;
  return (previous ?? 0) + 1;
}

export function withAttemptReference(
  feedback: FieldFeedback,
  failedAttempts: number,
  reference: string | undefined
): FieldFeedback {
  if (feedback.ok || failedAttempts < 3 || !reference) return feedback;
  return {
    ...feedback,
    message: `${feedback.message}（参考 ${reference}）`
  };
}

export type ParseStudentNumberOptions = {
  /** Accept scientific notation (`1.2e-3`). Default rejects it. */
  allowScientific?: boolean;
};

// 小数点的中文形态在 normalizeStudentNumericLiteral 里收成「.」。
// 半角逗号不归一，避免和千分位混淆。测量读数默认拒绝科学计数法；
// `allowScientific` 仅供非读数场景逃生。
const STUDENT_NUMBER_PATTERN = /^([+-]?\d+(?:\.\d+)?)\s*([A-Za-zµμ]+)?$/i;
const STUDENT_NUMBER_SCIENTIFIC_PATTERN =
  /^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*([A-Za-zµμ]+)?$/i;

export function parseStudentNumber(
  raw: string,
  expectedUnit: string,
  options: ParseStudentNumberOptions = {}
): ParsedStudentNumber {
  const trimmed = normalizeStudentNumericLiteral(raw);
  if (!trimmed) {
    return { ok: false, layer: 'format', message: EMPTY_INPUT_MESSAGE };
  }
  const match = trimmed.match(
    options.allowScientific
      ? STUDENT_NUMBER_SCIENTIFIC_PATTERN
      : STUDENT_NUMBER_PATTERN
  );
  if (!match) {
    return { ok: false, layer: 'format', message: EMPTY_INPUT_MESSAGE };
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return { ok: false, layer: 'format', message: EMPTY_INPUT_MESSAGE };
  }
  const unitToken = match[2];
  if (unitToken) {
    const unit =
      UNIT_ALIASES[unitToken.toLowerCase()] ?? unitToken.toLowerCase();
    if (unit !== expectedUnit) {
      return {
        ok: false,
        layer: 'unit',
        message: `请使用 ${expectedUnit}，不要换算后偷偷改写单位`
      };
    }
    return { ok: true, value, unit };
  }
  return { ok: true, value };
}

export function checkInstrumentReading(
  submittedMm: number,
  snapshot: MeasurementSnapshot | null | undefined
): FieldFeedback {
  if (!snapshot) {
    return {
      ok: false,
      layer: 'instrument',
      message: '请先对准仪器后再校对读数'
    };
  }
  if (!snapshot.aligned) {
    return {
      ok: false,
      layer: 'instrument',
      message: '准星未对准亮纹，请先对准后再读数'
    };
  }
  if (
    looksLikeWrongUnit(submittedMm, snapshot.readingMm, snapshot.precisionMm)
  ) {
    return {
      ok: false,
      layer: 'unit',
      message: '数值与当前读数差一个数量级，请确认单位是 mm'
    };
  }
  const strategy = readingStrategyOf(snapshot);
  if (strategy.kind === 'exact-discrete') {
    const canonical = quantizeExactDiscreteMm(
      snapshot.readingMm,
      strategy.stepMm
    );
    if (!exactDiscreteEqual(submittedMm, canonical)) {
      return {
        ok: false,
        layer: 'instrument',
        message: '与当前游标位置不符，请按最小分度重新读取'
      };
    }
    return { ok: true, message: '读数已校对' };
  }
  if (
    !estimatedRangeContains(
      submittedMm,
      snapshot.readingMm,
      strategy.halfRangeMm,
      strategy.minMm,
      strategy.maxMm
    )
  ) {
    return {
      ok: false,
      layer: 'instrument',
      message: '请重新观察主尺和微分筒后再估读'
    };
  }
  return { ok: true, message: '估读在合理范围内' };
}
