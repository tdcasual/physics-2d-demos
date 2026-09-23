/**
 * Fillable data-workspace panel. Independent of readout HUD and graph slot.
 * Field ids, labels, units, and result copy come only from DataWorkspaceSpec / host.
 */

import {
  chartStepReady,
  formatReadinessHint,
  formatResultText,
  getSummaryField,
  getTrialField,
  isFieldReady,
  isSummaryField,
  resolveRowLimits,
  shouldShowChartAnalysis,
  summaryContextItems,
  trialLabel,
  type DataWorkspaceDraft,
  type DataWorkspaceEligibility,
  type DataWorkspaceFieldId,
  type DataWorkspaceFieldSpec,
  type DataWorkspaceHost,
  type DataWorkspaceKnown,
  type DataWorkspaceSession,
  type DataWorkspaceSpec,
  type FieldCheckState
} from '../../platform/data-workspace';
import { renderDataWorkspaceReview } from './data-workspace-panel/review';

export type DataWorkspacePanelStep = 'data' | 'chartAnalysis';

export type DataWorkspacePanel = {
  root: HTMLElement;
  chartMount: HTMLElement | null;
  getStep(): DataWorkspacePanelStep;
  /** 进入/退出图像分析模式（入口在悬浮工具条，由 capability 门控）。 */
  setChartMode(on: boolean): void;
  update(): void;
  dispose(): void;
};

function fieldStatus(field: FieldCheckState | undefined): string {
  if (!field) return '';
  if (field.stale) return field.feedback?.message ?? '请重新校对';
  return field.feedback?.message ?? '';
}

function statusClass(field: FieldCheckState | undefined): string {
  if (!field?.feedback) return '';
  if (field.stale) return 'is-stale';
  return field.feedback.ok ? 'is-ok' : 'is-error';
}

function headerLabel(field: DataWorkspaceFieldSpec): string {
  return field.unit ? `${field.label} / ${field.unit}` : field.label;
}

function isFieldsOrientation(spec: DataWorkspaceSpec): boolean {
  return spec.tableOrientation === 'fields';
}

function isFixedRowCount(spec: DataWorkspaceSpec): boolean {
  const { minRows, maxRows } = resolveRowLimits(spec);
  return minRows === maxRows;
}

function isNaPlaceholder(field: FieldCheckState | undefined): boolean {
  return Boolean(field?.checked && field.raw === '—' && !field.stale);
}

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
      tableSignature = '';
      options.onChange();
      update();
    },
    { signal: ac.signal }
  );
  rowActions.appendChild(addBtn);

  const confirmEl = document.createElement('div');
  confirmEl.className = 'data-workspace-confirm';
  confirmEl.hidden = true;
  confirmEl.setAttribute('role', 'dialog');
  confirmEl.setAttribute('aria-label', '确认删除该组');
  const confirmText = document.createElement('p');
  confirmText.textContent = '该组已有数据，确定删除？';
  const confirmOk = document.createElement('button');
  confirmOk.type = 'button';
  confirmOk.className = 'data-workspace-check';
  confirmOk.textContent = '删除';
  const confirmCancel = document.createElement('button');
  confirmCancel.type = 'button';
  confirmCancel.className = 'data-workspace-exit';
  confirmCancel.textContent = '取消';
  confirmEl.append(confirmText, confirmCancel, confirmOk);
  let pendingDeleteId: string | null = null;

  confirmCancel.addEventListener(
    'click',
    () => {
      pendingDeleteId = null;
      confirmEl.hidden = true;
    },
    { signal: ac.signal }
  );
  confirmOk.addEventListener(
    'click',
    () => {
      if (!pendingDeleteId) return;
      harvestDrafts();
      options.host.removeTrial(pendingDeleteId, true);
      pendingDeleteId = null;
      confirmEl.hidden = true;
      tableSignature = '';
      options.onChange();
      update();
    },
    { signal: ac.signal }
  );

  const summary = document.createElement('div');
  summary.className = 'data-workspace-summary';

  const result = document.createElement('div');
  result.className = 'data-workspace-result';
  result.hidden = true;

  let reviewEl: HTMLElement | null = null;
  let chartMount: HTMLElement | null = null;
  if (shouldShowChartAnalysis(spec)) {
    reviewEl = document.createElement('div');
    reviewEl.className = 'data-workspace-review';
    reviewEl.hidden = true;
    reviewEl.setAttribute('aria-label', '已校验数据');
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
  if (reviewEl && chartMount) {
    root.insertBefore(reviewEl, summary);
    root.insertBefore(chartMount, summary);
  }

  function bindCheck(
    input: HTMLInputElement,
    field: DataWorkspaceFieldId,
    trialIndex?: number
  ): void {
    const run = () => {
      if (input.disabled) return;
      options.host.submitField({
        field,
        trialIndex,
        raw: input.value
      });
      options.onChange();
      update();
    };
    input.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          run();
        }
      },
      { signal: ac.signal }
    );
  }

  function harvestDrafts(): void {
    const drafts: DataWorkspaceDraft[] = [];
    root
      .querySelectorAll<HTMLInputElement>('.data-workspace-input')
      .forEach((input) => {
        const field = input.dataset.field;
        const rowId = input.dataset.rowId;
        if (!field || !rowId) return;
        if (isSummaryField(options.host.getSpec(), field)) return;
        drafts.push({ rowId, field, raw: input.value });
      });
    if (drafts.length === 0) return;
    options.host.applyDrafts(drafts);
  }

  /**
   * 进入/退出图像分析模式。ready 门控由 capability 的悬浮入口按钮负责；
   * 这里保留一道防御：未就绪时拒绝进入。
   */
  function setChartMode(on: boolean): void {
    const specNow = options.host.getSpec();
    const next: DataWorkspacePanelStep = on ? 'chartAnalysis' : 'data';
    if (next === currentStep) return;
    if (on && !chartStepReady(options.host.getSession(), specNow)) return;
    harvestDrafts();
    currentStep = next;
    options.onStepChange?.(next);
    update();
  }

  function appendFieldControl(
    cell: HTMLElement,
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec,
    def: DataWorkspaceFieldSpec,
    trialIndex: number
  ): void {
    const trial = session.trials[trialIndex] ?? {
      id: `row-${trialIndex + 1}`,
      fields: {}
    };
    const current = getTrialField(trial, def.id);
    cell.dataset.label = headerLabel(def);
    if (isNaPlaceholder(current)) {
      cell.classList.add('data-workspace-na');
      cell.dataset.field = def.id;
      cell.dataset.trial = String(trialIndex);
      cell.dataset.rowId = trial.id;
      cell.textContent = '—';
      cell.setAttribute('aria-disabled', 'true');
      if (current?.feedback?.message) cell.title = current.feedback.message;
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'data-workspace-field';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = def.inputMode === 'numeric' ? 'numeric' : 'decimal';
    if (def.inputMode === 'text') input.inputMode = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.className = 'data-workspace-input';
    input.dataset.field = def.id;
    input.dataset.trial = String(trialIndex);
    input.dataset.rowId = trial.id;
    input.setAttribute(
      'aria-label',
      `第 ${trialLabel(specNow, trialIndex)} 组 ${def.label}${def.unit ? `（${def.unit}）` : ''}`
    );
    input.value = current?.raw ?? '';
    bindCheck(input, def.id, trialIndex);

    const status = document.createElement('span');
    status.className = `data-workspace-status ${statusClass(current)}`;
    status.textContent = fieldStatus(current);
    const key = fieldKey(def.id, trialIndex);
    statusNodes.set(key, status);
    rowInputs.set(key, { input });
    const ready = isFieldReady(session, specNow, def.id, trialIndex);
    setFieldEnabled(input, ready);
    if (def.gated && !ready) {
      status.className = 'data-workspace-status data-workspace-summary-note';
      status.textContent = formatReadinessHint(def, session.trials.length);
    }

    wrap.append(input, status);
    cell.appendChild(wrap);
  }

  function renderTrialRow(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec,
    trialIndex: number
  ): HTMLTableRowElement {
    const trial = session.trials[trialIndex] ?? {
      id: `row-${trialIndex + 1}`,
      fields: {}
    };
    const tr = document.createElement('tr');
    tr.dataset.rowId = trial.id;
    const indexCell = document.createElement('th');
    indexCell.scope = 'row';
    indexCell.textContent = trialLabel(specNow, trialIndex);
    tr.appendChild(indexCell);

    for (const def of specNow.rowFields) {
      const cell = document.createElement('td');
      appendFieldControl(cell, session, specNow, def, trialIndex);
      tr.appendChild(cell);
    }

    const delCell = document.createElement('td');
    delCell.className = 'data-workspace-actions';
    delCell.dataset.label = '操作';
    const checkRowBtn = document.createElement('button');
    checkRowBtn.type = 'button';
    checkRowBtn.className = 'data-workspace-check data-workspace-check-row';
    checkRowBtn.textContent = '校对本组';
    checkRowBtn.setAttribute(
      'aria-label',
      `校对第 ${trialLabel(specNow, trialIndex)} 组`
    );
    checkRowBtn.addEventListener(
      'click',
      () => {
        const fields = specNow.rowFields
          .map((def) => ({
            def,
            input: rowInputs.get(fieldKey(def.id, trialIndex))?.input ?? null
          }))
          .filter(
            (
              item
            ): item is {
              def: DataWorkspaceFieldSpec;
              input: HTMLInputElement;
            } => item.input !== null && !item.input.disabled
          );
        if (fields.length === 0) return;
        for (const { def, input } of fields) {
          options.host.submitField({
            field: def.id,
            trialIndex,
            raw: input.value
          });
        }
        options.onChange();
        update();
      },
      { signal: ac.signal }
    );
    rowChecks.set(trial.id, checkRowBtn);
    delCell.append(checkRowBtn);

    if (!isFixedRowCount(specNow)) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'data-workspace-exit data-workspace-remove';
      delBtn.textContent = '删除';
      delBtn.setAttribute(
        'aria-label',
        `删除第 ${trialLabel(specNow, trialIndex)} 组`
      );
      const { minRows } = resolveRowLimits(specNow);
      if (session.trials.length <= minRows) {
        delBtn.disabled = true;
        delBtn.setAttribute('aria-disabled', 'true');
        delBtn.title = '至少保留一组';
      }
      delBtn.addEventListener(
        'click',
        () => {
          harvestDrafts();
          const outcome = options.host.removeTrial(trial.id, false);
          if (outcome.needsConfirm) {
            pendingDeleteId = trial.id;
            confirmEl.hidden = false;
            confirmOk.focus();
            return;
          }
          tableSignature = '';
          options.onChange();
          update();
        },
        { signal: ac.signal }
      );
      delCell.append(delBtn);
    }

    tr.appendChild(delCell);
    syncRowCheckButton(checkRowBtn, specNow, trialIndex);
    return tr;
  }

  function renderFieldRow(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec,
    def: DataWorkspaceFieldSpec
  ): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.dataset.field = def.id;
    const labelCell = document.createElement('th');
    labelCell.scope = 'row';
    labelCell.textContent = headerLabel(def);
    tr.appendChild(labelCell);

    for (
      let trialIndex = 0;
      trialIndex < session.trials.length;
      trialIndex += 1
    ) {
      const cell = document.createElement('td');
      appendFieldControl(cell, session, specNow, def, trialIndex);
      tr.appendChild(cell);
    }

    const checkCell = document.createElement('td');
    checkCell.className = 'data-workspace-actions';
    checkCell.dataset.label = '操作';
    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'data-workspace-check data-workspace-check-row';
    checkBtn.textContent = '校对';
    checkBtn.setAttribute('aria-label', `校对${def.label}`);
    checkBtn.addEventListener(
      'click',
      () => {
        const fields = options.host
          .getSession()
          .trials.map((_, trialIndex) => ({
            trialIndex,
            input: rowInputs.get(fieldKey(def.id, trialIndex))?.input ?? null
          }))
          .filter(
            (item): item is { trialIndex: number; input: HTMLInputElement } =>
              item.input !== null && !item.input.disabled
          );
        if (fields.length === 0) return;
        for (const { trialIndex, input } of fields) {
          options.host.submitField({
            field: def.id,
            trialIndex,
            raw: input.value
          });
        }
        options.onChange();
        update();
      },
      { signal: ac.signal }
    );
    fieldChecks.set(def.id, checkBtn);
    checkCell.appendChild(checkBtn);
    tr.appendChild(checkCell);
    syncFieldCheckButton(checkBtn, def.id);
    return tr;
  }

  const statusNodes = new Map<string, HTMLSpanElement>();
  const rowInputs = new Map<
    string,
    {
      input: HTMLInputElement;
    }
  >();
  const rowChecks = new Map<string, HTMLButtonElement>();
  const fieldChecks = new Map<string, HTMLButtonElement>();
  const summaryInputs = new Map<
    string,
    { input: HTMLInputElement; btn: HTMLButtonElement; row: HTMLElement }
  >();
  let tableSignature = '';
  let summaryBuilt = false;
  let contextEl: HTMLDivElement | null = null;

  function setFieldEnabled(
    input: HTMLInputElement | null,
    enabled: boolean,
    btn: HTMLButtonElement | null = null
  ): void {
    if (input) {
      input.disabled = !enabled;
      input.setAttribute('aria-disabled', String(!enabled));
    }
    if (btn) {
      btn.disabled = !enabled;
      btn.setAttribute('aria-disabled', String(!enabled));
    }
  }

  function syncRowCheckButton(
    button: HTMLButtonElement,
    specNow: DataWorkspaceSpec,
    trialIndex: number
  ): void {
    const allDisabled = specNow.rowFields.every((def) => {
      const input = rowInputs.get(fieldKey(def.id, trialIndex))?.input;
      return !input || input.disabled;
    });
    button.disabled = allDisabled;
    button.setAttribute('aria-disabled', String(allDisabled));
  }

  function syncFieldCheckButton(
    button: HTMLButtonElement,
    fieldId: string
  ): void {
    const session = options.host.getSession();
    const allDisabled = session.trials.every((_, trialIndex) => {
      const input = rowInputs.get(fieldKey(fieldId, trialIndex))?.input;
      return !input || input.disabled;
    });
    button.disabled = allDisabled;
    button.setAttribute('aria-disabled', String(allDisabled));
  }

  function syncInputValue(
    input: HTMLInputElement | null,
    state: FieldCheckState | undefined
  ): void {
    if (!input || document.activeElement === input) return;
    input.value = state?.raw ?? '';
  }

  function fieldKey(field: string, trialIndex?: number): string {
    return trialIndex == null ? field : `${trialIndex}:${field}`;
  }

  function rowsSignature(session: DataWorkspaceSession): string {
    return session.trials.map((trial) => trial.id).join('|');
  }

  function appendHeadCell(row: HTMLTableRowElement, label: string): void {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    row.appendChild(th);
  }

  function renderTable(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    rowInputs.clear();
    rowChecks.clear();
    fieldChecks.clear();
    tableWrap.replaceChildren();
    for (const key of [...statusNodes.keys()]) {
      if (!specNow.summaryFields.some((field) => field.id === key)) {
        statusNodes.delete(key);
      }
    }
    const table = document.createElement('table');
    table.className = 'data-workspace-table';
    table.dataset.orientation = isFieldsOrientation(specNow)
      ? 'fields'
      : 'trials';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const tbody = document.createElement('tbody');
    if (isFieldsOrientation(specNow)) {
      appendHeadCell(headRow, '');
      for (let i = 0; i < session.trials.length; i += 1) {
        appendHeadCell(headRow, trialLabel(specNow, i));
      }
      appendHeadCell(headRow, '');
      for (const def of specNow.rowFields) {
        tbody.appendChild(renderFieldRow(session, specNow, def));
      }
    } else {
      const cols = ['组', ...specNow.rowFields.map(headerLabel), ''];
      for (const label of cols) appendHeadCell(headRow, label);
      for (let i = 0; i < session.trials.length; i += 1) {
        tbody.appendChild(renderTrialRow(session, specNow, i));
      }
    }
    thead.appendChild(headRow);
    table.append(thead, tbody);
    tableWrap.appendChild(table);
    tableSignature = rowsSignature(session);
  }

  function renderReview(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    if (!reviewEl) return;
    renderDataWorkspaceReview(reviewEl, session, specNow);
  }

  function ensureSummary(specNow: DataWorkspaceSpec): void {
    if (summaryBuilt) return;
    summary.replaceChildren();
    contextEl = document.createElement('div');
    contextEl.className =
      'data-workspace-knowns data-workspace-summary-context';
    contextEl.hidden = true;
    summary.appendChild(contextEl);

    for (const def of specNow.summaryFields) {
      const row = document.createElement('div');
      row.className =
        def.id === specNow.result?.field
          ? 'data-workspace-summary-row data-workspace-result-field'
          : 'data-workspace-summary-row';
      row.dataset.step = def.step ?? 'data';
      const lab = document.createElement('label');
      lab.textContent = headerLabel(def);
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = def.inputMode === 'numeric' ? 'numeric' : 'decimal';
      input.className = 'data-workspace-input';
      input.dataset.field = def.id;
      input.setAttribute(
        'aria-label',
        `${def.label}${def.unit ? `（${def.unit}）` : ''}`
      );
      bindCheck(input, def.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'data-workspace-check';
      btn.textContent = '校对';
      btn.addEventListener(
        'click',
        () => {
          if (btn.disabled || input.disabled) return;
          options.host.submitField({ field: def.id, raw: input.value });
          options.onChange();
          update();
        },
        { signal: ac.signal }
      );
      const status = document.createElement('span');
      status.className = 'data-workspace-status';
      statusNodes.set(fieldKey(def.id), status);
      row.append(lab, input, btn, status);
      summary.appendChild(row);
      summaryInputs.set(def.id, { input, btn, row });
    }
    summaryBuilt = true;
  }

  function syncSummary(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec,
    knowns: readonly DataWorkspaceKnown[]
  ): void {
    ensureSummary(specNow);
    const knownKeys = new Set(knowns.map((known) => known.key));
    const contextItems = summaryContextItems(
      knowns,
      specNow.summary?.contextKnownKeys
    ).filter((known) => !knownKeys.has(known.key));
    if (contextEl) {
      contextEl.hidden = contextItems.length === 0;
      renderKnownsInto(contextEl, contextItems);
    }

    const chartMode = shouldShowChartAnalysis(specNow);
    for (const def of specNow.summaryFields) {
      const nodes = summaryInputs.get(def.id);
      if (nodes) {
        const onChartStep = def.step === 'chartAnalysis';
        nodes.row.hidden = chartMode
          ? currentStep === 'chartAnalysis'
            ? !onChartStep
            : onChartStep
          : false;
      }
      const ready = isFieldReady(session, specNow, def.id);
      setFieldEnabled(nodes?.input ?? null, ready, nodes?.btn ?? null);
      const state = getSummaryField(session, def.id);
      syncInputValue(nodes?.input ?? null, state);
      const status = statusNodes.get(def.id);
      if (!status) continue;
      if (def.gated && !ready) {
        status.className =
          def === specNow.summaryFields[0]
            ? 'data-workspace-status data-workspace-summary-note'
            : 'data-workspace-status';
        status.textContent = formatReadinessHint(def, session.trials.length);
      } else {
        status.className = `data-workspace-status ${statusClass(state)}`;
        status.textContent = fieldStatus(state);
      }
    }
  }

  function renderResult(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    if (shouldShowChartAnalysis(specNow) && currentStep !== 'chartAnalysis') {
      result.hidden = true;
      result.replaceChildren();
      return;
    }
    const custom = options.host.renderResult?.(session) ?? null;
    const text = custom ?? formatResultText(session, specNow);
    if (!text) {
      result.hidden = true;
      result.replaceChildren();
      return;
    }
    result.hidden = false;
    result.replaceChildren();
    const p = document.createElement('p');
    p.textContent = text;
    result.appendChild(p);
  }

  function patchStatus(key: string, field: FieldCheckState | undefined): void {
    const node = statusNodes.get(key);
    if (!node) return;
    node.className = `data-workspace-status ${statusClass(field)}`;
    node.textContent = fieldStatus(field);
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

  function renderKnownsInto(
    container: HTMLElement,
    knowns: readonly DataWorkspaceKnown[]
  ): void {
    const chips = knowns.map((known) => {
      const chip = document.createElement('span');
      chip.className = 'data-workspace-known-chip';
      const label = document.createElement('span');
      label.className = 'data-workspace-known-label';
      label.textContent = `${known.label} `;
      const value = document.createElement('strong');
      value.className = 'data-workspace-known-value';
      value.textContent = known.value;
      chip.append(label, value);
      return chip;
    });
    container.replaceChildren(...chips);
  }

  function renderKnowns(knowns: readonly DataWorkspaceKnown[]): void {
    renderKnownsInto(knownsEl, knowns);
  }

  function applyStepVisibility(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    const chartOn = shouldShowChartAnalysis(specNow);
    const onChart = chartOn && currentStep === 'chartAnalysis';
    knownsEl.hidden = onChart;
    tableWrap.hidden = onChart;
    rowActions.hidden = onChart || isFixedRowCount(specNow);
    if (onChart) confirmEl.hidden = true;
    if (reviewEl) reviewEl.hidden = !onChart;
    if (chartMount) chartMount.hidden = !onChart;
  }

  function patchTableCells(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    session.trials.forEach((trial, index) => {
      for (const def of specNow.rowFields) {
        const key = fieldKey(def.id, index);
        const nodes = rowInputs.get(key);
        const ready = isFieldReady(session, specNow, def.id, index);
        setFieldEnabled(nodes?.input ?? null, ready);
        const status = statusNodes.get(key);
        if (def.gated && !ready && status) {
          status.className =
            'data-workspace-status data-workspace-summary-note';
          status.textContent = formatReadinessHint(def, session.trials.length);
        } else {
          patchStatus(key, getTrialField(trial, def.id));
        }
      }
      const rowCheck = rowChecks.get(trial.id);
      if (rowCheck) syncRowCheckButton(rowCheck, specNow, index);
    });
    for (const def of specNow.rowFields) {
      const fieldCheck = fieldChecks.get(def.id);
      if (fieldCheck) syncFieldCheckButton(fieldCheck, def.id);
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
    applyStepVisibility(session, specNow);
    syncAddButton(session, specNow);
    if (tableSignature !== rowsSignature(session)) {
      renderTable(session, specNow);
    } else {
      patchTableCells(session, specNow);
    }
    if (reviewEl && currentStep === 'chartAnalysis') {
      renderReview(session, specNow);
    }
    syncSummary(session, specNow, knowns);
    renderResult(session, specNow);
  }

  update();

  return {
    root,
    chartMount,
    getStep: () => currentStep,
    setChartMode,
    update,
    dispose() {
      ac.abort();
      root.replaceChildren();
      root.remove();
    }
  };
}
