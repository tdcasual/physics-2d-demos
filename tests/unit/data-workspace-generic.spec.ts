import { describe, expect, it, vi } from 'vitest';
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
  createKinematicsChartHost,
  createKinematicsHost,
  createSpecHost,
  kinematicsChartWorkspaceSpec,
  kinematicsWorkspaceSpec
} from './data-workspace-generic.fixture';

describe('generic data-workspace fixture', () => {
  it('renders knowns as chips, hides empty hints, and marks the result field', () => {
    const { host } = createKinematicsHost();
    host.getHint = () => '';
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    const knowns = panel.root.querySelector('.data-workspace-knowns');
    const chips = knowns?.querySelectorAll('.data-workspace-known-chip');
    const hint = panel.root.querySelector(
      '.data-workspace-hint'
    ) as HTMLElement;
    const resultField = panel.root.querySelector(
      '.data-workspace-result-field'
    );

    expect(chips).toHaveLength(1);
    expect(chips?.[0]?.textContent).toBe('g 9.8 m/s²');
    expect(
      chips?.[0]?.querySelector('.data-workspace-known-label')
    ).toBeTruthy();
    expect(
      chips?.[0]?.querySelector('.data-workspace-known-value')
    ).toBeTruthy();
    expect(hint.hidden).toBe(true);
    expect(resultField?.querySelector('[data-field="meanSpeed"]')).toBeTruthy();

    host.getEligibility = () => ({ ok: false, reason: '尚未就绪' });
    panel.update();
    expect(hint.hidden).toBe(false);
    expect(hint.textContent).toBe('尚未就绪');
    panel.dispose();
  });

  it('renders unrelated field ids and stages meanSpeed', () => {
    const { host } = createKinematicsHost();
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    expect(panel.root.textContent).toMatch(/质量/);
    expect(panel.root.textContent).toMatch(/平均速率/);
    expect(panel.root.innerHTML).not.toMatch(/x1|deltaX|lambda/);
    expect(panel.root.querySelector('.data-workspace-leave')).toBeNull();
    expect(
      panel.root.querySelectorAll('.data-workspace-check-row')
    ).toHaveLength(1);
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
      onChange() {}
    });
    const speed = panel.root.querySelector(
      '[data-field="speed"]'
    ) as HTMLInputElement;
    const speedBtn = panel.root.querySelector(
      '[aria-label="校对第 1 组"]'
    ) as HTMLButtonElement;
    expect(speed.disabled).toBe(true);
    expect(speed.getAttribute('aria-disabled')).toBe('true');
    expect(speedBtn.disabled).toBe(false);
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

  it('checks each enabled field in a row and refreshes once', () => {
    const { host, getLiveSession } = createKinematicsHost();
    const onChange = vi.fn();
    const submitField = vi.spyOn(host, 'submitField');
    const panel = createDataWorkspacePanel({ host, onChange });
    const mass = panel.root.querySelector(
      '[data-field="mass"]'
    ) as HTMLInputElement;
    const time = panel.root.querySelector(
      '[data-field="time"]'
    ) as HTMLInputElement;
    const speed = panel.root.querySelector(
      '[data-field="speed"]'
    ) as HTMLInputElement;
    const checkRow = panel.root.querySelector(
      '[aria-label="校对第 1 组"]'
    ) as HTMLButtonElement;

    mass.value = '2';
    time.value = '1';
    checkRow.click();
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual([
      'mass',
      'time'
    ]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(speed.disabled).toBe(false);

    speed.value = '2';
    checkRow.click();
    expect(
      submitField.mock.calls.slice(2).map(([input]) => input.field)
    ).toEqual(['mass', 'time', 'speed']);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(
      getTrialField(getLiveSession().trials[0], 'speed')?.feedback?.ok
    ).toBe(true);
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
    expect(() => assertSpecGraph(kinematicsChartWorkspaceSpec)).not.toThrow();
    expect(() =>
      assertSpecGraph({ ...kinematicsWorkspaceSpec, stagePanZoom: true })
    ).not.toThrow();
    expect(() =>
      assertSpecGraph({ ...kinematicsWorkspaceSpec, stagePanZoom: false })
    ).not.toThrow();
    expect(() =>
      assertSpecGraph({
        ...kinematicsWorkspaceSpec,
        stagePanZoom: 'on' as unknown as boolean
      })
    ).toThrow(/stagePanZoom/);
  });
});

describe('transposed table and two-step shell', () => {
  it('renders fields as rows, hides add/remove, and shows N/A placeholders', () => {
    const { host } = createKinematicsChartHost();
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    const table = panel.root.querySelector(
      '.data-workspace-table'
    ) as HTMLTableElement;
    expect(table.dataset.orientation).toBe('fields');
    expect(panel.root.querySelectorAll('tbody tr')).toHaveLength(3);
    const headLabels = [...table.querySelectorAll('thead th')].map(
      (cell) => cell.textContent
    );
    expect(headLabels).toEqual(['', '1', '2', '3', '']);
    expect(
      (panel.root.querySelector('.data-workspace-row-actions') as HTMLElement)
        .hidden
    ).toBe(true);
    expect(panel.root.querySelector('.data-workspace-remove')).toBeNull();
    expect(panel.root.querySelector('[aria-label="删除第 1 组"]')).toBeNull();
    const na = panel.root.querySelector(
      '.data-workspace-na[data-field="speed"][data-trial="0"]'
    ) as HTMLElement;
    expect(na).toBeTruthy();
    expect(na.textContent).toBe('—');
    expect(
      panel.root.querySelector('input[data-field="speed"][data-trial="0"]')
    ).toBeNull();
    expect(
      panel.root.querySelector('input[data-field="speed"][data-trial="1"]')
    ).toBeTruthy();
    expect(
      [...panel.root.querySelectorAll('.data-workspace-check-row')].map((btn) =>
        btn.getAttribute('aria-label')
      )
    ).toEqual(['校对质量', '校对时间', '校对速率']);
    panel.dispose();
  });

  it('submits every enabled cell in a transposed field row', () => {
    const { host } = createKinematicsChartHost();
    const onChange = vi.fn();
    const submitField = vi.spyOn(host, 'submitField');
    const panel = createDataWorkspacePanel({ host, onChange });
    for (let i = 0; i < 3; i += 1) {
      (
        panel.root.querySelector(
          `input[data-field="mass"][data-trial="${i}"]`
        ) as HTMLInputElement
      ).value = String(i + 1);
    }
    (
      panel.root.querySelector('[aria-label="校对质量"]') as HTMLButtonElement
    ).click();
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual([
      'mass',
      'mass',
      'mass'
    ]);
    expect(submitField.mock.calls.map(([input]) => input.trialIndex)).toEqual([
      0, 1, 2
    ]);
    expect(onChange).toHaveBeenCalledTimes(1);
    panel.dispose();
  });

  it('keeps the data step locked until rows and data summaries are ok', () => {
    const { host } = createKinematicsChartHost();
    const onStepChange = vi.fn();
    const panel = createDataWorkspacePanel({
      host,
      onChange() {},
      onStepChange
    });
    expect(panel.getStep()).toBe('data');
    const tabs = panel.root.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.textContent).toBe('1 数据处理');
    expect(tabs[1]?.textContent).toBe('2 图像分析');
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]?.getAttribute('aria-disabled')).toBe('true');
    expect(tabs[1]?.classList.contains('is-locked')).toBe(true);
    (tabs[1] as HTMLButtonElement).click();
    expect(panel.getStep()).toBe('data');
    expect(onStepChange).not.toHaveBeenCalled();
    const stepAlert = panel.root.querySelector(
      '.data-workspace-step-alert'
    ) as HTMLElement;
    expect(stepAlert.hidden).toBe(false);
    expect(stepAlert.textContent).toBe('请先完成数据处理');
    expect(panel.root.querySelector('.data-workspace-hint')?.textContent).toBe(
      '填写质量、时间和速率'
    );
    expect(
      (panel.root.querySelector('.data-workspace-review') as HTMLElement).hidden
    ).toBe(true);

    for (let i = 0; i < 3; i += 1) {
      host.submitField({ field: 'mass', trialIndex: i, raw: '2' });
      host.submitField({ field: 'time', trialIndex: i, raw: '1' });
      if (i !== 0) {
        host.submitField({ field: 'speed', trialIndex: i, raw: '2' });
      }
    }
    host.submitField({ field: 'meanSpeed', raw: '2' });
    panel.update();
    expect(tabs[1]?.getAttribute('aria-disabled')).toBeNull();
    expect(tabs[1]?.classList.contains('is-locked')).toBe(false);
    (tabs[1] as HTMLButtonElement).click();
    expect(panel.getStep()).toBe('chartAnalysis');
    expect(onStepChange).toHaveBeenCalledWith('chartAnalysis');
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(stepAlert.hidden).toBe(true);
    expect(
      (panel.root.querySelector('.data-workspace-table-wrap') as HTMLElement)
        .hidden
    ).toBe(true);
    const review = panel.root.querySelector(
      '.data-workspace-review'
    ) as HTMLElement;
    expect(review.hidden).toBe(false);
    expect(
      review.querySelector('[data-field="speed"][data-trial="0"]')?.textContent
    ).toBe('—');
    expect(
      (panel.root.querySelector('.data-workspace-chart') as HTMLElement).hidden
    ).toBe(false);
    const meanRow = panel.root
      .querySelector('[data-field="meanSpeed"]')
      ?.closest('.data-workspace-summary-row') as HTMLElement;
    const slopeRow = panel.root
      .querySelector('[data-field="fitSlope"]')
      ?.closest('.data-workspace-summary-row') as HTMLElement;
    expect(meanRow.hidden).toBe(true);
    expect(slopeRow.hidden).toBe(false);
    (tabs[0] as HTMLButtonElement).click();
    expect(panel.getStep()).toBe('data');
    expect(onStepChange).toHaveBeenCalledWith('data');
    expect(meanRow.hidden).toBe(false);
    expect(slopeRow.hidden).toBe(true);
    panel.dispose();
  });

  it('does not show a step bar or transposed table for the default spec', () => {
    const { host } = createKinematicsHost();
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    expect(panel.getStep()).toBe('data');
    expect(panel.root.querySelector('[role="tablist"]')).toBeNull();
    expect(
      (panel.root.querySelector('.data-workspace-table') as HTMLTableElement)
        .dataset.orientation
    ).toBe('trials');
    expect(panel.root.querySelector('.data-workspace-add')).toBeTruthy();
    expect(panel.root.querySelector('.data-workspace-review')).toBeNull();
    panel.dispose();
  });

  it('uses trialLabels for transposed headers and trial-oriented row labels', () => {
    const { host: fieldsHost } = createSpecHost(
      {
        ...kinematicsChartWorkspaceSpec,
        trialLabels: ['0', '1', '2']
      },
      { naCells: [{ trialIndex: 0, field: 'speed' }] }
    );
    const fieldsPanel = createDataWorkspacePanel({
      host: fieldsHost,
      onChange() {}
    });
    const fieldsTable = fieldsPanel.root.querySelector(
      '.data-workspace-table'
    ) as HTMLTableElement;
    expect(
      [...fieldsTable.querySelectorAll('thead th')].map(
        (cell) => cell.textContent
      )
    ).toEqual(['', '0', '1', '2', '']);
    expect(
      fieldsPanel.root.querySelector('[aria-label="第 0 组 质量（kg）"]')
    ).toBeTruthy();
    fieldsPanel.dispose();

    const { host: trialsHost } = createSpecHost({
      ...kinematicsWorkspaceSpec,
      trialLabels: ['甲']
    });
    const trialsPanel = createDataWorkspacePanel({
      host: trialsHost,
      onChange() {}
    });
    const rowHead = trialsPanel.root.querySelector(
      'tbody th'
    ) as HTMLTableCellElement;
    expect(rowHead.textContent).toBe('甲');
    expect(
      trialsPanel.root.querySelector('[aria-label="校对第 甲 组"]')
    ).toBeTruthy();
    expect(
      trialsPanel.root.querySelector('[aria-label="第 甲 组 质量（kg）"]')
    ).toBeTruthy();
    trialsPanel.dispose();
  });

  it('auto-hides the locked chart-step alert after a short delay', () => {
    vi.useFakeTimers();
    const { host } = createKinematicsChartHost();
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    try {
      const chartTab = panel.root.querySelector(
        '[role="tab"][data-step="chartAnalysis"]'
      ) as HTMLButtonElement;
      const alert = panel.root.querySelector(
        '.data-workspace-step-alert'
      ) as HTMLElement;
      expect(alert.hidden).toBe(true);
      chartTab.click();
      expect(alert.hidden).toBe(false);
      expect(alert.textContent).toBe('请先完成数据处理');
      vi.advanceTimersByTime(3000);
      expect(alert.hidden).toBe(true);
      expect(alert.textContent).toBe('');
    } finally {
      panel.dispose();
      vi.useRealTimers();
    }
  });
});
