/**
 * Data-workspace types and pure validation.
 *
 * readout  = 只读 HUD / 状态
 * data-workspace = 可填写、可校验的数据工作区（独立 slot / capability）
 * graph    = 可选图表区（仅当任务显式 chartAnalysis 时使用）
 */

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
} from './tolerance';
export { assertAcyclicDependencies } from './validation';
export {
  cloneSession,
  createEmptySession,
  createTrialRecord,
  freezeSession
} from './session';

export { DATA_WORKSPACE_STEPS } from './types';
export type {
  DataWorkspaceDraft,
  DataWorkspaceEligibility,
  DataWorkspaceFieldId,
  DataWorkspaceFieldResult,
  DataWorkspaceFieldSpec,
  DataWorkspaceFieldSubmit,
  DataWorkspaceHost,
  DataWorkspaceInputMode,
  DataWorkspaceKnown,
  DataWorkspaceResultSpec,
  DataWorkspaceRowCheckStage,
  DataWorkspaceSession,
  DataWorkspaceSpec,
  DataWorkspaceStageMode,
  DataWorkspaceStepKind,
  DataWorkspaceSummarySpec,
  DataWorkspaceTableOrientation,
  EstimatedRangeReading,
  ExactDiscreteReading,
  FeedbackLayer,
  FieldCheckState,
  FieldDependency,
  FieldDependencyScope,
  FieldFeedback,
  MeasurementSnapshot,
  ParsedStudentNumber,
  ReadingStrategy,
  TrialRecord
} from './types';

export { createDataWorkspaceHost } from './host';
export type {
  CreateDataWorkspaceHostOptions,
  DataWorkspaceHostEffects,
  DataWorkspaceHostExtensions,
  DataWorkspaceHostFacade,
  DataWorkspaceHostNotifyEffect,
  DataWorkspaceHostSubmitEffect
} from './host';

export {
  chartStepReady,
  dependencySatisfied,
  fieldIsOk,
  findFieldSpec,
  getSummaryField,
  getTrialField,
  isChartField,
  isFieldReady,
  isRowField,
  isSummaryField,
  resolveRowLimits,
  shouldEnableStagePanZoom,
  shouldShowChartAnalysis,
  trialLabel
} from './spec-queries';

export {
  assertSpecGraph,
  rowCheckStageState,
  stagedFieldReadiness
} from './spec-validation';
export type {
  RowCheckStageState,
  StagedFieldReadiness
} from './spec-validation';

export {
  checkInstrumentReading,
  checkNumericFormat,
  checkPositionRawFormat,
  nextFailedAttempts,
  normalizeStudentNumericLiteral,
  parseStudentNumber,
  positionFormatDigits,
  positionFormatKindFromSnapshot,
  withAttemptReference
} from './numeric-format';
export type {
  NumericFormatOptions,
  ParseStudentNumberOptions,
  PositionFormatKind
} from './numeric-format';

export {
  addSessionTrial,
  allTrialsComplete,
  applyFieldDrafts,
  checkedRowValues,
  formatReadinessHint,
  formatResultText,
  invalidateAllTrials,
  invalidateDownstream,
  invalidateSummary,
  markFieldStale,
  removeSessionTrial,
  summaryContextItems,
  trialHasContent,
  writeCheckedField
} from './session-ops';
