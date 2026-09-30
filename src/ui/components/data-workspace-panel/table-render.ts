/**
 * 数据工作区表格渲染与行校对。
 * 从 createDataWorkspacePanel 抽出（债务计划 E2）：注册表与行渲染
 * 由本控制器持有，经 PanelContext 注入宿主与回写。
 */

import {
  fieldIsOk,
  formatReadinessHint,
  getTrialField,
  isFieldReady,
  resolveRowLimits,
  rowCheckStageState,
  stagedFieldReadiness,
  trialLabel,
  type DataWorkspaceDraft,
  type DataWorkspaceFieldId,
  type DataWorkspaceFieldSpec,
  type DataWorkspaceHost,
  type DataWorkspaceSession,
  type DataWorkspaceSpec,
  type FieldCheckState
} from '../../../platform/data-workspace';
import {
  clearReadinessOnInput,
  fillFieldLabel,
  isFieldsOrientation,
  isFixedRowCount,
  isNaPlaceholder,
  setFieldStatus,
  setReadinessOnInput,
  headerLabel
} from './field-status';

export type PanelContext = {
  host: DataWorkspaceHost;
  ac: AbortController;
  tableWrap: HTMLElement;
  onChange(): void;
  update(): void;
  harvestDrafts(): void;
  requestDelete(trialId: string, returnFocus: HTMLElement): void;
};

export type TableRenderController = {
  bindCheck(
    input: HTMLInputElement,
    field: DataWorkspaceFieldId,
    trialIndex?: number
  ): void;
  renderTable(session: DataWorkspaceSession, specNow: DataWorkspaceSpec): void;
  patchTableCells(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void;
  rowsSignature(session: DataWorkspaceSession): string;
  getTableSignature(): string;
  invalidateSignature(): void;
  readonly statusNodes: ReadonlyMap<string, HTMLSpanElement>;
  registerStatusNode(key: string, node: HTMLSpanElement): void;
  fieldKey(field: string, trialIndex?: number): string;
  setFieldEnabled(
    input: HTMLInputElement | null,
    enabled: boolean,
    btn?: HTMLButtonElement | null
  ): void;
};

export function createTableRenderController(
  ctx: PanelContext
): TableRenderController {
  const { host, ac, tableWrap } = ctx;

  const statusNodes = new Map<string, HTMLSpanElement>();
  const rowInputs = new Map<
    string,
    {
      input: HTMLInputElement;
    }
  >();
  const rowChecks = new Map<string, HTMLButtonElement>();
  const fieldChecks = new Map<string, HTMLButtonElement>();
  let tableSignature = '';

  function bindCheck(
    input: HTMLInputElement,
    field: DataWorkspaceFieldId,
    trialIndex?: number
  ): void {
    const run = () => {
      if (input.disabled) return;
      const specNow = host.getSpec();
      if (trialIndex != null && specNow.rowCheckStages) {
        const readiness = stagedFieldReadiness(
          host.getSession(),
          specNow,
          field,
          trialIndex
        );
        if (!readiness.ready) return;
      }
      host.submitField({
        field,
        trialIndex,
        raw: input.value
      });
      ctx.onChange();
      ctx.update();
    };
    let submitAfterComposition = false;
    input.addEventListener(
      'compositionstart',
      () => {
        submitAfterComposition = false;
      },
      { signal: ac.signal }
    );
    input.addEventListener(
      'compositionend',
      () => {
        if (!submitAfterComposition) return;
        submitAfterComposition = false;
        run();
      },
      { signal: ac.signal }
    );
    input.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Enter') return;
        // 输入法用 Enter 上屏时，字面还没写进 value。等 compositionend 再校对。
        if (event.isComposing) {
          submitAfterComposition = true;
          return;
        }
        event.preventDefault();
        run();
      },
      { signal: ac.signal }
    );
  }

  function setFieldEnabled(
    input: HTMLInputElement | null,
    enabled: boolean,
    btn: HTMLButtonElement | null = null
  ): void {
    if (input) {
      if (input.disabled !== !enabled) input.disabled = !enabled;
      const ariaDisabled = String(!enabled);
      if (input.getAttribute('aria-disabled') !== ariaDisabled) {
        input.setAttribute('aria-disabled', ariaDisabled);
      }
    }
    if (btn) {
      if (btn.disabled !== !enabled) btn.disabled = !enabled;
      const ariaDisabled = String(!enabled);
      if (btn.getAttribute('aria-disabled') !== ariaDisabled) {
        btn.setAttribute('aria-disabled', ariaDisabled);
      }
    }
  }

  /** Stage editing ignores `gated`. Future stages stay disabled. */
  function isRowInputEnabled(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec,
    def: DataWorkspaceFieldSpec,
    trialIndex: number
  ): boolean {
    const stages = specNow.rowCheckStages;
    if (!stages || stages.length === 0) {
      return isFieldReady(session, specNow, def.id, trialIndex);
    }
    const stageIndex = stages.findIndex((stage) =>
      stage.fields.includes(def.id)
    );
    if (stageIndex < 0) return false;
    const state = rowCheckStageState(session, specNow, trialIndex);
    if (state.completed) return true;
    return stageIndex < state.index;
  }

  function fieldKey(field: string, trialIndex?: number): string {
    return trialIndex == null ? field : `${trialIndex}:${field}`;
  }

  function rowsSignature(session: DataWorkspaceSession): string {
    return session.trials.map((trial) => trial.id).join('|');
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
    input.dataset.dwApplied = input.value;
    bindCheck(input, def.id, trialIndex);

    const status = document.createElement('span');
    setFieldStatus(status, current);
    const key = fieldKey(def.id, trialIndex);
    statusNodes.set(key, status);
    rowInputs.set(key, { input });
    const ready = isRowInputEnabled(session, specNow, def, trialIndex);
    setFieldEnabled(input, ready);
    if (!specNow.rowCheckStages && def.gated && !ready) {
      status.className = 'data-workspace-status';
      status.textContent = '';
      status.removeAttribute('title');
      status.removeAttribute('aria-label');
      delete status.dataset.reason;
      setReadinessOnInput(
        input,
        formatReadinessHint(def, session.trials.length)
      );
    }

    wrap.append(input, status);
    cell.appendChild(wrap);
  }

  function runStagedRowCheck(trialIndex: number): void {
    const specNow = host.getSpec();
    const stages = specNow.rowCheckStages;
    if (!stages || stages.length === 0) return;
    const before = rowCheckStageState(host.getSession(), specNow, trialIndex);
    const through = before.completed ? stages.length : before.index;
    const allowed = new Set(
      stages.slice(0, through).flatMap((stage) => [...stage.fields])
    );
    const trial = host.getSession().trials[trialIndex];
    const drafts: DataWorkspaceDraft[] = [];
    if (trial) {
      for (const def of specNow.rowFields) {
        if (!allowed.has(def.id)) continue;
        const input = rowInputs.get(fieldKey(def.id, trialIndex))?.input;
        if (!input || input.disabled) continue;
        drafts.push({ rowId: trial.id, field: def.id, raw: input.value });
      }
    }
    if (drafts.length > 0) host.applyDrafts(drafts);

    const state = rowCheckStageState(host.getSession(), specNow, trialIndex);
    const stage = state.stage;
    if (stage) {
      for (const fieldId of stage.fields) {
        const session = host.getSession();
        const readiness = stagedFieldReadiness(
          session,
          specNow,
          fieldId,
          trialIndex
        );
        const input =
          rowInputs.get(fieldKey(fieldId, trialIndex))?.input ?? null;
        const domRaw = input?.value ?? '';
        const current = getTrialField(session.trials[trialIndex], fieldId);
        if (fieldIsOk(current) && current?.raw === domRaw) continue;
        if (!readiness.ready || domRaw.trim() === '' || !input) {
          input?.focus();
          break;
        }
        const result = host.submitField({
          field: fieldId,
          trialIndex,
          raw: domRaw
        });
        if (!result.feedback.ok) {
          input.focus();
          break;
        }
      }
    }
    ctx.onChange();
    ctx.update();
  }

  function syncRowCheckButton(
    button: HTMLButtonElement,
    specNow: DataWorkspaceSpec,
    trialIndex: number
  ): void {
    const stages = specNow.rowCheckStages;
    if (stages && stages.length > 0) {
      const state = rowCheckStageState(host.getSession(), specNow, trialIndex);
      const group = trialLabel(specNow, trialIndex);
      if (state.completed || !state.stage) {
        button.disabled = true;
        button.textContent = '本组已完成';
        button.setAttribute('aria-label', `第 ${group} 组已完成`);
        button.removeAttribute('title');
      } else {
        button.disabled = false;
        button.textContent = `${state.index}/${state.total} ${state.stage.label}`;
        const stageHint = state.stage.hint ? `。${state.stage.hint}` : '';
        button.setAttribute(
          'aria-label',
          `校对第 ${group} 组，阶段 ${state.index}/${state.total}：${state.stage.label}${stageHint}`
        );
        button.removeAttribute('title');
      }
      button.setAttribute('aria-disabled', String(button.disabled));
      return;
    }
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
    const session = host.getSession();
    const allDisabled = session.trials.every((_, trialIndex) => {
      const input = rowInputs.get(fieldKey(fieldId, trialIndex))?.input;
      return !input || input.disabled;
    });
    button.disabled = allDisabled;
    button.setAttribute('aria-disabled', String(allDisabled));
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
        if (specNow.rowCheckStages) {
          runStagedRowCheck(trialIndex);
          return;
        }
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
          host.submitField({
            field: def.id,
            trialIndex,
            raw: input.value
          });
        }
        ctx.onChange();
        ctx.update();
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
          ctx.harvestDrafts();
          const outcome = host.removeTrial(trial.id, false);
          if (outcome.needsConfirm) {
            ctx.requestDelete(trial.id, delBtn);
            return;
          }
          tableSignature = '';
          ctx.onChange();
          ctx.update();
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
    fillFieldLabel(labelCell, def);
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
        const fields = host
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
          host.submitField({
            field: def.id,
            trialIndex,
            raw: input.value
          });
        }
        ctx.onChange();
        ctx.update();
      },
      { signal: ac.signal }
    );
    fieldChecks.set(def.id, checkBtn);
    checkCell.appendChild(checkBtn);
    tr.appendChild(checkCell);
    syncFieldCheckButton(checkBtn, def.id);
    return tr;
  }

  function appendHeadCell(
    row: HTMLTableRowElement,
    label: string,
    field?: DataWorkspaceFieldSpec
  ): void {
    const th = document.createElement('th');
    th.scope = 'col';
    if (field) fillFieldLabel(th, field);
    else th.textContent = label;
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
    table.setAttribute(
      'aria-label',
      isFieldsOrientation(specNow) ? '按字段填写的数据表' : '按试次填写的数据表'
    );
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
      appendHeadCell(headRow, '组');
      for (const def of specNow.rowFields) appendHeadCell(headRow, '', def);
      appendHeadCell(headRow, '');
      for (let i = 0; i < session.trials.length; i += 1) {
        tbody.appendChild(renderTrialRow(session, specNow, i));
      }
    }
    thead.appendChild(headRow);
    table.append(thead, tbody);
    tableWrap.appendChild(table);
    tableSignature = rowsSignature(session);
  }

  function patchStatus(key: string, field: FieldCheckState | undefined): void {
    const node = statusNodes.get(key);
    if (!node) return;
    setFieldStatus(node, field);
  }

  function patchTableCells(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    session.trials.forEach((trial, index) => {
      for (const def of specNow.rowFields) {
        const key = fieldKey(def.id, index);
        const nodes = rowInputs.get(key);
        const ready = isRowInputEnabled(session, specNow, def, index);
        setFieldEnabled(nodes?.input ?? null, ready);
        const status = statusNodes.get(key);
        if (!specNow.rowCheckStages && def.gated && !ready && status) {
          status.className = 'data-workspace-status';
          status.textContent = '';
          status.removeAttribute('title');
          status.removeAttribute('aria-label');
          delete status.dataset.reason;
          setReadinessOnInput(
            nodes?.input ?? null,
            formatReadinessHint(def, session.trials.length)
          );
        } else {
          clearReadinessOnInput(nodes?.input ?? null);
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

  return {
    bindCheck,
    renderTable,
    patchTableCells,
    rowsSignature,
    getTableSignature: () => tableSignature,
    invalidateSignature() {
      tableSignature = '';
    },
    get statusNodes() {
      return statusNodes;
    },
    registerStatusNode(key, node) {
      statusNodes.set(key, node);
    },
    fieldKey,
    setFieldEnabled
  };
}
