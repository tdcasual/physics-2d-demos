/**
 * 数据工作区字段状态渲染的纯函数集（debt-ledger A4 从 panel index 抽出）。
 * 只依赖类型与传入参数，不持有任何面板状态。
 */

import { resolveRowLimits } from '../../../platform/data-workspace/spec-queries';
import type {
  DataWorkspaceFieldSpec,
  DataWorkspaceSpec,
  FieldCheckState
} from '../../../platform/data-workspace';

/** 校验结果保持简短；具体判分原因仍可悬停查看并由辅助技术读取。 */
export function fieldStatus(field: FieldCheckState | undefined): string {
  if (!field?.feedback) return '';
  if (field.feedback.message === '端点无需填写') return '—';
  if (field.stale) return '↻ 需重校';
  if (!field.feedback.ok) return '✗ 不通过';
  return '✓';
}

export function statusClass(field: FieldCheckState | undefined): string {
  if (!field?.feedback) return '';
  if (field.stale) return 'is-stale';
  return field.feedback.ok ? 'is-ok' : 'is-error';
}

export function visibleFeedbackReason(
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

export function setFieldStatus(
  node: HTMLElement,
  field: FieldCheckState | undefined
): void {
  const className = `data-workspace-status ${statusClass(field)}`;
  const text = fieldStatus(field);
  const reason = visibleFeedbackReason(field);
  const feedback = field?.feedback;
  const message = feedback?.message.trim();
  const hasFeedback = Boolean(field && feedback && message);
  const outcome = field?.stale
    ? '数据已变化，需要重新校对'
    : feedback?.ok
      ? '校对通过'
      : '校对未通过';
  const title = hasFeedback ? (message ?? '') : '';
  const ariaLabel = hasFeedback ? `${outcome}。${message}` : '';
  // 场景 notify 高频（如拖动测微仪旋钮 ≈60Hz）；目标态全等时跳过 DOM 写。
  if (
    node.className === className &&
    node.textContent === text &&
    (node.dataset.reason ?? '') === (reason ?? '') &&
    node.title === title &&
    (node.getAttribute('aria-label') ?? '') === ariaLabel
  ) {
    return;
  }
  node.className = className;
  node.textContent = text;
  if (reason) node.dataset.reason = reason;
  else delete node.dataset.reason;
  if (!field || !feedback || !message) {
    node.removeAttribute('title');
    node.removeAttribute('aria-label');
    return;
  }
  node.title = message;
  node.setAttribute('aria-label', `${outcome}。${message}`);
}

export function headerLabel(field: DataWorkspaceFieldSpec): string {
  return field.unit ? `${field.label} / ${field.unit}` : field.label;
}

/** 表头只留字段名和单位。位数说明在标题下，不进表格。 */
export function fillFieldLabel(
  target: HTMLElement,
  field: DataWorkspaceFieldSpec
): void {
  target.textContent = headerLabel(field);
}

export function rememberAria(input: HTMLInputElement): void {
  if (!input.dataset.dwAria) {
    input.dataset.dwAria = input.getAttribute('aria-label') ?? '';
  }
}

/** 未就绪说明只挂在禁用输入上，不写进单元格正文。 */
export function setReadinessOnInput(
  input: HTMLInputElement | null,
  hint: string
): void {
  if (!input) return;
  rememberAria(input);
  const base = input.dataset.dwAria ?? '';
  input.title = hint;
  input.setAttribute('aria-label', base ? `${base}。${hint}` : hint);
}

export function clearReadinessOnInput(input: HTMLInputElement | null): void {
  if (!input?.dataset.dwAria) return;
  input.removeAttribute('title');
  input.setAttribute('aria-label', input.dataset.dwAria);
}

export function isFieldsOrientation(spec: DataWorkspaceSpec): boolean {
  return spec.tableOrientation === 'fields';
}

export function isFixedRowCount(spec: DataWorkspaceSpec): boolean {
  const { minRows, maxRows } = resolveRowLimits(spec);
  return minRows === maxRows;
}

export function isNaPlaceholder(field: FieldCheckState | undefined): boolean {
  return Boolean(field?.checked && field.raw === '—' && !field.stale);
}
