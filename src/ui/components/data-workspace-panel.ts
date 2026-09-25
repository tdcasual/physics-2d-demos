/**
 * Fillable data-workspace panel. Independent of readout HUD and graph slot.
 * Field ids, labels, units, and result copy come only from DataWorkspaceSpec / host.
 */

import {
  fieldIsOk,
  formatReadinessHint,
  formatResultText,
  getSummaryField,
  getTrialField,
  isFieldReady,
  isSummaryField,
  resolveRowLimits,
  rowCheckStageState,
  shouldShowChartAnalysis,
  stagedFieldReadiness,
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
  setChartMode(on: boolean): boolean;
  update(): void;
  dispose(): void;
};

/** 校验结果保持简短；具体判分原因仍可悬停查看并由辅助技术读取。 */
function fieldStatus(field: FieldCheckState | undefined): string {
  if (!field?.feedback) return '';
  if (field.feedback.message === '端点无需填写') return '—';
  if (field.stale) return '↻ 需重校';
  if (!field.feedback.ok) return '✗ 不通过';
  return '✓';
}

function statusClass(field: FieldCheckState | undefined): string {
  if (!field?.feedback) return '';
  if (field.stale) return 'is-stale';
  return field.feedback.ok ? 'is-ok' : 'is-error';
}

function visibleFeedbackReason(
  field: FieldCheckState | undefined
): string | undefined {
  if (!field?.feedback || field.stale || field.feedback.ok) return undefined;
  switch (field.feedback.layer) {
    case 'format':
      return '格式不符';
    case 'unit':
      return '单位不符';
    case 'range':
      return '超出范围';
    case 'instrument':
      return '仪器读数不符';
    case 'relation':
      return '计算关系不符';
  }
}

function setFieldStatus(
  node: HTMLElement,
  field: FieldCheckState | undefined
): void {
  node.className = `data-workspace-status ${statusClass(field)}`;
  node.textContent = fieldStatus(field);
  const reason = visibleFeedbackReason(field);
  if (reason) node.dataset.reason = reason;
  else delete node.dataset.reason;
  const feedback = field?.feedback;
  const message = feedback?.message.trim();
  if (!field || !feedback || !message) {
    node.removeAttribute('title');
    node.removeAttribute('aria-label');
    return;
  }
  const outcome = field.stale
    ? '数据已变化，需要重新校对'
    : feedback.ok
      ? '校对通过'
      : '校对未通过';
  node.title = message;
  node.setAttribute('aria-label', `${outcome}。${message}`);
}

function headerLabel(field: DataWorkspaceFieldSpec): string {
  return field.unit ? `${field.label} / ${field.unit}` : field.label;
}

/** 表头只留字段名和单位。位数说明在标题下，不进表格。 */
function fillFieldLabel(
  target: HTMLElement,
  field: DataWorkspaceFieldSpec
): void {
  target.textContent = headerLabel(field);
}

function rememberAria(input: HTMLInputElement): void {
  if (!input.dataset.dwAria) {
    input.dataset.dwAria = input.getAttribute('aria-label') ?? '';
  }
}

/** 未就绪说明只挂在禁用输入上，不写进单元格正文。 */
function setReadinessOnInput(
  input: HTMLInputElement | null,
  hint: string
): void {
  if (!input) return;
  rememberAria(input);
  const base = input.dataset.dwAria ?? '';
  input.title = hint;
  input.setAttribute('aria-label', base ? `${base}。${hint}` : hint);
}

function clearReadinessOnInput(input: HTMLInputElement | null): void {
  if (!input?.dataset.dwAria) return;
  input.removeAttribute('title');
  input.setAttribute('aria-label', input.dataset.dwAria);
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
  confirmEl.setAttribute('aria-modal', 'true');
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
  let confirmReturnFocus: HTMLElement | null = null;

  function restoreConfirmFocus(): void {
    const target = confirmReturnFocus;
    confirmReturnFocus = null;
    if (target?.isConnected && !target.hasAttribute('disabled')) target.focus();
  }

  confirmCancel.addEventListener(
    'click',
    () => {
      pendingDeleteId = null;
      confirmEl.hidden = true;
      restoreConfirmFocus();
    },
    { signal: ac.signal }
  );
  confirmEl.addEventListener(
    'keydown',
    (event) => {
      if (confirmEl.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        pendingDeleteId = null;
        confirmEl.hidden = true;
        restoreConfirmFocus();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [confirmCancel, confirmOk];
      const active = document.activeElement;
      if (event.shiftKey && active === items[0]) {
        event.preventDefault();
        items[1]?.focus();
      } else if (!event.shiftKey && active === items[1]) {
        event.preventDefault();
        items[0]?.focus();
      }
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
      restoreConfirmFocus();
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
  /** 图像分析环节的两区包裹层（表 + 分隔条 + 图），比例基准只含这三个。 */
  let chartStage: HTMLElement | null = null;
  let splitter: HTMLElement | null = null;
  if (shouldShowChartAnalysis(spec)) {
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
    chartStage = document.createElement('div');
    chartStage.className = 'data-workspace-chart-stage';
    splitter = document.createElement('div');
    splitter.className = 'data-workspace-splitter';
    splitter.setAttribute('role', 'separator');
    splitter.setAttribute('aria-orientation', 'horizontal');
    splitter.setAttribute('aria-valuemin', '18');
    splitter.setAttribute('aria-valuemax', '72');
    splitter.setAttribute('aria-label', '调整表格与图表分界');
    splitter.tabIndex = 0;
    splitter.hidden = true;
  }

  const SPLIT_MIN = 0.18;
  const SPLIT_MAX = 0.72;
  const splitStorageKey = `dw-split-fit-${spec.id}`;
  let splitMode: 'content' | 'manual' | 'even' = 'content';

  function readStoredSplit(): number | null {
    try {
      const stored = Number(window.localStorage.getItem(splitStorageKey));
      if (
        Number.isFinite(stored) &&
        stored >= SPLIT_MIN &&
        stored <= SPLIT_MAX
      ) {
        return stored;
      }
    } catch {
      /* storage may be unavailable in private or embedded browsing contexts */
    }
    return null;
  }

  function measuredSplitRatio(stage: HTMLElement): number | null {
    const review = stage.querySelector('.data-workspace-review');
    const height = stage.clientHeight || stage.getBoundingClientRect().height;
    if (!(review instanceof HTMLElement) || !(height > 0)) return null;
    const reviewHeight = review.getBoundingClientRect().height;
    if (!(reviewHeight > 0)) return null;
    return reviewHeight / height;
  }

  function currentSplitRatio(stage: HTMLElement): number {
    if (splitMode === 'even') return 0.5;
    if (splitMode === 'manual') {
      const parsed =
        Number.parseFloat(stage.style.getPropertyValue('--dw-split')) / 100;
      if (Number.isFinite(parsed)) return parsed;
    }
    return measuredSplitRatio(stage) ?? SPLIT_MIN;
  }

  function applySplitRatio(ratio: number, persist = true): void {
    const clamped = Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, ratio));
    splitMode = 'manual';
    chartStage?.setAttribute('data-split-mode', 'manual');
    chartStage?.style.setProperty(
      '--dw-split',
      `${(clamped * 100).toFixed(2)}%`
    );
    announceSeparator(clamped, false);
    if (!persist) return;
    try {
      window.localStorage.setItem(
        splitStorageKey,
        String(Math.round(clamped * 1000) / 1000)
      );
    } catch {
      /* 私密模式等存储不可用时静默 */
    }
  }

  /**
   * aria-valuenow must stay inside aria-valuemin/max. Content-fit can be
   * shorter than 18%; the announced value is clamped, and aria-valuetext
   * still says the split is following the table.
   */
  function announceSeparator(ratio: number, content: boolean): void {
    if (!splitter) return;
    const announced = Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, ratio));
    splitter.setAttribute('aria-valuenow', String(Math.round(announced * 100)));
    if (content) splitter.setAttribute('aria-valuetext', '按表格内容');
    else splitter.removeAttribute('aria-valuetext');
  }

  function useContentSplit(): void {
    splitMode = 'content';
    chartStage?.setAttribute('data-split-mode', 'content');
    chartStage?.style.removeProperty('--dw-split');
    const measured = chartStage ? measuredSplitRatio(chartStage) : null;
    announceSeparator(measured ?? SPLIT_MIN, true);
  }

  function useEvenSplit(): void {
    splitMode = 'even';
    chartStage?.setAttribute('data-split-mode', 'even');
    chartStage?.style.removeProperty('--dw-split');
    if (!splitter) return;
    splitter.setAttribute('aria-valuenow', '50');
    splitter.setAttribute('aria-valuetext', '上下各半');
  }

  function viewportAllowsEven(): boolean {
    return typeof window !== 'undefined' && window.innerHeight >= 640;
  }

  /** Stored manual ratios win. Even is only the untouched default. */
  function chooseIdleSplit(): void {
    if (splitMode === 'manual') return;
    const stored = readStoredSplit();
    if (stored != null) {
      applySplitRatio(stored, false);
      return;
    }
    if (
      options.host.getSpec().chartEvenSplit === true &&
      viewportAllowsEven()
    ) {
      useEvenSplit();
      return;
    }
    useContentSplit();
  }

  function syncContentSeparator(): void {
    if (splitMode !== 'content') return;
    const measured = chartStage ? measuredSplitRatio(chartStage) : null;
    announceSeparator(measured ?? SPLIT_MIN, true);
  }

  function bindSplitter(handle: HTMLElement, stage: HTMLElement): void {
    const ratioFromPointer = (clientY: number): number => {
      const rect = stage.getBoundingClientRect();
      // 相对「表+分隔条+图」包裹层的高度换算拖拽比例；包裹层不在
      // 舞台 transform 内，不违反舞台缩放坐标纪律。
      const height = stage.clientHeight || rect.height;
      if (height <= 0) return SPLIT_MIN;
      return Math.max(
        SPLIT_MIN,
        Math.min(SPLIT_MAX, (clientY - rect.top) / height)
      );
    };
    handle.addEventListener(
      'pointerdown',
      (event) => {
        try {
          if (typeof handle.setPointerCapture === 'function') {
            handle.setPointerCapture(event.pointerId);
          }
        } catch {
          /* capture is optional; move events still update the ratio */
        }
        applySplitRatio(ratioFromPointer(event.clientY));
        const move = (moveEvent: PointerEvent): void => {
          applySplitRatio(ratioFromPointer(moveEvent.clientY));
        };
        const up = (): void => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      },
      { signal: ac.signal }
    );
    handle.addEventListener(
      'keydown',
      (event) => {
        const current = currentSplitRatio(stage);
        const step =
          event.key === 'PageUp' || event.key === 'PageDown' ? 0.05 : 0.01;
        if (event.key === 'ArrowUp' || event.key === 'PageUp') {
          event.preventDefault();
          applySplitRatio(current - step);
        } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
          event.preventDefault();
          applySplitRatio(current + step);
        } else if (event.key === 'Home') {
          event.preventDefault();
          applySplitRatio(SPLIT_MIN);
        } else if (event.key === 'End') {
          event.preventDefault();
          applySplitRatio(SPLIT_MAX);
        }
      },
      { signal: ac.signal }
    );
  }
  if (chartStage && splitter) {
    chooseIdleSplit();
    bindSplitter(splitter, chartStage);
    window.addEventListener('resize', chooseIdleSplit, { signal: ac.signal });
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

  function bindCheck(
    input: HTMLInputElement,
    field: DataWorkspaceFieldId,
    trialIndex?: number
  ): void {
    const run = () => {
      if (input.disabled) return;
      const specNow = options.host.getSpec();
      if (trialIndex != null && specNow.rowCheckStages) {
        const readiness = stagedFieldReadiness(
          options.host.getSession(),
          specNow,
          field,
          trialIndex
        );
        if (!readiness.ready) return;
      }
      options.host.submitField({
        field,
        trialIndex,
        raw: input.value
      });
      options.onChange();
      update();
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
            confirmReturnFocus = delBtn;
            confirmEl.hidden = false;
            confirmCancel.focus();
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

  function runStagedRowCheck(trialIndex: number): void {
    const specNow = options.host.getSpec();
    const stages = specNow.rowCheckStages;
    if (!stages || stages.length === 0) return;
    const before = rowCheckStageState(
      options.host.getSession(),
      specNow,
      trialIndex
    );
    const through = before.completed ? stages.length : before.index;
    const allowed = new Set(
      stages.slice(0, through).flatMap((stage) => [...stage.fields])
    );
    const trial = options.host.getSession().trials[trialIndex];
    const drafts: DataWorkspaceDraft[] = [];
    if (trial) {
      for (const def of specNow.rowFields) {
        if (!allowed.has(def.id)) continue;
        const input = rowInputs.get(fieldKey(def.id, trialIndex))?.input;
        if (!input || input.disabled) continue;
        drafts.push({ rowId: trial.id, field: def.id, raw: input.value });
      }
    }
    if (drafts.length > 0) options.host.applyDrafts(drafts);

    const state = rowCheckStageState(
      options.host.getSession(),
      specNow,
      trialIndex
    );
    const stage = state.stage;
    if (stage) {
      for (const fieldId of stage.fields) {
        const session = options.host.getSession();
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
        const result = options.host.submitField({
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
    options.onChange();
    update();
  }

  function syncRowCheckButton(
    button: HTMLButtonElement,
    specNow: DataWorkspaceSpec,
    trialIndex: number
  ): void {
    const stages = specNow.rowCheckStages;
    if (stages && stages.length > 0) {
      const state = rowCheckStageState(
        options.host.getSession(),
        specNow,
        trialIndex
      );
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
    const next = state?.raw ?? '';
    const applied = input.dataset.dwApplied ?? '';
    // 画面每帧都会刷新面板。未校对的输入不能被空的存档盖掉，
    // 否则失焦后再点校对，读到的是空字符串，提示「请输入有效数值」。
    if (input.value !== applied) {
      if (next === input.value) input.dataset.dwApplied = next;
      return;
    }
    if (input.value === next) return;
    input.value = next;
    input.dataset.dwApplied = next;
  }

  function fieldKey(field: string, trialIndex?: number): string {
    return trialIndex == null ? field : `${trialIndex}:${field}`;
  }

  function rowsSignature(session: DataWorkspaceSession): string {
    return session.trials.map((trial) => trial.id).join('|');
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
      fillFieldLabel(lab, def);
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = def.inputMode === 'numeric' ? 'numeric' : 'decimal';
      input.className = 'data-workspace-input';
      input.dataset.field = def.id;
      input.setAttribute(
        'aria-label',
        `${def.label}${def.unit ? `（${def.unit}）` : ''}`
      );
      input.dataset.dwApplied = '';
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
        setFieldStatus(status, state);
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
    setFieldStatus(node, field);
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
    syncContentSeparator();
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
