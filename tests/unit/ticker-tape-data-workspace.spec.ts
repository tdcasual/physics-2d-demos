import { describe, expect, it, vi } from 'vitest';
import {
  findWorkspaceTransportBar,
  tapeScaleCap
} from '../../src/scenes/ticker-tape/scene.view';
import { createTickerTapeScene } from '../../src/scenes/ticker-tape/scene.entry';
import {
  createTickerTapeDataWorkspace,
  evaluateTickerTapeField,
  tickerTapeDataWorkspaceSpec
} from '../../src/scenes/ticker-tape/data-task';
import {
  createTickerTapeSim,
  fitLineDroppingOutliers
} from '../../src/scenes/ticker-tape/scene.sim';
import {
  assertSpecGraph,
  chartStepReady,
  createEmptySession,
  fieldIsOk,
  getSummaryField,
  getTrialField,
  isFieldReady,
  writeCheckedField,
  type DataWorkspaceSession,
  type FieldCheckState
} from '../../src/platform/data-workspace';

function makeSource(kind: 'ua' | 'uniform' = 'ua') {
  const sim = createTickerTapeSim({ tapeKind: kind, noise: 'off' });
  const plot = { hasFit: false };
  const source = {
    getState: () => sim.getState(),
    getPlotStatus: () => plot,
    writeBack: {
      setMeasuredX: (i: number, value: number) => sim.setMeasuredX(i, value),
      setDeltaX: (i: number, value: number) => sim.setDeltaX(i, value),
      setV: (i: number, value: number) => sim.setV(i, value)
    }
  };
  return { sim, source, plot };
}
function submit(
  session: DataWorkspaceSession,
  source: ReturnType<typeof makeSource>['source'],
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

describe('workspace transport bar lookup', () => {
  function stageWithCanvas(
    frameClass: string,
    withBar: boolean
  ): HTMLCanvasElement {
    const frame = document.createElement('div');
    frame.className = frameClass;
    const canvas = document.createElement('canvas');
    frame.appendChild(canvas);
    if (withBar) {
      const bar = document.createElement('div');
      bar.className = 'stage-floating-controls';
      Object.defineProperty(bar, 'offsetHeight', { value: 70 });
      frame.appendChild(bar);
    }
    document.body.appendChild(frame);
    return canvas;
  }

  it('finds the transport bar in every desktop stage frame', () => {
    for (const frameClass of [
      'lab-stage-anim',
      'teaching-stage-frame',
      'srgb-stage-frame'
    ]) {
      const canvas = stageWithCanvas(frameClass, true);
      expect(findWorkspaceTransportBar(canvas)?.className).toBe(
        'stage-floating-controls'
      );
      canvas.parentElement?.remove();
    }
  });

  it('returns null when the frame has no transport bar', () => {
    const canvas = stageWithCanvas('teaching-stage-frame', false);
    const outside = document.createElement('div');
    outside.className = 'mobile-control-bar';
    document.body.appendChild(outside);
    expect(findWorkspaceTransportBar(canvas)).toBeNull();
    canvas.parentElement?.remove();
    outside.remove();
  });
});

describe('ticker tape scale cap', () => {
  it('keeps the pre-split stage height on wide and narrow viewports', () => {
    expect(tapeScaleCap(1920, 1080)).toBeCloseTo(302.4, 5);
    expect(tapeScaleCap(1280, 720)).toBe(240);
    expect(tapeScaleCap(390, 844)).toBeCloseTo(844 * 0.4 - 8, 5);
  });
});

describe('ticker-tape data workspace', () => {
  it('has the planned graph-enabled spec and a fixed seven-row session', () => {
    expect(() => assertSpecGraph(tickerTapeDataWorkspaceSpec)).not.toThrow();
    expect(tickerTapeDataWorkspaceSpec.tableOrientation).toBe('fields');
    expect(tickerTapeDataWorkspaceSpec.stageLock).toBe(true);
    expect(tickerTapeDataWorkspaceSpec.trialLabels).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6'
    ]);
    const aFitSpec = tickerTapeDataWorkspaceSpec.summaryFields.find(
      (field) => field.id === 'aFit'
    );
    const aDiffSpec = tickerTapeDataWorkspaceSpec.summaryFields.find(
      (field) => field.id === 'aDiff'
    );
    expect(aFitSpec?.step).toBe('chartAnalysis');
    expect(aDiffSpec?.step).toBeUndefined();
    const { source } = makeSource();
    const host = createTickerTapeDataWorkspace(source);
    const session = host.getSession();
    expect(session.trials).toHaveLength(7);
    expect(getTrialField(session.trials[0], 'deltaX')?.feedback?.message).toBe(
      '端点无需填写'
    );
    expect(getTrialField(session.trials[0], 'v')?.checked).toBe(true);
    expect(getTrialField(session.trials[6], 'v')?.checked).toBe(true);
  });

  it('checks x, deltaX and v with dependencies, tolerance and sim write-back', () => {
    const { source } = makeSource();
    let session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm;
    let result = submit(session, source, 'deltaX', '0.00', 1);
    expect(result.feedback.layer).toBe('relation');
    session = result.session;
    result = submit(session, source, 'x', truth[0].toFixed(2), 0);
    session = result.session;
    result = submit(session, source, 'x', truth[1].toFixed(2), 1);
    expect(result.feedback.ok).toBe(true);
    session = result.session;
    result = submit(
      session,
      source,
      'deltaX',
      (truth[1] - truth[0]).toFixed(2),
      1
    );
    expect(result.feedback.ok).toBe(true);
    expect(source.getState().deltaXCm[1]).toBeCloseTo(truth[1] - truth[0]);
    const expectedV = (truth[2] - truth[0]) / 100 / (2 * source.getState().T);
    // v 按 3 位有效数字判分（默认），0.12 须写作 0.120。
    result = submit(session, source, String('v'), expectedV.toPrecision(3), 1);
    expect(result.feedback.layer).toBe('relation');
    result = submit(result.session, source, 'x', truth[2].toFixed(2), 2);
    result = submit(result.session, source, 'v', expectedV.toPrecision(3), 1);
    expect(result.feedback.ok).toBe(true);
    expect(source.getState().vMs[1]).toBeCloseTo(expectedV);
  });

  it('rejects unit/quantity errors and accepts the ±0.03 cm boundary', () => {
    const { source } = makeSource();
    const truth = source.getState().tapeXCm[1];
    let session = createTickerTapeDataWorkspace(source).getSession();
    let result = submit(session, source, 'x', `${(truth * 100).toFixed(2)}`, 1);
    expect(result.feedback.layer).toBe('unit');
    result = submit(session, source, 'x', `${(truth * 10).toFixed(2)}`, 1);
    expect(result.feedback.layer).toBe('unit');
    result = submit(session, source, 'x', `${(truth + 0.03).toFixed(2)}`, 1);
    expect(result.feedback.ok).toBe(true);
    result = submit(session, source, 'x', `${(truth - 0.03).toFixed(2)}`, 1);
    expect(result.feedback.ok).toBe(true);
    result = submit(session, source, 'x', `${(truth + 0.04).toFixed(2)}`, 1);
    expect(result.feedback.ok).toBe(false);
    expect(result.feedback.layer).toBe('range');
    session = result.session;
    result = submit(session, source, 'x', 'not-a-number', 2);
    expect(result.feedback.layer).toBe('format');
  });

  it('enforces the two-decimal recording format on x and deltaX', () => {
    const { source } = makeSource();
    let session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm;
    for (const raw of ['1', '1.0', '1.240', '1.2e0', '01.24']) {
      const result = submit(session, source, 'x', raw, 1);
      expect(result.feedback.layer, raw).toBe('format');
      expect(result.feedback.ok, raw).toBe(false);
    }
    session = submit(session, source, 'x', truth[1].toFixed(2), 1).session;
    session = submit(session, source, 'x', truth[0].toFixed(2), 0).session;
    const result = submit(session, source, 'deltaX', '0.2', 1);
    expect(result.feedback.layer).toBe('format');
  });

  it('grades v by significant-digit format and half-unit rounding', () => {
    const { source } = makeSource();
    let session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm;
    session = submit(session, source, 'x', truth[0].toFixed(2), 0).session;
    session = submit(session, source, 'x', truth[2].toFixed(2), 2).session;
    const expectedV = (truth[2] - truth[0]) / 100 / 0.2;
    // v 的期望含 /100 换算：恰好 3 位有效数字（含末尾零）必须通过。
    const ok = submit(session, source, 'v', expectedV.toPrecision(3), 1);
    expect(ok.feedback.ok).toBe(true);
    const sci = submit(session, source, 'v', '0.15e-1', 1);
    expect(sci.feedback.layer).toBe('format');
    // 有效位数不符落 format 层（0.12 = 2 位、0.1200 = 4 位）。
    const few = submit(session, source, 'v', '0.12', 1);
    expect(few.feedback.layer).toBe('format');
    const many = submit(session, source, 'v', '0.1200', 1);
    expect(many.feedback.layer).toBe('format');
    // 半单位舍入窗口与「恰好 N 位有效数字」格式联合语义：3 位有效输入中
    // 唯一合法值是舍入值本身（相邻可表示值间隔 = 2×半单位）。
    // 0.1204 是 4 位有效数字，落 format 层。
    const fourDigits = submit(session, source, 'v', '0.1204', 1);
    expect(fourDigits.feedback.layer).toBe('format');
    // 3 位有效但偏离舍入值（0.121 差 0.001 > 0.0005）落 range 层。
    const off = submit(session, source, 'v', '0.121', 1);
    expect(off.feedback.ok).toBe(false);
    expect(off.feedback.layer).toBe('range');
    // 旧的 ±0.01 绝对容差会放行 0.13，现在它在格式层即被拒。
    const legacy = submit(session, source, 'v', '0.13', 1);
    expect(legacy.feedback.ok).toBe(false);
    expect(legacy.feedback.layer).toBe('format');
  });

  it('checks summary acceleration and requires plot fitting for aFit', () => {
    const { source } = makeSource();
    const host = createTickerTapeDataWorkspace(source);
    let session = host.getSession();
    const truth = source.getState().tapeXCm;
    for (let i = 0; i < truth.length; i += 1) {
      session = submit(session, source, 'x', truth[i].toFixed(2), i).session;
    }
    const a = source.getState().tapeXCm;
    const aExpected = (a[6] - 2 * a[3] + a[0]) / 100 / (0.3 * 0.3);
    // aDiff 与 v 一样按有效位数判分（默认 3 位）。
    let result = submit(
      session,
      source,
      'aDiff',
      aExpected.toPrecision(3),
      undefined
    );
    expect(result.feedback.ok).toBe(true);
    session = result.session;
    for (let i = 1; i <= 5; i += 1) {
      const v = (truth[i + 1] - truth[i - 1]) / 100 / 0.2;
      session = submit(session, source, 'v', v.toPrecision(3), i).session;
    }
    result = submit(session, source, 'aFit', '10', undefined);
    expect(result.feedback.layer).toBe('relation');
    expect(getSummaryField(result.session, 'aFit')?.checked).toBe(false);
  });

  it('invalidates checked cells and restores endpoint placeholders', () => {
    const { source } = makeSource();
    const host = createTickerTapeDataWorkspace(source);
    host.setActive(true);
    const truth = source.getState().tapeXCm;
    host.submitField({ field: 'x', trialIndex: 0, raw: truth[0].toFixed(2) });
    host.invalidateAll('纸带已更换，请重新测量校对');
    const session = host.getSession();
    expect(getTrialField(session.trials[0], 'x')?.stale).toBe(true);
    expect(getTrialField(session.trials[0], 'v')?.checked).toBe(true);
    expect(session.active).toBe(true);
  });

  it('marks downstream cells stale even when an upstream format gate fails', () => {
    const { source } = makeSource();
    const host = createTickerTapeDataWorkspace(source);
    let session = host.getSession();
    const truth = source.getState().tapeXCm;
    session = submit(session, source, 'x', truth[0].toFixed(2), 0).session;
    session = submit(session, source, 'x', truth[1].toFixed(2), 1).session;
    session = submit(
      session,
      source,
      'deltaX',
      (truth[1] - truth[0]).toFixed(2),
      1
    ).session;
    // 已校对的 Δx 在同 row 的 x 被改坏（格式失败但写表）后必须失效
    // （依赖图为行作用域：x[1] → 本行 Δx/v）。
    const broken = submit(session, source, 'x', truth[1].toFixed(1), 1);
    expect(broken.feedback.layer).toBe('format');
    const deltaX = getTrialField(broken.session.trials[1], 'deltaX');
    expect(fieldIsOk(deltaX)).toBe(false);
    expect(deltaX?.stale).toBe(true);
  });

  it('uses the same fit helper as the scene for an accepted slope', () => {
    const points = [1, 2, 3, 4, 5].map((y, i) => ({ t: i * 0.1, y }));
    expect(fitLineDroppingOutliers(points).fit?.slope).toBeCloseTo(10);
  });

  it('honors a per-scene 2-significant-digit v setting', () => {
    const { sim, source } = makeSource();
    sim.setParams({ vSigFigs: 2 });
    expect(sim.getState().significantDigits).toBe(2);
    let session = createTickerTapeDataWorkspace(source).getSession();
    const truth = source.getState().tapeXCm;
    session = submit(session, source, 'x', truth[0].toFixed(2), 0).session;
    session = submit(session, source, 'x', truth[2].toFixed(2), 2).session;
    // v 期望 0.12：2 位有效数字设置下 '0.12' 通过、'0.120' 反而格式拒绝。
    const ok = submit(session, source, 'v', '0.12', 1);
    expect(ok.feedback.ok).toBe(true);
    const wrongDigits = submit(session, source, 'v', '0.120', 1);
    expect(wrongDigits.feedback.layer).toBe('format');
    expect(wrongDigits.feedback.message).toContain('2 位有效数字');
    // 越界设置钳到上限 4 位。
    sim.setParams({ vSigFigs: 9 });
    expect(sim.getState().significantDigits).toBe(4);
  });

  it('invalidates every vSigFigs-dependent field on invalidateSigFigsDerived', () => {
    const { source, plot } = makeSource();
    const host = createTickerTapeDataWorkspace(source);
    const truth = source.getState().tapeXCm;
    for (let i = 0; i < truth.length; i += 1) {
      host.submitField({ field: 'x', trialIndex: i, raw: truth[i].toFixed(2) });
    }
    host.submitField({
      field: 'deltaX',
      trialIndex: 1,
      raw: (truth[1] - truth[0]).toFixed(2)
    });
    for (let i = 1; i <= 5; i += 1) {
      const v = (truth[i + 1] - truth[i - 1]) / 100 / 0.2;
      host.submitField({ field: 'v', trialIndex: i, raw: v.toPrecision(3) });
    }
    const aDiff = (truth[6] - 2 * truth[3] + truth[0]) / 100 / (0.3 * 0.3);
    expect(
      host.submitField({ field: 'aDiff', raw: aDiff.toPrecision(3) }).feedback
        .ok
    ).toBe(true);
    plot.hasFit = true;
    const aFit = host.submitField({ field: 'aFit', raw: '0.400' });
    expect(aFit.feedback.ok).toBe(true);
    host.invalidateSigFigsDerived('v 有效位数要求已改为 2 位，请重新校对');
    const after = host.getSession();
    expect(getTrialField(after.trials[1], 'v')?.stale).toBe(true);
    expect(getSummaryField(after, 'aDiff')?.stale).toBe(true);
    expect(getSummaryField(after, 'aFit')?.stale).toBe(true);
    expect(getTrialField(after.trials[0], 'x')?.checked).toBe(true);
    expect(getTrialField(after.trials[1], 'deltaX')?.checked).toBe(true);
    expect(getTrialField(after.trials[0], 'v')?.feedback?.message).toBe(
      '端点无需填写'
    );
  });

  it('expires the neighbouring rows when one x changes', () => {
    const { source, plot } = makeSource();
    const host = createTickerTapeDataWorkspace(source);
    const truth = source.getState().tapeXCm;
    for (let i = 0; i < truth.length; i += 1) {
      host.submitField({ field: 'x', trialIndex: i, raw: truth[i].toFixed(2) });
    }
    for (let i = 1; i <= 6; i += 1) {
      host.submitField({
        field: 'deltaX',
        trialIndex: i,
        raw: (truth[i] - truth[i - 1]).toFixed(2)
      });
    }
    for (let i = 1; i <= 5; i += 1) {
      const v = (truth[i + 1] - truth[i - 1]) / 100 / 0.2;
      host.submitField({ field: 'v', trialIndex: i, raw: v.toPrecision(3) });
    }
    const aDiff = (truth[6] - 2 * truth[3] + truth[0]) / 100 / (0.3 * 0.3);
    expect(
      host.submitField({ field: 'aDiff', raw: aDiff.toPrecision(3) }).feedback
        .ok
    ).toBe(true);
    expect(host.getSession().trials.every((t) => fieldIsOk(t.fields.v))).toBe(
      true
    );
    expect(chartStepReady(host.getSession(), tickerTapeDataWorkspaceSpec)).toBe(
      true
    );
    plot.hasFit = true;
    expect(host.submitField({ field: 'aFit', raw: '0.400' }).feedback.ok).toBe(
      true
    );

    // 改第 3 点的 x：Δx₃（本行）与 Δx₄（下一行）失效；v₂ 与 v₄（前后各一
    // 行用中央差分）失效；v₃ 不含 x₃，保持不变。
    host.submitField({
      field: 'x',
      trialIndex: 3,
      raw: (truth[3] - 0.05).toFixed(2)
    });
    const after = host.getSession();
    expect(fieldIsOk(getTrialField(after.trials[2], 'deltaX'))).toBe(true);
    expect(fieldIsOk(getTrialField(after.trials[3], 'deltaX'))).toBe(false);
    expect(getTrialField(after.trials[3], 'deltaX')?.stale).toBe(true);
    expect(getTrialField(after.trials[4], 'deltaX')?.stale).toBe(true);
    expect(getTrialField(after.trials[2], 'v')?.stale).toBe(true);
    expect(fieldIsOk(getTrialField(after.trials[3], 'v'))).toBe(true);
    expect(getTrialField(after.trials[4], 'v')?.stale).toBe(true);
    // 逐差法与图像拟合都不能靠旧值放行。
    expect(getSummaryField(after, 'aDiff')?.stale).toBe(true);
    expect(getSummaryField(after, 'aFit')?.stale).toBe(true);
    expect(chartStepReady(after, tickerTapeDataWorkspaceSpec)).toBe(false);
  });

  it('gates Δx and v on the neighbouring x readings', () => {
    const { source } = makeSource();
    const host = createTickerTapeDataWorkspace(source);
    const truth = source.getState().tapeXCm;
    host.submitField({ field: 'x', trialIndex: 1, raw: truth[1].toFixed(2) });
    let session = host.getSession();
    // Δx₁ 需要 x₀ 与 x₁；v₁ 需要 x₀ 与 x₂。
    expect(
      isFieldReady(session, tickerTapeDataWorkspaceSpec, 'deltaX', 1)
    ).toBe(false);
    expect(isFieldReady(session, tickerTapeDataWorkspaceSpec, 'v', 1)).toBe(
      false
    );
    host.submitField({ field: 'x', trialIndex: 0, raw: truth[0].toFixed(2) });
    host.submitField({ field: 'x', trialIndex: 2, raw: truth[2].toFixed(2) });
    session = host.getSession();
    expect(
      isFieldReady(session, tickerTapeDataWorkspaceSpec, 'deltaX', 1)
    ).toBe(true);
    expect(isFieldReady(session, tickerTapeDataWorkspaceSpec, 'v', 1)).toBe(
      true
    );
  });
});

describe('scene fillFromRuler invalidation (Fix 2)', () => {
  function makeTapeScene() {
    const canvas = document.createElement('canvas');
    const parent = document.createElement('div');
    parent.appendChild(canvas);
    document.body.appendChild(parent);
    const scene = createTickerTapeScene({ canvas, theme: 'light' });
    return { scene };
  }

  async function readyScene() {
    const { scene } = makeTapeScene();
    const host = scene.getDataWorkspace();
    // 数据任务模块经动态 import 加载，等待外层 host 就绪。
    await vi.waitFor(() => {
      expect(() => host.getSpec()).not.toThrow();
    });
    return { scene, host };
  }

  it('invalidates the full checked chain and closes the plot gate', async () => {
    const { scene, host } = await readyScene();
    const tapeX = scene.getState().tapeXCm;
    const T = scene.getState().T;

    for (let i = 0; i < 7; i += 1) {
      const result = host.submitField({
        field: 'x',
        trialIndex: i,
        raw: tapeX[i].toFixed(2)
      });
      expect(result.feedback.ok).toBe(true);
    }
    for (let i = 1; i < 7; i += 1) {
      const result = host.submitField({
        field: 'deltaX',
        trialIndex: i,
        raw: (tapeX[i] - tapeX[i - 1]).toFixed(2)
      });
      expect(result.feedback.ok).toBe(true);
    }
    for (let i = 1; i < 6; i += 1) {
      const expected = (tapeX[i + 1] - tapeX[i - 1]) / 100 / (2 * T);
      const result = host.submitField({
        field: 'v',
        trialIndex: i,
        raw: expected.toPrecision(3)
      });
      expect(result.feedback.ok).toBe(true);
    }
    expect(chartStepReady(host.getSession(), tickerTapeDataWorkspaceSpec)).toBe(
      true
    );

    scene.fillFromRuler();

    const session = host.getSession();
    expect(session.trials.every((trial) => trial.fields.x?.stale)).toBe(true);
    expect(session.trials[0]?.fields.x?.feedback?.message).toBe(
      '已按尺重新填数，请重新校对'
    );
    expect(chartStepReady(session, tickerTapeDataWorkspaceSpec)).toBe(false);
    scene.dispose();
  });

  it('is safe on an untouched session and keeps the host usable afterwards', async () => {
    const { scene, host } = await readyScene();
    expect(() => scene.fillFromRuler()).not.toThrow();
    const tapeX = scene.getState().tapeXCm;
    expect(
      host.submitField({ field: 'x', trialIndex: 0, raw: tapeX[0].toFixed(2) })
        .feedback.ok
    ).toBe(true);
    scene.dispose();
  });
});

describe('renderResult significant-digit formatting (Fix 8)', () => {
  const { source } = makeSource();
  const host = createTickerTapeDataWorkspace(source);

  function okState(raw: string, value: number): FieldCheckState {
    return {
      raw,
      value,
      checked: true,
      stale: false,
      feedback: { ok: true, message: '校对通过' }
    };
  }

  it('keeps significant trailing zeros and appends the aDiff note only when checked', () => {
    let session = createEmptySession(tickerTapeDataWorkspaceSpec);
    session = writeCheckedField(
      session,
      undefined,
      'aDiff',
      okState('1.20', 1.2),
      tickerTapeDataWorkspaceSpec
    );
    session = writeCheckedField(
      session,
      undefined,
      'aFit',
      okState('1.20', 1.2),
      tickerTapeDataWorkspaceSpec
    );
    expect(host.renderResult?.(session)).toBe(
      'v–t 图像斜率 a = 1.20 m/s²，与逐差法 a = 1.20 m/s² 相互印证'
    );
  });

  it('formats 0.823 at three digits without the note when aDiff is empty', () => {
    let session = createEmptySession(tickerTapeDataWorkspaceSpec);
    session = writeCheckedField(
      session,
      undefined,
      'aFit',
      okState('0.823', 0.823),
      tickerTapeDataWorkspaceSpec
    );
    expect(host.renderResult?.(session)).toBe('v–t 图像斜率 a = 0.823 m/s²');
  });

  it('returns null before completion', () => {
    const session = createEmptySession(tickerTapeDataWorkspaceSpec);
    expect(host.renderResult?.(session)).toBeNull();
  });
});
