/**
 * Fillable data-workspace panel. Independent of readout HUD and graph slot.
 * Field ids, labels, units, and result copy come only from DataWorkspaceSpec / host.
 */

import {
  formatReadinessHint,
  formatResultText,
  getSummaryField,
  getTrialField,
  isFieldReady,
  isSummaryField,
  resolveRowLimits,
  shouldShowChartAnalysis,
  summaryContextItems,
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

export type DataWorkspacePanel = {
  root: HTMLElement;
  chartMount: HTMLElement | null;
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

export function createDataWorkspacePanel(options: {
  host: DataWorkspaceHost;
  onExit(): void;
  onChange(): void;
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
  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'data-workspace-exit data-workspace-leave';
  exitBtn.textContent = '返回实验';
  exitBtn.addEventListener('click', () => options.onExit(), {
    signal: ac.signal
  });
  header.append(title, exitBtn);

  const knownsEl = document.createElement('p');
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

  let chartMount: HTMLElement | null = null;
  if (shouldShowChartAnalysis(spec)) {
    chartMount = document.createElement('div');
    chartMount.className = 'data-workspace-chart';
    chartMount.dataset.dataWorkspaceChart = 'true';
    chartMount.setAttribute('data-data-workspace-chart', '');
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
  if (chartMount) root.appendChild(chartMount);

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
    indexCell.textContent = String(trialIndex + 1);
    tr.appendChild(indexCell);

    for (const def of specNow.rowFields) {
      const cell = document.createElement('td');
      cell.dataset.label = headerLabel(def);
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
        `第 ${trialIndex + 1} 组 ${def.label}${def.unit ? `（${def.unit}）` : ''}`
      );
      const current = getTrialField(trial, def.id);
      input.value = current?.raw ?? '';
      bindCheck(input, def.id, trialIndex);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'data-workspace-check';
      btn.textContent = '校对';
      btn.setAttribute(
        'aria-label',
        `校对第 ${trialIndex + 1} 组 ${def.label}`
      );
      btn.addEventListener(
        'click',
        () => {
          if (btn.disabled || input.disabled) return;
          options.host.submitField({
            field: def.id,
            trialIndex,
            raw: input.value
          });
          options.onChange();
          update();
        },
        { signal: ac.signal }
      );

      const status = document.createElement('span');
      status.className = `data-workspace-status ${statusClass(current)}`;
      status.textContent = fieldStatus(current);
      const key = fieldKey(def.id, trialIndex);
      statusNodes.set(key, status);
      rowInputs.set(key, { input, btn, def });
      const ready = isFieldReady(session, specNow, def.id, trialIndex);
      setFieldEnabled(input, btn, ready);
      if (def.gated && !ready) {
        status.className = 'data-workspace-status data-workspace-summary-note';
        status.textContent = formatReadinessHint(def, session.trials.length);
      }

      wrap.append(input, btn, status);
      cell.appendChild(wrap);
      tr.appendChild(cell);
    }

    const delCell = document.createElement('td');
    delCell.dataset.label = '删除';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'data-workspace-exit data-workspace-remove';
    delBtn.textContent = '删除';
    delBtn.setAttribute('aria-label', `删除第 ${trialIndex + 1} 组`);
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
    delCell.appendChild(delBtn);
    tr.appendChild(delCell);
    return tr;
  }

  const statusNodes = new Map<string, HTMLSpanElement>();
  const rowInputs = new Map<
    string,
    {
      input: HTMLInputElement;
      btn: HTMLButtonElement;
      def: DataWorkspaceFieldSpec;
    }
  >();
  const summaryInputs = new Map<
    string,
    { input: HTMLInputElement; btn: HTMLButtonElement }
  >();
  let tableSignature = '';
  let summaryBuilt = false;
  let contextEl: HTMLParagraphElement | null = null;

  function setFieldEnabled(
    input: HTMLInputElement | null,
    btn: HTMLButtonElement | null,
    enabled: boolean
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

  function renderTable(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    rowInputs.clear();
    tableWrap.replaceChildren();
    for (const key of [...statusNodes.keys()]) {
      if (!specNow.summaryFields.some((field) => field.id === key)) {
        statusNodes.delete(key);
      }
    }
    const table = document.createElement('table');
    table.className = 'data-workspace-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const cols = ['组', ...specNow.rowFields.map(headerLabel), ''];
    for (const label of cols) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    const tbody = document.createElement('tbody');
    for (let i = 0; i < session.trials.length; i += 1) {
      tbody.appendChild(renderTrialRow(session, specNow, i));
    }
    table.append(thead, tbody);
    tableWrap.appendChild(table);
    tableSignature = rowsSignature(session);
  }

  function ensureSummary(specNow: DataWorkspaceSpec): void {
    if (summaryBuilt) return;
    summary.replaceChildren();
    contextEl = document.createElement('p');
    contextEl.className =
      'data-workspace-knowns data-workspace-summary-context';
    contextEl.hidden = true;
    summary.appendChild(contextEl);

    for (const def of specNow.summaryFields) {
      const row = document.createElement('div');
      row.className = 'data-workspace-summary-row';
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
      summaryInputs.set(def.id, { input, btn });
    }
    summaryBuilt = true;
  }

  function syncSummary(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec,
    knowns: readonly DataWorkspaceKnown[]
  ): void {
    ensureSummary(specNow);
    const contextItems = summaryContextItems(
      knowns,
      specNow.summary?.contextKnownKeys
    );
    if (contextEl) {
      contextEl.hidden = contextItems.length === 0;
      contextEl.textContent = contextItems
        .map((item) => `${item.label} ${item.value}`)
        .join('　');
    }

    for (const def of specNow.summaryFields) {
      const nodes = summaryInputs.get(def.id);
      const ready = isFieldReady(session, specNow, def.id);
      setFieldEnabled(nodes?.input ?? null, nodes?.btn ?? null, ready);
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

  function update(): void {
    const session = options.host.getSession();
    const specNow = options.host.getSpec();
    const eligibility: DataWorkspaceEligibility = options.host.getEligibility();
    knownsEl.textContent = options.host
      .getKnowns()
      .map((item) => `${item.label} ${item.value}`)
      .join('　');
    hintEl.textContent = eligibility.ok
      ? options.host.getHint()
      : eligibility.reason;
    syncAddButton(session, specNow);
    if (tableSignature !== rowsSignature(session)) {
      renderTable(session, specNow);
    } else {
      session.trials.forEach((trial, index) => {
        for (const def of specNow.rowFields) {
          const key = fieldKey(def.id, index);
          const nodes = rowInputs.get(key);
          const ready = isFieldReady(session, specNow, def.id, index);
          setFieldEnabled(nodes?.input ?? null, nodes?.btn ?? null, ready);
          const status = statusNodes.get(key);
          if (def.gated && !ready && status) {
            status.className =
              'data-workspace-status data-workspace-summary-note';
            status.textContent = formatReadinessHint(
              def,
              session.trials.length
            );
          } else {
            patchStatus(key, getTrialField(trial, def.id));
          }
        }
      });
    }
    syncSummary(session, specNow, options.host.getKnowns());
    renderResult(session, specNow);
  }

  update();

  return {
    root,
    chartMount,
    update,
    dispose() {
      ac.abort();
      root.replaceChildren();
      root.remove();
    }
  };
}
