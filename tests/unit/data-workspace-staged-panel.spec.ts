import { describe, expect, it, vi } from 'vitest';
import type {
  DataWorkspaceFieldSubmit,
  DataWorkspaceHost,
  DataWorkspaceSpec
} from '../../src/platform/data-workspace';
import { fieldIsOk, getTrialField } from '../../src/platform/data-workspace';
import { createDataWorkspacePanel } from '../../src/ui/components/data-workspace-panel';
import {
  createKinematicsChartHost,
  createKinematicsHost,
  createSpecHost
} from './data-workspace-generic.fixture';

const stagedSpec: DataWorkspaceSpec = {
  id: 'staged-panel',
  title: '分阶段校对',
  chartAnalysis: false,
  enabledSteps: ['data'],
  minRows: 1,
  maxRows: 2,
  initialRows: 1,
  rowFields: [
    { id: 'x1', label: 'x₁', inputMode: 'decimal' },
    {
      id: 'x2',
      label: 'x₂',
      inputMode: 'decimal',
      dependsOn: [{ scope: 'row', field: 'x1' }]
    },
    {
      id: 'n',
      label: 'n',
      inputMode: 'numeric',
      gated: true,
      dependsOn: [{ scope: 'row', field: 'x2' }],
      readinessHint: '先校对 x₂'
    },
    {
      id: 'D',
      label: 'D',
      inputMode: 'decimal',
      dependsOn: [{ scope: 'row', field: 'x2' }]
    },
    {
      id: 'deltaX',
      label: 'Δx',
      inputMode: 'decimal',
      gated: true,
      dependsOn: [{ scope: 'row', field: 'D' }]
    }
  ],
  summaryFields: [],
  rowCheckStages: [
    {
      id: 'first-reading',
      label: '校对 x₁',
      fields: ['x1'],
      hint: '对准第一条亮纹'
    },
    {
      id: 'second-reading',
      label: '校对 x₂ 与 n',
      fields: ['x2', 'n'],
      hint: '移动到另一条亮纹'
    },
    {
      id: 'calculation',
      label: '校对 D 与 Δx',
      fields: ['D', 'deltaX'],
      hint: '用冻结读数计算'
    }
  ]
};

function honestHost(): {
  host: DataWorkspaceHost;
  getLiveSession: ReturnType<typeof createSpecHost>['getLiveSession'];
} {
  const built = createSpecHost(stagedSpec);
  const real = built.host.submitField.bind(built.host);
  built.host.submitField = (input: DataWorkspaceFieldSubmit) => {
    const result = real(input);
    const state =
      input.trialIndex == null
        ? result.session.summary[input.field]
        : result.session.trials[input.trialIndex]?.fields[input.field];
    return {
      session: result.session,
      feedback: state?.feedback ?? { ok: false, message: '无效' }
    };
  };
  return built;
}

function inputOf(
  root: ParentNode,
  field: string,
  trial = '0'
): HTMLInputElement {
  return root.querySelector(
    `input[data-field="${field}"][data-trial="${trial}"]`
  ) as HTMLInputElement;
}

function stageButton(root: ParentNode): HTMLButtonElement {
  return root.querySelector('.data-workspace-check-row') as HTMLButtonElement;
}

function pressEnter(input: HTMLInputElement): void {
  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    })
  );
}

describe('staged data-workspace panel', () => {
  it('renders one stage button and keeps future fields disabled despite gated', () => {
    const { host } = honestHost();
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    const buttons = panel.root.querySelectorAll('.data-workspace-check-row');
    expect(buttons).toHaveLength(1);
    const button = stageButton(panel.root);
    expect(button.textContent).toBe('1/3 校对 x₁');
    expect(button.getAttribute('aria-label')).toBe(
      '校对第 1 组，阶段 1/3：校对 x₁。对准第一条亮纹'
    );
    expect(button.title).toBe('');
    expect(button.disabled).toBe(false);
    expect(inputOf(panel.root, 'x1').disabled).toBe(false);
    for (const field of ['x2', 'n', 'D', 'deltaX']) {
      expect(inputOf(panel.root, field).disabled).toBe(true);
    }
    panel.dispose();
  });

  it('submits only the current stage and unlocks the next field in the same click', () => {
    const { host } = honestHost();
    const submitField = vi.spyOn(host, 'submitField');
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    inputOf(panel.root, 'x1').value = '1.0';
    stageButton(panel.root).click();
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual([
      'x1'
    ]);

    submitField.mockClear();
    expect(inputOf(panel.root, 'x2').disabled).toBe(false);
    expect(inputOf(panel.root, 'n').disabled).toBe(false);
    expect(inputOf(panel.root, 'D').disabled).toBe(true);
    inputOf(panel.root, 'x2').value = '3.0';
    inputOf(panel.root, 'n').value = '2';
    stageButton(panel.root).click();
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual([
      'x2',
      'n'
    ]);
    expect(stageButton(panel.root).textContent).toBe('3/3 校对 D 与 Δx');
    panel.dispose();
  });

  it('stops after x2 succeeds and n fails, then retries only n', () => {
    const { host } = honestHost();
    const submitField = vi.spyOn(host, 'submitField');
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    inputOf(panel.root, 'x1').value = '1';
    stageButton(panel.root).click();
    submitField.mockClear();
    inputOf(panel.root, 'x2').value = '4';
    inputOf(panel.root, 'n').value = 'bad';
    const n = inputOf(panel.root, 'n');
    n.focus = vi.fn();
    stageButton(panel.root).click();
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual([
      'x2',
      'n'
    ]);
    expect(n.focus).toHaveBeenCalled();
    expect(stageButton(panel.root).textContent).toBe('2/3 校对 x₂ 与 n');
    expect(fieldIsOk(getTrialField(host.getSession().trials[0], 'x2'))).toBe(
      true
    );

    submitField.mockClear();
    stageButton(panel.root).click();
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual(['n']);
    panel.dispose();
  });

  it('syncs enabled current and earlier drafts before deriving the stage', () => {
    const { host, getLiveSession } = honestHost();
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    inputOf(panel.root, 'x1').value = '1';
    stageButton(panel.root).click();
    inputOf(panel.root, 'x2').value = '4';
    inputOf(panel.root, 'n').value = 'bad';
    stageButton(panel.root).click();
    expect(fieldIsOk(getTrialField(getLiveSession().trials[0], 'x2'))).toBe(
      true
    );

    inputOf(panel.root, 'x2').value = '9';
    inputOf(panel.root, 'D').value = 'should-not-draft';
    const applyDrafts = vi.spyOn(host, 'applyDrafts');
    const submitField = vi.spyOn(host, 'submitField');
    stageButton(panel.root).click();

    expect(applyDrafts).toHaveBeenCalledTimes(1);
    const drafts = applyDrafts.mock.calls[0]?.[0] ?? [];
    expect(drafts.map((draft) => draft.field)).toEqual(['x1', 'x2', 'n']);
    expect(drafts.find((draft) => draft.field === 'x2')?.raw).toBe('9');
    expect(drafts.some((draft) => draft.field === 'D')).toBe(false);
    expect(submitField.mock.invocationCallOrder[0]).toBeGreaterThan(
      applyDrafts.mock.invocationCallOrder[0] ?? 0
    );
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual([
      'x2',
      'n'
    ]);
    expect(getTrialField(getLiveSession().trials[0], 'D')?.raw).toBeUndefined();
    expect(stageButton(panel.root).textContent).toBe('2/3 校对 x₂ 与 n');
    panel.dispose();
  });

  it('does not harvest disabled future fields when adding a row', () => {
    const { host, getLiveSession } = honestHost();
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    inputOf(panel.root, 'x1').value = '1.2';
    inputOf(panel.root, 'x2').value = 'should-not-draft';
    (
      panel.root.querySelector('.data-workspace-add') as HTMLButtonElement
    ).click();
    expect(getTrialField(getLiveSession().trials[0], 'x1')?.raw).toBe('1.2');
    expect(
      getTrialField(getLiveSession().trials[0], 'x2')?.raw
    ).toBeUndefined();
    panel.dispose();
  });

  it('allows Enter on an earlier field and ignores Enter on a future field', () => {
    const { host } = honestHost();
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    const submitField = vi.spyOn(host, 'submitField');
    const x2 = inputOf(panel.root, 'x2');
    pressEnter(x2);
    expect(submitField).not.toHaveBeenCalled();

    inputOf(panel.root, 'x1').value = '1';
    stageButton(panel.root).click();
    inputOf(panel.root, 'x2').value = '3';
    inputOf(panel.root, 'n').value = '2';
    stageButton(panel.root).click();
    expect(stageButton(panel.root).textContent).toBe('3/3 校对 D 与 Δx');

    submitField.mockClear();
    const x1 = inputOf(panel.root, 'x1');
    expect(x1.disabled).toBe(false);
    x1.value = '1.5';
    pressEnter(x1);
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual([
      'x1'
    ]);
    expect(stageButton(panel.root).textContent).toBe('2/3 校对 x₂ 与 n');
    expect(inputOf(panel.root, 'D').disabled).toBe(true);
    panel.dispose();
  });

  it('disables the button when the row is complete', () => {
    const { host } = honestHost();
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    inputOf(panel.root, 'x1').value = '1';
    stageButton(panel.root).click();
    inputOf(panel.root, 'x2').value = '3';
    inputOf(panel.root, 'n').value = '2';
    stageButton(panel.root).click();
    inputOf(panel.root, 'D').value = '2';
    inputOf(panel.root, 'deltaX').value = '1';
    stageButton(panel.root).click();
    const button = stageButton(panel.root);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('本组已完成');
    expect(button.getAttribute('aria-label')).toBe('第 1 组已完成');
    panel.dispose();
  });

  it('keeps legacy row and transposed batch submit order', () => {
    const { host } = createKinematicsHost();
    const submitField = vi.spyOn(host, 'submitField');
    const applyDrafts = vi.spyOn(host, 'applyDrafts');
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    const button = stageButton(panel.root);
    expect(button.textContent).toBe('校对本组');
    (
      panel.root.querySelector('input[data-field="mass"]') as HTMLInputElement
    ).value = '2';
    (
      panel.root.querySelector('input[data-field="time"]') as HTMLInputElement
    ).value = '1';
    button.click();
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual([
      'mass',
      'time'
    ]);
    expect(applyDrafts).not.toHaveBeenCalled();
    panel.dispose();

    const chart = createKinematicsChartHost();
    const chartSubmit = vi.spyOn(chart.host, 'submitField');
    const chartPanel = createDataWorkspacePanel({
      host: chart.host,
      onChange() {}
    });
    expect(
      [...chartPanel.root.querySelectorAll('.data-workspace-check-row')].map(
        (node) => node.getAttribute('aria-label')
      )
    ).toEqual(['校对质量', '校对时间', '校对速率']);
    (
      chartPanel.root.querySelector(
        '[aria-label="校对质量"]'
      ) as HTMLButtonElement
    ).click();
    expect(chartSubmit.mock.calls.map(([input]) => input.trialIndex)).toEqual([
      0, 1, 2
    ]);
    chartPanel.dispose();
  });
});
