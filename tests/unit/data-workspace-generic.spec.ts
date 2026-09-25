import { describe, expect, it, vi } from 'vitest';

const SPLIT_FIT_KEY = 'dw-split-fit-kinematics-chart';
const SPLIT_LEGACY_KEY = 'dw-split-kinematics-chart';

function splitRect(height: number, width = 200): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON() {
      return {};
    }
  } as DOMRect;
}

function mockSplitHeights(
  stage: HTMLElement,
  review: HTMLElement,
  stageHeight: number,
  reviewHeight: number
): void {
  Object.defineProperty(stage, 'clientHeight', {
    configurable: true,
    get: () => stageHeight
  });
  stage.getBoundingClientRect = () => splitRect(stageHeight);
  review.getBoundingClientRect = () => splitRect(reviewHeight);
}

function expectLegalSeparator(splitter: HTMLElement): void {
  const now = Number(splitter.getAttribute('aria-valuenow'));
  const min = Number(splitter.getAttribute('aria-valuemin'));
  const max = Number(splitter.getAttribute('aria-valuemax'));
  expect(Number.isFinite(now)).toBe(true);
  expect(now).toBeGreaterThanOrEqual(min);
  expect(now).toBeLessThanOrEqual(max);
}
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
    expect(panel.root.textContent).not.toMatch(/请先校对质量和时间/);
    expect(speed.getAttribute('aria-label')).toMatch(/请先校对质量和时间/);
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

  it('keeps detailed grading feedback available with compact visible status', () => {
    const { host } = createKinematicsHost();
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    host.submitField({ field: 'mass', trialIndex: 0, raw: 'bad' });
    panel.update();

    const status = panel.root.querySelector(
      '.data-workspace-status.is-error'
    ) as HTMLElement;
    expect(status.textContent).toBe('✗ 不通过');
    expect(status.dataset.reason).toBe('格式不符');
    expect(status.title).toBeTruthy();
    expect(status.getAttribute('aria-label')).toContain(status.title);
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

  it('opens chart layout before rows are complete and still renders the review', () => {
    const { host } = createKinematicsChartHost();
    const onStepChange = vi.fn();
    const panel = createDataWorkspacePanel({
      host,
      onChange() {},
      onStepChange
    });
    expect(panel.getStep()).toBe('data');
    // 图像分析不再有面板内步骤条；进出由 capability 经 setChartMode 驱动。
    expect(panel.root.querySelectorAll('[role="tab"]')).toHaveLength(0);
    expect(panel.root.querySelector('.data-workspace-hint')?.textContent).toBe(
      '填写质量、时间和速率'
    );
    expect(panel.setChartMode(true)).toBe(true);
    expect(panel.getStep()).toBe('chartAnalysis');
    expect(onStepChange).toHaveBeenCalledWith('chartAnalysis');
    expect(
      (panel.root.querySelector('.data-workspace-review') as HTMLElement).hidden
    ).toBe(false);
    panel.setChartMode(false);
    expect(panel.getStep()).toBe('data');

    for (let i = 0; i < 3; i += 1) {
      host.submitField({ field: 'mass', trialIndex: i, raw: '2' });
      host.submitField({ field: 'time', trialIndex: i, raw: '1' });
      if (i !== 0) {
        host.submitField({ field: 'speed', trialIndex: i, raw: '2' });
      }
    }
    host.submitField({ field: 'meanSpeed', raw: '2' });
    panel.update();
    // Simulate the live editor state corresponding to direct host submissions;
    // chart-mode entry now correctly treats the DOM as authoritative drafts.
    const liveSession = host.getSession();
    for (let i = 0; i < 3; i += 1) {
      for (const field of ['mass', 'time', 'speed']) {
        const selector =
          'input[data-field="' + field + '"][data-trial="' + i + '"]';
        const input = panel.root.querySelector(
          selector
        ) as HTMLInputElement | null;
        const raw = liveSession.trials[i]?.fields[field]?.raw;
        if (input && raw != null) input.value = raw;
      }
    }
    const meanInput = panel.root.querySelector(
      'input[data-field="meanSpeed"]'
    ) as HTMLInputElement | null;
    if (meanInput) meanInput.value = liveSession.summary.meanSpeed?.raw ?? '';
    expect(panel.setChartMode(true)).toBe(true);
    expect(panel.getStep()).toBe('chartAnalysis');
    expect(onStepChange).toHaveBeenCalledWith('chartAnalysis');
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
    panel.setChartMode(false);
    expect(panel.getStep()).toBe('data');
    expect(onStepChange).toHaveBeenCalledWith('data');
    expect(meanRow.hidden).toBe(false);
    expect(slopeRow.hidden).toBe(true);
    panel.dispose();
  });

  it('uses an even chart split only when the spec asks and the viewport is tall', () => {
    const created = createKinematicsChartHost();
    const spec = { ...created.host.getSpec(), chartEvenSplit: true };
    const host = { ...created.host, getSpec: () => spec };
    localStorage.removeItem('dw-split-fit-kinematics-chart');
    const previous = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800
    });
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    const stage = panel.root.querySelector(
      '.data-workspace-chart-stage'
    ) as HTMLElement;
    const splitter = panel.root.querySelector(
      '.data-workspace-splitter'
    ) as HTMLElement;
    expect(stage.getAttribute('data-split-mode')).toBe('even');
    expect(splitter.getAttribute('aria-valuenow')).toBe('50');
    expect(splitter.getAttribute('aria-valuetext')).toBe('上下各半');
    expect(stage.style.getPropertyValue('--dw-split')).toBe('');
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 500
    });
    window.dispatchEvent(new Event('resize'));
    expect(stage.getAttribute('data-split-mode')).toBe('content');
    expect(splitter.getAttribute('aria-valuetext')).toBe('按表格内容');
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800
    });
    window.dispatchEvent(new Event('resize'));
    expect(stage.getAttribute('data-split-mode')).toBe('even');
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: previous
    });
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

  it('fits the review to content until keyboard or pointer enters the 18–72 manual range', () => {
    window.localStorage.removeItem(SPLIT_FIT_KEY);
    window.localStorage.removeItem(SPLIT_LEGACY_KEY);
    const { host } = createKinematicsChartHost();
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    const stage = panel.root.querySelector(
      '.data-workspace-chart-stage'
    ) as HTMLElement;
    const splitter = panel.root.querySelector(
      '.data-workspace-splitter'
    ) as HTMLElement;
    const review = panel.root.querySelector(
      '.data-workspace-review'
    ) as HTMLElement;
    const tableWrap = panel.root.querySelector(
      '.data-workspace-table-wrap'
    ) as HTMLElement;
    const summary = panel.root.querySelector(
      '.data-workspace-summary'
    ) as HTMLElement;
    try {
      expect(stage.getAttribute('data-split-mode')).toBe('content');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('');
      expect(splitter.getAttribute('aria-valuemin')).toBe('18');
      expect(splitter.getAttribute('aria-valuemax')).toBe('72');
      expect(splitter.getAttribute('aria-valuetext')).toBe('按表格内容');
      expect(splitter.tabIndex).toBe(0);
      expect(tableWrap.tabIndex).toBe(0);
      expect(review.tabIndex).toBe(0);
      expectLegalSeparator(splitter);
      expect(window.localStorage.getItem(SPLIT_FIT_KEY)).toBeNull();
      expect(window.localStorage.getItem(SPLIT_LEGACY_KEY)).toBeNull();
      const stageChildren = [...stage.children].map((el) =>
        el.classList.contains('data-workspace-review')
          ? 'review'
          : el.classList.contains('data-workspace-splitter')
            ? 'splitter'
            : el.classList.contains('data-workspace-chart')
              ? 'chart'
              : el.className
      );
      expect(stageChildren).toEqual(['review', 'splitter', 'chart']);
      const panelChildren = [...panel.root.children];
      expect(panelChildren.indexOf(summary)).toBeGreaterThan(
        panelChildren.indexOf(stage)
      );

      mockSplitHeights(stage, review, 400, 100);
      panel.update();
      expect(stage.getAttribute('data-split-mode')).toBe('content');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('');
      expect(splitter.getAttribute('aria-valuenow')).toBe('25');
      expect(splitter.getAttribute('aria-valuetext')).toBe('按表格内容');
      expectLegalSeparator(splitter);

      splitter.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      expect(stage.getAttribute('data-split-mode')).toBe('manual');
      expect(splitter.getAttribute('aria-valuenow')).toBe('26');
      expect(splitter.getAttribute('aria-valuetext')).toBeNull();
      expect(stage.style.getPropertyValue('--dw-split')).toBe('26.00%');
      expect(window.localStorage.getItem(SPLIT_FIT_KEY)).toBe('0.26');
      expectLegalSeparator(splitter);

      splitter.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true })
      );
      expect(Number(splitter.getAttribute('aria-valuenow'))).toBe(21);
      expect(stage.style.getPropertyValue('--dw-split')).toBe('21.00%');

      splitter.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true })
      );
      expect(splitter.getAttribute('aria-valuenow')).toBe('18');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('18.00%');
      splitter.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true })
      );
      expect(splitter.getAttribute('aria-valuenow')).toBe('72');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('72.00%');

      for (let i = 0; i < 80; i += 1) {
        splitter.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
        );
      }
      expect(splitter.getAttribute('aria-valuenow')).toBe('18');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('18.00%');
      expectLegalSeparator(splitter);

      splitter.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          clientY: 80
        })
      );
      splitter.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          clientY: 240
        })
      );
      splitter.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })
      );
      expect(splitter.getAttribute('aria-valuenow')).toBe('60');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('60.00%');
      expect(window.localStorage.getItem(SPLIT_FIT_KEY)).toBe('0.6');

      splitter.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          clientY: 400
        })
      );
      splitter.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          clientY: 390
        })
      );
      expect(splitter.getAttribute('aria-valuenow')).toBe('72');
      expectLegalSeparator(splitter);
    } finally {
      panel.dispose();
      window.localStorage.removeItem(SPLIT_FIT_KEY);
      window.localStorage.removeItem(SPLIT_LEGACY_KEY);
    }
  });

  it('clamps the announced separator when content-fit is outside 18–72', () => {
    window.localStorage.removeItem(SPLIT_FIT_KEY);
    const { host } = createKinematicsChartHost();
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    const stage = panel.root.querySelector(
      '.data-workspace-chart-stage'
    ) as HTMLElement;
    const splitter = panel.root.querySelector(
      '.data-workspace-splitter'
    ) as HTMLElement;
    const review = panel.root.querySelector(
      '.data-workspace-review'
    ) as HTMLElement;
    try {
      mockSplitHeights(stage, review, 400, 40);
      panel.update();
      expect(stage.getAttribute('data-split-mode')).toBe('content');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('');
      expect(splitter.getAttribute('aria-valuenow')).toBe('18');
      expect(splitter.getAttribute('aria-valuetext')).toBe('按表格内容');
      expectLegalSeparator(splitter);

      splitter.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      expect(stage.getAttribute('data-split-mode')).toBe('manual');
      expect(splitter.getAttribute('aria-valuenow')).toBe('18');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('18.00%');
      expectLegalSeparator(splitter);
    } finally {
      panel.dispose();
      window.localStorage.removeItem(SPLIT_FIT_KEY);
    }

    const above = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    const aboveStage = above.root.querySelector(
      '.data-workspace-chart-stage'
    ) as HTMLElement;
    const aboveSplitter = above.root.querySelector(
      '.data-workspace-splitter'
    ) as HTMLElement;
    const aboveReview = above.root.querySelector(
      '.data-workspace-review'
    ) as HTMLElement;
    try {
      mockSplitHeights(aboveStage, aboveReview, 400, 360);
      above.update();
      expect(aboveStage.getAttribute('data-split-mode')).toBe('content');
      expect(aboveSplitter.getAttribute('aria-valuenow')).toBe('72');
      expect(aboveSplitter.getAttribute('aria-valuetext')).toBe('按表格内容');
      expectLegalSeparator(aboveSplitter);
      aboveSplitter.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      );
      expect(aboveStage.getAttribute('data-split-mode')).toBe('manual');
      expect(aboveSplitter.getAttribute('aria-valuenow')).toBe('72');
      expect(aboveStage.style.getPropertyValue('--dw-split')).toBe('72.00%');
      expectLegalSeparator(aboveSplitter);
    } finally {
      above.dispose();
      window.localStorage.removeItem(SPLIT_FIT_KEY);
    }
  });

  it('restores only the content-fit storage key and ignores the legacy 33% key', () => {
    window.localStorage.setItem(SPLIT_LEGACY_KEY, '0.333');
    window.localStorage.removeItem(SPLIT_FIT_KEY);
    const ignored = createDataWorkspacePanel({
      host: createKinematicsChartHost().host,
      onChange() {}
    });
    try {
      const stage = ignored.root.querySelector(
        '.data-workspace-chart-stage'
      ) as HTMLElement;
      expect(stage.getAttribute('data-split-mode')).toBe('content');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('');
      expect(window.localStorage.getItem(SPLIT_LEGACY_KEY)).toBe('0.333');
      expect(window.localStorage.getItem(SPLIT_FIT_KEY)).toBeNull();
    } finally {
      ignored.dispose();
      window.localStorage.removeItem(SPLIT_LEGACY_KEY);
    }

    window.localStorage.setItem(SPLIT_FIT_KEY, '0.6');
    const restored = createDataWorkspacePanel({
      host: createKinematicsChartHost().host,
      onChange() {}
    });
    try {
      const stage = restored.root.querySelector(
        '.data-workspace-chart-stage'
      ) as HTMLElement;
      const splitter = restored.root.querySelector(
        '.data-workspace-splitter'
      ) as HTMLElement;
      expect(stage.getAttribute('data-split-mode')).toBe('manual');
      expect(stage.style.getPropertyValue('--dw-split')).toBe('60.00%');
      expect(splitter.getAttribute('aria-valuenow')).toBe('60');
      expect(splitter.getAttribute('aria-valuetext')).toBeNull();
      expectLegalSeparator(splitter);
    } finally {
      restored.dispose();
      window.localStorage.removeItem(SPLIT_FIT_KEY);
    }
  });

  it('renders no in-panel step chrome now that chart mode lives in the toolbar', () => {
    const { host } = createKinematicsChartHost();
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    try {
      expect(panel.root.querySelector('[role="tablist"]')).toBeNull();
      expect(panel.root.querySelector('.data-workspace-step-alert')).toBeNull();
    } finally {
      panel.dispose();
    }
  });
});
