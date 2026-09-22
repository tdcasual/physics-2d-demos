import { describe, expect, it } from 'vitest';
import {
  createTickerTapeDataWorkspace,
  evaluateTickerTapeField,
  type TickerTapeMeasurementSource
} from '../../src/scenes/ticker-tape/data-task';
import {
  COUNTING_INTERVAL_TICKS,
  TICK_PERIOD_S,
  computeSuccessiveAMs2,
  countingPeriodS,
  createTickerTapeSim,
  type TickerTapeState
} from '../../src/scenes/ticker-tape/scene.sim';
import {
  evaluateDoubleSlitField,
  doubleSlitDataWorkspaceSpec,
  slitDistanceMm
} from '../../src/scenes/double-slit/data-task';
import {
  assertSpecGraph,
  createEmptySession,
  type DataWorkspaceSession
} from '../../src/platform/data-workspace';

/**
 * 测量判分契约测试（docs/plans/2026-09-22-measurement-grading-contract.md）。
 * 常量块刻意不导出：这里的字面量断言是棘轮——调整容差/位数而未同步
 * hint、文案与测试时，本文件必须失败。
 */

function makeTickerSource() {
  const sim = createTickerTapeSim({ tapeKind: 'ua', noise: 'off' });
  const source: TickerTapeMeasurementSource = {
    getState: () => sim.getState(),
    getPlotStatus: () => ({ hasFit: false }),
    writeBack: {
      setMeasuredX: (i, value) => sim.setMeasuredX(i, value),
      setDeltaX: (i, value) => sim.setDeltaX(i, value),
      setV: (i, value) => sim.setV(i, value)
    }
  };
  return { sim, source };
}

function submitTicker(
  session: DataWorkspaceSession,
  source: TickerTapeMeasurementSource,
  field: string,
  raw: string,
  trialIndex?: number
) {
  return evaluateTickerTapeField({
    session,
    source,
    submit: { field, raw, trialIndex }
  });
}

describe('ticker-tape grading contract', () => {
  it('binds the hint to the ±0.03 cm tolerance and two-decimal recording', () => {
    const host = createTickerTapeDataWorkspace(makeTickerSource().source);
    const hint = host.getHint();
    expect(hint).toContain('0.03');
    expect(hint).toContain('两位小数');
    expect(hint).toContain('估读到 0.01 cm');
  });

  it('pins the timing model that the v expectation formula relies on', () => {
    expect(TICK_PERIOD_S).toBe(0.02);
    expect(COUNTING_INTERVAL_TICKS).toBe(5);
    expect(countingPeriodS(COUNTING_INTERVAL_TICKS)).toBe(0.1);
    const state: TickerTapeState = makeTickerSource().source.getState();
    expect(state.T).toBe(0.1);
  });

  it('keeps the x grading window at ±0.03 cm with on-grid bounds', () => {
    const { source } = makeTickerSource();
    let session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm[1];
    const pass = submitTicker(
      session,
      source,
      'x',
      (truth + 0.03).toFixed(2),
      1
    );
    expect(pass.feedback.ok).toBe(true);
    const failLow = submitTicker(
      pass.session,
      source,
      'x',
      (truth - 0.04).toFixed(2),
      1
    );
    expect(failLow.feedback.ok).toBe(false);
    expect(failLow.feedback.layer).toBe('range');
    expect(failLow.feedback.message).toContain('±0.03');
    session = failLow.session;
    const reject = submitTicker(session, source, 'x', '1', 1);
    expect(reject.feedback.layer).toBe('format');
  });

  it('rejects wrong-precision and scientific-notation recordings for x', () => {
    const { source } = makeTickerSource();
    const session = createTickerTapeDataWorkspace(source).getSession();
    for (const raw of ['2.2', '2.240', '2.24e0', '2E0']) {
      const result = submitTicker(session, source, 'x', raw, 1);
      expect(result.feedback.layer, raw).toBe('format');
    }
  });

  it('accepts the optional cm suffix end-to-end through the grader', () => {
    const { source } = makeTickerSource();
    const session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm[1];
    const result = submitTicker(
      session,
      source,
      'x',
      `${truth.toFixed(2)} cm`,
      1
    );
    expect(result.feedback.ok).toBe(true);
  });

  it('keeps near-zero readings in the range layer instead of unit hints', () => {
    const { source } = makeTickerSource();
    const session = createTickerTapeDataWorkspace(source).getSession();
    // 原点真值 0.00：10 倍的 0 仍是 0，倍率启发必须让位于 range 提示。
    const result = submitTicker(session, source, 'x', '0.20', 0);
    expect(result.feedback.ok).toBe(false);
    expect(result.feedback.layer).toBe('range');
  });

  it('pins the ±0.02 cm deltaX boundary on the student-grid', () => {
    const { source } = makeTickerSource();
    let session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm;
    session = submitTicker(
      session,
      source,
      'x',
      truth[0].toFixed(2),
      0
    ).session;
    session = submitTicker(
      session,
      source,
      'x',
      truth[1].toFixed(2),
      1
    ).session;
    const expected = truth[1] - truth[0];
    const pass = submitTicker(
      session,
      source,
      'deltaX',
      (expected + 0.02).toFixed(2),
      1
    );
    expect(pass.feedback.ok).toBe(true);
    const fail = submitTicker(
      session,
      source,
      'deltaX',
      (expected + 0.03).toFixed(2),
      1
    );
    expect(fail.feedback.ok).toBe(false);
    expect(fail.feedback.layer).toBe('range');
  });

  it('pins the ±0.05 absolute floor of the aDiff tolerance', () => {
    const { source } = makeTickerSource();
    let session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm;
    for (let i = 0; i < truth.length; i += 1) {
      session = submitTicker(
        session,
        source,
        'x',
        truth[i].toFixed(2),
        i
      ).session;
    }
    const expected = computeSuccessiveAMs2(
      truth,
      source.getState().T
    ) as number;
    const pass = submitTicker(
      session,
      source,
      'aDiff',
      String(expected + 0.04),
      undefined
    );
    expect(pass.feedback.ok).toBe(true);
    const fail = submitTicker(
      session,
      source,
      'aDiff',
      String(expected + 0.06),
      undefined
    );
    expect(fail.feedback.ok).toBe(false);
    expect(fail.feedback.layer).toBe('range');
  });

  it('grades v by absolute tolerance, not tick rounding', () => {
    const { source } = makeTickerSource();
    let session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm;
    session = submitTicker(
      session,
      source,
      'x',
      truth[0].toFixed(2),
      0
    ).session;
    session = submitTicker(
      session,
      source,
      'x',
      truth[2].toFixed(2),
      2
    ).session;
    const expected = (truth[2] - truth[0]) / 100 / 0.2;
    // 鉴别器：期望值落在 0.01 网格的 .0/.5 刻度上，+0.011 在刻度比较下只差
    // 1 tick 会假通过，绝对比较必须拒绝；+0.009 两侧都应通过。
    const inside = submitTicker(
      session,
      source,
      'v',
      String(expected + 0.009),
      1
    );
    expect(inside.feedback.ok).toBe(true);
    const outside = submitTicker(
      session,
      source,
      'v',
      String(expected + 0.011),
      1
    );
    expect(outside.feedback.ok).toBe(false);
    expect(outside.feedback.layer).toBe('range');
  });

  it('never writes back format-invalid values into the sim', () => {
    const { source } = makeTickerSource();
    let session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm[1];
    session = submitTicker(session, source, 'x', truth.toFixed(2), 1).session;
    const accepted = source.getState().measuredXCm[1];
    expect(accepted ?? Number.NaN).toBeCloseTo(truth, 10);
    const broken = submitTicker(
      session,
      source,
      'x',
      (truth + 0.2).toFixed(1),
      1
    );
    expect(broken.feedback.layer).toBe('format');
    expect(source.getState().measuredXCm[1] ?? Number.NaN).toBeCloseTo(
      accepted ?? Number.NaN,
      10
    );
  });
});

describe('double-slit grading contract', () => {
  it('keeps the d constant single-sourced with the sim in mm units', () => {
    for (const slitDistance of [0.2, 0.3, 0.4, 0.5]) {
      expect(slitDistanceMm(slitDistance)).toBeCloseTo(slitDistance * 0.01, 12);
    }
  });

  it('gates λ and n inputs through the shared format layer', () => {
    expect(() => assertSpecGraph(doubleSlitDataWorkspaceSpec)).not.toThrow();
    const session = createEmptySession(doubleSlitDataWorkspaceSpec);
    const lambda = evaluateDoubleSlitField({
      session,
      submit: { field: 'lambda', raw: '6.5e2' },
      snapshot: null,
      expected: {
        dMm: 0.4,
        L_m: 1.2,
        theoreticalDeltaXmm: 1.596,
        theoreticalLambdaNm: 532
      }
    });
    expect(lambda.feedback.layer).toBe('format');
    const n = evaluateDoubleSlitField({
      session,
      submit: { field: 'n', trialIndex: 0, raw: '3e0' },
      snapshot: null,
      expected: {
        dMm: 0.4,
        L_m: 1.2,
        theoreticalDeltaXmm: 1.596,
        theoreticalLambdaNm: 532
      }
    });
    expect(n.feedback.layer).toBe('format');
  });
});
