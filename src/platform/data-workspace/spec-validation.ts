/**
 * Spec graph / rowCheck stage validation and derived stage cursors.
 */
import {
  dependencySatisfied,
  fieldIsOk,
  findFieldSpec,
  getTrialField,
  isRowField,
  isSummaryField,
  resolveRowLimits,
  shouldShowChartAnalysis
} from './spec-queries';
import {
  NEIGHBOR_ROW_MAX_OFFSET,
  type DataWorkspaceRowCheckStage,
  type DataWorkspaceSession,
  type DataWorkspaceSpec
} from './types';
import { assertAcyclicDependencies } from './validation';

function allFieldIds(spec: DataWorkspaceSpec): Set<string> {
  return new Set([
    ...spec.rowFields.map((field) => field.id),
    ...spec.summaryFields.map((field) => field.id)
  ]);
}

/**
 * Validated spec identities. Spec objects are frozen module constants in
 * every scene; submit paths call assertSpecGraph on every write, so the
 * result is memoized per instance. A spec that fails is never added, so
 * repeated assertions on a broken spec keep throwing.
 */
const validatedSpecs = new WeakSet<object>();

export function assertSpecGraph(spec: DataWorkspaceSpec): void {
  if (validatedSpecs.has(spec)) return;
  const ids = allFieldIds(spec);
  if (ids.size !== spec.rowFields.length + spec.summaryFields.length) {
    throw new Error(`[data-workspace] duplicate field id in spec "${spec.id}"`);
  }
  const ownerIsRow = (id: string) => isRowField(spec, id);
  for (const field of [...spec.rowFields, ...spec.summaryFields]) {
    const rowOwner = ownerIsRow(field.id);
    for (const dep of field.dependsOn ?? []) {
      if (!ids.has(dep.field)) {
        throw new Error(
          `[data-workspace] unknown dependency "${dep.field}" on field "${field.id}" in spec "${spec.id}"`
        );
      }
      if (dep.scope === 'row' && !isRowField(spec, dep.field)) {
        throw new Error(
          `[data-workspace] row-scoped dependency "${dep.field}" is not a row field`
        );
      }
      if (dep.scope === 'neighbor-row') {
        if (!isRowField(spec, dep.field)) {
          throw new Error(
            `[data-workspace] neighbor-row dependency "${dep.field}" is not a row field`
          );
        }
        if (
          !Number.isInteger(dep.offset) ||
          dep.offset === 0 ||
          Math.abs(dep.offset) > NEIGHBOR_ROW_MAX_OFFSET
        ) {
          throw new Error(
            `[data-workspace] neighbor-row dependency "${dep.field}" of "${field.id}" needs a non-zero integer offset within ±${NEIGHBOR_ROW_MAX_OFFSET} in spec "${spec.id}"`
          );
        }
      }
      if (dep.scope === 'all-rows' && !isRowField(spec, dep.field)) {
        throw new Error(
          `[data-workspace] all-rows dependency "${dep.field}" is not a row field`
        );
      }
      if (dep.scope === 'summary' && !isSummaryField(spec, dep.field)) {
        throw new Error(
          `[data-workspace] summary dependency "${dep.field}" is not a summary field`
        );
      }
      // Invalidation only walks row→row (same or neighbouring row),
      // row→summary(all-rows), summary→summary.
      if (rowOwner && dep.scope !== 'row' && dep.scope !== 'neighbor-row') {
        throw new Error(
          `[data-workspace] row field "${field.id}" cannot depend with scope "${dep.scope}" in spec "${spec.id}"`
        );
      }
      if (!rowOwner && (dep.scope === 'row' || dep.scope === 'neighbor-row')) {
        throw new Error(
          '[data-workspace] summary field "' +
            field.id +
            '" cannot use row scope; use all-rows in spec "' +
            spec.id +
            '"'
        );
      }
    }
  }
  if (spec.result && !isSummaryField(spec, spec.result.field)) {
    throw new Error(
      `[data-workspace] result.field "${spec.result.field}" must be a summary field in spec "${spec.id}"`
    );
  }
  if (spec.completionField && !isSummaryField(spec, spec.completionField)) {
    throw new Error(
      `[data-workspace] completionField "${spec.completionField}" must be a summary field in spec "${spec.id}"`
    );
  }
  if (
    spec.lockInstrumentFromField &&
    !isRowField(spec, spec.lockInstrumentFromField)
  ) {
    throw new Error(
      `[data-workspace] lockInstrumentFromField "${spec.lockInstrumentFromField}" must be a row field in spec "${spec.id}"`
    );
  }
  const orientation = spec.tableOrientation;
  if (
    orientation !== undefined &&
    orientation !== 'trials' &&
    orientation !== 'fields'
  ) {
    throw new Error(
      `[data-workspace] tableOrientation must be "trials" or "fields" in spec "${spec.id}"`
    );
  }
  if (spec.stageLock !== undefined && typeof spec.stageLock !== 'boolean') {
    throw new Error(
      `[data-workspace] stageLock must be a boolean in spec "${spec.id}"`
    );
  }
  if (
    spec.stagePanZoom !== undefined &&
    typeof spec.stagePanZoom !== 'boolean'
  ) {
    throw new Error(
      `[data-workspace] stagePanZoom must be a boolean in spec "${spec.id}"`
    );
  }
  if (spec.trialLabels !== undefined) {
    const { minRows } = resolveRowLimits(spec);
    if (!Array.isArray(spec.trialLabels) || spec.trialLabels.length < minRows) {
      throw new Error(
        `[data-workspace] trialLabels.length must be >= minRows (${minRows}) in spec "${spec.id}"`
      );
    }
  }
  for (const field of spec.rowFields) {
    if (field.step != null) {
      throw new Error(
        `[data-workspace] step is only allowed on summaryFields (field "${field.id}" in spec "${spec.id}")`
      );
    }
    if (field.optional) {
      throw new Error(
        `[data-workspace] optional is only allowed on summaryFields (field "${field.id}" in spec "${spec.id}")`
      );
    }
  }
  for (const field of spec.summaryFields) {
    if (field.step == null) continue;
    if (field.step !== 'chartAnalysis') {
      throw new Error(
        `[data-workspace] unsupported step "${String(field.step)}" on field "${field.id}" in spec "${spec.id}"`
      );
    }
    if (!shouldShowChartAnalysis(spec)) {
      throw new Error(
        `[data-workspace] field "${field.id}" cannot set step when chartAnalysis is off in spec "${spec.id}"`
      );
    }
  }
  assertRowCheckStages(spec);
  assertAcyclicDependencies(spec);
  validatedSpecs.add(spec);
}

function assertRowCheckStages(spec: DataWorkspaceSpec): void {
  const stages = spec.rowCheckStages;
  if (stages == null) return;
  if (stages.length === 0) {
    throw new Error(
      `[data-workspace] rowCheckStages must be a non-empty array in spec "${spec.id}"`
    );
  }
  const rowIds = spec.rowFields.map((field) => field.id);
  const rowIdSet = new Set(rowIds);
  const seenStageIds = new Set<string>();
  const seenFields = new Set<string>();
  const stageOf = new Map<string, { stageIndex: number; fieldIndex: number }>();

  stages.forEach((stage, stageIndex) => {
    const id = stage.id?.trim() ?? '';
    const label = stage.label?.trim() ?? '';
    if (!id) {
      throw new Error(
        `[data-workspace] rowCheckStages[${stageIndex}].id must be non-empty in spec "${spec.id}"`
      );
    }
    if (!label) {
      throw new Error(
        `[data-workspace] rowCheckStages "${id}" label must be non-empty in spec "${spec.id}"`
      );
    }
    if (seenStageIds.has(id)) {
      throw new Error(
        `[data-workspace] duplicate rowCheckStages id "${id}" in spec "${spec.id}"`
      );
    }
    seenStageIds.add(id);
    if (stage.fields.length === 0) {
      throw new Error(
        `[data-workspace] rowCheckStages "${id}" fields must be non-empty in spec "${spec.id}"`
      );
    }
    stage.fields.forEach((fieldId, fieldIndex) => {
      if (!rowIdSet.has(fieldId)) {
        throw new Error(
          `[data-workspace] rowCheckStages "${id}" field "${fieldId}" is not a row field in spec "${spec.id}"`
        );
      }
      if (seenFields.has(fieldId)) {
        throw new Error(
          `[data-workspace] field "${fieldId}" is repeated in rowCheckStages of spec "${spec.id}"`
        );
      }
      seenFields.add(fieldId);
      stageOf.set(fieldId, { stageIndex, fieldIndex });
    });
  });

  for (const fieldId of rowIds) {
    if (!seenFields.has(fieldId)) {
      throw new Error(
        `[data-workspace] rowCheckStages must cover every row field; missing "${fieldId}" in spec "${spec.id}"`
      );
    }
  }

  for (const field of spec.rowFields) {
    const owner = stageOf.get(field.id);
    if (!owner) continue;
    for (const dep of field.dependsOn ?? []) {
      if (dep.scope !== 'row') continue;
      const target = stageOf.get(dep.field);
      if (!target) continue;
      if (target.stageIndex > owner.stageIndex) {
        throw new Error(
          `[data-workspace] row dependency "${dep.field}" of "${field.id}" is in a later stage in spec "${spec.id}"`
        );
      }
      if (
        target.stageIndex === owner.stageIndex &&
        target.fieldIndex >= owner.fieldIndex
      ) {
        throw new Error(
          `[data-workspace] row dependency "${dep.field}" of "${field.id}" is not earlier in stage "${stages[owner.stageIndex]?.id}" in spec "${spec.id}"`
        );
      }
    }
  }
}

export type RowCheckStageState = {
  /** First incomplete stage. Null when none are declared or the row is done. */
  stage: DataWorkspaceRowCheckStage | null;
  /**
   * 1-based index of the first incomplete stage. Equals `total` when the
   * row is complete. 0 when the spec declares no stages.
   */
  index: number;
  total: number;
  completed: boolean;
};

function stageFieldsOk(
  session: DataWorkspaceSession,
  stage: DataWorkspaceRowCheckStage,
  trialIndex: number
): boolean {
  const trial = session.trials[trialIndex];
  return stage.fields.every((fieldId) =>
    fieldIsOk(getTrialField(trial, fieldId))
  );
}

/** Derived stage cursor. Does not read or write any session phase. */
export function rowCheckStageState(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec,
  trialIndex: number
): RowCheckStageState {
  const stages = spec.rowCheckStages;
  if (!stages || stages.length === 0) {
    return { stage: null, index: 0, total: 0, completed: false };
  }
  const incompleteAt = stages.findIndex(
    (stage) => !stageFieldsOk(session, stage, trialIndex)
  );
  if (incompleteAt < 0) {
    return {
      stage: null,
      index: stages.length,
      total: stages.length,
      completed: true
    };
  }
  return {
    stage: stages[incompleteAt] ?? null,
    index: incompleteAt + 1,
    total: stages.length,
    completed: false
  };
}

export type StagedFieldReadiness =
  | { ready: true }
  | { ready: false; reason: string };

/**
 * Stage submit gate. Independent of `gated` / `isFieldReady`.
 * Specs without `rowCheckStages` stay ready so legacy batching is unchanged.
 * Fields in an already completed earlier stage stay ready so they can be remeasured.
 */
export function stagedFieldReadiness(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec,
  fieldId: string,
  trialIndex: number
): StagedFieldReadiness {
  const stages = spec.rowCheckStages;
  if (!stages) return { ready: true };

  let stageIndex = -1;
  let fieldIndex = -1;
  for (let i = 0; i < stages.length; i += 1) {
    const at = stages[i]?.fields.indexOf(fieldId) ?? -1;
    if (at >= 0) {
      stageIndex = i;
      fieldIndex = at;
      break;
    }
  }
  if (stageIndex < 0) {
    return {
      ready: false,
      reason: `字段「${fieldId}」不在分阶段校验中`
    };
  }

  for (let i = 0; i < stageIndex; i += 1) {
    const earlier = stages[i];
    if (!earlier || stageFieldsOk(session, earlier, trialIndex)) continue;
    return {
      ready: false,
      reason: `先完成阶段「${earlier.label}」`
    };
  }

  const current = stages[stageIndex];
  const priorFields = current?.fields.slice(0, fieldIndex) ?? [];
  const trial = session.trials[trialIndex];
  for (const priorId of priorFields) {
    if (fieldIsOk(getTrialField(trial, priorId))) continue;
    const prior = findFieldSpec(spec, priorId);
    return {
      ready: false,
      reason: `先校对${prior?.label ?? priorId}`
    };
  }

  const field = findFieldSpec(spec, fieldId);
  for (const dep of field?.dependsOn ?? []) {
    if (dependencySatisfied(session, spec, dep, trialIndex)) continue;
    const depField = findFieldSpec(spec, dep.field);
    return {
      ready: false,
      reason: `先满足对${depField?.label ?? dep.field}的依赖`
    };
  }

  return { ready: true };
}
