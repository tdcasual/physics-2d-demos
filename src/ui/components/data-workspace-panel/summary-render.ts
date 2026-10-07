/**
 * 数据工作区汇总区、结论与已知量芯片。
 * 从 createDataWorkspacePanel 抽出（债务计划 E2）。
 * 行表注册表由表格控制器持有，本模块经 context 只读访问 status 节点。
 */

import {
  formatReadinessHint,
  formatResultText,
  getSummaryField,
  isFieldReady,
  shouldShowChartAnalysis,
  summaryContextItems,
  type DataWorkspaceFieldId,
  type DataWorkspaceHost,
  type DataWorkspaceKnown,
  type DataWorkspaceSession,
  type DataWorkspaceSpec,
  type FieldCheckState
} from '../../../platform/data-workspace';
import {
  clearReadinessOnInput,
  fillFieldLabel,
  setFieldStatus,
  setReadinessOnInput
} from './field-status';

export type SummaryRenderController = {
  ensureSummary(specNow: DataWorkspaceSpec): void;
  syncSummary(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec,
    knowns: readonly DataWorkspaceKnown[]
  ): void;
  renderResult(session: DataWorkspaceSession, specNow: DataWorkspaceSpec): void;
  renderKnownsInto(
    container: HTMLElement,
    knowns: readonly DataWorkspaceKnown[]
  ): void;
};

export function createSummaryRenderController(options: {
  host: DataWorkspaceHost;
  ac: AbortController;
  summary: HTMLElement;
  result: HTMLElement;
  statusNodes: ReadonlyMap<string, HTMLSpanElement>;
  registerStatusNode(key: string, node: HTMLSpanElement): void;
  fieldKey(field: string, trialIndex?: number): string;
  bindCheck(
    input: HTMLInputElement,
    field: DataWorkspaceFieldId,
    trialIndex?: number
  ): void;
  setFieldEnabled(
    input: HTMLInputElement | null,
    enabled: boolean,
    btn?: HTMLButtonElement | null
  ): void;
  getCurrentStep(): 'data' | 'chartAnalysis';
  onChange(): void;
  update(): void;
}): SummaryRenderController {
  const {
    host,
    ac,
    summary,
    result,
    statusNodes,
    registerStatusNode,
    fieldKey,
    bindCheck,
    setFieldEnabled,
    getCurrentStep
  } = options;

  const summaryInputs = new Map<
    string,
    { input: HTMLInputElement; btn: HTMLButtonElement; row: HTMLElement }
  >();
  let summaryBuilt = false;
  let contextEl: HTMLDivElement | null = null;
  /** summaryCheck: 'together' 时汇总区唯一的校对按钮。 */
  let checkAllBtn: HTMLButtonElement | null = null;

  /** 当前环节可见的汇总字段（图像分析字段只在图像分析环节出现）。 */
  function isOnCurrentStep(
    specNow: DataWorkspaceSpec,
    def: DataWorkspaceSpec['summaryFields'][number]
  ): boolean {
    if (!shouldShowChartAnalysis(specNow)) return true;
    const onChartStep = def.step === 'chartAnalysis';
    return getCurrentStep() === 'chartAnalysis' ? onChartStep : !onChartStep;
  }

  /** 一次校对当前环节的全部汇总字段，只刷新一次面板。 */
  function checkAllSummary(): void {
    const specNow = host.getSpec();
    let submitted = false;
    for (const def of specNow.summaryFields) {
      const nodes = summaryInputs.get(def.id);
      if (!nodes || nodes.input.disabled) continue;
      if (!isOnCurrentStep(specNow, def)) continue;
      host.submitField({ field: def.id, raw: nodes.input.value });
      submitted = true;
    }
    if (!submitted) return;
    options.onChange();
    options.update();
  }

  /** 每个容器的芯片签名：knowns 内容不变时跳过 replaceChildren。 */
  const knownsSignatures = new WeakMap<HTMLElement, string>();

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

  function renderKnownsInto(
    container: HTMLElement,
    knowns: readonly DataWorkspaceKnown[]
  ): void {
    const signature = knowns
      .map((known) => `${known.key}\u0000${known.value}`)
      .join('\u0001');
    if (knownsSignatures.get(container) === signature) return;
    knownsSignatures.set(container, signature);
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

  function ensureSummary(specNow: DataWorkspaceSpec): void {
    if (summaryBuilt) return;
    summary.replaceChildren();
    contextEl = document.createElement('div');
    contextEl.className =
      'data-workspace-knowns data-workspace-summary-context';
    contextEl.hidden = true;
    summary.appendChild(contextEl);

    const together = specNow.summaryCheck === 'together';
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
      if (together) {
        input.addEventListener(
          'keydown',
          (event) => {
            if (event.key !== 'Enter' || event.isComposing) return;
            checkAllSummary();
          },
          { signal: ac.signal }
        );
      } else {
        bindCheck(input, def.id);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'data-workspace-check';
      btn.textContent = '校对';
      btn.hidden = together;
      btn.addEventListener(
        'click',
        () => {
          if (btn.disabled || input.disabled) return;
          host.submitField({ field: def.id, raw: input.value });
          options.onChange();
          options.update();
        },
        { signal: ac.signal }
      );
      const status = document.createElement('span');
      status.className = 'data-workspace-status';
      registerStatusNode(fieldKey(def.id), status);
      row.append(lab, input, btn, status);
      summary.appendChild(row);
      summaryInputs.set(def.id, { input, btn, row });
    }
    if (together) {
      const row = document.createElement('div');
      row.className = 'data-workspace-summary-row';
      checkAllBtn = document.createElement('button');
      checkAllBtn.type = 'button';
      checkAllBtn.className = 'data-workspace-check';
      checkAllBtn.textContent = '校对';
      checkAllBtn.setAttribute(
        'aria-label',
        `校对${specNow.summaryFields.map((def) => def.label).join('、')}`
      );
      checkAllBtn.addEventListener(
        'click',
        () => {
          if (checkAllBtn?.disabled) return;
          checkAllSummary();
        },
        { signal: ac.signal }
      );
      row.append(checkAllBtn);
      summary.appendChild(row);
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

    let anyReady = false;
    for (const def of specNow.summaryFields) {
      const nodes = summaryInputs.get(def.id);
      const visible = isOnCurrentStep(specNow, def);
      if (nodes) nodes.row.hidden = !visible;
      const ready = isFieldReady(session, specNow, def.id);
      if (ready && visible) anyReady = true;
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
    if (checkAllBtn) checkAllBtn.disabled = !anyReady;
  }

  function renderResult(
    session: DataWorkspaceSession,
    specNow: DataWorkspaceSpec
  ): void {
    if (
      shouldShowChartAnalysis(specNow) &&
      getCurrentStep() !== 'chartAnalysis'
    ) {
      if (!result.hidden) {
        result.hidden = true;
        result.replaceChildren();
      }
      return;
    }
    const custom = host.renderResult?.(session) ?? null;
    const text = custom ?? formatResultText(session, specNow);
    if (!text) {
      if (!result.hidden) {
        result.hidden = true;
        result.replaceChildren();
      }
      return;
    }
    const existing = result.firstElementChild;
    if (!result.hidden && result.childNodes.length === 1) {
      const existingText =
        existing instanceof HTMLElement ? existing.textContent : null;
      if (existingText === text) return;
    }
    result.hidden = false;
    result.replaceChildren();
    const p = document.createElement('p');
    p.textContent = text;
    result.appendChild(p);
  }

  return {
    ensureSummary,
    syncSummary,
    renderResult,
    renderKnownsInto
  };
}
