/**
 * Dependency-graph invalidation and session write operations.
 */
import { cloneSession, createTrialRecord } from './session';
import { assertSpecGraph } from './spec-validation';
import type {
  DataWorkspaceDraft,
  DataWorkspaceFieldId,
  DataWorkspaceFieldSpec,
  DataWorkspaceKnown,
  DataWorkspaceSession,
  DataWorkspaceSpec,
  FieldCheckState,
  GraphNode,
  TrialRecord
} from './types';
import {
  fieldIsOk,
  findFieldSpec,
  getSummaryField,
  isRowField,
  isSummaryField,
  resolveRowLimits
} from './spec-queries';

function nodeKey(node: GraphNode): string {
  return node.loc === 'row'
    ? `row:${node.id}@${node.rowOffset}`
    : `summary:${node.id}`;
}

function dependentsOf(spec: DataWorkspaceSpec, node: GraphNode): GraphNode[] {
  const out: GraphNode[] = [];
  if (node.loc === 'row') {
    const { id, rowOffset } = node;
    for (const field of spec.rowFields) {
      for (const dep of field.dependsOn ?? []) {
        if (dep.field !== id) continue;
        if (dep.scope === 'row') {
          out.push({ loc: 'row', id: field.id, rowOffset });
        } else if (dep.scope === 'neighbor-row') {
          // F_i reads x_{i+offset}, so an edit to x_j expires F_{j−offset}:
          // the dependent's row shifts by the negated offset.
          out.push({
            loc: 'row',
            id: field.id,
            rowOffset: rowOffset - dep.offset
          });
        }
      }
    }
    for (const field of spec.summaryFields) {
      for (const dep of field.dependsOn ?? []) {
        if (dep.scope === 'all-rows' && dep.field === id) {
          out.push({ loc: 'summary', id: field.id });
        }
      }
    }
  } else {
    for (const field of spec.summaryFields) {
      for (const dep of field.dependsOn ?? []) {
        if (dep.scope === 'summary' && dep.field === node.id) {
          out.push({ loc: 'summary', id: field.id });
        }
      }
    }
  }
  return out;
}

function collectDownstream(
  spec: DataWorkspaceSpec,
  start: GraphNode
): GraphNode[] {
  const seen = new Set<string>();
  const queue: GraphNode[] = [...dependentsOf(spec, start)];
  const result: GraphNode[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    const key = nodeKey(node);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(node);
    queue.push(...dependentsOf(spec, node));
  }
  return result;
}

export function markFieldStale(
  field: FieldCheckState | undefined
): FieldCheckState | undefined {
  if (!field) return field;
  return {
    ...field,
    checked: false,
    stale: true,
    feedback: field.feedback
      ? { ok: false, layer: 'relation', message: '上游数据已改，请重新校对' }
      : undefined
  };
}

function requireKnownField(spec: DataWorkspaceSpec, field: string): GraphNode {
  if (isRowField(spec, field)) return { loc: 'row', id: field, rowOffset: 0 };
  if (isSummaryField(spec, field)) return { loc: 'summary', id: field };
  throw new Error(
    `[data-workspace] unknown field id "${field}" in spec "${spec.id}"`
  );
}

export function invalidateDownstream(
  session: DataWorkspaceSession,
  trialIndex: number,
  field: DataWorkspaceFieldId,
  spec: DataWorkspaceSpec
): DataWorkspaceSession {
  assertSpecGraph(spec);
  const next = cloneSession(session);
  next.completed = false;
  const start = requireKnownField(spec, field);
  const downstream = collectDownstream(spec, start);
  for (const node of downstream) {
    if (node.loc === 'row') {
      const trial = next.trials[trialIndex + node.rowOffset];
      if (trial) trial.fields[node.id] = markFieldStale(trial.fields[node.id]);
    } else {
      next.summary[node.id] = markFieldStale(next.summary[node.id]);
    }
  }
  return next;
}

export function writeCheckedField(
  session: DataWorkspaceSession,
  trialIndex: number | undefined,
  field: DataWorkspaceFieldId,
  state: FieldCheckState,
  spec: DataWorkspaceSpec
): DataWorkspaceSession {
  const next = invalidateDownstream(session, trialIndex ?? 0, field, spec);
  if (isSummaryField(spec, field)) {
    next.summary[field] = state;
    next.completed = Boolean(
      spec.completionField === field && state.checked && state.feedback?.ok
    );
  } else if (
    isRowField(spec, field) &&
    trialIndex != null &&
    next.trials[trialIndex]
  ) {
    next.trials[trialIndex].fields[field] = state;
    next.completed = false;
    if (
      spec.lockInstrumentFromField === field &&
      state.checked &&
      state.feedback?.ok &&
      state.snapshot?.instrumentId
    ) {
      next.lockedInstrumentId = state.snapshot.instrumentId;
    }
  } else {
    throw new Error(
      `[data-workspace] cannot write unknown field "${field}" in spec "${spec.id}"`
    );
  }
  return next;
}

export function invalidateAllTrials(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec,
  message: string
): DataWorkspaceSession {
  const next = cloneSession(session);
  next.completed = false;
  next.lockedInstrumentId = undefined;
  for (const id of spec.summaryFields.map((field) => field.id)) {
    next.summary[id] = markFieldStale(next.summary[id]);
  }
  for (const trial of next.trials) {
    for (const id of spec.rowFields.map((field) => field.id)) {
      const current = trial.fields[id];
      if (!current) continue;
      trial.fields[id] = {
        ...current,
        checked: false,
        stale: true,
        feedback: { ok: false, layer: 'instrument', message }
      };
    }
  }
  return next;
}

export function trialHasContent(
  trial: TrialRecord,
  spec?: DataWorkspaceSpec
): boolean {
  const ids = spec
    ? spec.rowFields.map((field) => field.id)
    : Object.keys(trial.fields);
  return ids.some((id) => {
    const field = trial.fields[id];
    if (!field) return false;
    if (field.checked || field.stale) return true;
    return Boolean(field.raw && field.raw.trim());
  });
}

export function invalidateSummary(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec
): DataWorkspaceSession {
  const next = cloneSession(session);
  next.completed = false;
  for (const id of spec.summaryFields.map((field) => field.id)) {
    next.summary[id] = markFieldStale(next.summary[id]);
  }
  return next;
}

export function addSessionTrial(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec
): DataWorkspaceSession {
  const { maxRows } = resolveRowLimits(spec);
  if (session.trials.length >= maxRows) return cloneSession(session);
  const next = invalidateSummary(session, spec);
  const id = `row-${next.nextRowSeq}`;
  next.nextRowSeq += 1;
  next.trials = [...next.trials, createTrialRecord(id)];
  return next;
}

export function removeSessionTrial(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec,
  rowId: string,
  confirmed = false
): { session: DataWorkspaceSession; needsConfirm: boolean } {
  const { minRows } = resolveRowLimits(spec);
  if (session.trials.length <= minRows) {
    return { session: cloneSession(session), needsConfirm: false };
  }
  const index = session.trials.findIndex((trial) => trial.id === rowId);
  if (index < 0) return { session: cloneSession(session), needsConfirm: false };
  const target = session.trials[index];
  if (trialHasContent(target, spec) && !confirmed) {
    return { session: cloneSession(session), needsConfirm: true };
  }
  const next = invalidateSummary(session, spec);
  next.trials = next.trials.filter((trial) => trial.id !== rowId);
  if (next.currentTrial >= next.trials.length) {
    next.currentTrial = Math.max(0, next.trials.length - 1);
  }
  return { session: next, needsConfirm: false };
}

export function applyFieldDrafts(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec,
  drafts: readonly DataWorkspaceDraft[]
): DataWorkspaceSession {
  let next = cloneSession(session);
  for (const draft of drafts) {
    if (!isRowField(spec, draft.field)) continue;
    const trialIndex = draft.rowId
      ? next.trials.findIndex((item) => item.id === draft.rowId)
      : -1;
    if (trialIndex < 0) continue;
    const current = next.trials[trialIndex]?.fields[draft.field];
    if (current && current.raw === draft.raw) continue;
    next = invalidateDownstream(next, trialIndex, draft.field, spec);
    const trial = next.trials[trialIndex];
    if (!trial) continue;
    trial.fields[draft.field] = {
      raw: draft.raw,
      value: Number.NaN,
      checked: false,
      stale: false,
      snapshot: undefined,
      feedback: undefined,
      failedAttempts: current?.failedAttempts
    };
  }
  return next;
}

export function formatReadinessHint(
  field: DataWorkspaceFieldSpec,
  rowCount: number
): string {
  if (rowCount === 1 && field.readinessHintOne) return field.readinessHintOne;
  return (field.readinessHint ?? '').replace(/\{rowCount\}/g, String(rowCount));
}

export function allTrialsComplete(
  session: DataWorkspaceSession,
  specOrCount: DataWorkspaceSpec | number = 1
): boolean {
  if (typeof specOrCount === 'number') {
    const minRows = Math.max(1, Math.floor(specOrCount));
    if (session.trials.length < minRows) return false;
    return session.trials.every((trial) =>
      Object.values(trial.fields).some((field) => fieldIsOk(field))
    );
  }
  const spec = specOrCount;
  const { minRows } = resolveRowLimits(spec);
  if (session.trials.length < minRows) return false;
  const allRowDeps = spec.summaryFields.flatMap((field) =>
    (field.dependsOn ?? []).filter((dep) => dep.scope === 'all-rows')
  );
  if (allRowDeps.length === 0) {
    return session.trials.every((trial) =>
      spec.rowFields.every((field) => fieldIsOk(trial.fields[field.id]))
    );
  }
  return session.trials.every((trial) =>
    allRowDeps.every((dep) => fieldIsOk(trial.fields[dep.field]))
  );
}

export function summaryContextItems(
  knowns: readonly DataWorkspaceKnown[],
  keys: readonly string[] | undefined
): DataWorkspaceKnown[] {
  if (!keys || keys.length === 0) return [];
  const byKey = new Map(knowns.map((item) => [item.key, item]));
  return keys.flatMap((key) => {
    const item = byKey.get(key);
    return item ? [item] : [];
  });
}

export function checkedRowValues(
  session: DataWorkspaceSession,
  fieldId: string
): number[] {
  return session.trials
    .map((trial) => trial.fields[fieldId])
    .filter((field): field is FieldCheckState => fieldIsOk(field))
    .map((field) => field.value);
}

export function formatResultText(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec
): string | null {
  const result = spec.result;
  if (!result) return null;
  const state = getSummaryField(session, result.field);
  if (!session.completed || !fieldIsOk(state) || !state) return null;
  const field = findFieldSpec(spec, result.field);
  const digits = result.digits ?? 0;
  return result.template
    .replaceAll('{value}', state.value.toFixed(digits))
    .replaceAll('{unit}', field?.unit ?? '');
}
