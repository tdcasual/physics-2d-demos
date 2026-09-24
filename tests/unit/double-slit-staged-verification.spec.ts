import { describe, expect, it } from 'vitest';
import {
  createDoubleSlitDataWorkspace,
  type DoubleSlitMeasurementSource
} from '../../src/scenes/double-slit/data-task';
import type { MeasurementSnapshot } from '../../src/platform/data-workspace';
import { withDoubleSlitFringeOrder } from '../../src/scenes/double-slit/snapshot-meta';
import {
  CALIPER_PRECISION_MM,
  CALIPER_READING_STRATEGY
} from '../../src/scenes/double-slit/reading-constants';

function params() {
  return {
    step: 6,
    lambda: 532,
    slitDistance: 20,
    isPlaying: true,
    activeInstrument: 'caliper' as const,
    showInstrumentReadout: false,
    micrometerOffset: 0,
    stripeOffset: 12,
    L: 0.7,
    lightMode: 'mono' as const,
    filterColor: null
  };
}

function snapshot(
  readingMm: number,
  order: number,
  capturedAt: number
): MeasurementSnapshot {
  return withDoubleSlitFringeOrder(
    {
      readingMm,
      precisionMm: CALIPER_PRECISION_MM,
      displayDigits: 3,
      instrumentId: 'caliper',
      instrumentLabel: '干涉读数游标卡尺',
      capturedAt,
      aligned: true,
      residualPx: 0.1,
      readingStrategy: CALIPER_READING_STRATEGY
    },
    order
  );
}

function sourceFrom(sequence: readonly MeasurementSnapshot[]) {
  let captures = 0;
  const source: DoubleSlitMeasurementSource = {
    getParams: params,
    capture: () => sequence[Math.min(captures++, sequence.length - 1)] ?? null
  };
  return { source, captures: () => captures };
}

describe('double-slit staged measurement verification', () => {
  it('blocks out-of-order x2 before capture and keeps the session unchanged', () => {
    const { source, captures } = sourceFrom([snapshot(10, 1, 1)]);
    const host = createDoubleSlitDataWorkspace(source);

    const result = host.submitField({
      field: 'x2',
      trialIndex: 0,
      raw: '19.32'
    });

    expect(result.feedback.layer).toBe('relation');
    expect(result.feedback.message).toContain('x₁');
    expect(captures()).toBe(0);
    expect(result.session.trials[0]?.fields.x2).toBeUndefined();
  });

  it('captures only x1/x2 and preserves x2 when n fails for retry', () => {
    const { source, captures } = sourceFrom([
      snapshot(10, 1, 1),
      snapshot(19.32, 6, 2)
    ]);
    const host = createDoubleSlitDataWorkspace(source);

    expect(host.submitField({ field: 'x1', raw: '10.00' }).feedback.ok).toBe(
      true
    );
    expect(host.submitField({ field: 'x2', raw: '19.32' }).feedback.ok).toBe(
      true
    );
    expect(captures()).toBe(2);

    const wrongN = host.submitField({ field: 'n', raw: '6' });
    expect(wrongN.feedback.ok).toBe(false);
    expect(wrongN.session.trials[0]?.fields.x2?.checked).toBe(true);
    expect(captures()).toBe(2);

    const n = host.submitField({ field: 'n', raw: '5' });
    expect(n.feedback.ok).toBe(true);
    expect(captures()).toBe(2);
    // D 与读数同小数位（卡尺 2 位）；Δx 按 3 位有效数字。
    expect(host.submitField({ field: 'D', raw: '9.32' }).feedback.ok).toBe(
      true
    );
    expect(host.submitField({ field: 'deltaX', raw: '1.86' }).feedback.ok).toBe(
      true
    );
    expect(captures()).toBe(2);
  });

  it('rejects wrong digits, wrong values and wrong units on derived fields', () => {
    const { source } = sourceFrom([snapshot(10, 1, 1), snapshot(19.32, 6, 2)]);
    const host = createDoubleSlitDataWorkspace(source);
    host.submitField({ field: 'x1', raw: '10.00' });
    host.submitField({ field: 'x2', raw: '19.32' });
    host.submitField({ field: 'n', raw: '5' });
    host.submitField({ field: 'D', raw: '9.32' });

    const deltaX = host.submitField({ field: 'deltaX', raw: '1.86' });
    expect(deltaX.feedback.ok).toBe(true);
    // 正确数值但位数不对 → format；位数对但数值错 → relation；单位错 → unit。
    expect(
      host.submitField({ field: 'deltaX', raw: '1.864' }).feedback.layer
    ).toBe('format');
    expect(
      host.submitField({ field: 'deltaX', raw: '1.87' }).feedback.layer
    ).toBe('relation');
    expect(
      host.submitField({ field: 'deltaX', raw: '0.186' }).feedback.layer
    ).toBe('unit');
    // 重新提交正确值后阶段仍然通过（越序/错值不污染后续）。
    expect(host.submitField({ field: 'deltaX', raw: '1.86' }).feedback.ok).toBe(
      true
    );
    expect(host.submitField({ field: 'D', raw: '9.320' }).feedback.layer).toBe(
      'format'
    );
  });

  it('rejects x2 when the second snapshot changes the reading baseline', () => {
    const first = snapshot(10, 1, 1);
    const second = {
      ...snapshot(19.32, 6, 2),
      precisionMm: 0.001,
      displayDigits: 3,
      readingStrategy: {
        kind: 'estimated-range' as const,
        halfRangeMm: 0.005,
        minMm: 0,
        maxMm: 32
      }
    };
    const { source } = sourceFrom([first, second]);
    const host = createDoubleSlitDataWorkspace(source);
    expect(host.submitField({ field: 'x1', raw: '10.00' }).feedback.ok).toBe(
      true
    );

    const result = host.submitField({ field: 'x2', raw: '19.32' });

    expect(result.feedback.ok).toBe(false);
    expect(result.feedback.layer).toBe('instrument');
    expect(result.session.trials[0]?.fields.x2?.checked).toBe(false);
  });
});
