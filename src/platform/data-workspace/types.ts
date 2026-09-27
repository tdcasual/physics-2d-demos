/**
 * Data-workspace public types and leaf constants.
 */
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
  /**
   * At height >= 640px, every layout that has a stage frame starts the
   * animation and the panel at half height, with a draggable boundary.
   * Absent keeps that layout's own stage height.
   */
  stageHalfSplit?: boolean;
  /**
   * Chart step starts with the review and the plot at equal height when the
   * viewport is at least 640px and no split ratio is stored. Absent means
   * the review follows its content.
   */
  chartEvenSplit?: boolean;
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
  /**
   * Visual-only stage activation, separate from setActive's session
   * semantics. Presentation-mode suspension restores stage visuals while
   * keeping the session active so the capability can auto re-enter when
   * presentation ends. Scenes whose open state has no stage side effects
   * may omit it.
   */
  setActiveVisual?(active: boolean): void;
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

export type GraphNode =
  | { loc: 'row'; id: string; rowOffset: number }
  | { loc: 'summary'; id: string };

/** Neighbour windows stay tiny; a larger offset is a modelling mistake. */
export const NEIGHBOR_ROW_MAX_OFFSET = 8;
