import { describe, expect, it } from 'vitest';
import {
  addSessionTrial,
  allTrialsComplete,
  calculationTolerance,
  checkInstrumentReading,
  checkNumericFormat,
  checkPositionRawFormat,
  createEmptySession,
  dependencySatisfied,
  estimatedRangeContains,
  exactDiscreteEqual,
  fieldIsOk,
  getSummaryField,
  getTrialField,
  invalidateDownstream,
  isFieldReady,
  looksLikeWrongUnit,
  nextFailedAttempts,
  parseStudentNumber,
  quantizeExactDiscreteMm,
  readingsAgree,
  removeSessionTrial,
  resolveRowLimits,
  significantRoundingHalfUnit,
  shouldShowChartAnalysis,
  shouldEnableStagePanZoom,
  isChartField,
  chartStepReady,
  assertSpecGraph,
  summaryContextItems,
  trialLabel,
  trialHasContent,
  withAttemptReference,
  writeCheckedField,
  type DataWorkspaceSpec,
  type MeasurementSnapshot
} from '../../src/platform/data-workspace';
import {
  checkAverageSpacing,
  checkCalculatedFormat,
  checkDifference,
  checkFringeSpacing,
  checkIntervalCount,
  checkIntervalCountFromOrders,
  checkWavelengthNm,
  wavelengthNmFromAverage
} from '../../src/scenes/double-slit/wavelength';
import {
  CALIPER_PRECISION_MM,
  CALIPER_READING_STRATEGY,
  DOUBLE_SLIT_MAX_ROWS,
  MICROMETER_MAX_MM,
  MICROMETER_PRECISION_MM,
  MICROMETER_READING_STRATEGY,
  doubleSlitDataWorkspaceSpec,
  doubleSlitEligibility,
  doubleSlitHint,
  doubleSlitKnowns,
  evaluateDoubleSlitField,
  expectedQuantities,
  slitDistanceMm
} from '../../src/scenes/double-slit/data-task';
import {
  computeRealDeltaXmm,
  DEFAULT_L
} from '../../src/scenes/double-slit/scene.sim';
import {
  doubleSlitFringeOrder,
  withDoubleSlitFringeOrder
} from '../../src/scenes/double-slit/snapshot-meta';

function writeChecked(
  session: Parameters<typeof writeCheckedField>[0],
  trialIndex: Parameters<typeof writeCheckedField>[1],
  field: Parameters<typeof writeCheckedField>[2],
  state: Parameters<typeof writeCheckedField>[3]
) {
  return writeCheckedField(
    session,
    trialIndex,
    field,
    state,
    doubleSlitDataWorkspaceSpec
  );
}

const SNAPSHOT: MeasurementSnapshot = withDoubleSlitFringeOrder(
  {
    readingMm: 14.02,
    precisionMm: CALIPER_PRECISION_MM,
    displayDigits: 3,
    instrumentId: 'caliper',
    instrumentLabel: '干涉读数游标卡尺',
    capturedAt: 1,
    aligned: true,
    residualPx: 0.2,
    readingStrategy: { kind: 'exact-discrete', stepMm: 0.02 }
  },
  2
);

describe('chartAnalysis opt-in / opt-out', () => {
  it('exposes only d and L as knowns and keeps the concise unit hint', () => {
    const params = {
      step: 6,
      lambda: 532,
      slitDistance: 20,
      isPlaying: false,
      activeInstrument: 'caliper' as const,
      showInstrumentReadout: true,
      micrometerOffset: 0,
      stripeOffset: 0,
      L: 0.7,
      lightMode: 'mono' as const
    };
    expect(doubleSlitKnowns(params).map((known) => known.key)).toEqual([
      'd',
      'L'
    ]);
    // 提示必须把逐字段的有效位数/小数位要求写清楚（触摸与键盘用户看不到 title）。
    expect(doubleSlitHint(params)).toContain('卡尺 2 位小数');
    expect(doubleSlitHint(params)).toContain('测微仪 3 位小数');
    expect(doubleSlitHint(params)).toContain('3 位有效数字');
    expect(doubleSlitHint(params)).not.toMatch(/单位 mm/);
    const formatHints = Object.fromEntries(
      [
        ...doubleSlitDataWorkspaceSpec.rowFields,
        ...doubleSlitDataWorkspaceSpec.summaryFields
      ]
        .filter((field) => field.formatHint)
        .map((field) => [field.id, field.formatHint])
    );
    expect(formatHints).toEqual({});
  });

  it('hides chart analysis when the spec does not enable it', () => {
    expect(doubleSlitDataWorkspaceSpec.chartAnalysis).toBe(false);
    expect(doubleSlitDataWorkspaceSpec.enabledSteps).not.toContain(
      'chartAnalysis'
    );
    expect(shouldShowChartAnalysis(doubleSlitDataWorkspaceSpec)).toBe(false);
    expect(doubleSlitDataWorkspaceSpec.tableOrientation).toBeUndefined();
    expect(doubleSlitDataWorkspaceSpec.stageLock).toBeUndefined();
    expect(
      doubleSlitDataWorkspaceSpec.summaryFields.every(
        (field) => field.step == null
      )
    ).toBe(true);
  });

  it('shows chart analysis only when the task explicitly opts in', () => {
    const spec: DataWorkspaceSpec = {
      ...doubleSlitDataWorkspaceSpec,
      chartAnalysis: true,
      enabledSteps: [
        ...doubleSlitDataWorkspaceSpec.enabledSteps,
        'chartAnalysis'
      ]
    };
    expect(shouldShowChartAnalysis(spec)).toBe(true);
  });

  it('does not show a chart region if only the boolean is set', () => {
    const spec: DataWorkspaceSpec = {
      ...doubleSlitDataWorkspaceSpec,
      chartAnalysis: true
    };
    expect(shouldShowChartAnalysis(spec)).toBe(false);
  });
});

describe('summary context and staged calculation readiness', () => {
  it('picks current knowns by optional spec keys without inventing values', () => {
    const knowns = [
      { key: 'd', label: '双缝间距 d', value: '0.20 mm' },
      { key: 'L', label: '缝屏距 L', value: '70 cm' },
      { key: 'instrument', label: '当前仪器', value: '干涉读数游标卡尺' }
    ];
    expect(
      summaryContextItems(
        knowns,
        doubleSlitDataWorkspaceSpec.summary?.contextKnownKeys
      )
    ).toEqual([knowns[0], knowns[1]]);
    expect(summaryContextItems(knowns, undefined)).toEqual([]);
    expect(summaryContextItems(knowns, ['missing'])).toEqual([]);
  });

  it('enables average only after valid non-stale deltaX, then lambda after average', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    expect(
      isFieldReady(session, doubleSlitDataWorkspaceSpec, 'averageDeltaX')
    ).toBe(false);
    expect(isFieldReady(session, doubleSlitDataWorkspaceSpec, 'lambda')).toBe(
      false
    );
    session = writeChecked(session, 0, 'deltaX', {
      raw: '1.8',
      value: 1.8,
      checked: true,
      stale: false,
      feedback: { ok: true, message: 'ok' }
    });
    expect(
      isFieldReady(session, doubleSlitDataWorkspaceSpec, 'averageDeltaX')
    ).toBe(true);
    expect(isFieldReady(session, doubleSlitDataWorkspaceSpec, 'lambda')).toBe(
      false
    );
    session = writeChecked(session, undefined, 'averageDeltaX', {
      raw: '1.8',
      value: 1.8,
      checked: true,
      stale: false,
      feedback: { ok: true, message: 'ok' }
    });
    expect(isFieldReady(session, doubleSlitDataWorkspaceSpec, 'lambda')).toBe(
      true
    );
    session = addSessionTrial(session, doubleSlitDataWorkspaceSpec);
    expect(
      isFieldReady(session, doubleSlitDataWorkspaceSpec, 'averageDeltaX')
    ).toBe(false);
    expect(isFieldReady(session, doubleSlitDataWorkspaceSpec, 'lambda')).toBe(
      false
    );
  });
});

describe('student input parsing and units', () => {
  it('accepts a bare millimetre value', () => {
    const parsed = parseStudentNumber('14.020', 'mm');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toBe(14.02);
  });

  it('rejects a mismatched unit instead of converting it', () => {
    const parsed = parseStudentNumber('1.402 cm', 'mm');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.layer).toBe('unit');
  });

  it('rejects empty and non-numeric input', () => {
    expect(parseStudentNumber('  ', 'mm').ok).toBe(false);
    expect(parseStudentNumber('abc', 'mm').ok).toBe(false);
  });

  it('rejects scientific notation by default with an opt-in escape hatch', () => {
    expect(parseStudentNumber('3.02e0', 'mm').ok).toBe(false);
    expect(parseStudentNumber('1.2e-3', 'mm').ok).toBe(false);
    expect(parseStudentNumber('14.02E1', 'mm').ok).toBe(false);
    const allowed = parseStudentNumber('1.2e-3', 'mm', {
      allowScientific: true
    });
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.value).toBeCloseTo(0.0012, 10);
  });

  it('accepts CJK decimal points and full-width digits, rejects half-width commas', () => {
    for (const raw of ['3，02', '3。02', '3．02', '３.０２', '−3.02']) {
      const parsed = parseStudentNumber(raw, 'mm');
      expect(parsed.ok, raw).toBe(true);
      if (parsed.ok)
        expect(parsed.value, raw).toBeCloseTo(
          raw.startsWith('−') ? -3.02 : 3.02,
          10
        );
    }
    expect(parseStudentNumber('3,02', 'mm').ok).toBe(false);
  });

  it('detects cm/mm decade confusion against an instrument reading', () => {
    expect(looksLikeWrongUnit(1.402, 14.02, CALIPER_PRECISION_MM)).toBe(true);
    expect(looksLikeWrongUnit(14.02, 14.02, CALIPER_PRECISION_MM)).toBe(false);
  });
});

describe('checkNumericFormat', () => {
  it('enforces exact decimal places via thin delegation parity', () => {
    expect(checkNumericFormat('3.02', { decimalPlaces: 2 })).toBeNull();
    expect(checkNumericFormat('-0.005', { decimalPlaces: 3 })).toBeNull();
    for (const raw of ['3.0', '3.020', '3', '3.', '.02', '01.02']) {
      const fb = checkNumericFormat(raw, {
        decimalPlaces: 2,
        formatMessage: '须两位小数'
      });
      expect(fb?.layer, raw).toBe('format');
      expect(fb?.message, raw).toBe('须两位小数');
    }
    expect(checkNumericFormat('3.02 mm', { decimalPlaces: 2 })).toBeNull();
  });

  it('gates integer literals with optional unit suffix', () => {
    expect(checkNumericFormat('5', { integer: true })).toBeNull();
    expect(checkNumericFormat('-7', { integer: true })).toBeNull();
    expect(checkNumericFormat('05', { integer: true })).toBeNull();
    expect(checkNumericFormat('5 mm', { integer: true })).toBeNull();
    expect(checkNumericFormat('3.0', { integer: true })?.layer).toBe('format');
    expect(
      checkNumericFormat('5 mm', { integer: true, allowUnitSuffix: false })
        ?.layer
    ).toBe('format');
  });

  it('rejects scientific notation anywhere unless allowed', () => {
    for (const raw of ['1.402e1', '14.02e0', '1.40E+1', '1e2']) {
      expect(checkNumericFormat(raw, {})?.layer, raw).toBe('format');
    }
    expect(checkNumericFormat('1e2', { allowScientific: true })).toBeNull();
    // 语法-only 模式不判小数位数，语法判断交给 parseStudentNumber。
    expect(checkNumericFormat('abc', {})).toBeNull();
    expect(checkNumericFormat('3.020', {})).toBeNull();
  });

  it('rejects e anywhere, including inside unit words (preserved behaviour)', () => {
    expect(checkPositionRawFormat('14.02 meter', 'caliper')?.layer).toBe(
      'format'
    );
    expect(checkNumericFormat('3.02 sec', { decimalPlaces: 2 })?.layer).toBe(
      'format'
    );
  });

  it('normalizes CJK numerals and uses distinct empty-input message', () => {
    expect(checkNumericFormat('3，02', { decimalPlaces: 2 })).toBeNull();
    expect(checkNumericFormat('0。32', { decimalPlaces: 2 })).toBeNull();
    expect(checkNumericFormat('３．９４', { decimalPlaces: 2 })).toBeNull();
    expect(checkPositionRawFormat('0。32', 'caliper')).toBeNull();
    const empty = checkNumericFormat('   ', {
      emptyMessage: '请先输入',
      formatMessage: '格式不对'
    });
    expect(empty?.message).toBe('请先输入');
    const bad = checkNumericFormat('3.0', {
      decimalPlaces: 2,
      emptyMessage: '请先输入',
      formatMessage: '格式不对'
    });
    expect(bad?.message).toBe('格式不对');
  });
});

describe('instrument reading strategies', () => {
  const caliperSnap: MeasurementSnapshot = {
    ...SNAPSHOT,
    readingMm: 9.56,
    readingStrategy: CALIPER_READING_STRATEGY
  };
  const micrometerSnap: MeasurementSnapshot = {
    readingMm: 12.345,
    precisionMm: MICROMETER_PRECISION_MM,
    displayDigits: 3,
    instrumentId: 'micrometer',
    instrumentLabel: '高精度干涉测微仪',
    capturedAt: 1,
    aligned: true,
    residualPx: 0.1,
    metadata: { fringeOrder: 3 },
    readingStrategy: MICROMETER_READING_STRATEGY
  };

  it('quantizes caliper readings onto the unique 0.02 mm tick', () => {
    expect(CALIPER_READING_STRATEGY.kind).toBe('exact-discrete');
    expect(CALIPER_READING_STRATEGY.stepMm).toBeCloseTo(0.02, 10);
    expect(quantizeExactDiscreteMm(9.561, 0.02)).toBeCloseTo(9.56, 10);
    expect(quantizeExactDiscreteMm(9.57, 0.02)).toBeCloseTo(9.58, 10);
    expect(exactDiscreteEqual(9.56, 9.561)).toBe(false);
  });

  it('accepts equivalent caliper formats and rejects ±0.001 mm', () => {
    const parsed = parseStudentNumber('9.56', 'mm');
    const paddedParsed = parseStudentNumber('9.560', 'mm');
    expect(parsed.ok).toBe(true);
    expect(paddedParsed.ok).toBe(true);
    if (!parsed.ok || !paddedParsed.ok) return;
    expect(exactDiscreteEqual(parsed.value, paddedParsed.value)).toBe(true);
    const ok = checkInstrumentReading(parsed.value, caliperSnap);
    expect(ok.ok).toBe(true);
    expect(ok.message).toMatch(/读数已校对/);
    expect(checkInstrumentReading(paddedParsed.value, caliperSnap).ok).toBe(
      true
    );
    const plus = checkInstrumentReading(9.561, caliperSnap);
    expect(plus.ok).toBe(false);
    expect(plus.layer).toBe('instrument');
    expect(plus.message).toMatch(/最小分度/);
    expect(plus.message).not.toMatch(/9\.56/);
    const minus = checkInstrumentReading(9.559, caliperSnap);
    expect(minus.ok).toBe(false);
    expect(readingsAgree(9.56, 9.561, CALIPER_PRECISION_MM)).toBe(true);
  });

  it('accepts the closed micrometer estimate range and rejects 0.001 outside', () => {
    expect(MICROMETER_READING_STRATEGY.kind).toBe('estimated-range');
    expect(MICROMETER_READING_STRATEGY.halfRangeMm).toBeCloseTo(0.005, 10);
    expect(estimatedRangeContains(12.345, 12.345, 0.005, 0, 32)).toBe(true);
    expect(estimatedRangeContains(12.34, 12.345, 0.005, 0, 32)).toBe(true);
    expect(estimatedRangeContains(12.35, 12.345, 0.005, 0, 32)).toBe(true);
    expect(estimatedRangeContains(12.339, 12.345, 0.005, 0, 32)).toBe(false);
    const center = checkInstrumentReading(12.345, micrometerSnap);
    expect(center.ok).toBe(true);
    expect(center.message).toBe('估读在合理范围内');
    expect(checkInstrumentReading(12.34, micrometerSnap).ok).toBe(true);
    expect(checkInstrumentReading(12.35, micrometerSnap).ok).toBe(true);
    const lowOut = checkInstrumentReading(12.339, micrometerSnap);
    expect(lowOut.ok).toBe(false);
    expect(lowOut.message).toBe('请重新观察主尺和微分筒后再估读');
    expect(lowOut.message).not.toMatch(/12\.3/);
    expect(lowOut.message).not.toMatch(/0\.005/);
    const highOut = checkInstrumentReading(12.351, micrometerSnap);
    expect(highOut.ok).toBe(false);
  });

  it('clamps the micrometer interval to the instrument range', () => {
    const atZero: MeasurementSnapshot = {
      ...micrometerSnap,
      readingMm: 0
    };
    expect(checkInstrumentReading(0, atZero).ok).toBe(true);
    expect(checkInstrumentReading(0.005, atZero).ok).toBe(true);
    expect(checkInstrumentReading(-0.001, atZero).ok).toBe(false);
    const atMax: MeasurementSnapshot = {
      ...micrometerSnap,
      readingMm: MICROMETER_MAX_MM
    };
    expect(checkInstrumentReading(32, atMax).ok).toBe(true);
    expect(checkInstrumentReading(31.995, atMax).ok).toBe(true);
    expect(checkInstrumentReading(32.001, atMax).ok).toBe(false);
  });

  it('still prefers unit-magnitude errors and keeps alignment / instrument rules', () => {
    const unit = checkInstrumentReading(1.402, SNAPSHOT);
    expect(unit.ok).toBe(false);
    expect(unit.layer).toBe('unit');
    const miss = checkInstrumentReading(16.0, SNAPSHOT);
    expect(miss.ok).toBe(false);
    expect(miss.layer).toBe('instrument');
    expect(checkInstrumentReading(14.02, SNAPSHOT).ok).toBe(true);
    const unaligned = checkInstrumentReading(14.02, {
      ...SNAPSHOT,
      aligned: false,
      residualPx: 8
    });
    expect(unaligned.ok).toBe(false);
    expect(unaligned.message).toMatch(/亮纹/);
    expect(looksLikeWrongUnit(1.2345, 12.345, MICROMETER_PRECISION_MM)).toBe(
      true
    );
  });
});

describe('double-slit derived checks', () => {
  const params = {
    step: 6,
    lambda: 532,
    slitDistance: 20,
    isPlaying: true,
    activeInstrument: 'caliper' as const,
    showInstrumentReadout: false,
    micrometerOffset: 0,
    stripeOffset: 12,
    L: DEFAULT_L,
    lightMode: 'mono' as const,
    filterColor: null
  };
  const expected = expectedQuantities(params);
  const deltaX = computeRealDeltaXmm(532, 20, 0.7);
  const x1 = 10;
  const n = 5;
  const x2 = x1 + n * deltaX;
  const D = x2 - x1;

  it('matches the textbook λ = d·Δx/L in nanometres', () => {
    expect(slitDistanceMm(20)).toBeCloseTo(0.2, 10);
    expect(deltaX).toBeCloseTo(((532e-9 * 0.7) / 0.2e-3) * 1000, 6);
    expect(wavelengthNmFromAverage(0.2, deltaX, 0.7)).toBeCloseTo(532, 6);
    expect(expected.theoreticalLambdaNm).toBeCloseTo(532, 6);
  });

  it('accepts interval count n, not the number of bright fringes', () => {
    expect(checkIntervalCount(n, x1, x2, deltaX, CALIPER_PRECISION_MM).ok).toBe(
      true
    );
    const fringeCount = n + 1;
    const fb = checkIntervalCount(
      fringeCount,
      x1,
      x2,
      deltaX,
      CALIPER_PRECISION_MM
    );
    expect(fb.ok).toBe(false);
    expect(fb.message).toMatch(/间隔数/);
    expect(checkIntervalCountFromOrders(5, 2, 7).ok).toBe(true);
    expect(checkIntervalCountFromOrders(6, 2, 7).ok).toBe(false);
    expect(checkIntervalCountFromOrders(6, 2, 7).message).toMatch(/间隔数/);
  });

  it('checks D = x2 − x1 exactly (pure subtraction, no rounding slack)', () => {
    expect(checkDifference(D, x1, x2).ok).toBe(true);
    expect(checkDifference(D + 0.05, x1, x2).ok).toBe(false);
    // D 为已校对读数的纯减法：非精确差（含 0.001 量级凑数）一律拒绝。
    expect(checkDifference(D + 0.001, x1, x2).ok).toBe(false);
  });

  it('grades Δx with the 3-significant-digit half unit, not fixed decimals', () => {
    const exact = D / n; // 1.862
    expect(checkFringeSpacing(exact, D, n).ok).toBe(true);
    expect(checkFringeSpacing(1.86, D, n).ok).toBe(true);
    expect(checkFringeSpacing(1.87, D, n).ok).toBe(false);
    // 固定小数位口径（旧的 0.0005 半单位）会误拒合法的 3 位有效数字答案。
    expect(calculationTolerance(3)).toBeCloseTo(0.0005, 10);
    expect(Math.abs(1.86 - exact)).toBeGreaterThan(calculationTolerance(3));
    // 半末位边界本身必须通过（IEEE 754 尾差不得误拒）：8.79/6 = 1.4649999999999999，
    // 于是 1.47 与期望的差距是 0.0050000000000001155，比半末位多出 1e-16。
    const boundary = 8.79 / 6;
    expect(significantRoundingHalfUnit(boundary, 3)).toBeCloseTo(0.005, 10);
    expect(checkFringeSpacing(1.46, 8.79, 6).ok).toBe(true);
    expect(checkFringeSpacing(1.47, 8.79, 6).ok).toBe(true);
    expect(checkFringeSpacing(1.45, 8.79, 6).ok).toBe(false);
    // 单位混淆落 unit 层（cm 值小 10 倍）。
    const cm = checkFringeSpacing(0.186, D, n);
    expect(cm.ok).toBe(false);
    expect(cm.layer).toBe('unit');
    expect(checkFringeSpacing(0, D, n).layer).toBe('range');
  });

  it('checks the mean of three Δx values then wavelength', () => {
    const samples = [deltaX, deltaX + 0.001, deltaX - 0.001];
    const mean = samples.reduce((a, b) => a + b, 0) / 3;
    expect(checkAverageSpacing(mean, samples).ok).toBe(true);
    expect(checkAverageSpacing(1.86, samples).ok).toBe(true);
    expect(checkAverageSpacing(mean + 0.05, samples).ok).toBe(false);
    expect(checkAverageSpacing(18.6, samples).layer).toBe('unit');
    expect(checkWavelengthNm(532, 0.2, mean, 0.7).ok).toBe(true);
    // 逐位正确的 3 位有效数字 λ 必须通过；错值拒绝。
    expect(checkWavelengthNm(531, 0.2, 1.86, 0.7).ok).toBe(true);
    expect(checkWavelengthNm(542, 0.2, 1.86, 0.7).ok).toBe(false);
    const nmAsMm = checkWavelengthNm(0.532, 0.2, mean, 0.7);
    expect(nmAsMm.ok).toBe(false);
    expect(nmAsMm.layer).toBe('unit');
  });

  it('gates calculated values to exactly three significant digits', () => {
    expect(checkCalculatedFormat('1.86', 'Δx')).toBeNull();
    expect(checkCalculatedFormat('0.186', 'Δx')).toBeNull();
    expect(checkCalculatedFormat('18.6', 'Δx')).toBeNull();
    expect(checkCalculatedFormat('1.86 mm', 'Δx')).toBeNull();
    expect(checkCalculatedFormat('1.862', 'Δx')?.layer).toBe('format');
    expect(checkCalculatedFormat('1.9', 'Δx')?.layer).toBe('format');
    expect(checkCalculatedFormat('1.860', 'Δx')?.layer).toBe('format');
    expect(checkCalculatedFormat('1.86e2', 'Δx')?.layer).toBe('format');
    expect(checkCalculatedFormat('', 'Δx')?.layer).toBe('format');
  });
});

describe('eligibility does not rewrite physics params', () => {
  it('rejects white light and non-step-6 without changing caller state', () => {
    const base = {
      step: 5,
      lambda: 532,
      slitDistance: 20,
      isPlaying: true,
      activeInstrument: 'caliper' as const,
      showInstrumentReadout: false,
      micrometerOffset: 0,
      stripeOffset: 12,
      lightMode: 'white' as const,
      filterColor: null
    };
    const copy = { ...base };
    const result = doubleSlitEligibility(copy, true);
    expect(result.ok).toBe(false);
    expect(copy).toEqual(base);
    expect(
      doubleSlitEligibility({ ...base, step: 6, lightMode: 'mono' }, true).ok
    ).toBe(true);
  });
});

describe('sequential field evaluation and invalidation', () => {
  it('captures x1 against the snapshot taken at submit time', () => {
    const session = createEmptySession(1);
    const first = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '14.02' },
      snapshot: SNAPSHOT,
      expected: expectedQuantities({
        step: 6,
        lambda: 532,
        slitDistance: 20,
        isPlaying: true,
        activeInstrument: 'caliper',
        showInstrumentReadout: false,
        micrometerOffset: 0,
        stripeOffset: 12,
        L: 0.7,
        lightMode: 'mono'
      })
    });
    expect(first.feedback.ok).toBe(true);
    expect(
      getTrialField(first.session.trials[0], 'x1')?.snapshot?.readingMm
    ).toBe(14.02);

    const later = evaluateDoubleSlitField({
      session: first.session,
      submit: { field: 'x2', trialIndex: 0, raw: '14.02' },
      snapshot: { ...SNAPSHOT, readingMm: 19.31, capturedAt: 2 },
      expected: expectedQuantities({
        step: 6,
        lambda: 532,
        slitDistance: 20,
        isPlaying: true,
        activeInstrument: 'caliper',
        showInstrumentReadout: false,
        micrometerOffset: 0,
        stripeOffset: 12,
        L: 0.7,
        lightMode: 'mono'
      })
    });
    expect(later.feedback.ok).toBe(false);
    expect(
      getTrialField(later.session.trials[0], 'x1')?.snapshot?.readingMm
    ).toBe(14.02);
  });

  it('rejects x2 when both snapshots are aligned but instrument ids differ', () => {
    const expected = expectedQuantities({
      step: 6,
      lambda: 532,
      slitDistance: 20,
      isPlaying: true,
      activeInstrument: 'caliper',
      showInstrumentReadout: false,
      micrometerOffset: 0,
      stripeOffset: 12,
      L: 0.7,
      lightMode: 'mono'
    });
    const caliperSnap: MeasurementSnapshot = withDoubleSlitFringeOrder(
      {
        ...SNAPSHOT,
        instrumentId: 'caliper',
        aligned: true,
        readingMm: 14.02
      },
      2
    );
    const micrometerSnap: MeasurementSnapshot = withDoubleSlitFringeOrder(
      {
        ...SNAPSHOT,
        instrumentId: 'micrometer',
        instrumentLabel: '高精度干涉测微仪',
        aligned: true,
        readingMm: 16,
        residualPx: 0.1
      },
      5
    );
    expect(caliperSnap.aligned).toBe(true);
    expect(micrometerSnap.aligned).toBe(true);
    const first = evaluateDoubleSlitField({
      session: createEmptySession(3),
      submit: { field: 'x1', trialIndex: 0, raw: '14.02' },
      snapshot: caliperSnap,
      expected
    });
    expect(first.feedback.ok).toBe(true);
    const second = evaluateDoubleSlitField({
      session: first.session,
      submit: { field: 'x2', trialIndex: 0, raw: '16.000' },
      snapshot: micrometerSnap,
      expected: {
        ...expected
      }
    });
    expect(second.feedback.ok).toBe(false);
    expect(second.feedback.layer).toBe('instrument');
    expect(second.feedback.message).toBe(
      'x1 与 x2 须用同一台仪器、同一单位基准'
    );
  });

  it('checks n from bright-fringe order, not a theoretical Δx dump', () => {
    let session = createEmptySession(3);
    const expected = expectedQuantities({
      step: 6,
      lambda: 532,
      slitDistance: 20,
      isPlaying: true,
      activeInstrument: 'caliper',
      showInstrumentReadout: false,
      micrometerOffset: 0,
      stripeOffset: 12,
      L: 0.7,
      lightMode: 'mono'
    });
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.00' },
      snapshot: withDoubleSlitFringeOrder({ ...SNAPSHOT, readingMm: 10 }, 1),
      expected
    }).session;
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x2', trialIndex: 0, raw: '19.32' },
      snapshot: withDoubleSlitFringeOrder(
        { ...SNAPSHOT, readingMm: 19.32, capturedAt: 2 },
        6
      ),
      expected
    }).session;
    const nOk = evaluateDoubleSlitField({
      session,
      submit: { field: 'n', trialIndex: 0, raw: '5' },
      snapshot: SNAPSHOT,
      expected
    });
    expect(nOk.feedback.ok).toBe(true);
    const nCount = evaluateDoubleSlitField({
      session: nOk.session,
      submit: { field: 'n', trialIndex: 0, raw: '6' },
      snapshot: SNAPSHOT,
      expected
    });
    expect(nCount.feedback.ok).toBe(false);
    expect(nCount.feedback.message).toMatch(/间隔数/);
  });

  it('marks downstream fields stale after an upstream correction', () => {
    let session = createEmptySession(3);
    session = writeChecked(session, 0, 'x1', {
      raw: '10',
      value: 10,
      checked: true,
      stale: false,
      feedback: { ok: true, message: 'ok' }
    });
    session = writeChecked(session, 0, 'D', {
      raw: '9',
      value: 9,
      checked: true,
      stale: false,
      feedback: { ok: true, message: 'ok' }
    });
    const next = invalidateDownstream(
      session,
      0,
      'x1',
      doubleSlitDataWorkspaceSpec
    );
    expect(getTrialField(next.trials[0], 'D')?.stale).toBe(true);
    expect(getTrialField(next.trials[0], 'D')?.checked).toBe(false);
    expect(next.completed).toBe(false);
  });

  it('does not treat unfinished trials as complete', () => {
    const session = createEmptySession(doubleSlitDataWorkspaceSpec);
    expect(allTrialsComplete(session, doubleSlitDataWorkspaceSpec)).toBe(false);
    expect(session.trials).toHaveLength(1);
  });

  it('keeps the student-submitted D and λ, not the hidden system values', () => {
    const expected = expectedQuantities({
      step: 6,
      lambda: 532,
      slitDistance: 20,
      isPlaying: true,
      activeInstrument: 'caliper',
      showInstrumentReadout: false,
      micrometerOffset: 0,
      stripeOffset: 12,
      L: 0.7,
      lightMode: 'mono'
    });
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.00' },
      snapshot: withDoubleSlitFringeOrder({ ...SNAPSHOT, readingMm: 10 }, 1),
      expected
    }).session;
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x2', trialIndex: 0, raw: '19.32' },
      snapshot: withDoubleSlitFringeOrder(
        { ...SNAPSHOT, readingMm: 19.32, capturedAt: 2 },
        6
      ),
      expected
    }).session;
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'n', trialIndex: 0, raw: '5' },
      snapshot: SNAPSHOT,
      expected
    }).session;
    const dResult = evaluateDoubleSlitField({
      session,
      submit: { field: 'D', trialIndex: 0, raw: '9.32' },
      snapshot: SNAPSHOT,
      expected
    });
    expect(dResult.feedback.ok).toBe(true);
    expect(getTrialField(dResult.session.trials[0], 'D')?.value).toBeCloseTo(
      9.32,
      10
    );
    expect(getTrialField(dResult.session.trials[0], 'D')?.value).not.toBe(
      expected.theoreticalDeltaXmm
    );
  });
});

describe('dynamic experiment rows', () => {
  it('reads min/max/initial rows from the spec instead of a UI constant', () => {
    expect(DOUBLE_SLIT_MAX_ROWS).toBe(6);
    expect(doubleSlitDataWorkspaceSpec.minRows).toBe(1);
    expect(doubleSlitDataWorkspaceSpec.maxRows).toBe(DOUBLE_SLIT_MAX_ROWS);
    expect(doubleSlitDataWorkspaceSpec.initialRows).toBe(1);
    expect(doubleSlitDataWorkspaceSpec.stageMode).toBe('instrument-only');
    expect(doubleSlitDataWorkspaceSpec.chartAnalysis).toBe(false);
    const limits = resolveRowLimits(doubleSlitDataWorkspaceSpec);
    expect(limits).toEqual({ minRows: 1, maxRows: 6, initialRows: 1 });
    const custom = resolveRowLimits({
      ...doubleSlitDataWorkspaceSpec,
      minRows: 2,
      maxRows: 4,
      initialRows: 3
    });
    expect(custom).toEqual({ minRows: 2, maxRows: 4, initialRows: 3 });
  });

  it('starts with the spec initial row count and stable ids', () => {
    const session = createEmptySession(doubleSlitDataWorkspaceSpec);
    expect(session.trials).toHaveLength(1);
    expect(session.trials[0]?.id).toBe('row-1');
    expect(session.nextRowSeq).toBe(2);
  });

  it('adds rows up to maxRows, then no-ops, and invalidates the summary', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    session = writeChecked(session, undefined, 'averageDeltaX', {
      raw: '1.8',
      value: 1.8,
      checked: true,
      stale: false,
      feedback: { ok: true, message: 'ok' }
    });
    session = writeChecked(session, undefined, 'lambda', {
      raw: '532',
      value: 532,
      checked: true,
      stale: false,
      feedback: { ok: true, message: 'ok' }
    });
    const firstId = session.trials[0]?.id;
    session = addSessionTrial(session, doubleSlitDataWorkspaceSpec);
    expect(session.trials).toHaveLength(2);
    expect(session.trials[0]?.id).toBe(firstId);
    expect(session.trials[1]?.id).toBe('row-2');
    expect(getSummaryField(session, 'averageDeltaX')?.stale).toBe(true);
    expect(getSummaryField(session, 'lambda')?.stale).toBe(true);
    expect(session.completed).toBe(false);
    for (let i = session.trials.length; i < DOUBLE_SLIT_MAX_ROWS; i += 1) {
      session = addSessionTrial(session, doubleSlitDataWorkspaceSpec);
    }
    expect(session.trials).toHaveLength(6);
    const blocked = addSessionTrial(session, doubleSlitDataWorkspaceSpec);
    expect(blocked.trials).toHaveLength(6);
    expect(blocked.trials.map((row) => row.id)).toEqual(
      session.trials.map((row) => row.id)
    );
  });

  it('requires confirm to delete a filled row and keeps other rows bound to their ids', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    session = addSessionTrial(session, doubleSlitDataWorkspaceSpec);
    session = addSessionTrial(session, doubleSlitDataWorkspaceSpec);
    session = writeChecked(session, 0, 'x1', {
      raw: '10',
      value: 10,
      checked: true,
      stale: false,
      snapshot: SNAPSHOT,
      feedback: { ok: true, message: 'ok' }
    });
    session = writeChecked(session, 1, 'x1', {
      raw: '12',
      value: 12,
      checked: true,
      stale: false,
      snapshot: withDoubleSlitFringeOrder({ ...SNAPSHOT, readingMm: 12 }, 4),
      feedback: { ok: true, message: 'ok' }
    });
    session = writeChecked(session, 2, 'x1', {
      raw: '14',
      value: 14,
      checked: true,
      stale: false,
      snapshot: withDoubleSlitFringeOrder({ ...SNAPSHOT, readingMm: 14 }, 6),
      feedback: { ok: true, message: 'ok' }
    });
    const middleId = session.trials[1]!.id;
    const denied = removeSessionTrial(
      session,
      doubleSlitDataWorkspaceSpec,
      middleId,
      false
    );
    expect(denied.needsConfirm).toBe(true);
    expect(denied.session.trials).toHaveLength(3);
    expect(getTrialField(denied.session.trials[1], 'x1')?.value).toBe(12);
    const removed = removeSessionTrial(
      session,
      doubleSlitDataWorkspaceSpec,
      middleId,
      true
    );
    expect(removed.needsConfirm).toBe(false);
    expect(removed.session.trials.map((row) => row.id)).toEqual([
      'row-1',
      'row-3'
    ]);
    expect(getTrialField(removed.session.trials[0], 'x1')?.value).toBe(10);
    expect(
      doubleSlitFringeOrder(
        getTrialField(removed.session.trials[0], 'x1')?.snapshot
      )
    ).toBe(2);
    expect(getTrialField(removed.session.trials[1], 'x1')?.value).toBe(14);
    expect(
      getTrialField(removed.session.trials[1], 'x1')?.snapshot?.readingMm
    ).toBe(14);
  });

  it('deletes an empty row immediately and refuses to go below minRows', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    expect(trialHasContent(session.trials[0]!)).toBe(false);
    const only = removeSessionTrial(
      session,
      doubleSlitDataWorkspaceSpec,
      'row-1',
      false
    );
    expect(only.session.trials).toHaveLength(1);
    session = addSessionTrial(session, doubleSlitDataWorkspaceSpec);
    const emptied = removeSessionTrial(
      session,
      doubleSlitDataWorkspaceSpec,
      'row-2',
      false
    );
    expect(emptied.needsConfirm).toBe(false);
    expect(emptied.session.trials).toHaveLength(1);
    expect(emptied.session.trials[0]?.id).toBe('row-1');
  });

  it('treats a single completed row as enough for the summary, then invalidates on add', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    session = writeChecked(session, 0, 'deltaX', {
      raw: '1.862',
      value: 1.862,
      checked: true,
      stale: false,
      feedback: { ok: true, message: 'ok' }
    });
    expect(allTrialsComplete(session, doubleSlitDataWorkspaceSpec)).toBe(true);
    session = writeChecked(session, undefined, 'averageDeltaX', {
      raw: '1.862',
      value: 1.862,
      checked: true,
      stale: false,
      feedback: { ok: true, message: 'ok' }
    });
    const afterAdd = addSessionTrial(session, doubleSlitDataWorkspaceSpec);
    expect(allTrialsComplete(afterAdd, doubleSlitDataWorkspaceSpec)).toBe(
      false
    );
    expect(getSummaryField(afterAdd, 'averageDeltaX')?.stale).toBe(true);
    expect(getTrialField(afterAdd.trials[0], 'deltaX')?.checked).toBe(true);
    const restored = removeSessionTrial(
      afterAdd,
      doubleSlitDataWorkspaceSpec,
      'row-2',
      false
    );
    expect(
      allTrialsComplete(restored.session, doubleSlitDataWorkspaceSpec)
    ).toBe(true);
    expect(
      getTrialField(restored.session.trials[0], 'deltaX')?.value
    ).toBeCloseTo(1.862, 10);
  });
});

const CALIPER_EXPECTED = expectedQuantities({
  step: 6,
  lambda: 532,
  slitDistance: 20,
  isPlaying: true,
  activeInstrument: 'caliper',
  showInstrumentReadout: false,
  micrometerOffset: 0,
  stripeOffset: 12,
  L: 0.7,
  lightMode: 'mono'
});

const MICRO_SNAP: MeasurementSnapshot = withDoubleSlitFringeOrder(
  {
    readingMm: 12.345,
    precisionMm: MICROMETER_PRECISION_MM,
    displayDigits: 3,
    instrumentId: 'micrometer',
    instrumentLabel: '高精度干涉测微仪',
    capturedAt: 1,
    aligned: true,
    residualPx: 0.1,
    readingStrategy: MICROMETER_READING_STRATEGY
  },
  3
);

describe('x1/x2 raw format matrix', () => {
  it('accepts exact fractionals and optional mm; rejects shortened, padded, scientific', () => {
    expect(checkPositionRawFormat('14.02', 'caliper')).toBeNull();
    expect(checkPositionRawFormat('14.02 mm', 'caliper')).toBeNull();
    expect(checkPositionRawFormat('14.02mm', 'caliper')).toBeNull();
    expect(checkPositionRawFormat(' 14.02  MM ', 'caliper')).toBeNull();
    expect(checkPositionRawFormat('12.345', 'micrometer')).toBeNull();
    expect(checkPositionRawFormat('12.345 mm', 'micrometer')).toBeNull();
    expect(checkPositionRawFormat('+14.02', 'caliper')).toBeNull();
    expect(checkPositionRawFormat('-14.02', 'caliper')).toBeNull();
    expect(checkPositionRawFormat('+12.345', 'micrometer')).toBeNull();
    expect(checkPositionRawFormat('-0.005', 'micrometer')).toBeNull();

    const caliperRejects = [
      '14.2',
      '14.020',
      '14',
      '14.',
      '.02',
      '1.402e1',
      '14.02e0',
      '1.40E+1'
    ];
    for (const raw of caliperRejects) {
      const fb = checkPositionRawFormat(raw, 'caliper');
      expect(fb?.ok, raw).toBe(false);
      expect(fb?.layer, raw).toBe('format');
    }
    const microRejects = ['12.34', '12.3450', '12.3', '1.2345e1', '12.345e0'];
    for (const raw of microRejects) {
      const fb = checkPositionRawFormat(raw, 'micrometer');
      expect(fb?.ok, raw).toBe(false);
      expect(fb?.layer, raw).toBe('format');
    }
  });

  it('does not apply the position format gate to n', () => {
    const session = createEmptySession(doubleSlitDataWorkspaceSpec);
    const n = evaluateDoubleSlitField({
      session,
      submit: { field: 'n', trialIndex: 0, raw: '5' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    });
    expect(n.feedback.layer).not.toBe('format');
  });

  it('gates D on the frozen instrument decimals and Δx on three sig figs', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.00' },
      snapshot: withDoubleSlitFringeOrder({ ...SNAPSHOT, readingMm: 10 }, 1),
      expected: CALIPER_EXPECTED
    }).session;
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x2', trialIndex: 0, raw: '19.32' },
      snapshot: withDoubleSlitFringeOrder(
        { ...SNAPSHOT, readingMm: 19.32, capturedAt: 2 },
        6
      ),
      expected: CALIPER_EXPECTED
    }).session;
    const d = (raw: string) =>
      evaluateDoubleSlitField({
        session,
        submit: { field: 'D', trialIndex: 0, raw },
        snapshot: SNAPSHOT,
        expected: CALIPER_EXPECTED
      }).feedback;
    // 卡尺两次读数都是 2 位小数 → D 也是 2 位小数（加减法规则）。
    expect(d('9.32').ok).toBe(true);
    expect(d('9.320').layer).toBe('format');
    expect(d('9.3').layer).toBe('format');
  });

  it('gates n on integer literals: 3.0 / 3e0 rejected, 05 still accepted', () => {
    const session = createEmptySession(doubleSlitDataWorkspaceSpec);
    for (const raw of ['3.0', '3e0', '3.5']) {
      const n = evaluateDoubleSlitField({
        session,
        submit: { field: 'n', trialIndex: 0, raw },
        snapshot: SNAPSHOT,
        expected: CALIPER_EXPECTED
      });
      expect(n.feedback.layer, raw).toBe('format');
      expect(n.feedback.message, raw).toBe('n 应为正整数');
    }
    // 前导零整数一路穿过格式闸、整数校验与量程，停在依赖未满足的 relation 层。
    const leadingZero = evaluateDoubleSlitField({
      session,
      submit: { field: 'n', trialIndex: 0, raw: '05' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    });
    expect(leadingZero.feedback.layer).toBe('relation');
    // 带单位后缀的 n 由 parsed.unit 检查落在 unit 层，绝不能判通过。
    const withUnit = evaluateDoubleSlitField({
      session,
      submit: { field: 'n', trialIndex: 0, raw: '5 mm' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    });
    expect(withUnit.feedback.ok).toBe(false);
    expect(withUnit.feedback.layer).toBe('unit');
    expect(withUnit.feedback.message).toContain('不要带长度单位');
  });

  it('lets signed exact-digit x1 reach range instead of format', () => {
    expect(checkPositionRawFormat('-14.02 mm', 'caliper')).toBeNull();
    expect(checkPositionRawFormat('+14.02 mm', 'caliper')).toBeNull();
    const plus = evaluateDoubleSlitField({
      session: createEmptySession(doubleSlitDataWorkspaceSpec),
      submit: { field: 'x1', trialIndex: 0, raw: '+14.02' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    });
    expect(plus.feedback.ok).toBe(true);
    const neg = evaluateDoubleSlitField({
      session: createEmptySession(doubleSlitDataWorkspaceSpec),
      submit: { field: 'x1', trialIndex: 0, raw: '-14.02' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    });
    expect(neg.feedback.ok).toBe(false);
    expect(neg.feedback.layer).toBe('range');
    expect(neg.feedback.message).toMatch(/量程/);
    expect(neg.feedback.layer).not.toBe('format');
  });

  it('accepts optional mm on x1 then still runs numeric/instrument checks', () => {
    const ok = evaluateDoubleSlitField({
      session: createEmptySession(doubleSlitDataWorkspaceSpec),
      submit: { field: 'x1', trialIndex: 0, raw: '14.02 mm' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    });
    expect(ok.feedback.ok).toBe(true);
    expect(ok.feedback.message).not.toMatch(/参考/);
    expect(getTrialField(ok.session.trials[0], 'x1')?.failedAttempts).toBe(0);

    const unit = evaluateDoubleSlitField({
      session: createEmptySession(doubleSlitDataWorkspaceSpec),
      submit: { field: 'x1', trialIndex: 0, raw: '14.02 cm' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    });
    expect(unit.feedback.ok).toBe(false);
    expect(unit.feedback.layer).toBe('unit');
  });
});

describe('per-row per-field failed attempts and third-error reference', () => {
  it('counts only failed x1/x2 with an aligned snapshot', () => {
    expect(nextFailedAttempts(2, { ok: true, count: true })).toBe(0);
    expect(nextFailedAttempts(2, { ok: false, count: false })).toBe(2);
    expect(nextFailedAttempts(2, { ok: false, count: true })).toBe(3);
    expect(
      withAttemptReference(
        { ok: false, layer: 'instrument', message: 'err' },
        2,
        '14.02'
      ).message
    ).toBe('err');
    expect(
      withAttemptReference(
        { ok: false, layer: 'instrument', message: 'err' },
        3,
        '14.02'
      ).message
    ).toBe('err（参考 14.02）');
  });

  it('does not increment on missing or misaligned snapshot', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    for (let i = 0; i < 3; i += 1) {
      session = evaluateDoubleSlitField({
        session,
        submit: { field: 'x1', trialIndex: 0, raw: '10.00' },
        snapshot: null,
        expected: CALIPER_EXPECTED
      }).session;
    }
    expect(getTrialField(session.trials[0], 'x1')?.failedAttempts ?? 0).toBe(0);
    expect(
      getTrialField(session.trials[0], 'x1')?.feedback?.message
    ).not.toMatch(/参考/);

    session = createEmptySession(doubleSlitDataWorkspaceSpec);
    const unaligned = { ...SNAPSHOT, aligned: false, residualPx: 8 };
    for (let i = 0; i < 3; i += 1) {
      session = evaluateDoubleSlitField({
        session,
        submit: { field: 'x1', trialIndex: 0, raw: '14.02' },
        snapshot: unaligned,
        expected: CALIPER_EXPECTED
      }).session;
    }
    expect(getTrialField(session.trials[0], 'x1')?.failedAttempts ?? 0).toBe(0);
    expect(
      getTrialField(session.trials[0], 'x1')?.feedback?.message
    ).not.toMatch(/参考/);
    expect(getTrialField(session.trials[0], 'x1')?.feedback?.message).toMatch(
      /亮纹/
    );
  });

  it('keeps independent counters per field and per row; reveals only on the third failure', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    session = addSessionTrial(session, doubleSlitDataWorkspaceSpec);

    const wrongCaliper = { ...SNAPSHOT, readingMm: 14.02 };
    const failX1 = (s: typeof session, trialIndex: number) =>
      evaluateDoubleSlitField({
        session: s,
        submit: { field: 'x1', trialIndex, raw: '10.00' },
        snapshot: wrongCaliper,
        expected: CALIPER_EXPECTED
      });
    const failX2 = (s: typeof session, trialIndex: number) =>
      evaluateDoubleSlitField({
        session: s,
        submit: { field: 'x2', trialIndex, raw: '10.00' },
        snapshot: wrongCaliper,
        expected: CALIPER_EXPECTED
      });

    let r = failX1(session, 0);
    expect(r.feedback.message).not.toMatch(/参考/);
    expect(getTrialField(r.session.trials[0], 'x1')?.failedAttempts).toBe(1);
    r = failX1(r.session, 0);
    expect(r.feedback.message).not.toMatch(/参考/);
    expect(getTrialField(r.session.trials[0], 'x1')?.failedAttempts).toBe(2);
    r = failX1(r.session, 0);
    expect(r.feedback.ok).toBe(false);
    expect(r.feedback.message).toMatch(/参考 14\.02/);
    expect(getTrialField(r.session.trials[0], 'x1')?.failedAttempts).toBe(3);

    r = failX2(r.session, 0);
    expect(getTrialField(r.session.trials[0], 'x2')?.failedAttempts).toBe(1);
    expect(r.feedback.message).not.toMatch(/参考/);
    r = failX2(r.session, 0);
    r = failX2(r.session, 0);
    expect(getTrialField(r.session.trials[0], 'x2')?.failedAttempts).toBe(3);
    expect(r.feedback.message).toMatch(/参考 14\.02/);
    expect(getTrialField(r.session.trials[0], 'x1')?.failedAttempts).toBe(3);

    r = failX1(r.session, 1);
    expect(getTrialField(r.session.trials[1], 'x1')?.failedAttempts).toBe(1);
    expect(r.feedback.message).not.toMatch(/参考/);
    expect(getTrialField(r.session.trials[0], 'x1')?.failedAttempts).toBe(3);
  });

  it('shows the current submission snapshot on later failures, not an earlier one', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    const first = { ...SNAPSHOT, readingMm: 14.02, capturedAt: 1 };
    const moved = { ...SNAPSHOT, readingMm: 16.0, capturedAt: 2 };
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.00' },
      snapshot: first,
      expected: CALIPER_EXPECTED
    }).session;
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.00' },
      snapshot: first,
      expected: CALIPER_EXPECTED
    }).session;
    const third = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.00' },
      snapshot: moved,
      expected: CALIPER_EXPECTED
    });
    expect(third.feedback.message).toMatch(/参考 16\.00/);
    expect(third.feedback.message).not.toMatch(/14\.02/);
  });

  it('does not leak the reference on success, even after prior failures', () => {
    let session = createEmptySession(doubleSlitDataWorkspaceSpec);
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.00' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    }).session;
    session = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.00' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    }).session;
    const ok = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '14.02' },
      snapshot: SNAPSHOT,
      expected: CALIPER_EXPECTED
    });
    expect(ok.feedback.ok).toBe(true);
    expect(ok.feedback.message).toBe('读数已校对');
    expect(ok.feedback.message).not.toMatch(/参考|14\.02/);
    expect(getTrialField(ok.session.trials[0], 'x1')?.failedAttempts).toBe(0);
  });

  it('reveals the micrometer center to three digits after three aligned failures', () => {
    const session = createEmptySession(doubleSlitDataWorkspaceSpec);
    let last = evaluateDoubleSlitField({
      session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.000' },
      snapshot: MICRO_SNAP,
      expected: CALIPER_EXPECTED
    });
    last = evaluateDoubleSlitField({
      session: last.session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.000' },
      snapshot: MICRO_SNAP,
      expected: CALIPER_EXPECTED
    });
    expect(last.feedback.message).not.toMatch(/参考/);
    last = evaluateDoubleSlitField({
      session: last.session,
      submit: { field: 'x1', trialIndex: 0, raw: '10.000' },
      snapshot: MICRO_SNAP,
      expected: CALIPER_EXPECTED
    });
    expect(last.feedback.message).toMatch(/参考 12\.345/);
  });
});

describe('chart field helpers and spec guards', () => {
  const spec: DataWorkspaceSpec = {
    id: 'chart-helpers',
    title: 't',
    chartAnalysis: true,
    enabledSteps: ['data', 'chartAnalysis'],
    maxRows: 1,
    minRows: 1,
    initialRows: 1,
    rowFields: [{ id: 'x', label: '位移', unit: 'm' }],
    summaryFields: [
      { id: 'avg', label: '平均', unit: 'm' },
      { id: 'slope', label: '斜率', unit: 'm/s', step: 'chartAnalysis' }
    ]
  };

  const ok = {
    raw: '1',
    value: 1,
    checked: true as const,
    stale: false,
    feedback: { ok: true, message: 'ok' }
  };

  it('classifies chart summary fields and ignores unknown ids', () => {
    expect(isChartField(spec, 'slope')).toBe(true);
    expect(isChartField(spec, 'avg')).toBe(false);
    expect(isChartField(spec, 'x')).toBe(false);
    expect(isChartField(spec, 'missing')).toBe(false);
  });

  it('requires every row field and data summary field before the chart step', () => {
    let session = createEmptySession(spec);
    expect(chartStepReady(session, spec)).toBe(false);
    session = writeCheckedField(session, 0, 'x', ok, spec);
    expect(chartStepReady(session, spec)).toBe(false);
    session = writeCheckedField(session, undefined, 'avg', ok, spec);
    expect(chartStepReady(session, spec)).toBe(true);
    session = writeCheckedField(session, undefined, 'slope', ok, spec);
    expect(chartStepReady(session, spec)).toBe(true);
  });

  it('rejects step on row fields, invalid orientation, and step when chart is off', () => {
    expect(() => assertSpecGraph(spec)).not.toThrow();
    expect(() =>
      assertSpecGraph({
        ...spec,
        rowFields: [{ id: 'x', label: '位移', step: 'chartAnalysis' }]
      })
    ).toThrow(/step is only allowed on summaryFields/);
    expect(() =>
      assertSpecGraph({
        ...spec,
        tableOrientation: 'sideways' as DataWorkspaceSpec['tableOrientation']
      })
    ).toThrow(/tableOrientation/);
    expect(() =>
      assertSpecGraph({
        ...spec,
        stageLock: 'yes' as unknown as boolean
      })
    ).toThrow(/stageLock/);
    expect(() =>
      assertSpecGraph({
        ...spec,
        stagePanZoom: 'yes' as unknown as boolean
      })
    ).toThrow(/stagePanZoom/);
    expect(() =>
      assertSpecGraph({ ...spec, stagePanZoom: false })
    ).not.toThrow();
    expect(shouldEnableStagePanZoom(spec)).toBe(true);
    expect(shouldEnableStagePanZoom({ ...spec, stagePanZoom: false })).toBe(
      false
    );
    expect(() =>
      assertSpecGraph({
        ...doubleSlitDataWorkspaceSpec,
        summaryFields: doubleSlitDataWorkspaceSpec.summaryFields.map(
          (field, index) =>
            index === 0 ? { ...field, step: 'chartAnalysis' } : field
        )
      })
    ).toThrow(/chartAnalysis is off/);
  });

  it('validates neighbour-row dependency offsets and rejects them on summary fields', () => {
    const neighbourSpec: DataWorkspaceSpec = {
      ...spec,
      rowFields: [
        { id: 'x', label: 'x' },
        {
          id: 'slope2',
          label: 'Δ',
          dependsOn: [{ scope: 'neighbor-row', field: 'x', offset: -1 }]
        }
      ],
      summaryFields: [{ id: 'avg', label: 'avg', dependsOn: [] }],
      result: undefined,
      completionField: undefined
    };
    expect(() => assertSpecGraph(neighbourSpec)).not.toThrow();
    expect(() =>
      assertSpecGraph({
        ...neighbourSpec,
        rowFields: [
          { id: 'x', label: 'x' },
          {
            id: 'slope2',
            label: 'Δ',
            dependsOn: [{ scope: 'neighbor-row', field: 'x', offset: 0 }]
          }
        ]
      })
    ).toThrow(/non-zero integer offset/);
    expect(() =>
      assertSpecGraph({
        ...neighbourSpec,
        rowFields: [
          { id: 'x', label: 'x' },
          {
            id: 'slope2',
            label: 'Δ',
            dependsOn: [{ scope: 'neighbor-row', field: 'x', offset: 1.5 }]
          }
        ]
      })
    ).toThrow(/non-zero integer offset/);
    expect(() =>
      assertSpecGraph({
        ...neighbourSpec,
        rowFields: [
          { id: 'x', label: 'x' },
          {
            id: 'slope2',
            label: 'Δ',
            dependsOn: [{ scope: 'neighbor-row', field: 'x', offset: 99 }]
          }
        ]
      })
    ).toThrow(/non-zero integer offset/);
    expect(() =>
      assertSpecGraph({
        ...neighbourSpec,
        rowFields: [
          { id: 'x', label: 'x' },
          {
            id: 'slope2',
            label: 'Δ',
            dependsOn: [{ scope: 'neighbor-row', field: 'avg', offset: -1 }]
          }
        ]
      })
    ).toThrow(/neighbor-row dependency "avg" is not a row field/);
    expect(() =>
      assertSpecGraph({
        ...neighbourSpec,
        summaryFields: [
          {
            id: 'avg',
            label: 'avg',
            dependsOn: [{ scope: 'neighbor-row', field: 'x', offset: -1 }]
          }
        ]
      })
    ).toThrow(/summary field .* cannot use row scope/);
  });

  it('expires neighbouring rows on edit and keeps offsets symmetric', () => {
    const neighbourSpec: DataWorkspaceSpec = {
      id: 'neighbour-probe',
      title: 'neighbour',
      chartAnalysis: false,
      enabledSteps: ['data'],
      minRows: 3,
      maxRows: 3,
      initialRows: 3,
      rowFields: [
        { id: 'x', label: 'x' },
        {
          id: 'back',
          label: 'Δ',
          dependsOn: [{ scope: 'neighbor-row', field: 'x', offset: -1 }]
        },
        {
          id: 'centre',
          label: 'v',
          dependsOn: [
            { scope: 'neighbor-row', field: 'x', offset: -1 },
            { scope: 'neighbor-row', field: 'x', offset: 1 }
          ]
        }
      ],
      summaryFields: [{ id: 'all', label: 'a', dependsOn: [] }]
    };
    let session = createEmptySession(neighbourSpec);
    for (let i = 0; i < 3; i += 1) {
      session = writeCheckedField(
        session,
        i,
        'x',
        { ...ok, value: i, raw: String(i) },
        neighbourSpec
      );
    }
    session = writeCheckedField(session, 1, 'back', ok, neighbourSpec);
    session = writeCheckedField(session, 2, 'back', ok, neighbourSpec);
    session = writeCheckedField(session, 0, 'centre', ok, neighbourSpec);
    session = writeCheckedField(session, 1, 'centre', ok, neighbourSpec);
    session = writeCheckedField(session, 2, 'centre', ok, neighbourSpec);
    // 改第 2 行（索引 1）的 x：back 的第 1、2 行失效；centre 的第 0、2 行
    // 失效（中央差分不含本行 x），第 1 行保持不变。
    session = writeCheckedField(
      session,
      1,
      'x',
      { ...ok, value: 9, raw: '9' },
      neighbourSpec
    );
    expect(fieldIsOk(getTrialField(session.trials[1], 'back'))).toBe(true);
    expect(getTrialField(session.trials[2], 'back')?.stale).toBe(true);
    expect(getTrialField(session.trials[0], 'centre')?.stale).toBe(true);
    expect(getTrialField(session.trials[2], 'centre')?.stale).toBe(true);
    expect(fieldIsOk(getTrialField(session.trials[1], 'centre'))).toBe(true);
    // 越界邻居不写入、不抛错。
    session = writeCheckedField(
      session,
      0,
      'x',
      { ...ok, value: 8, raw: '8' },
      neighbourSpec
    );
    expect(session.trials.every((trial) => trial.fields !== undefined)).toBe(
      true
    );
    expect(
      dependencySatisfied(
        session,
        neighbourSpec,
        { scope: 'neighbor-row', field: 'x', offset: -1 },
        0
      )
    ).toBe(false);
    expect(
      dependencySatisfied(
        session,
        neighbourSpec,
        { scope: 'neighbor-row', field: 'x', offset: 1 },
        1
      )
    ).toBe(true);
  });

  it('requires trialLabels to cover minRows and defaults to 1-based indices', () => {
    expect(trialLabel(spec, 0)).toBe('1');
    expect(trialLabel(spec, 3)).toBe('4');
    expect(trialLabel({ ...spec, trialLabels: ['0'] }, 0)).toBe('0');
    expect(trialLabel({ ...spec, trialLabels: ['0'] }, 2)).toBe('3');
    expect(() =>
      assertSpecGraph({ ...spec, trialLabels: ['0'] })
    ).not.toThrow();
    expect(() =>
      assertSpecGraph({
        ...spec,
        minRows: 3,
        maxRows: 3,
        initialRows: 3,
        trialLabels: ['0', '1']
      })
    ).toThrow(/trialLabels/);
    expect(() =>
      assertSpecGraph({
        ...spec,
        trialLabels: '0' as unknown as readonly string[]
      })
    ).toThrow(/trialLabels/);
  });
});

describe('assertSpecGraph memoization (Fix 7)', () => {
  it('caches validated specs and keeps re-throwing on failed ones', () => {
    const good: DataWorkspaceSpec = { ...doubleSlitDataWorkspaceSpec };
    expect(() => assertSpecGraph(good)).not.toThrow();
    // 记忆化命中：重复断言同一实例依然通过。
    expect(() => assertSpecGraph(good)).not.toThrow();

    const bad: DataWorkspaceSpec = {
      ...doubleSlitDataWorkspaceSpec,
      rowCheckStages: []
    };
    // 失败实例不入 WeakSet：连续断言两次都必须继续抛出。
    expect(() => assertSpecGraph(bad)).toThrow(/rowCheckStages/);
    expect(() => assertSpecGraph(bad)).toThrow(/rowCheckStages/);
  });
});
