/**
 * Data-workspace types and pure validation.
 *
 * readout  = 只读 HUD / 状态
 * data-workspace = 可填写、可校验的数据工作区（独立 slot / capability）
 * graph    = 可选图表区（仅当任务显式 chartAnalysis 时使用）
 */

export const DATA_WORKSPACE_STEPS = [
  'reading',
  'data',
  'calculation',
  'chartAnalysis'
] as const;

export type DataWorkspaceStepKind = (typeof DATA_WORKSPACE_STEPS)[number];

export type DataWorkspaceLayoutConfig = {
  /** Reserved; chart visibility is owned by DataWorkspaceSpec.chartAnalysis. */
  chartAnalysis?: boolean;
};

export type DataWorkspaceStageMode = 'full' | 'instrument-only';

export type DataWorkspaceInputMode = 'decimal' | 'numeric' | 'text';

export type FieldDependencyScope = 'row' | 'all-rows' | 'summary';

export type FieldDependency = {
  scope: FieldDependencyScope;
  field: string;
};

export type DataWorkspaceFieldSpec = {
  id: string;
  label: string;
  unit?: string;
  inputMode?: DataWorkspaceInputMode;
  dependsOn?: readonly FieldDependency[];
  /** When true, native-disabled until dependsOn is satisfied. */
  gated?: boolean;
  readinessHint?: string;
  readinessHintOne?: string;
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
  rowFields: readonly DataWorkspaceFieldSpec[];
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
      // Invalidation only walks row→row, row→summary(all-rows), summary→summary.
      if (rowOwner && dep.scope !== 'row') {
        throw new Error(
          `[data-workspace] row field "${field.id}" cannot depend with scope "${dep.scope}" in spec "${spec.id}"`
        );
      }
      if (!rowOwner && dep.scope === 'row') {
        throw new Error(
          `[data-workspace] summary field "${field.id}" cannot use row scope; use all-rows in spec "${spec.id}"`
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
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const edges = (id: string): string[] => {
    const field = findFieldSpec(spec, id);
    return (field?.dependsOn ?? []).map((dep) => dep.field);
  };
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(
        `[data-workspace] cyclic field dependencies involving "${id}" in spec "${spec.id}"`
      );
    }
    visiting.add(id);
    for (const next of edges(id)) visit(next);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) visit(id);
}

type GraphNode = { loc: 'row' | 'summary'; id: string };

function nodeKey(node: GraphNode): string {
  return `${node.loc}:${node.id}`;
}

function dependentsOf(spec: DataWorkspaceSpec, node: GraphNode): GraphNode[] {
  const out: GraphNode[] = [];
  if (node.loc === 'row') {
    for (const field of spec.rowFields) {
      for (const dep of field.dependsOn ?? []) {
        if (dep.scope === 'row' && dep.field === node.id) {
          out.push({ loc: 'row', id: field.id });
        }
      }
    }
    for (const field of spec.summaryFields) {
      for (const dep of field.dependsOn ?? []) {
        if (dep.scope === 'all-rows' && dep.field === node.id) {
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

export function createTrialRecord(id: string): TrialRecord {
  return { id, fields: {} };
}

export function cloneSession(
  session: DataWorkspaceSession
): DataWorkspaceSession {
  const cloneField = (
    field: FieldCheckState | undefined
  ): FieldCheckState | undefined => (field ? { ...field } : undefined);
  return {
    active: session.active,
    currentTrial: session.currentTrial,
    completed: session.completed,
    lockedInstrumentId: session.lockedInstrumentId,
    nextRowSeq: session.nextRowSeq,
    summary: Object.fromEntries(
      Object.entries(session.summary).map(([key, value]) => [
        key,
        cloneField(value)
      ])
    ),
    trials: session.trials.map((trial) => ({
      id: trial.id,
      fields: Object.fromEntries(
        Object.entries(trial.fields).map(([key, value]) => [
          key,
          cloneField(value)
        ])
      )
    }))
  };
}

export function freezeSession(
  session: DataWorkspaceSession
): DataWorkspaceSession {
  for (const trial of session.trials) {
    Object.freeze(trial.fields);
    Object.freeze(trial);
  }
  Object.freeze(session.summary);
  Object.freeze(session.trials);
  return Object.freeze(session);
}

export function createEmptySession(
  specOrCount: DataWorkspaceSpec | number = 1
): DataWorkspaceSession {
  if (typeof specOrCount !== 'number') assertSpecGraph(specOrCount);
  const count =
    typeof specOrCount === 'number'
      ? Math.max(1, Math.floor(specOrCount))
      : resolveRowLimits(specOrCount).initialRows;
  return {
    active: false,
    trials: Array.from({ length: count }, (_, i) =>
      createTrialRecord(`row-${i + 1}`)
    ),
    currentTrial: 0,
    summary: {},
    completed: false,
    lockedInstrumentId: undefined,
    nextRowSeq: count + 1
  };
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

/**
 * Strict position raw-string format. Optional literal `mm` only.
 * Rejects shortened/padded fractionals and scientific notation.
 */
export function checkPositionRawFormat(
  raw: string,
  kind: PositionFormatKind
): FieldFeedback | null {
  const digits = positionFormatDigits(kind);
  const trimmed = raw.trim().replace(/，/g, '.');
  if (!trimmed) {
    return { ok: false, layer: 'format', message: '请输入有效数值' };
  }
  if (/[eE]/.test(trimmed)) {
    return {
      ok: false,
      layer: 'format',
      message: POSITION_FORMAT_MESSAGE[kind]
    };
  }
  const match = trimmed.match(
    /^[+-]?(0|[1-9]\d*)\.(\d+)(?:\s*([A-Za-zμµ]+))?$/
  );
  if (!match) {
    return {
      ok: false,
      layer: 'format',
      message: POSITION_FORMAT_MESSAGE[kind]
    };
  }
  if (match[2].length !== digits) {
    return {
      ok: false,
      layer: 'format',
      message: POSITION_FORMAT_MESSAGE[kind]
    };
  }
  return null;
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

export function parseStudentNumber(
  raw: string,
  expectedUnit: string
): ParsedStudentNumber {
  const trimmed = raw.trim().replace(/，/g, '.');
  if (!trimmed) {
    return { ok: false, layer: 'format', message: '请输入有效数值' };
  }
  const match = trimmed.match(
    /^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*([A-Za-zμµ]+)?$/i
  );
  if (!match) {
    return { ok: false, layer: 'format', message: '请输入有效数值' };
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return { ok: false, layer: 'format', message: '请输入有效数值' };
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

export function calculationTolerance(displayDigits: number): number {
  const digits = Number.isFinite(displayDigits)
    ? Math.max(0, Math.min(6, Math.round(displayDigits)))
    : 3;
  return 2 * 10 ** -digits;
}

export function instrumentToleranceMm(precisionMm: number): number {
  return Number.isFinite(precisionMm) && precisionMm > 0 ? precisionMm : 0.02;
}

export function quantizeExactDiscreteMm(rawMm: number, stepMm: number): number {
  const step = stepMm > 0 && Number.isFinite(stepMm) ? stepMm : 0.02;
  const q = Math.round(rawMm / step) * step;
  const decimals = Math.max(0, Math.min(8, Math.ceil(-Math.log10(step)) + 1));
  return Number(q.toFixed(decimals));
}

export function exactDiscreteEqual(
  submittedMm: number,
  canonicalMm: number
): boolean {
  return Math.abs(submittedMm - canonicalMm) < 5e-7;
}

export function estimatedRangeContains(
  submittedMm: number,
  centerMm: number,
  halfRangeMm: number,
  minMm?: number,
  maxMm?: number
): boolean {
  const half = halfRangeMm > 0 ? halfRangeMm : 0;
  let low = centerMm - half;
  let high = centerMm + half;
  if (typeof minMm === 'number') low = Math.max(low, minMm);
  if (typeof maxMm === 'number') high = Math.min(high, maxMm);
  const eps = 1e-9;
  return submittedMm + eps >= low && submittedMm - eps <= high;
}

export function readingStrategyOf(
  snapshot: MeasurementSnapshot
): ReadingStrategy {
  if (snapshot.readingStrategy) return snapshot.readingStrategy;
  return {
    kind: 'exact-discrete',
    stepMm: instrumentToleranceMm(snapshot.precisionMm)
  };
}

export function readingsAgree(
  submittedMm: number,
  actualMm: number,
  precisionMm: number
): boolean {
  return (
    Math.abs(submittedMm - actualMm) <=
    instrumentToleranceMm(precisionMm) + 1e-12
  );
}

export function looksLikeWrongUnit(
  submitted: number,
  actualMm: number,
  precisionMm: number
): boolean {
  const tol = instrumentToleranceMm(precisionMm);
  if (readingsAgree(submitted, actualMm, precisionMm)) return false;
  if (readingsAgree(submitted * 10, actualMm, precisionMm)) return true;
  if (readingsAgree(submitted / 10, actualMm, precisionMm)) return true;
  if (Math.abs(actualMm) > tol && Math.abs(submitted / actualMm - 0.1) < 0.05) {
    return true;
  }
  if (Math.abs(actualMm) > tol && Math.abs(submitted / actualMm - 10) < 0.05) {
    return true;
  }
  return false;
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

function markStale(
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
  if (isRowField(spec, field)) return { loc: 'row', id: field };
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
  const trial = next.trials[trialIndex];
  for (const node of downstream) {
    if (node.loc === 'row' && trial) {
      trial.fields[node.id] = markStale(trial.fields[node.id]);
    } else if (node.loc === 'summary') {
      next.summary[node.id] = markStale(next.summary[node.id]);
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
    next.summary[id] = markStale(next.summary[id]);
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
    next.summary[id] = markStale(next.summary[id]);
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
  if (dep.scope === 'row') {
    const trial = trialIndex != null ? session.trials[trialIndex] : undefined;
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
