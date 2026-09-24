/**
 * Data-workspace types and pure validation.
 *
 * readout  = 只读 HUD / 状态
 * data-workspace = 可填写、可校验的数据工作区（独立 slot / capability）
 * graph    = 可选图表区（仅当任务显式 chartAnalysis 时使用）
 */

import {
  exactDiscreteEqual,
  estimatedRangeContains,
  looksLikeWrongUnit,
  quantizeExactDiscreteMm,
  readingStrategyOf
} from './data-workspace/tolerance';
import { assertAcyclicDependencies } from './data-workspace/validation';
import { cloneSession, createTrialRecord } from './data-workspace/session';

export {
  calculationTolerance,
  exactDiscreteEqual,
  estimatedRangeContains,
  instrumentToleranceMm,
  looksLikeWrongUnit,
  quantizeExactDiscreteMm,
  readingStrategyOf,
  readingsAgree,
  roundToSignificantDigits,
  significantRoundingHalfUnit,
  withinEpsilon,
  withinTickTolerance
} from './data-workspace/tolerance';
export { assertAcyclicDependencies } from './data-workspace/validation';
export {
  cloneSession,
  createEmptySession,
  createTrialRecord,
  freezeSession
} from './data-workspace/session';

export const DATA_WORKSPACE_STEPS = [
  'reading',
  'data',
  'calculation',
  'chartAnalysis'
] as const;

export type DataWorkspaceStepKind = (typeof DATA_WORKSPACE_STEPS)[number];

export type DataWorkspaceStageMode = 'full' | 'instrument-only';

export type DataWorkspaceInputMode = 'decimal' | 'numeric' | 'text';

export type FieldDependencyScope =
  | 'row'
  | 'neighbor-row'
  | 'all-rows'
  | 'summary';

/**
 * `row` / `all-rows` / `summary` read the field in the same row / every row /
 * the summary block. `neighbor-row` additionally shifts the row window by
 * `offset`: Δx_i = x_i − x_{i−1} is `{ scope: 'neighbor-row', field: 'x',
 * offset: -1 }`, a centred difference v_i = (x_{i+1} − x_{i−1}) needs both
 * −1 and +1. Invalidation follows the same edge, so editing one row's x
 * expires the neighbouring rows' derived values instead of leaving them
 * wrongly "checked".
 */
export type FieldDependency =
  | { scope: 'row' | 'all-rows' | 'summary'; field: string }
  | { scope: 'neighbor-row'; field: string; offset: number };

export type DataWorkspaceTableOrientation = 'trials' | 'fields';

export type DataWorkspaceFieldSpec = {
  id: string;
  label: string;
  unit?: string;
  inputMode?: DataWorkspaceInputMode;
  dependsOn?: readonly FieldDependency[];
  /** When true, native-disabled until dependsOn is satisfied. */
  gated?: boolean;
  /**
   * Always-visible, one-line precision/digit requirement for this field
   * (e.g. 「3 位有效数字」). Rendered next to the field label so touch and
   * keyboard users see the rule without hovering a title.
   */
  formatHint?: string;
  readinessHint?: string;
  readinessHintOne?: string;
  /** Chart-analysis summary fields only. Default is the data step. */
  step?: 'chartAnalysis';
  /**
   * Summary fields only: the field may stay empty without blocking
   * chartStepReady (e.g. an alternative evaluation method). Grading and
   * dependsOn still apply whenever the student does fill it in.
   */
  optional?: boolean;
};

/** Optional calculation-section presentation. Keys refer to getKnowns(). */
export type DataWorkspaceSummarySpec = {
  contextKnownKeys?: readonly string[];
};

export type DataWorkspaceResultSpec = {
  field: string;
  template: string;
  digits?: number;
};

/** Ordered batch within one trial. Progress is derived, never stored. */
export type DataWorkspaceRowCheckStage = {
  id: string;
  label: string;
  fields: readonly DataWorkspaceFieldId[];
  hint?: string;
};

export type DataWorkspaceSpec = {
  id: string;
  title: string;
  /** When false, the workspace must not render an empty graph region. */
  chartAnalysis: boolean;
  enabledSteps: readonly DataWorkspaceStepKind[];
  /** @deprecated Prefer minRows/maxRows/initialRows. Kept as max-row fallback. */
  trialCount: number;
  minRows?: number;
  maxRows?: number;
  initialRows?: number;
  /** full = keep the scene canvas; instrument-only = hide it (per-spec). */
  stageMode?: DataWorkspaceStageMode;
  /** trials = one trial per row (default). fields = one field per row. */
  tableOrientation?: DataWorkspaceTableOrientation;
  /** When true, the capability locks stage pointer events while the workspace is open. */
  stageLock?: boolean;
  /**
   * Stage pan/zoom while the workspace is open. Default true (architecture
   * capability). Set false to opt out. Scene widgets that must keep their
   * own pointer drag should mark `data-panzoom-ignore`.
   */
  stagePanZoom?: boolean;
  /** Per-trial display labels (e.g. counting points 0..6). Default: 1-based 组号. */
  trialLabels?: readonly string[];
  rowFields: readonly DataWorkspaceFieldSpec[];
  /**
   * Omit for legacy “check the whole row” batching. An empty array is illegal.
   * When set, stages are the only check order and must cover every row field.
   */
  rowCheckStages?: readonly DataWorkspaceRowCheckStage[];
  summaryFields: readonly DataWorkspaceFieldSpec[];
  summary?: DataWorkspaceSummarySpec;
  result?: DataWorkspaceResultSpec;
  completionField?: string;
  lockInstrumentFromField?: string;
};

export type DataWorkspaceEligibility =
  | { ok: true }
  | { ok: false; reason: string };

export type FeedbackLayer =
  | 'format'
  | 'unit'
  | 'range'
  | 'instrument'
  | 'relation';

export type DataWorkspaceKnown = {
  key: string;
  label: string;
  value: string;
};

export type ExactDiscreteReading = {
  kind: 'exact-discrete';
  /** Unique allowed tick, mm. */
  stepMm: number;
};

export type EstimatedRangeReading = {
  kind: 'estimated-range';
  /** Closed half-width around the continuous reading, mm. */
  halfRangeMm: number;
  minMm?: number;
  maxMm?: number;
};

export type ReadingStrategy = ExactDiscreteReading | EstimatedRangeReading;

export type MeasurementSnapshot = {
  readingMm: number;
  precisionMm: number;
  displayDigits: number;
  instrumentId: string;
  instrumentLabel: string;
  capturedAt: number;
  /** True only when the instrument reports an aligned reading. */
  aligned: boolean;
  residualPx: number;
  readingStrategy?: ReadingStrategy;
  /** Scene-owned extras. Session code must not require them. */
  metadata?: Readonly<Record<string, unknown>>;
};

export type DataWorkspaceFieldId = string;

export type FieldCheckState = {
  raw: string;
  value: number;
  checked: boolean;
  stale: boolean;
  snapshot?: MeasurementSnapshot;
  feedback?: FieldFeedback;
  /** Per-row per-field failed submissions. Generic; counting policy is caller-owned. */
  failedAttempts?: number;
};

export type TrialRecord = {
  id: string;
  fields: Record<string, FieldCheckState | undefined>;
};

export type DataWorkspaceSession = {
  active: boolean;
  trials: TrialRecord[];
  currentTrial: number;
  summary: Record<string, FieldCheckState | undefined>;
  completed: boolean;
  /** First successful lockInstrumentFromField locks the instrument. */
  lockedInstrumentId?: string;
  nextRowSeq: number;
};

export type FieldFeedback = {
  ok: boolean;
  layer?: FeedbackLayer;
  message: string;
};

export type ParsedStudentNumber =
  | { ok: true; value: number; unit?: string }
  | { ok: false; layer: FeedbackLayer; message: string };

export type DataWorkspaceFieldSubmit = {
  trialIndex?: number;
  field: DataWorkspaceFieldId;
  raw: string;
};

export type DataWorkspaceDraft = {
  rowId?: string;
  field: DataWorkspaceFieldId;
  raw: string;
};

export type DataWorkspaceFieldResult = {
  feedback: FieldFeedback;
  session: DataWorkspaceSession;
};

export type DataWorkspaceHost = {
  getSpec(): DataWorkspaceSpec;
  getEligibility(): DataWorkspaceEligibility;
  getSession(): DataWorkspaceSession;
  getKnowns(): DataWorkspaceKnown[];
  getHint(): string;
  setActive(active: boolean): void;
  submitField(input: DataWorkspaceFieldSubmit): DataWorkspaceFieldResult;
  applyDrafts(drafts: readonly DataWorkspaceDraft[]): DataWorkspaceSession;
  resetSession(): void;
  syncInstrument(instrumentId: string): void;
  addTrial(): DataWorkspaceSession;
  removeTrial(
    rowId: string,
    confirmed?: boolean
  ): { session: DataWorkspaceSession; needsConfirm: boolean };
  renderResult?(session: DataWorkspaceSession): string | null;
};

const UNIT_ALIASES: Record<string, string> = {
  mm: 'mm',
  cm: 'cm',
  nm: 'nm',
  m: 'm',
  μm: 'μm',
  um: 'μm'
};

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
  const maxRows = Math.max(
    minRows,
    Math.floor(spec.maxRows ?? spec.trialCount ?? minRows)
  );
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

function allFieldIds(spec: DataWorkspaceSpec): Set<string> {
  return new Set([
    ...spec.rowFields.map((field) => field.id),
    ...spec.summaryFields.map((field) => field.id)
  ]);
}

export function assertSpecGraph(spec: DataWorkspaceSpec): void {
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

type GraphNode =
  | { loc: 'row'; id: string; rowOffset: number }
  | { loc: 'summary'; id: string };

/** Neighbour windows stay tiny; a larger offset is a modelling mistake. */
const NEIGHBOR_ROW_MAX_OFFSET = 8;

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

export type PositionFormatKind = 'caliper' | 'micrometer';

export function positionFormatKindFromSnapshot(
  snapshot: MeasurementSnapshot | null | undefined
): PositionFormatKind | null {
  if (!snapshot) return null;
  if (snapshot.instrumentId === 'micrometer') return 'micrometer';
  if (snapshot.instrumentId === 'caliper') return 'caliper';
  return null;
}

export function positionFormatDigits(kind: PositionFormatKind): 2 | 3 {
  return kind === 'caliper' ? 2 : 3;
}

const POSITION_FORMAT_MESSAGE: Record<PositionFormatKind, string> = {
  caliper: '游标卡尺读数须恰好两位小数',
  micrometer: '测微仪读数须恰好三位小数'
};

export type NumericFormatOptions = {
  /** Require exactly this many fractional digits (implies a decimal point). */
  decimalPlaces?: number;
  /**
   * Require exactly this many significant digits in the plain decimal
   * literal (e.g. `0.120` = 3 digits, `0.12` = 2). Counted on the raw
   * string, trailing zeros count, leading zeros do not. Incompatible with
   * `integer`.
   */
  significantDigits?: number;
  /** Require an integer literal (`/^[+-]?\d+$/` after trim; leading zeros ok). */
  integer?: boolean;
  /** Allow scientific notation. Default rejects any `e`/`E` anywhere. */
  allowScientific?: boolean;
  /** Allow a trailing letter-like unit suffix (`mm`, `cm`, …). Default true. */
  allowUnitSuffix?: boolean;
  /** Message for empty/blank input. Default 「请输入有效数值」. */
  emptyMessage?: string;
  /** Message for format / decimal-place / scientific failures. */
  formatMessage?: string;
};

const EMPTY_INPUT_MESSAGE = '请输入有效数值';

/**
 * Declarative numeric format gate for measurement inputs, shared by all
 * data-workspace scenes. Returns null when `raw` passes; otherwise a
 * `format`-layer feedback. Decimal-place counting works on the raw string
 * (never through binary floats). Scenes must not assemble their own regexes.
 */
export function checkNumericFormat(
  raw: string,
  options: NumericFormatOptions = {}
): FieldFeedback | null {
  const emptyMessage = options.emptyMessage ?? EMPTY_INPUT_MESSAGE;
  const formatMessage = options.formatMessage ?? emptyMessage;
  const trimmed = raw.trim().replace(/，/g, '.');
  if (!trimmed) {
    return { ok: false, layer: 'format', message: emptyMessage };
  }
  if (!options.allowScientific && /[eE]/.test(trimmed)) {
    return { ok: false, layer: 'format', message: formatMessage };
  }
  if (options.integer) {
    const suffix =
      options.allowUnitSuffix === false ? '' : '(?:\\s*[A-Za-zµμ]+)?';
    if (!new RegExp(`^[+-]?\\d+${suffix}$`).test(trimmed)) {
      return { ok: false, layer: 'format', message: formatMessage };
    }
    return null;
  }
  if (options.significantDigits != null) {
    // 统计在去符号、去单位后缀的裸字面量上进行：前导零不算有效数字，
    // 末尾零算（0.120 = 3 位，0.12 = 2 位）。
    const body = trimmed.replace(/^[+-]/, '').replace(/\s*[A-Za-zµμ]+$/, '');
    const match = body.match(/^(0|[1-9]\d*)(?:\.(\d+))?$/);
    if (
      !match ||
      `${match[1]}${match[2] ?? ''}`.replace(/^0+/, '').length !==
        options.significantDigits
    ) {
      return { ok: false, layer: 'format', message: formatMessage };
    }
    if (options.decimalPlaces == null) return null;
    if ((match[2] ?? '').length !== options.decimalPlaces) {
      return { ok: false, layer: 'format', message: formatMessage };
    }
    return null;
  }
  if (options.decimalPlaces == null) {
    // Syntax-only mode: emptiness and scientific notation checked above;
    // remaining grammar is parseStudentNumber's business.
    return null;
  }
  const suffix =
    options.allowUnitSuffix === false ? '' : '(?:\\s*([A-Za-zµμ]+))?';
  const match = trimmed.match(
    new RegExp(`^[+-]?(0|[1-9]\\d*)\\.(\\d+)${suffix}$`)
  );
  if (!match) {
    return { ok: false, layer: 'format', message: formatMessage };
  }
  if (match[2].length !== options.decimalPlaces) {
    return { ok: false, layer: 'format', message: formatMessage };
  }
  return null;
}

/**
 * Strict position raw-string format for instrument-read positions: exactly
 * the instrument's fractional digit count, optional letter-like unit suffix
 * (suffix spelling is NOT validated to be `mm` — historically shape-only),
 * no scientific notation, no leading zeros in the integer part.
 * Thin delegate over {@link checkNumericFormat}; keep behaviour in lockstep.
 */
export function checkPositionRawFormat(
  raw: string,
  kind: PositionFormatKind
): FieldFeedback | null {
  return checkNumericFormat(raw, {
    decimalPlaces: positionFormatDigits(kind),
    formatMessage: POSITION_FORMAT_MESSAGE[kind]
  });
}

export function nextFailedAttempts(
  previous: number | undefined,
  options: { ok: boolean; count: boolean }
): number {
  if (options.ok) return 0;
  if (!options.count) return previous ?? 0;
  return (previous ?? 0) + 1;
}

export function withAttemptReference(
  feedback: FieldFeedback,
  failedAttempts: number,
  reference: string | undefined
): FieldFeedback {
  if (feedback.ok || failedAttempts < 3 || !reference) return feedback;
  return {
    ...feedback,
    message: `${feedback.message}（参考 ${reference}）`
  };
}

export type ParseStudentNumberOptions = {
  /** Accept scientific notation (`1.2e-3`). Default rejects it. */
  allowScientific?: boolean;
};

// 全角逗号静默归一为小数点是既有行为（CJK 输入习惯），由测试钉住；
// 半角逗号/全角句点不在归一范围内，保持「请输入有效数值」。
// 测量读数默认拒绝科学计数法；`allowScientific` 仅供非读数场景逃生。
const STUDENT_NUMBER_PATTERN = /^([+-]?\d+(?:\.\d+)?)\s*([A-Za-zµμ]+)?$/i;
const STUDENT_NUMBER_SCIENTIFIC_PATTERN =
  /^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*([A-Za-zµμ]+)?$/i;

export function parseStudentNumber(
  raw: string,
  expectedUnit: string,
  options: ParseStudentNumberOptions = {}
): ParsedStudentNumber {
  const trimmed = raw.trim().replace(/，/g, '.');
  if (!trimmed) {
    return { ok: false, layer: 'format', message: EMPTY_INPUT_MESSAGE };
  }
  const match = trimmed.match(
    options.allowScientific
      ? STUDENT_NUMBER_SCIENTIFIC_PATTERN
      : STUDENT_NUMBER_PATTERN
  );
  if (!match) {
    return { ok: false, layer: 'format', message: EMPTY_INPUT_MESSAGE };
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return { ok: false, layer: 'format', message: EMPTY_INPUT_MESSAGE };
  }
  const unitToken = match[2];
  if (unitToken) {
    const unit =
      UNIT_ALIASES[unitToken.toLowerCase()] ?? unitToken.toLowerCase();
    if (unit !== expectedUnit) {
      return {
        ok: false,
        layer: 'unit',
        message: `请使用 ${expectedUnit}，不要换算后偷偷改写单位`
      };
    }
    return { ok: true, value, unit };
  }
  return { ok: true, value };
}

export function checkInstrumentReading(
  submittedMm: number,
  snapshot: MeasurementSnapshot | null | undefined
): FieldFeedback {
  if (!snapshot) {
    return {
      ok: false,
      layer: 'instrument',
      message: '请先对准仪器后再校对读数'
    };
  }
  if (!snapshot.aligned) {
    return {
      ok: false,
      layer: 'instrument',
      message: '准星未对准亮纹，请先对准后再读数'
    };
  }
  if (
    looksLikeWrongUnit(submittedMm, snapshot.readingMm, snapshot.precisionMm)
  ) {
    return {
      ok: false,
      layer: 'unit',
      message: '数值与当前读数差一个数量级，请确认单位是 mm'
    };
  }
  const strategy = readingStrategyOf(snapshot);
  if (strategy.kind === 'exact-discrete') {
    const canonical = quantizeExactDiscreteMm(
      snapshot.readingMm,
      strategy.stepMm
    );
    if (!exactDiscreteEqual(submittedMm, canonical)) {
      return {
        ok: false,
        layer: 'instrument',
        message: '与当前游标位置不符，请按最小分度重新读取'
      };
    }
    return { ok: true, message: '读数已校对' };
  }
  if (
    !estimatedRangeContains(
      submittedMm,
      snapshot.readingMm,
      strategy.halfRangeMm,
      strategy.minMm,
      strategy.maxMm
    )
  ) {
    return {
      ok: false,
      layer: 'instrument',
      message: '请重新观察主尺和微分筒后再估读'
    };
  }
  return { ok: true, message: '估读在合理范围内' };
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
