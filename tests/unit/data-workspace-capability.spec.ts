import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataWorkspace } from '../../src/app/layouts/capabilities/data-workspace';
import { createSidebarToggle } from '../../src/app/layouts/capabilities/sidebar-toggle';
import { SplitRightLayout } from '../../src/app/layouts/layouts/split-right/split-right';
import { shouldShowChartAnalysis } from '../../src/platform/data-workspace';
import {
  addSessionTrial,
  applyFieldDrafts,
  createEmptySession,
  removeSessionTrial,
  writeCheckedField,
  type DataWorkspaceDraft,
  type DataWorkspaceHost,
  type DataWorkspaceSpec
} from '../../src/platform/data-workspace';
import { doubleSlitDataWorkspaceSpec } from '../../src/scenes/double-slit/data-task';
import type {
  CapabilityContext,
  LayoutSlots
} from '../../src/app/layouts/types';
import { createDataWorkspacePanel } from '../../src/ui/components/data-workspace-panel';
import { createKinematicsChartHost } from './data-workspace-generic.fixture';

function specWithChart(on: boolean): DataWorkspaceSpec {
  return {
    ...doubleSlitDataWorkspaceSpec,
    chartAnalysis: on,
    enabledSteps: on
      ? [...doubleSlitDataWorkspaceSpec.enabledSteps, 'chartAnalysis']
      : doubleSlitDataWorkspaceSpec.enabledSteps
  };
}

function createHost(
  overrides: Partial<DataWorkspaceSpec> = {}
): DataWorkspaceHost {
  const spec: DataWorkspaceSpec = {
    ...doubleSlitDataWorkspaceSpec,
    ...overrides
  };
  let session = createEmptySession(spec);
  return {
    getSpec: () => spec,
    getEligibility: () => ({ ok: true }),
    getSession: () => session,
    getKnowns: () => [
      { key: 'd', label: '双缝间距 d', value: '0.20 mm' },
      { key: 'L', label: '缝屏距 L', value: '70 cm' }
    ],
    getHint: () => '对准亮纹后读取',
    setActive(active: boolean) {
      session = { ...session, active };
    },
    submitField() {
      return { feedback: { ok: true, message: 'ok' }, session };
    },
    applyDrafts(drafts: readonly DataWorkspaceDraft[]) {
      session = applyFieldDrafts(session, spec, drafts);
      return session;
    },
    resetSession() {
      session = createEmptySession(spec);
    },
    syncInstrument() {},
    addTrial() {
      session = addSessionTrial(session, spec);
      return session;
    },
    removeTrial(rowId: string, confirmed = false) {
      const result = removeSessionTrial(session, spec, rowId, confirmed);
      session = result.session;
      return result;
    }
  };
}

function createCtx(container: HTMLElement): CapabilityContext {
  return {
    container,
    getTheme: () => 'light',
    setTheme() {},
    getMode: () => 'normal',
    setMode() {},
    switchLayout() {},
    getCurrentLayoutId: () => 'split-right',
    getAvailableLayouts: () => [],
    on: () => () => {},
    requestStageRepaint() {}
  };
}

describe('data-workspace capability lifecycle', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    cleanups.splice(0).forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('does not mount on split-right unless the layout config opts in', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const layout = new SplitRightLayout(container);
    expect(layout.capabilities.some((c) => c.id === 'data-workspace')).toBe(
      false
    );
    await layout.mount();
    await layout.unmount();
  });

  it('opts in only when layoutConfig.dataWorkspace is set', async () => {
    const container = document.createElement('div');
    const layout = new SplitRightLayout(container, { dataWorkspace: true });
    expect(layout.capabilities.some((c) => c.id === 'data-workspace')).toBe(
      true
    );
  });

  it('creates a stage entry without transport-bar and cleans listeners', () => {
    const container = document.createElement('div');
    const animation = document.createElement('div');
    container.append(animation);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation
    };
    const def = createDataWorkspace();
    const host = createHost();
    const instance = def.mount(slots, {}, createCtx(container));
    instance.update?.({ host });
    const btn = container.querySelector(
      '.data-workspace-entry'
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(false);
    expect(
      container.querySelector('.teaching-stage-floating-controls')
    ).toBeTruthy();

    btn.click();
    expect(container.classList.contains('is-data-workspace')).toBe(true);
    expect(
      container.querySelector('[data-slot="data-workspace"]')
    ).toBeTruthy();
    expect(container.querySelector('[data-data-workspace-chart]')).toBeNull();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.classList.contains('is-data-workspace-stage-lock')).toBe(
      false
    );
    expect(host.getSession().active).toBe(true);

    const spy = vi.spyOn(host, 'setActive');
    instance.dispose();
    expect(container.querySelector('.data-workspace-entry')).toBeNull();
    expect(container.querySelector('[data-slot="data-workspace"]')).toBeNull();
    expect(container.classList.contains('is-data-workspace')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    btn.click();
    expect(container.querySelector('[data-slot="data-workspace"]')).toBeNull();
  });

  it('does not create a chart mount when chartAnalysis is off', () => {
    const host = createHost();
    expect(shouldShowChartAnalysis(host.getSpec())).toBe(false);
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    expect(panel.chartMount).toBeNull();
    expect(panel.getStep()).toBe('data');
    expect(panel.root.querySelector('[data-data-workspace-chart]')).toBeNull();
    expect(panel.root.querySelector('[role="tablist"]')).toBeNull();
    panel.dispose();
  });

  it('places the graph slot under the table when chartAnalysis is on', () => {
    const container = document.createElement('div');
    const animation = document.createElement('div');
    animation.className = 'teaching-stage-frame';
    const graphSection = document.createElement('div');
    graphSection.className = 'teaching-graph-section';
    const graph = document.createElement('div');
    graph.className = 'graph-slot';
    graphSection.appendChild(graph);
    container.append(animation, graphSection);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation,
      graph
    };
    const host = createHost(specWithChart(true));
    const instance = createDataWorkspace().mount(
      slots,
      {},
      createCtx(container)
    );
    instance.update?.({ host });
    const btn = container.querySelector(
      '.data-workspace-entry'
    ) as HTMLButtonElement;
    btn.click();
    const chart = container.querySelector('[data-data-workspace-chart]');
    expect(chart).toBeTruthy();
    expect(chart?.contains(graphSection)).toBe(false);
    expect(graphSection.parentElement).toBe(container);
    expect(container.classList.contains('is-data-workspace-chart')).toBe(false);
    const table = container.querySelector('.data-workspace-table');
    expect(table).toBeTruthy();
    const panel = container.querySelector('.data-workspace-panel');
    expect(panel?.contains(table!)).toBe(true);
    expect(
      table!.compareDocumentPosition(chart!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    (
      container.querySelector('.graph-analysis-entry') as HTMLButtonElement
    ).click();
    expect(chart?.contains(graphSection)).toBe(false);
    expect(container.classList.contains('is-data-workspace-chart')).toBe(false);

    btn.click();
    expect(container.querySelector('[data-data-workspace-chart]')).toBeNull();
    expect(graphSection.parentElement).toBe(container);
    instance.dispose();
  });

  it('locks the stage and adopts the graph only on the chart step', () => {
    const container = document.createElement('div');
    const animation = document.createElement('div');
    animation.className = 'teaching-stage-frame';
    const graphSection = document.createElement('div');
    graphSection.className = 'teaching-graph-section';
    graphSection.hidden = true;
    graphSection.classList.add('is-collapsed');
    const graph = document.createElement('div');
    graph.className = 'graph-slot';
    graphSection.appendChild(graph);
    container.append(animation, graphSection);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation,
      graph
    };
    const { host } = createKinematicsChartHost();
    for (let i = 0; i < 3; i += 1) {
      host.submitField({ field: 'mass', trialIndex: i, raw: '2' });
      host.submitField({ field: 'time', trialIndex: i, raw: '1' });
      if (i !== 0) {
        host.submitField({ field: 'speed', trialIndex: i, raw: '2' });
      }
    }
    host.submitField({ field: 'meanSpeed', raw: '2' });
    const instance = createDataWorkspace().mount(
      slots,
      {},
      createCtx(container)
    );
    instance.update?.({ host });
    const btn = container.querySelector(
      '.data-workspace-entry'
    ) as HTMLButtonElement;
    btn.click();
    expect(container.classList.contains('is-data-workspace-stage-lock')).toBe(
      true
    );
    expect(container.classList.contains('is-data-workspace-chart')).toBe(false);
    expect(graphSection.parentElement).toBe(container);
    expect(graphSection.hidden).toBe(true);
    (
      container.querySelector('.graph-analysis-entry') as HTMLButtonElement
    ).click();
    const chart = container.querySelector('[data-data-workspace-chart]');
    expect(container.classList.contains('is-data-workspace-chart')).toBe(true);
    expect(chart?.contains(graphSection)).toBe(true);
    expect(graphSection.hidden).toBe(false);
    expect(graphSection.classList.contains('is-collapsed')).toBe(false);
    (
      container.querySelector('.graph-analysis-entry') as HTMLButtonElement
    ).click();
    expect(container.classList.contains('is-data-workspace-chart')).toBe(false);
    expect(graphSection.parentElement).toBe(container);
    expect(graphSection.hidden).toBe(true);
    expect(graphSection.classList.contains('is-collapsed')).toBe(true);
    btn.click();
    expect(container.classList.contains('is-data-workspace-stage-lock')).toBe(
      false
    );
    expect(graphSection.parentElement).toBe(container);
    instance.dispose();
    expect(container.classList.contains('is-data-workspace-stage-lock')).toBe(
      false
    );
  });

  it('clears adopted graph float geometry and restores it on the data step', () => {
    const container = document.createElement('div');
    const animation = document.createElement('div');
    animation.className = 'teaching-stage-frame';
    const graphSection = document.createElement('div');
    graphSection.className = 'lab-float lab-float-graph is-collapsed';
    graphSection.hidden = true;
    graphSection.style.cssText =
      'position:absolute;top:568px;left:788px;width:400px;height:200px;z-index:20';
    const graph = document.createElement('div');
    graph.className = 'graph-slot';
    graphSection.appendChild(graph);
    container.append(animation, graphSection);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation,
      graph
    };
    const { host } = createKinematicsChartHost();
    for (let i = 0; i < 3; i += 1) {
      host.submitField({ field: 'mass', trialIndex: i, raw: '2' });
      host.submitField({ field: 'time', trialIndex: i, raw: '1' });
      if (i !== 0) {
        host.submitField({ field: 'speed', trialIndex: i, raw: '2' });
      }
    }
    host.submitField({ field: 'meanSpeed', raw: '2' });
    const instance = createDataWorkspace().mount(
      slots,
      {},
      createCtx(container)
    );
    instance.update?.({ host });
    (
      container.querySelector('.data-workspace-entry') as HTMLButtonElement
    ).click();
    expect(graphSection.style.top).toBe('568px');
    expect(graphSection.style.left).toBe('788px');
    (
      container.querySelector('.graph-analysis-entry') as HTMLButtonElement
    ).click();
    const chart = container.querySelector('[data-data-workspace-chart]');
    expect(chart?.contains(graphSection)).toBe(true);
    expect(graphSection.style.position).toBe('');
    expect(graphSection.style.top).toBe('');
    expect(graphSection.style.left).toBe('');
    expect(graphSection.style.width).toBe('');
    expect(graphSection.style.height).toBe('');
    expect(graphSection.style.zIndex).toBe('');
    (
      container.querySelector('.graph-analysis-entry') as HTMLButtonElement
    ).click();
    expect(graphSection.parentElement).toBe(container);
    expect(graphSection.style.position).toBe('absolute');
    expect(graphSection.style.top).toBe('568px');
    expect(graphSection.style.left).toBe('788px');
    expect(graphSection.style.width).toBe('400px');
    expect(graphSection.style.height).toBe('200px');
    expect(graphSection.style.zIndex).toBe('20');
    instance.dispose();
  });

  function mountWorkspaceWithSidebar(container: HTMLElement) {
    container.className =
      'layout-master teaching-demo split-right-shell is-data-workspace-host';
    container.style.gridTemplateColumns = 'minmax(280px, 350px) 8px 1fr';
    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    const resizer = document.createElement('div');
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('aria-orientation', 'vertical');
    const animation = document.createElement('div');
    container.append(sidebar, resizer, animation);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation
    };
    const ctx = createCtx(container);
    const toggle = createSidebarToggle().mount(slots, {}, ctx);
    const workspace = createDataWorkspace().mount(slots, {}, ctx);
    const host = createHost();
    workspace.update?.({ host });
    const style = document.createElement('style');
    style.textContent = `
      .layout-master.is-data-workspace .layout-left-panel,
      .layout-master.is-data-workspace .sidebar-toggle-btn {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    cleanups.push(() => {
      style.remove();
      workspace.dispose();
      toggle.dispose();
    });
    return { sidebar, resizer, host, workspace, slots };
  }

  function snapshotSidebar(container: HTMLElement, sidebar: HTMLElement) {
    const btn = container.querySelector(
      '.sidebar-toggle-btn'
    ) as HTMLButtonElement;
    const resizer = container.querySelector(
      '[role="separator"]'
    ) as HTMLElement;
    return {
      grid: container.style.gridTemplateColumns,
      text: btn.textContent,
      expanded: btn.getAttribute('aria-expanded'),
      sidebarHidden: sidebar.getAttribute('aria-hidden'),
      sidebarDisplay: sidebar.style.display,
      resizerDisplay: resizer.style.display
    };
  }

  it('does not mutate sidebar-toggle state; CSS hides the toggle in data mode', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { sidebar } = mountWorkspaceWithSidebar(container);
    const before = snapshotSidebar(container, sidebar);
    expect(before.text).toBe('隐藏控制面板');
    expect(before.expanded).toBe('true');
    const entry = container.querySelector(
      '.data-workspace-entry'
    ) as HTMLButtonElement;
    entry.click();
    expect(container.classList.contains('is-data-workspace')).toBe(true);
    expect(
      container.classList.contains('is-data-workspace-instrument-only')
    ).toBe(true);
    const during = snapshotSidebar(container, sidebar);
    expect(during).toEqual(before);
    expect(
      getComputedStyle(container.querySelector('.sidebar-toggle-btn')!).display
    ).toBe('none');
    entry.click();
    expect(snapshotSidebar(container, sidebar)).toEqual(before);
    expect(
      getComputedStyle(container.querySelector('.sidebar-toggle-btn')!).display
    ).not.toBe('none');
  });

  it('restores a collapsed sidebar after leaving data mode', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { sidebar } = mountWorkspaceWithSidebar(container);
    (
      container.querySelector('.sidebar-toggle-btn') as HTMLButtonElement
    ).click();
    const before = snapshotSidebar(container, sidebar);
    expect(before.text).toBe('显示控制面板');
    expect(before.expanded).toBe('false');
    expect(before.sidebarHidden).toBe('true');
    expect(before.grid).toBe('0px 8px 1fr');
    (
      container.querySelector('.data-workspace-entry') as HTMLButtonElement
    ).click();
    expect(snapshotSidebar(container, sidebar)).toEqual(before);
    (
      container.querySelector('.data-workspace-entry') as HTMLButtonElement
    ).click();
    expect(snapshotSidebar(container, sidebar)).toEqual(before);
  });

  it('wraps the stage for pan/zoom on enter and unwraps on exit', () => {
    const container = document.createElement('div');
    const animation = document.createElement('div');
    const canvas = document.createElement('canvas');
    animation.appendChild(canvas);
    container.appendChild(animation);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation
    };
    const host = createHost({ stageMode: 'full' });
    const instance = createDataWorkspace().mount(
      slots,
      {},
      createCtx(container)
    );
    instance.update?.({ host });
    const btn = container.querySelector(
      '.data-workspace-entry'
    ) as HTMLButtonElement;
    btn.click();
    const viewport = animation.querySelector('.stage-viewport') as HTMLElement;
    expect(viewport).toBeTruthy();
    expect(viewport.contains(canvas)).toBe(true);
    expect(animation.querySelector('button[aria-label="放大"]')).toBeTruthy();
    btn.click();
    expect(animation.querySelector('.stage-viewport')).toBeNull();
    expect(canvas.parentElement).toBe(animation);
    instance.dispose();
  });

  it('skips pan/zoom when the spec opts out', () => {
    const container = document.createElement('div');
    const animation = document.createElement('div');
    animation.appendChild(document.createElement('canvas'));
    container.appendChild(animation);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation
    };
    const host = createHost({ stagePanZoom: false, stageMode: 'full' });
    const instance = createDataWorkspace().mount(
      slots,
      {},
      createCtx(container)
    );
    instance.update?.({ host });
    (
      container.querySelector('.data-workspace-entry') as HTMLButtonElement
    ).click();
    expect(container.classList.contains('is-data-workspace')).toBe(true);
    expect(animation.querySelector('.stage-viewport')).toBeNull();
    instance.dispose();
  });

  it('does not add the instrument-only class when the spec keeps a full stage', () => {
    const container = document.createElement('div');
    const animation = document.createElement('div');
    container.appendChild(animation);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation
    };
    const host = createHost({ stageMode: 'full' });
    const instance = createDataWorkspace().mount(
      slots,
      {},
      createCtx(container)
    );
    instance.update?.({ host });
    (
      container.querySelector('.data-workspace-entry') as HTMLButtonElement
    ).click();
    expect(container.classList.contains('is-data-workspace')).toBe(true);
    expect(
      container.classList.contains('is-data-workspace-instrument-only')
    ).toBe(false);
    instance.dispose();
  });

  it('keeps unsubmitted input when the host updates', () => {
    const container = document.createElement('div');
    const animation = document.createElement('div');
    container.appendChild(animation);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation
    };
    const host = createHost();
    const instance = createDataWorkspace().mount(
      slots,
      {},
      createCtx(container)
    );
    instance.update?.({ host });
    (
      container.querySelector('.data-workspace-entry') as HTMLButtonElement
    ).click();
    const input = container.querySelector(
      '[data-field="x1"][data-trial="0"]'
    ) as HTMLInputElement;
    input.value = '1.234';
    instance.update?.({ host });
    const same = container.querySelector(
      '[data-field="x1"][data-trial="0"]'
    ) as HTMLInputElement;
    expect(same).toBe(input);
    expect(same.value).toBe('1.234');
    instance.dispose();
  });

  it('restores chrome after a second enter and does not duplicate the slot', () => {
    const container = document.createElement('div');
    const animation = document.createElement('div');
    container.appendChild(animation);
    const slots: LayoutSlots = {
      control: document.createElement('div'),
      animation
    };
    const host = createHost();
    const instance = createDataWorkspace().mount(
      slots,
      {},
      createCtx(container)
    );
    instance.update?.({ host });
    const btn = container.querySelector(
      '.data-workspace-entry'
    ) as HTMLButtonElement;
    btn.click();
    btn.click();
    btn.click();
    expect(
      container.querySelectorAll('[data-slot="data-workspace"]').length
    ).toBe(1);
    instance.dispose();
    expect(
      container.querySelectorAll('[data-slot="data-workspace"]').length
    ).toBe(0);
  });
});

describe('data-workspace panel dynamic rows', () => {
  it('defaults to one row, adds from spec max, and confirms filled deletes', () => {
    const host = createHost({
      minRows: 1,
      maxRows: 4,
      initialRows: 1,
      trialCount: 4
    });
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    expect(panel.root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(panel.root.textContent).not.toMatch(/完成三组/);
    expect(panel.root.textContent).toMatch(/完成本组 Δx/);
    const add = panel.root.querySelector(
      '.data-workspace-add'
    ) as HTMLButtonElement;
    expect(add.textContent).toBe('＋ 添加一组');
    add.click();
    add.click();
    expect(panel.root.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(panel.root.textContent).toMatch(/当前 3 组/);
    expect(panel.root.textContent).not.toMatch(/完成本组 Δx/);
    const rows = panel.root.querySelectorAll('tbody tr');
    expect(rows[0]?.querySelector('th')?.textContent).toBe('1');
    expect(rows[1]?.getAttribute('data-row-id')).toBe('row-2');
    const del2 = panel.root.querySelector(
      '[aria-label="删除第 2 组"]'
    ) as HTMLButtonElement;
    expect(del2).toBeTruthy();
    (
      panel.root.querySelector(
        '[data-field="x1"][data-row-id="row-2"]'
      ) as HTMLInputElement
    ).value = '11.2';
    del2.click();
    const dialog = panel.root.querySelector(
      '.data-workspace-confirm'
    ) as HTMLElement;
    expect(dialog.hidden).toBe(false);
    (
      panel.root.querySelector(
        '.data-workspace-confirm .data-workspace-exit'
      ) as HTMLButtonElement
    ).click();
    expect(dialog.hidden).toBe(true);
    expect(panel.root.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(
      (
        panel.root.querySelector(
          '[data-field="x1"][data-row-id="row-2"]'
        ) as HTMLInputElement
      ).value
    ).toBe('11.2');
    del2.click();
    (
      panel.root.querySelector(
        '.data-workspace-confirm .data-workspace-check'
      ) as HTMLButtonElement
    ).click();
    expect(panel.root.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(
      [...panel.root.querySelectorAll('tbody tr')].map((row) =>
        row.getAttribute('data-row-id')
      )
    ).toEqual(['row-1', 'row-3']);
    expect(
      (panel.root.querySelector('[aria-label="删除第 2 组"]') as HTMLElement)
        .closest('tr')
        ?.getAttribute('data-row-id')
    ).toBe('row-3');
    add.click();
    add.click();
    expect(add.disabled).toBe(true);
    expect(add.title).toBe('最多 4 组');
    expect(add.title).not.toMatch(/6/);
    panel.dispose();
  });

  it('keeps the summary visible and re-disables average after adding an empty row', () => {
    const spec = doubleSlitDataWorkspaceSpec;
    let session = writeCheckedField(
      createEmptySession(spec),
      0,
      'deltaX',
      {
        raw: '1.8',
        value: 1.8,
        checked: true,
        stale: false,
        feedback: { ok: true, message: 'ok' }
      },
      spec
    );
    const host = createHost();
    host.getSession = () => session;
    host.addTrial = () => {
      session = addSessionTrial(session, spec);
      return session;
    };
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    const avg = panel.root.querySelector(
      '[aria-label="平均 Δx（mm）"]'
    ) as HTMLInputElement;
    const lambda = panel.root.querySelector(
      '[aria-label="λ = d·平均Δx / L（nm）"]'
    ) as HTMLInputElement;
    expect(avg).toBeTruthy();
    expect(avg.disabled).toBe(false);
    expect(lambda.disabled).toBe(true);
    (
      panel.root.querySelector('.data-workspace-add') as HTMLButtonElement
    ).click();
    expect(panel.root.querySelector('[aria-label="平均 Δx（mm）"]')).toBe(avg);
    expect(avg.disabled).toBe(true);
    expect(lambda.disabled).toBe(true);
    expect(panel.root.textContent).toMatch(/当前 2 组/);
    expect(panel.root.querySelector('.data-workspace-summary')).toBeTruthy();
    panel.dispose();
  });

  it('shows current knowns in the summary and stages average then lambda', () => {
    const spec = doubleSlitDataWorkspaceSpec;
    let session = createEmptySession(spec);
    const submit = vi.fn(() => ({
      feedback: { ok: true, message: 'ok' },
      session
    }));
    const host = createHost();
    host.getSession = () => session;
    host.submitField = submit;
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    const context = panel.root.querySelector(
      '.data-workspace-summary-context'
    ) as HTMLElement;
    expect(context.hidden).toBe(true);
    expect(context.textContent).toBe('');
    expect(
      panel.root.querySelector('.data-workspace-knowns')?.textContent
    ).toMatch(/0\.20 mm/);
    expect(
      panel.root.querySelector('.data-workspace-knowns')?.textContent
    ).toMatch(/70 cm/);

    const avg = panel.root.querySelector(
      '[aria-label="平均 Δx（mm）"]'
    ) as HTMLInputElement;
    const avgBtn = avg
      .closest('.data-workspace-summary-row')
      ?.querySelector('.data-workspace-check') as HTMLButtonElement;
    const lambda = panel.root.querySelector(
      '[aria-label="λ = d·平均Δx / L（nm）"]'
    ) as HTMLInputElement;
    const lambdaBtn = lambda
      .closest('.data-workspace-summary-row')
      ?.querySelector('.data-workspace-check') as HTMLButtonElement;
    expect(avg.disabled).toBe(true);
    expect(avgBtn.disabled).toBe(true);
    expect(lambda.disabled).toBe(true);
    avg.value = '1.8';
    avg.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    avgBtn.click();
    expect(submit).not.toHaveBeenCalled();

    session = writeCheckedField(
      session,
      0,
      'deltaX',
      {
        raw: '1.8',
        value: 1.8,
        checked: true,
        stale: false,
        feedback: { ok: true, message: 'ok' }
      },
      spec
    );
    panel.update();
    expect(avg.disabled).toBe(false);
    expect(lambda.disabled).toBe(true);
    lambda.value = '532';
    lambda.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    lambdaBtn.click();
    expect(submit).not.toHaveBeenCalled();

    session = writeCheckedField(
      session,
      undefined,
      'averageDeltaX',
      {
        raw: '1.8',
        value: 1.8,
        checked: true,
        stale: false,
        feedback: { ok: true, message: 'ok' }
      },
      spec
    );
    panel.update();
    expect(lambda.disabled).toBe(false);
    lambdaBtn.click();
    expect(submit).toHaveBeenCalledTimes(1);

    session = addSessionTrial(session, spec);
    panel.update();
    expect(avg.disabled).toBe(true);
    expect(lambda.disabled).toBe(true);
    expect(context.hidden).toBe(true);
    panel.dispose();
  });

  it('clears average and lambda inputs when session fields are absent', () => {
    const spec = doubleSlitDataWorkspaceSpec;
    let session = writeCheckedField(
      writeCheckedField(
        createEmptySession(spec),
        undefined,
        'averageDeltaX',
        {
          raw: '1.80',
          value: 1.8,
          checked: true,
          stale: false,
          feedback: { ok: true, message: 'ok' }
        },
        spec
      ),
      undefined,
      'lambda',
      {
        raw: '514',
        value: 514,
        checked: true,
        stale: false,
        feedback: { ok: true, message: 'ok' }
      },
      spec
    );
    const host = createHost();
    host.getSession = () => session;
    const panel = createDataWorkspacePanel({
      host,
      onChange() {}
    });
    const avg = panel.root.querySelector(
      '[aria-label="平均 Δx（mm）"]'
    ) as HTMLInputElement;
    const lambda = panel.root.querySelector(
      '[aria-label="λ = d·平均Δx / L（nm）"]'
    ) as HTMLInputElement;
    expect(avg.value).toBe('1.80');
    expect(lambda.value).toBe('514');

    session = createEmptySession(spec);
    panel.update();
    expect(avg.value).toBe('');
    expect(lambda.value).toBe('');
    expect(avg.disabled).toBe(true);
    expect(lambda.disabled).toBe(true);
    panel.dispose();
  });
});
