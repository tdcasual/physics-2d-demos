import { describe, expect, it } from 'vitest';
import {
  assertSpecGraph,
  createEmptySession,
  fieldIsOk,
  rowCheckStageState,
  stagedFieldReadiness,
  type DataWorkspaceFieldSpec,
  type DataWorkspaceSession,
  type DataWorkspaceSpec,
  type FieldCheckState
} from '../../src/platform/data-workspace';

function field(
  id: string,
  extra: Partial<DataWorkspaceFieldSpec> = {}
): DataWorkspaceFieldSpec {
  return { id, label: id, ...extra };
}

function spec(overrides: Partial<DataWorkspaceSpec> = {}): DataWorkspaceSpec {
  return {
    id: 'staged',
    title: 'staged',
    chartAnalysis: false,
    enabledSteps: ['data'],
    trialCount: 1,
    rowFields: [field('x1'), field('x2'), field('n')],
    summaryFields: [],
    ...overrides
  };
}

function ok(raw = '1'): FieldCheckState {
  return {
    raw,
    value: Number(raw),
    checked: true,
    stale: false,
    feedback: { ok: true, message: 'ok' }
  };
}

function mark(
  session: DataWorkspaceSession,
  trialIndex: number,
  id: string,
  state: FieldCheckState | undefined
): void {
  const trial = session.trials[trialIndex];
  if (!trial) throw new Error('missing trial');
  trial.fields[id] = state;
}

const stages = [
  { id: 'first', label: '校对 x1', fields: ['x1'] },
  { id: 'second', label: '校对 x2 与 n', fields: ['x2', 'n'] }
] as const;

describe('assertSpecGraph rowCheckStages', () => {
  it('keeps specs that omit stages legal', () => {
    expect(() => assertSpecGraph(spec())).not.toThrow();
  });

  it('rejects an empty stage list', () => {
    expect(() => assertSpecGraph(spec({ rowCheckStages: [] }))).toThrow(
      /non-empty/
    );
  });

  it('rejects a blank id or label', () => {
    expect(() =>
      assertSpecGraph(
        spec({
          rowCheckStages: [
            { id: '  ', label: '校对', fields: ['x1', 'x2', 'n'] }
          ]
        })
      )
    ).toThrow(/id must be non-empty/);
    expect(() =>
      assertSpecGraph(
        spec({
          rowCheckStages: [
            { id: 'only', label: ' ', fields: ['x1', 'x2', 'n'] }
          ]
        })
      )
    ).toThrow(/label must be non-empty/);
  });

  it('rejects a duplicate stage id', () => {
    expect(() =>
      assertSpecGraph(
        spec({
          rowCheckStages: [
            { id: 'same', label: '一', fields: ['x1'] },
            { id: 'same', label: '二', fields: ['x2', 'n'] }
          ]
        })
      )
    ).toThrow(/duplicate rowCheckStages id "same"/);
  });

  it('rejects an empty field list', () => {
    expect(() =>
      assertSpecGraph(
        spec({
          rowCheckStages: [
            { id: 'empty', label: '空', fields: [] },
            { id: 'rest', label: '其余', fields: ['x1', 'x2', 'n'] }
          ]
        })
      )
    ).toThrow(/fields must be non-empty/);
  });

  it('rejects a field that is not a row field', () => {
    expect(() =>
      assertSpecGraph(
        spec({
          summaryFields: [field('avg')],
          rowCheckStages: [
            { id: 'a', label: '一', fields: ['x1', 'avg'] },
            { id: 'b', label: '二', fields: ['x2', 'n'] }
          ]
        })
      )
    ).toThrow(/not a row field/);
  });

  it('rejects a repeated field and incomplete coverage', () => {
    expect(() =>
      assertSpecGraph(
        spec({
          rowCheckStages: [
            { id: 'a', label: '一', fields: ['x1', 'x2'] },
            { id: 'b', label: '二', fields: ['x2', 'n'] }
          ]
        })
      )
    ).toThrow(/repeated/);
    expect(() =>
      assertSpecGraph(
        spec({
          rowCheckStages: [
            { id: 'a', label: '一', fields: ['x1'] },
            { id: 'b', label: '二', fields: ['x2'] }
          ]
        })
      )
    ).toThrow(/missing "n"/);
  });

  it('rejects a row dependency in a later stage or later in the same stage', () => {
    expect(() =>
      assertSpecGraph(
        spec({
          rowFields: [
            field('x1', { dependsOn: [{ scope: 'row', field: 'x2' }] }),
            field('x2'),
            field('n')
          ],
          rowCheckStages: [...stages]
        })
      )
    ).toThrow(/later stage/);
    expect(() =>
      assertSpecGraph(
        spec({
          rowFields: [
            field('x1'),
            field('x2', { dependsOn: [{ scope: 'row', field: 'n' }] }),
            field('n')
          ],
          rowCheckStages: [...stages]
        })
      )
    ).toThrow(/not earlier in stage "second"/);
  });

  it('accepts full coverage and an earlier same-stage dependency', () => {
    expect(() =>
      assertSpecGraph(
        spec({
          rowFields: [
            field('x1'),
            field('x2'),
            field('n', { dependsOn: [{ scope: 'row', field: 'x2' }] })
          ],
          rowCheckStages: [...stages]
        })
      )
    ).not.toThrow();
  });
});

describe('rowCheckStageState', () => {
  const staged = spec({ rowCheckStages: [...stages] });

  it('points at the first incomplete stage and never writes a phase', () => {
    const session = createEmptySession(staged);
    const before = structuredClone(session);
    const state = rowCheckStageState(session, staged, 0);
    expect(state).toEqual({
      stage: stages[0],
      index: 1,
      total: 2,
      completed: false
    });
    expect(session).toEqual(before);
    expect(session.currentTrial).toBe(0);

    mark(session, 0, 'x1', ok());
    expect(rowCheckStageState(session, staged, 0)).toMatchObject({
      stage: stages[1],
      index: 2,
      completed: false
    });

    mark(session, 0, 'x2', ok());
    expect(rowCheckStageState(session, staged, 0).index).toBe(2);

    mark(session, 0, 'n', ok());
    expect(rowCheckStageState(session, staged, 0)).toEqual({
      stage: null,
      index: 2,
      total: 2,
      completed: true
    });
  });

  it('rolls back to the earliest stage that is no longer fieldIsOk', () => {
    const session = createEmptySession(staged);
    mark(session, 0, 'x1', ok());
    mark(session, 0, 'x2', ok());
    mark(session, 0, 'n', ok());
    mark(session, 0, 'x1', { ...ok(), stale: true });
    expect(fieldIsOk(session.trials[0]?.fields.x1)).toBe(false);
    expect(rowCheckStageState(session, staged, 0)).toMatchObject({
      index: 1,
      completed: false,
      stage: stages[0]
    });
  });

  it('reports no stage cursor when the spec is legacy', () => {
    const legacy = spec();
    const session = createEmptySession(legacy);
    mark(session, 0, 'x1', ok());
    expect(rowCheckStageState(session, legacy, 0)).toEqual({
      stage: null,
      index: 0,
      total: 0,
      completed: false
    });
  });
});

describe('stagedFieldReadiness', () => {
  const staged = spec({
    rowFields: [
      field('x1'),
      field('x2', {
        gated: false,
        dependsOn: [{ scope: 'row', field: 'x1' }]
      }),
      field('n', { dependsOn: [{ scope: 'row', field: 'x2' }] })
    ],
    rowCheckStages: [...stages]
  });

  it('blocks later stages and same-stage later fields, including ungated dependsOn', () => {
    const session = createEmptySession(staged);
    expect(stagedFieldReadiness(session, staged, 'x1', 0)).toEqual({
      ready: true
    });
    expect(stagedFieldReadiness(session, staged, 'x2', 0)).toEqual({
      ready: false,
      reason: '先完成阶段「校对 x1」'
    });

    mark(session, 0, 'x1', ok());
    expect(stagedFieldReadiness(session, staged, 'x2', 0)).toEqual({
      ready: true
    });
    expect(stagedFieldReadiness(session, staged, 'n', 0)).toEqual({
      ready: false,
      reason: '先校对x2'
    });

    mark(session, 0, 'x2', ok());
    expect(stagedFieldReadiness(session, staged, 'n', 0)).toEqual({
      ready: true
    });
  });

  it('keeps an early field ready for remeasurement after later fields pass', () => {
    const session = createEmptySession(staged);
    mark(session, 0, 'x1', ok());
    mark(session, 0, 'x2', ok());
    mark(session, 0, 'n', ok());
    expect(stagedFieldReadiness(session, staged, 'x1', 0)).toEqual({
      ready: true
    });
    expect(stagedFieldReadiness(session, staged, 'x2', 0)).toEqual({
      ready: true
    });
  });

  it('does not interfere with legacy specs', () => {
    const legacy = spec({
      rowFields: [
        field('x2', {
          gated: true,
          dependsOn: [{ scope: 'row', field: 'x1' }]
        }),
        field('x1'),
        field('n')
      ]
    });
    const session = createEmptySession(legacy);
    expect(stagedFieldReadiness(session, legacy, 'x2', 0)).toEqual({
      ready: true
    });
    expect(stagedFieldReadiness(session, legacy, 'n', 0)).toEqual({
      ready: true
    });
  });

  it('names the same-stage predecessor when it is not yet ok', () => {
    const session = createEmptySession(staged);
    mark(session, 0, 'x1', ok());
    const gate = stagedFieldReadiness(session, staged, 'n', 0);
    expect(gate).toEqual({ ready: false, reason: '先校对x2' });
  });
});
