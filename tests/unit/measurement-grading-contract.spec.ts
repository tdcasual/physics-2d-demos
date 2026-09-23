import { describe, expect, it } from 'vitest';
import {
  createTickerTapeDataWorkspace,
  evaluateTickerTapeField,
  tickerTapeDataWorkspaceSpec,
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
  chartStepReady,
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
  it('binds the hint to the ±0.03 cm tolerance, two-decimal x and 3-sig-fig v', () => {
    const host = createTickerTapeDataWorkspace(makeTickerSource().source);
    const hint = host.getHint();
    expect(hint).toContain('0.03');
    expect(hint).toContain('两位小数');
    expect(hint).toContain('估读到 0.01 cm');
    expect(hint).toContain('保留 3 位有效数字');
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

  it('requires deltaX to equal the checked x difference exactly (0-tick)', () => {
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
    // Δx 是已校对 x 的纯减法：精确差通过，±0.01 即拒（无读数容差）。
    const pass = submitTicker(
      session,
      source,
      'deltaX',
      expected.toFixed(2),
      1
    );
    expect(pass.feedback.ok).toBe(true);
    const fail = submitTicker(
      session,
      source,
      'deltaX',
      (expected + 0.01).toFixed(2),
      1
    );
    expect(fail.feedback.ok).toBe(false);
    expect(fail.feedback.layer).toBe('range');
    expect(fail.feedback.message).toContain('x_i − x_{i−1}');
  });

  it('grades aDiff by the significant-digit contract with half-unit rounding', () => {
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
    ) as number; // ua 纸带 = 0.4（2 位有效）
    // 恰好 3 位有效数字（含末尾零）通过。
    const pass = submitTicker(
      session,
      source,
      'aDiff',
      expected.toPrecision(3),
      undefined
    );
    expect(pass.feedback.ok).toBe(true);
    // 3 位有效但超出半单位舍入（0.401 差 0.001 > 0.0005）落 range 层。
    const off = submitTicker(session, source, 'aDiff', '0.401', undefined);
    expect(off.feedback.ok).toBe(false);
    expect(off.feedback.layer).toBe('range');
    // 位数不符（0.4 = 2 位有效）落 format 层。
    const few = submitTicker(session, source, 'aDiff', '0.4', undefined);
    expect(few.feedback.layer).toBe('format');
  });

  it('exposes the current significant-digit requirement via knowns', () => {
    const host = createTickerTapeDataWorkspace(makeTickerSource().source);
    const sig = host.getKnowns().find((known) => known.key === 'sigFigs');
    expect(sig?.value).toBe('3 位');
  });

  it('lets students skip the optional aDiff and still reach chart analysis', () => {
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
    for (let i = 1; i < truth.length; i += 1) {
      session = submitTicker(
        session,
        source,
        'deltaX',
        (truth[i] - truth[i - 1]).toFixed(2),
        i
      ).session;
    }
    for (let i = 1; i <= 5; i += 1) {
      const v = (truth[i + 1] - truth[i - 1]) / 100 / 0.2;
      session = submitTicker(session, source, 'v', v.toPrecision(3), i).session;
    }
    // aDiff 选填：行字段全通过而 aDiff 未填时，chartStepReady 已经为真。
    expect(chartStepReady(session, tickerTapeDataWorkspaceSpec)).toBe(true);
  });

  it('degrades the aDiff digit gate to syntax-only for uniform tape (a ≈ 0)', () => {
    const sim = createTickerTapeSim({ tapeKind: 'uniform', noise: 'off' });
    const source: TickerTapeMeasurementSource = {
      getState: () => sim.getState(),
      getPlotStatus: () => ({ hasFit: false }),
      writeBack: {
        setMeasuredX: (i, value) => sim.setMeasuredX(i, value),
        setDeltaX: (i, value) => sim.setDeltaX(i, value),
        setV: (i, value) => sim.setV(i, value)
      }
    };
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
    // 匀速纸带 a 期望为 0：'0' 无有效位数概念，语法级放行；非 0 值拒绝。
    const zero = submitTicker(session, source, 'aDiff', '0', undefined);
    expect(zero.feedback.ok).toBe(true);
    const off = submitTicker(session, source, 'aDiff', '0.01', undefined);
    expect(off.feedback.ok).toBe(false);
    expect(off.feedback.layer).toBe('range');
  });

  it('grades v by 3 significant digits with a half-unit rounding window', () => {
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
    // v 期望 = (truth[2] − truth[0]) / 100 / 0.2 = 0.12（2 位有效）。
    // 恰好 3 位有效数字（含末尾零）通过。
    const pass = submitTicker(session, source, 'v', '0.120', 1);
    expect(pass.feedback.ok).toBe(true);
    // 位数不符落 format 层；3 位有效但偏离舍入值（0.121 差 0.001 > 半单位
    // 0.0005）落 range 层。
    const fourDigits = submitTicker(session, source, 'v', '0.1204', 1);
    expect(fourDigits.feedback.layer).toBe('format');
    const few = submitTicker(session, source, 'v', '0.12', 1);
    expect(few.feedback.layer).toBe('format');
    const off = submitTicker(session, source, 'v', '0.121', 1);
    expect(off.feedback.ok).toBe(false);
    expect(off.feedback.layer).toBe('range');
    // 鉴别器：旧 ±0.01 绝对容差会放行 0.13（差恰为 0.01），
    // 新契约在格式层即拒——防止退化回绝对容差。
    const legacy = submitTicker(session, source, 'v', '0.13', 1);
    expect(legacy.feedback.ok).toBe(false);
    expect(legacy.feedback.layer).toBe('format');
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
