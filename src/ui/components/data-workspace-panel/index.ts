/**
 * Fillable data-workspace panel. Independent of readout HUD and graph slot.
 * Field ids, labels, units, and result copy come only from DataWorkspaceSpec / host.
 */

import {
  getTrialField,
  isSummaryField,
  resolveRowLimits,
  shouldShowChartAnalysis,
  type DataWorkspaceDraft,
  type DataWorkspaceEligibility,
  type DataWorkspaceHost,
  type DataWorkspaceKnown,
  type DataWorkspaceSession,
  type DataWorkspaceSpec
} from '../../../platform/data-workspace';
import { renderDataWorkspaceReview } from './review';
import { createChartStageController } from './chart-stage';
import { isFixedRowCount } from './field-status';
import { createConfirmDialog } from './confirm-dialog';
import { createTableRenderController } from './table-render';
import { createSummaryRenderController } from './summary-render';

export type DataWorkspacePanelStep = 'data' | 'chartAnalysis';

export type DataWorkspacePanel = {
  root: HTMLElement;
  chartMount: HTMLElement | null;
  getStep(): DataWorkspacePanelStep;
  /** 进入/退出图像分析模式（入口在悬浮工具条，由 capability 门控）。 */
  setChartMode(on: boolean): boolean;
  update(): void;
  dispose(): void;
};

/** 校验结果保持简短；具体判分原因仍可悬停查看并由辅助技术读取。 */
export function createDataWorkspacePanel(options: {
  host: DataWorkspaceHost;
  onChange(): void;
  onStepChange?(step: DataWorkspacePanelStep): void;
}): DataWorkspacePanel {
  const ac = new AbortController();
  const spec = options.host.getSpec();
  const root = document.createElement('section');
  root.className = 'data-workspace-panel';
  root.dataset.slot = 'data-workspace';
  root.setAttribute('aria-label', spec.title);

  const header = document.createElement('header');
  header.className = 'data-workspace-header';
  const title = document.createElement('h2');
  title.className = 'data-workspace-title';
  title.textContent = spec.title;
  header.append(title);

  let currentStep: DataWorkspacePanelStep = 'data';

  const knownsEl = document.createElement('div');
  knownsEl.className = 'data-workspace-knowns';
  const hintEl = document.createElement('p');
  hintEl.className = 'data-workspace-hint';

  const tableWrap = document.createElement('div');
  tableWrap.className = 'data-workspace-table-wrap';
  tableWrap.tabIndex = 0;
  tableWrap.setAttribute('aria-label', '数据表，内容超出时可横向滚动');

  const rowActions = document.createElement('div');
  rowActions.className = 'data-workspace-row-actions';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'data-workspace-check data-workspace-add';
  addBtn.textContent = '＋ 添加一组';
  addBtn.setAttribute('aria-label', '添加一组');
  addBtn.addEventListener(
    'click',
    () => {
      harvestDrafts();
      options.host.addTrial();
      tableRender.invalidateSignature();
      options.onChange();
      update();
    },
    { signal: ac.signal }
  );
  rowActions.appendChild(addBtn);

  const confirmDialog = createConfirmDialog({
    ac,
    harvestDrafts: () => harvestDrafts(),
    removeTrial: (trialId) => {
      options.host.removeTrial(trialId, true);
    },
    onDeleted: () => {
      tableRender.invalidateSignature();
      options.onChange();
      update();
    }
  });
  const confirmEl = confirmDialog.confirmEl;

  const summary = document.createElement('div');
  summary.className = 'data-workspace-summary';

  const result = document.createElement('div');
  result.className = 'data-workspace-result';
  result.hidden = true;

  let reviewEl: HTMLElement | null = null;
  let chartMount: HTMLElement | null = null;
  const chart = shouldShowChartAnalysis(spec)
    ? createChartStageController({ spec, ac })
    : null;
  const chartStage = chart?.chartStage ?? null;
  const splitter = chart?.splitter ?? null;
  if (chart) {
    reviewEl = document.createElement('div');
    reviewEl.className = 'data-workspace-review';
    reviewEl.hidden = true;
    reviewEl.tabIndex = 0;
    reviewEl.setAttribute('aria-label', '已校验数据，内容超出时可滚动');
    chartMount = document.createElement('div');
    chartMount.className = 'data-workspace-chart';
    chartMount.dataset.dataWorkspaceChart = 'true';
    chartMount.setAttribute('data-data-workspace-chart', '');
    chartMount.hidden = true;
  }

  root.append(
    header,
    knownsEl,
    hintEl,
    tableWrap,
    rowActions,
    confirmEl,
    summary,
    result
  );
  if (reviewEl && chartMount && chartStage && splitter) {
    chartStage.append(reviewEl, splitter, chartMount);
    root.insertBefore(chartStage, summary);
  }

  function harvestDrafts(): void {
    const drafts: DataWorkspaceDraft[] = [];
    root
      .querySelectorAll<HTMLInputElement>('.data-workspace-input')
      .forEach((input) => {
        const field = input.dataset.field;
        const rowId = input.dataset.rowId;
        if (!field || !rowId) return;
        const specNow = options.host.getSpec();
        if (isSummaryField(specNow, field)) return;
        if (specNow.rowCheckStages && input.disabled) return;
        const sessionNow = options.host.getSession();
        const trial = sessionNow.trials.find((item) => item.id === rowId);
        const current = getTrialField(trial, field);
        if (input.value === '' && current?.checked) return;
        drafts.push({ rowId, field, raw: input.value });
      });
    if (drafts.length === 0) return;
    options.host.applyDrafts(drafts);
  }

  /**
   * Enter or leave chart analysis. Plotting stays gated in the scene;
   * this switch only changes the layout, after harvesting drafts.
   */
  function setChartMode(on: boolean): boolean {
    const next: DataWorkspacePanelStep = on ? 'chartAnalysis' : 'data';
    if (next === currentStep) return true;
    harvestDrafts();
    currentStep = next;
    options.onStepChange?.(next);
    update();
    return true;
  }

  const tableRender = createTableRenderController({
    host: options.host,
    ac,
    tableWrap,
    onChange: () => options.onChange(),
    update: () => update(),
    harvestDrafts: () => harvestDrafts(),
    requestDelete: (trialId, returnFocus) =>
      confirmDialog.requestDelete(trialId, returnFocus)
  });

  const summaryRender = createSummaryRenderController({
    host: options.host,
    ac,
    summary,
    result,
    statusNodes: tableRender.statusNodes,
    registerStatusNode: (key, node) =>
      tableRender.registerStatusNode(key, node),
    fieldKey: (field, trialIndex) => tableRender.fieldKey(field, trialIndex),
    bindCheck: (input, field, trialIndex) =>
      tableRender.bindCheck(input, field, trialIndex),
    setFieldEnabled: (input, enabled, btn) =>
      tableRender.setFieldEnabled(input, enabled, btn),
    getCurrentStep: () => currentStep,
    onChange: () => options.onChange(),
    update: () => update()
  });

  function renderReview(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    if (!reviewEl) return;
    renderDataWorkspaceReview(reviewEl, session, specNow);
  }

  function syncAddButton(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    const { maxRows } = resolveRowLimits(specNow);
    const atMax = session.trials.length >= maxRows;
    addBtn.disabled = atMax;
    addBtn.setAttribute('aria-disabled', String(atMax));
    addBtn.title = atMax ? `最多 ${maxRows} 组` : '添加一组测量';
  }

  function renderKnowns(knowns: readonly DataWorkspaceKnown[]): void {
    summaryRender.renderKnownsInto(knownsEl, knowns);
  }

  function applyStepVisibility(specNow: DataWorkspaceSpec): void {
    const chartOn = shouldShowChartAnalysis(specNow);
    const onChart = chartOn && currentStep === 'chartAnalysis';
    knownsEl.hidden = onChart;
    // 图像分析环节只有两个组成区域：上方只读表、下方绘图区。
    if (onChart) hintEl.hidden = true;
    tableWrap.hidden = onChart;
    rowActions.hidden = onChart || isFixedRowCount(specNow);
    if (onChart) confirmEl.hidden = true;
    if (reviewEl) reviewEl.hidden = !onChart;
    if (chartMount) chartMount.hidden = !onChart;
    if (splitter) {
      splitter.hidden = !onChart;
      splitter.classList.toggle('is-hidden', !onChart);
    }
  }

  function update(): void {
    const session = options.host.getSession();
    const specNow = options.host.getSpec();
    const eligibility: DataWorkspaceEligibility = options.host.getEligibility();
    const knowns = options.host.getKnowns();
    const hint = eligibility.ok ? options.host.getHint() : eligibility.reason;
    renderKnowns(knowns);
    hintEl.textContent = hint;
    hintEl.hidden = hint === '';
    applyStepVisibility(specNow);
    syncAddButton(session, specNow);
    if (
      tableRender.getTableSignature() !== tableRender.rowsSignature(session)
    ) {
      tableRender.renderTable(session, specNow);
    } else {
      tableRender.patchTableCells(session, specNow);
    }
    if (reviewEl && currentStep === 'chartAnalysis') {
      renderReview(session, specNow);
    }
    summaryRender.syncSummary(session, specNow, knowns);
    summaryRender.renderResult(session, specNow);
    chart?.syncContentSeparator();
  }

  update();

  return {
    root,
    chartMount,
    getStep: () => currentStep,
    setChartMode,
    update,
    dispose() {
      harvestDrafts();
      ac.abort();
      root.replaceChildren();
      root.remove();
    }
  };
}
