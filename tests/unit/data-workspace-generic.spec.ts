import { describe, expect, it } from 'vitest';
import { createDataWorkspacePanel } from '../../src/ui/components/data-workspace-panel';
import {
  addSessionTrial,
  applyFieldDrafts,
  assertSpecGraph,
  createEmptySession,
  formatResultText,
  getSummaryField,
  getTrialField,
  invalidateDownstream,
  isFieldReady,
  writeCheckedField,
  type DataWorkspaceSpec
} from '../../src/platform/data-workspace';
import {
  createKinematicsHost,
  kinematicsWorkspaceSpec
} from './data-workspace-generic.fixture';

describe('generic data-workspace fixture', () => {
  it('renders unrelated field ids and stages meanSpeed', () => {
    const { host } = createKinematicsHost();
    const panel = createDataWorkspacePanel({
      host,
      onExit() {},
      onChange() {}
    });
    expect(panel.root.textContent).toMatch(/质量/);
    expect(panel.root.textContent).toMatch(/平均速率/);
    expect(panel.root.innerHTML).not.toMatch(/x1|deltaX|lambda/);
    const mean = panel.root.querySelector(
      '[data-field="meanSpeed"]'
    ) as HTMLInputElement;
    expect(mean.disabled).toBe(true);
    panel.dispose();
  });

  it('invalidates downstream speed and meanSpeed from mass', () => {
    const spec = kinematicsWorkspaceSpec;
    let session = createEmptySession(spec);
    session = writeCheckedField(
      session,
      0,
      'speed',
      {
        raw: '2',
        value: 2,
        checked: true,
        stale: false,
        feedback: { ok: true, message: 'ok' }
      },
      spec
    );
    session = writeCheckedField(
      session,
      undefined,
      'meanSpeed',
      {
        raw: '2',
        value: 2,
        checked: true,
        stale: false,
        feedback: { ok: true, message: 'ok' }
      },
      spec
    );
    const next = invalidateDownstream(session, 0, 'mass', spec);
    expect(getTrialField(next.trials[0], 'speed')?.stale).toBe(true);
    expect(getSummaryField(next, 'meanSpeed')?.stale).toBe(true);
  });

  it('preserves drafts across add via applyDrafts, not session mutation', () => {
    const { host, getLiveSession } = createKinematicsHost();
    const panel = createDataWorkspacePanel({
      host,
      onExit() {},
      onChange() {}
    });
    const mass = panel.root.querySelector(
      '[data-field="mass"]'
    ) as HTMLInputElement;
    mass.value = '1.5';
    const frozen = host.getSession();
    expect(() => {
      frozen.trials[0]!.fields.mass = {
        raw: 'hack',
        value: 0,
        checked: false,
        stale: false
      };
    }).toThrow();
    (
      panel.root.querySelector('.data-workspace-add') as HTMLButtonElement
    ).click();
    expect(getLiveSession().trials).toHaveLength(2);
    expect(getTrialField(getLiveSession().trials[0], 'mass')?.raw).toBe('1.5');
    expect(
      getTrialField(getLiveSession().trials[1], 'mass')?.raw
    ).toBeUndefined();
    panel.dispose();
  });

  it('formats a scene-driven result from spec', () => {
    const spec = kinematicsWorkspaceSpec;
    let session = createEmptySession(spec);
    session = writeCheckedField(
      session,
      0,
      'speed',
      {
        raw: '3',
        value: 3,
        checked: true,
        stale: false,
        feedback: { ok: true, message: 'ok' }
      },
      spec
    );
    expect(isFieldReady(session, spec, 'meanSpeed')).toBe(true);
    session = writeCheckedField(
      session,
      undefined,
      'meanSpeed',
      {
        raw: '3.00',
        value: 3,
        checked: true,
        stale: false,
        feedback: { ok: true, message: 'ok' }
      },
      spec
    );
    expect(formatResultText(session, spec)).toBe('平均速率 = 3.00 m/s');
    session = addSessionTrial(session, spec);
    expect(isFieldReady(session, spec, 'meanSpeed')).toBe(false);
  });

  it('applyFieldDrafts invalidates row and summary dependents and drops success state', () => {
    const spec = kinematicsWorkspaceSpec;
    let session = createEmptySession(spec);
    const ok = {
      checked: true as const,
      stale: false,
      feedback: { ok: true, message: 'ok' }
    };
    session = writeCheckedField(
      session,
      0,
      'mass',
      { raw: '2', value: 2, snapshot: undefined, ...ok },
      spec
    );
    session = writeCheckedField(
      session,
      0,
      'time',
      { raw: '1', value: 1, ...ok },
      spec
    );
    session = writeCheckedField(
      session,
      0,
      'speed',
      {
        raw: '2',
        value: 2,
        ...ok,
        snapshot: {
          readingMm: 1,
          precisionMm: 0.01,
          displayDigits: 2,
          instrumentId: 'demo',
          instrumentLabel: 'demo',
          capturedAt: 1,
          aligned: true,
          residualPx: 0
        },
        failedAttempts: 3
      },
      spec
    );
    session = writeCheckedField(
      session,
      undefined,
      'meanSpeed',
      { raw: '2', value: 2, ...ok },
      spec
    );
    expect(session.completed).toBe(true);
    const rowId = session.trials[0]!.id;
    const next = applyFieldDrafts(session, spec, [
      { rowId, field: 'mass', raw: '3' }
    ]);
    const mass = getTrialField(next.trials[0], 'mass');
    expect(mass?.raw).toBe('3');
    expect(mass?.checked).toBe(false);
    expect(mass?.feedback).toBeUndefined();
    expect(mass?.snapshot).toBeUndefined();
    expect(getTrialField(next.trials[0], 'speed')?.stale).toBe(true);
    expect(getTrialField(next.trials[0], 'speed')?.checked).toBe(false);
    expect(getSummaryField(next, 'meanSpeed')?.stale).toBe(true);
    expect(next.completed).toBe(false);
    expect(isFieldReady(next, spec, 'speed', 0)).toBe(false);
    expect(isFieldReady(next, spec, 'meanSpeed')).toBe(false);
  });

  it('preserves failedAttempts on a changed draft', () => {
    const spec = kinematicsWorkspaceSpec;
    let session = createEmptySession(spec);
    session = writeCheckedField(
      session,
      0,
      'mass',
      {
        raw: '2',
        value: 2,
        checked: false,
        stale: false,
        feedback: { ok: false, layer: 'format', message: 'bad' },
        failedAttempts: 2
      },
      spec
    );
    const next = applyFieldDrafts(session, spec, [
      { rowId: session.trials[0]!.id, field: 'mass', raw: '4' }
    ]);
    expect(getTrialField(next.trials[0], 'mass')?.failedAttempts).toBe(2);
    expect(getTrialField(next.trials[0], 'mass')?.feedback).toBeUndefined();
  });

  it('gates the synthetic speed field until mass and time are valid, then disables after a draft', () => {
    const { host } = createKinematicsHost();
    const panel = createDataWorkspacePanel({
      host,
      onExit() {},
      onChange() {}
    });
    const speed = panel.root.querySelector(
      '[data-field="speed"]'
    ) as HTMLInputElement;
    const speedBtn = panel.root.querySelector(
      '[aria-label="校对第 1 组 速率"]'
    ) as HTMLButtonElement;
    expect(speed.disabled).toBe(true);
    expect(speed.getAttribute('aria-disabled')).toBe('true');
    expect(speedBtn.disabled).toBe(true);
    expect(panel.root.textContent).toMatch(/请先校对质量和时间/);
    host.submitField({ field: 'mass', trialIndex: 0, raw: '2' });
    panel.update();
    expect(speed.disabled).toBe(true);
    host.submitField({ field: 'time', trialIndex: 0, raw: '1' });
    panel.update();
    expect(speed.disabled).toBe(false);
    expect(speedBtn.disabled).toBe(false);
    const mass = panel.root.querySelector(
      '[data-field="mass"]'
    ) as HTMLInputElement;
    mass.value = '9';
    (
      panel.root.querySelector('.data-workspace-add') as HTMLButtonElement
    ).click();
    const speedAfter = panel.root.querySelector(
      '[data-field="speed"][data-row-id="row-1"]'
    ) as HTMLInputElement;
    expect(speedAfter.disabled).toBe(true);
    panel.dispose();
  });

  it('rejects unknown ids, cycles, and unmodelable dependency scopes', () => {
    const base: DataWorkspaceSpec = {
      ...kinematicsWorkspaceSpec,
      id: 'bad-graph'
    };
    expect(() =>
      assertSpecGraph({
        ...base,
        rowFields: [
          ...base.rowFields,
          {
            id: 'accel',
            label: 'a',
            dependsOn: [{ scope: 'row', field: 'nope' }]
          }
        ]
      })
    ).toThrow(/unknown dependency/);
    expect(() =>
      assertSpecGraph({
        ...base,
        result: undefined,
        completionField: undefined,
        rowFields: [
          {
            id: 'a',
            label: 'a',
            dependsOn: [{ scope: 'row', field: 'b' }]
          },
          {
            id: 'b',
            label: 'b',
            dependsOn: [{ scope: 'row', field: 'a' }]
          }
        ],
        summaryFields: []
      })
    ).toThrow(/cyclic/);
    expect(() =>
      assertSpecGraph({
        ...base,
        rowFields: base.rowFields.map((field) =>
          field.id === 'mass'
            ? {
                ...field,
                dependsOn: [{ scope: 'summary', field: 'meanSpeed' }]
              }
            : field
        )
      })
    ).toThrow(/cannot depend with scope/);
    expect(() =>
      assertSpecGraph({
        ...base,
        result: { field: 'speed', template: '{value}' }
      })
    ).toThrow(/result.field/);
    expect(() =>
      assertSpecGraph({
        ...base,
        completionField: 'speed'
      })
    ).toThrow(/completionField/);
    expect(() =>
      assertSpecGraph({
        ...base,
        lockInstrumentFromField: 'meanSpeed'
      })
    ).toThrow(/lockInstrumentFromField/);
    expect(() => assertSpecGraph(kinematicsWorkspaceSpec)).not.toThrow();
  });
});
