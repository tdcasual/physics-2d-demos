import { describe, expect, it } from 'vitest';
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
  getSummaryField,
  getTrialField,
  type DataWorkspaceSession
} from '../../src/platform/data-workspace';

function makeSource(kind: 'ua' | 'uniform' = 'ua') {
  const sim = createTickerTapeSim({ tapeKind: kind, noise: 'off' });
  const hasFit = false;
  const source = {
    getState: () => sim.getState(),
    getPlotStatus: () => ({ hasFit }),
    writeBack: {
      setMeasuredX: (i: number, value: number) => sim.setMeasuredX(i, value),
      setDeltaX: (i: number, value: number) => sim.setDeltaX(i, value),
      setV: (i: number, value: number) => sim.setV(i, value)
    }
  };
  return { sim, source };
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
    let result = submit(session, source, 'deltaX', '0', 1);
    expect(result.feedback.layer).toBe('relation');
    session = result.session;
    result = submit(session, source, 'x', String(truth[0]), 0);
    session = result.session;
    result = submit(session, source, 'x', String(truth[1]), 1);
    expect(result.feedback.ok).toBe(true);
    session = result.session;
    result = submit(session, source, 'deltaX', String(truth[1] - truth[0]), 1);
    expect(result.feedback.ok).toBe(true);
    expect(source.getState().deltaXCm[1]).toBeCloseTo(truth[1] - truth[0]);
    const expectedV = (truth[2] - truth[0]) / 100 / (2 * source.getState().T);
    result = submit(session, source, String('v'), String(expectedV), 1);
    expect(result.feedback.layer).toBe('relation');
    result = submit(result.session, source, 'x', String(truth[2]), 2);
    result = submit(result.session, source, 'v', String(expectedV), 1);
    expect(result.feedback.ok).toBe(true);
    expect(source.getState().vMs[1]).toBeCloseTo(expectedV);
  });

  it('rejects unit/quantity errors and accepts tolerance boundaries', () => {
    const { source } = makeSource();
    const truth = source.getState().tapeXCm[1];
    let session = createTickerTapeDataWorkspace(source).getSession();
    let result = submit(session, source, 'x', `${truth * 100}`, 1);
    expect(result.feedback.layer).toBe('unit');
    result = submit(session, source, 'x', `${truth + 0.05}`, 1);
    expect(result.feedback.ok).toBe(true);
    session = result.session;
    result = submit(session, source, 'x', 'not-a-number', 2);
    expect(result.feedback.layer).toBe('format');
  });

  it('checks summary acceleration and requires plot fitting for aFit', () => {
    const { source } = makeSource();
    const host = createTickerTapeDataWorkspace(source);
    let session = host.getSession();
    const truth = source.getState().tapeXCm;
    for (let i = 0; i < truth.length; i += 1) {
      session = submit(session, source, 'x', String(truth[i]), i).session;
    }
    const a = source.getState().tapeXCm;
    const aExpected = (a[6] - 2 * a[3] + a[0]) / 100 / (0.3 * 0.3);
    let result = submit(session, source, 'aDiff', String(aExpected), undefined);
    expect(result.feedback.ok).toBe(true);
    session = result.session;
    for (let i = 1; i <= 5; i += 1) {
      const v = (truth[i + 1] - truth[i - 1]) / 100 / 0.2;
      session = submit(session, source, 'v', String(v), i).session;
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
    host.submitField({ field: 'x', trialIndex: 0, raw: String(truth[0]) });
    host.invalidateAll('纸带已更换，请重新测量校对');
    const session = host.getSession();
    expect(getTrialField(session.trials[0], 'x')?.stale).toBe(true);
    expect(getTrialField(session.trials[0], 'v')?.checked).toBe(true);
    expect(session.active).toBe(true);
  });

  it('uses the same fit helper as the scene for an accepted slope', () => {
    const points = [1, 2, 3, 4, 5].map((y, i) => ({ t: i * 0.1, y }));
    expect(fitLineDroppingOutliers(points).fit?.slope).toBeCloseTo(10);
  });
});
