/**
 * Spec and session query helpers (leaf; no validation/session-ops imports).
 */
import type {
  DataWorkspaceFieldSpec,
  DataWorkspaceSession,
  DataWorkspaceSpec,
  FieldCheckState,
  FieldDependency,
  TrialRecord
} from './types';

export function shouldShowChartAnalysis(spec: DataWorkspaceSpec): boolean {
  return (
    spec.chartAnalysis === true && spec.enabledSteps.includes('chartAnalysis')
  );
}

/** Stage pan/zoom is on unless the spec explicitly opts out. */
export function shouldEnableStagePanZoom(spec: DataWorkspaceSpec): boolean {
  return spec.stagePanZoom !== false;
}

export function resolveRowLimits(spec: DataWorkspaceSpec): {
  minRows: number;
  maxRows: number;
  initialRows: number;
} {
  const minRows = Math.max(1, Math.floor(spec.minRows ?? 1));
  const maxRows = Math.max(minRows, Math.floor(spec.maxRows ?? minRows));
  const initialRows = Math.min(
    maxRows,
    Math.max(minRows, Math.floor(spec.initialRows ?? minRows))
  );
  return { minRows, maxRows, initialRows };
}

export function trialLabel(spec: DataWorkspaceSpec, index: number): string {
  return spec.trialLabels?.[index] ?? String(index + 1);
}

export function fieldIsOk(field: FieldCheckState | undefined): boolean {
  return Boolean(field?.checked && field.feedback?.ok && !field.stale);
}

export function getTrialField(
  trial: TrialRecord | undefined,
  id: string
): FieldCheckState | undefined {
  return trial?.fields[id];
}

export function getSummaryField(
  session: DataWorkspaceSession,
  id: string
): FieldCheckState | undefined {
  return session.summary[id];
}

export function isRowField(spec: DataWorkspaceSpec, id: string): boolean {
  return spec.rowFields.some((field) => field.id === id);
}

export function isSummaryField(spec: DataWorkspaceSpec, id: string): boolean {
  return spec.summaryFields.some((field) => field.id === id);
}

export function findFieldSpec(
  spec: DataWorkspaceSpec,
  id: string
): DataWorkspaceFieldSpec | undefined {
  return (
    spec.rowFields.find((field) => field.id === id) ??
    spec.summaryFields.find((field) => field.id === id)
  );
}

export function isChartField(
  spec: DataWorkspaceSpec,
  fieldId: string
): boolean {
  const field = findFieldSpec(spec, fieldId);
  return field?.step === 'chartAnalysis';
}

export function chartStepReady(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec
): boolean {
  if (session.trials.length === 0) return false;
  const rowsOk = session.trials.every((trial) =>
    spec.rowFields.every((field) => fieldIsOk(trial.fields[field.id]))
  );
  if (!rowsOk) return false;
  return spec.summaryFields
    .filter((field) => field.step !== 'chartAnalysis')
    .every((field) => {
      const state = session.summary[field.id];
      // Optional fields are exempt only while genuinely empty. Once submitted,
      // an optional value must pass the same grading contract as required data.
      if (field.optional && !state?.raw?.trim()) return true;
      return fieldIsOk(state);
    });
}

export function dependencySatisfied(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec,
  dep: FieldDependency,
  trialIndex?: number
): boolean {
  if (dep.scope === 'row' || dep.scope === 'neighbor-row') {
    if (trialIndex == null) return false;
    const offset = dep.scope === 'neighbor-row' ? dep.offset : 0;
    const trial = session.trials[trialIndex + offset];
    return fieldIsOk(getTrialField(trial, dep.field));
  }
  if (dep.scope === 'all-rows') {
    const { minRows } = resolveRowLimits(spec);
    if (session.trials.length < minRows) return false;
    return session.trials.every((trial) =>
      fieldIsOk(getTrialField(trial, dep.field))
    );
  }
  return fieldIsOk(getSummaryField(session, dep.field));
}

export function isFieldReady(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec,
  fieldId: string,
  trialIndex?: number
): boolean {
  const field = findFieldSpec(spec, fieldId);
  if (!field) return false;
  if (!field.gated) return true;
  return (field.dependsOn ?? []).every((dep) =>
    dependencySatisfied(session, spec, dep, trialIndex)
  );
}
