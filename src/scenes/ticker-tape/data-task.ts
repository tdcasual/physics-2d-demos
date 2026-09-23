/**
 * 打点计时器纸带数据处理任务。
 *
 * 学生只需从纸带读取 x，随后手算 Δx、v，并用 v–t 图像拟合加速度。
 * 真值始终来自场景状态中的带误差纸带位置 tapeXCm。
 */

import {
  checkNumericFormat,
  significantRoundingHalfUnit,
  withinEpsilon,
  withinTickTolerance,
  addSessionTrial,
  applyFieldDrafts,
  cloneSession,
  createEmptySession,
  fieldIsOk,
  freezeSession,
  getSummaryField,
  getTrialField,
  invalidateAllTrials,
  markFieldStale,
  parseStudentNumber,
  removeSessionTrial,
  writeCheckedField,
  type DataWorkspaceDraft,
  type DataWorkspaceEligibility,
  type DataWorkspaceFieldResult,
  type DataWorkspaceFieldSubmit,
  type DataWorkspaceHost,
  type DataWorkspaceKnown,
  type DataWorkspaceSession,
  type DataWorkspaceSpec,
  type FieldCheckState,
  type FieldFeedback
} from '../../platform/data-workspace';
import {
  computeSuccessiveAMs2,
  fitLineDroppingOutliers,
  type TickerTapeState
} from './scene.sim';

export const tickerTapeDataWorkspaceSpec: DataWorkspaceSpec = {
  id: 'ticker-tape-vt',
  title: '纸带数据处理与 v–t 图像分析',
  chartAnalysis: true,
  enabledSteps: ['reading', 'data', 'calculation', 'chartAnalysis'],
  trialCount: 7,
  minRows: 7,
  maxRows: 7,
  initialRows: 7,
  stageMode: 'full',
  tableOrientation: 'fields',
  stageLock: true,
  trialLabels: ['0', '1', '2', '3', '4', '5', '6'],
  rowFields: [
    { id: 'x', label: 'x', unit: 'cm', inputMode: 'decimal' },
    {
      id: 'deltaX',
      label: 'Δx',
      unit: 'cm',
      inputMode: 'decimal',
      dependsOn: [{ scope: 'row', field: 'x' }],
      gated: true,
      readinessHint: '请先校对本行 x'
    },
    {
      id: 'v',
      label: 'v',
      unit: 'm/s',
      inputMode: 'decimal',
      dependsOn: [{ scope: 'row', field: 'x' }],
      gated: true,
      readinessHint: '请先校对本行 x'
    }
  ],
  summaryFields: [
    {
      id: 'aDiff',
      label: '逐差法 a',
      unit: 'm/s²',
      inputMode: 'decimal',
      gated: true,
      dependsOn: [{ scope: 'all-rows', field: 'x' }],
      readinessHint: '请先完成全部 7 个 x 校对'
    },
    {
      id: 'aFit',
      label: 'v–t 图斜率 a',
      unit: 'm/s²',
      inputMode: 'decimal',
      gated: true,
      step: 'chartAnalysis',
      dependsOn: [{ scope: 'all-rows', field: 'v' }],
      readinessHint: '请先完成各行 v 校对，并在图像区描点拟合'
    }
  ],
  summary: { contextKnownKeys: ['T'] },
  result: {
    field: 'aFit',
    template: 'v–t 图像斜率 a = {value} {unit}，与逐差法相互印证',
    digits: 2
  },
  completionField: 'aFit'
};

export type TickerTapePlotStatus = { hasFit: boolean };

/**
 * 测量判分契约（docs/plans/2026-09-22-measurement-grading-contract.md）：
 * 容差与小数位只允许出现在此常量块；hint 与失败文案必须由这些常量拼装，
 * 不得在判分分支写容差字面量。x 真值经 roundCm 量化在 0.01 cm 网格上，
 * 因此 x 走整数刻度比较。
 *
 * 派生行（Δx/v）的期望完全由学生已校对的 x 决定，读数误差已在 x 校对时
 * 吸收，故不存在独立容差：Δx 是同网格纯减法，按 0 刻度精确比较；v 按
 * 教师设定的有效位数（sim.vSigFigs，2–4 位，默认 3）做半单位舍入比较。
 */
const X_DECIMALS = 2;
const X_TOLERANCE_CM = 0.03;
/** Δx = x_i − x_{i−1}：0.01 cm 网格上的纯减法，合法偏差为 0 刻度。 */
const DELTA_X_TOLERANCE_CM = 0;
/** v 判分的兜底有效位数（sim 未提供 vSignificantDigits 时使用）。 */
const V_DEFAULT_SIG_FIGS = 3;
const A_TOLERANCE = { abs: 0.05, relDiff: 0.02, relFit: 0.05 } as const;
/** mm↔cm↔m 的倍率混淆提示窗口（长度量：cm 计）。 */
const LENGTH_UNIT_RATIOS = [10, 100] as const;
/** cm/s↔m/s、cm/s²↔m/s² 的倍率窗口（SI 换算量只有 ×100 一档）。 */
const SI_UNIT_RATIOS = [100] as const;
const TICKS_PER_CM = 100;

const X_FORMAT_MESSAGE = `x 须为恰好 ${X_DECIMALS} 位小数（估读到 0.01 cm），不支持指数记法`;
const DELTA_X_FORMAT_MESSAGE = `Δx 须为恰好 ${X_DECIMALS} 位小数，不支持指数记法`;
const DELTA_X_RANGE_DETAIL =
  'Δx = x_i − x_{i−1}，须与本行与前一行的已校对 x 之差精确相等';
const NO_SCIENTIFIC_MESSAGE = '不支持指数记法，请填普通小数';
const V_SIG_FIGS_FALLBACK = V_DEFAULT_SIG_FIGS;

function vSignificantDigitsOf(state: TickerTapeState): number {
  const sig = state.vSignificantDigits;
  return Number.isFinite(sig) && sig >= 2 && sig <= 4
    ? sig
    : V_SIG_FIGS_FALLBACK;
}

function vFormatMessage(sigFigs: number): string {
  return `v 应为恰好 ${sigFigs} 位有效数字，不支持指数记法`;
}

function vRangeDetail(sigFigs: number, expected: number): string {
  return `v = (x_{i+1} − x_{i−1}) / (2T)，按 ${sigFigs} 位有效数字舍入（允许误差 ±${significantRoundingHalfUnit(expected, sigFigs)} m/s）`;
}

export type TickerTapeMeasurementSource = {
  getState(): TickerTapeState;
  getPlotStatus(): TickerTapePlotStatus;
  writeBack: {
    setMeasuredX(index: number, value: number): void;
    setDeltaX(index: number, value: number): void;
    setV(index: number, value: number): void;
  };
};

export type TickerTapeDataWorkspaceHost = DataWorkspaceHost & {
  invalidateAll(reason: string): void;
  /** 仅失效 v 列与依赖它的 aFit（v 有效位数要求变更时使用）。 */
  invalidateVColumn(reason: string): void;
};

const NA_MESSAGE = '端点无需填写';

function naState(): FieldCheckState {
  return {
    raw: '—',
    value: Number.NaN,
    checked: true,
    stale: false,
    feedback: { ok: true, message: NA_MESSAGE }
  };
}

/** Keep the physically undefined endpoint cells checked after dependency invalidation. */
function restoreEndpointPlaceholders(
  session: DataWorkspaceSession
): DataWorkspaceSession {
  const next = cloneSession(session);
  const first = next.trials[0];
  const last = next.trials[next.trials.length - 1];
  if (first) {
    first.fields.deltaX = naState();
    first.fields.v = naState();
  }
  if (last) last.fields.v = naState();
  return next;
}

function ok(message = '校对通过'): FieldFeedback {
  return { ok: true, message };
}

function stateFor(
  raw: string,
  value: number,
  feedback: FieldFeedback
): FieldCheckState {
  return {
    raw,
    value,
    checked: feedback.ok,
    stale: false,
    feedback
  };
}

function writeField(
  session: DataWorkspaceSession,
  trialIndex: number | undefined,
  field: string,
  raw: string,
  value: number,
  feedback: FieldFeedback
): DataWorkspaceSession {
  return writeCheckedField(
    session,
    trialIndex,
    field,
    stateFor(raw, value, feedback),
    tickerTapeDataWorkspaceSpec
  );
}

function relation(message: string): FieldFeedback {
  return { ok: false, layer: 'relation', message };
}

function magnitudeFeedback(
  value: number,
  expected: number,
  tolerance: number,
  unit: string,
  options: {
    ticksPerUnit?: number;
    ratios?: readonly number[];
    /** 失败文案中替换默认「允许误差 ±X 单位」的派生量专用说明。 */
    rangeDetail?: string;
  } = {}
): FieldFeedback {
  const ticksPerUnit = options.ticksPerUnit;
  const ratios = options.ratios ?? LENGTH_UNIT_RATIOS;
  const matches = (candidate: number): boolean =>
    ticksPerUnit == null
      ? withinEpsilon(candidate, expected, tolerance)
      : withinTickTolerance(
          candidate,
          expected,
          Math.round(tolerance * ticksPerUnit),
          ticksPerUnit
        );
  if (matches(value)) return ok();
  // 近零真值上「10 倍的 0 仍是 0」，倍率启发必然误标，直接落 range 层。
  if (Math.abs(expected) > tolerance) {
    for (const ratio of ratios) {
      if (matches(value * ratio) || matches(value / ratio)) {
        return {
          ok: false,
          layer: 'unit',
          message: `数值与答案相差 ${ratio} 倍，请确认单位是 ${unit}`
        };
      }
    }
  }
  return {
    ok: false,
    layer: 'range',
    message: `与纸带读数不符（${
      options.rangeDetail ?? `允许误差 ±${tolerance.toFixed(2)} ${unit}`
    }）`
  };
}

function parsedOrFailure(
  raw: string,
  unit: string
): { value: number; feedback: FieldFeedback } {
  const parsed = parseStudentNumber(raw, unit);
  if (!parsed.ok) return { value: Number.NaN, feedback: parsed };
  return { value: parsed.value, feedback: ok() };
}

function isEndpointPlaceholder(field: string, index: number): boolean {
  return (
    (field === 'deltaX' && index === 0) ||
    (field === 'v' && (index === 0 || index === 6))
  );
}

function allRowsFieldComplete(
  session: DataWorkspaceSession,
  field: string
): boolean {
  return (
    session.trials.length >= 7 &&
    session.trials.every((trial) => fieldIsOk(getTrialField(trial, field)))
  );
}

export function evaluateTickerTapeField(options: {
  session: DataWorkspaceSession;
  submit: DataWorkspaceFieldSubmit;
  source: TickerTapeMeasurementSource;
}): DataWorkspaceFieldResult {
  const { source, submit } = options;
  let session = options.session;
  const index = submit.trialIndex ?? 0;
  const state = source.getState();
  const trial = session.trials[index];

  if (!trial && submit.field !== 'aDiff' && submit.field !== 'aFit') {
    return { feedback: relation('请先选择有效的计数点'), session };
  }
  if (trial && isEndpointPlaceholder(submit.field, index)) {
    return {
      feedback: ok(NA_MESSAGE),
      session: restoreEndpointPlaceholders(session)
    };
  }

  const field = submit.field;
  if (field === 'x') {
    const parsed = parsedOrFailure(submit.raw, 'cm');
    const expected = state.tapeXCm[index] ?? Number.NaN;
    const formatFb = checkNumericFormat(submit.raw, {
      decimalPlaces: X_DECIMALS,
      formatMessage: X_FORMAT_MESSAGE
    });
    const feedback = formatFb
      ? formatFb
      : parsed.feedback.ok
        ? magnitudeFeedback(parsed.value, expected, X_TOLERANCE_CM, 'cm', {
            ticksPerUnit: TICKS_PER_CM
          })
        : parsed.feedback;
    session = writeField(
      session,
      index,
      field,
      submit.raw,
      parsed.value,
      feedback
    );
    if (feedback.ok) source.writeBack.setMeasuredX(index, parsed.value);
  } else if (field === 'deltaX') {
    const parsed = parsedOrFailure(submit.raw, 'cm');
    const prev = getTrialField(session.trials[index - 1], 'x');
    const current = getTrialField(trial, 'x');
    const formatFb = checkNumericFormat(submit.raw, {
      decimalPlaces: X_DECIMALS,
      formatMessage: DELTA_X_FORMAT_MESSAGE
    });
    let feedback: FieldFeedback = formatFb ?? parsed.feedback;
    if (feedback.ok && (!fieldIsOk(prev) || !fieldIsOk(current))) {
      feedback = relation('请先校对相邻点的 x');
    } else if (feedback.ok) {
      feedback = magnitudeFeedback(
        parsed.value,
        current!.value - prev!.value,
        DELTA_X_TOLERANCE_CM,
        'cm',
        {
          ticksPerUnit: TICKS_PER_CM,
          rangeDetail: DELTA_X_RANGE_DETAIL
        }
      );
    }
    session = writeField(
      session,
      index,
      field,
      submit.raw,
      parsed.value,
      feedback
    );
    if (feedback.ok) source.writeBack.setDeltaX(index, parsed.value);
  } else if (field === 'v') {
    const parsed = parsedOrFailure(submit.raw, 'm/s');
    const prev = getTrialField(session.trials[index - 1], 'x');
    const next = getTrialField(session.trials[index + 1], 'x');
    const sigFigs = vSignificantDigitsOf(state);
    const formatFb = checkNumericFormat(submit.raw, {
      significantDigits: sigFigs,
      formatMessage: vFormatMessage(sigFigs)
    });
    let feedback: FieldFeedback = formatFb ?? parsed.feedback;
    if (feedback.ok && (!fieldIsOk(prev) || !fieldIsOk(next))) {
      feedback = relation('请先校对相邻点的 x');
    } else if (feedback.ok) {
      const expected = (next!.value - prev!.value) / 100 / (2 * state.T);
      feedback = magnitudeFeedback(
        parsed.value,
        expected,
        significantRoundingHalfUnit(expected, sigFigs),
        'm/s',
        {
          ratios: SI_UNIT_RATIOS,
          rangeDetail: vRangeDetail(sigFigs, expected)
        }
      );
    }
    session = writeField(
      session,
      index,
      field,
      submit.raw,
      parsed.value,
      feedback
    );
    if (feedback.ok) source.writeBack.setV(index, parsed.value);
  } else if (field === 'aDiff') {
    const parsed = parsedOrFailure(submit.raw, 'm/s²');
    const formatFb = checkNumericFormat(submit.raw, {
      formatMessage: NO_SCIENTIFIC_MESSAGE
    });
    let feedback: FieldFeedback = formatFb ?? parsed.feedback;
    if (feedback.ok && !allRowsFieldComplete(session, 'x')) {
      feedback = relation('请先完成全部 7 个 x 校对');
    } else if (feedback.ok) {
      const expected = computeSuccessiveAMs2(
        session.trials.map((row) => getTrialField(row, 'x')?.value ?? null),
        state.T
      );
      feedback =
        expected == null
          ? relation('请先完成全部 7 个 x 校对')
          : magnitudeFeedback(
              parsed.value,
              expected,
              Math.max(
                A_TOLERANCE.abs,
                Math.abs(expected) * A_TOLERANCE.relDiff
              ),
              'm/s²',
              { ratios: SI_UNIT_RATIOS }
            );
    }
    session = writeField(
      session,
      undefined,
      field,
      submit.raw,
      parsed.value,
      feedback
    );
  } else if (field === 'aFit') {
    const parsed = parsedOrFailure(submit.raw, 'm/s²');
    const formatFb = checkNumericFormat(submit.raw, {
      formatMessage: NO_SCIENTIFIC_MESSAGE
    });
    let feedback: FieldFeedback = formatFb ?? parsed.feedback;
    if (feedback.ok && !allRowsFieldComplete(session, 'v')) {
      feedback = relation('请先完成各行 v 校对');
    } else if (feedback.ok && !source.getPlotStatus().hasFit) {
      feedback = relation('请先在图像区点击「描点」「拟合」');
    } else if (feedback.ok) {
      const points = session.trials
        .map((row, i) => ({
          t: i * state.T,
          y: getTrialField(row, 'v')?.value
        }))
        .filter((point): point is { t: number; y: number } =>
          Number.isFinite(point.y)
        );
      const expected = fitLineDroppingOutliers(points).fit?.slope;
      feedback =
        expected == null
          ? relation('请先在图像区点击「描点」「拟合」')
          : magnitudeFeedback(
              parsed.value,
              expected,
              Math.max(
                A_TOLERANCE.abs,
                Math.abs(expected) * A_TOLERANCE.relFit
              ),
              'm/s²',
              { ratios: SI_UNIT_RATIOS }
            );
    }
    session = writeField(
      session,
      undefined,
      field,
      submit.raw,
      parsed.value,
      feedback
    );
  } else {
    return {
      feedback: { ok: false, layer: 'format', message: '未知数据字段' },
      session
    };
  }

  session = restoreEndpointPlaceholders(session);
  return { feedback: getFeedback(session, field, index), session };
}

function getFeedback(
  session: DataWorkspaceSession,
  field: string,
  index: number
): FieldFeedback {
  const value =
    field === 'aDiff' || field === 'aFit'
      ? getSummaryField(session, field)
      : getTrialField(session.trials[index], field);
  return (
    value?.feedback ?? {
      ok: false,
      layer: 'format',
      message: '无法保存校对结果'
    }
  );
}

export function createTickerTapeDataWorkspace(
  source: TickerTapeMeasurementSource
): TickerTapeDataWorkspaceHost {
  let session = restoreEndpointPlaceholders(
    createEmptySession(tickerTapeDataWorkspaceSpec)
  );

  const host: TickerTapeDataWorkspaceHost = {
    getSpec: () => tickerTapeDataWorkspaceSpec,
    getEligibility(): DataWorkspaceEligibility {
      return source.getState().playing
        ? { ok: false, reason: '请先暂停纸带播放再处理数据' }
        : { ok: true };
    },
    getSession: () => freezeSession(cloneSession(session)),
    getKnowns: (): DataWorkspaceKnown[] => [
      {
        key: 'T',
        label: '计数间隔 T',
        value: `${source.getState().T.toFixed(2)} s`
      },
      { key: 'points', label: '计数点', value: '7 个' }
    ],
    getHint: () => {
      const sigFigs = vSignificantDigitsOf(source.getState());
      return `x 单位 cm（毫米尺估读到 0.01 cm，填两位小数；与纸带读数相差不超过 ${X_TOLERANCE_CM.toFixed(2)} cm 判通过）；v 单位 m/s，保留 ${sigFigs} 位有效数字。`;
    },
    setActive(active: boolean) {
      session = { ...session, active };
    },
    submitField(input: DataWorkspaceFieldSubmit): DataWorkspaceFieldResult {
      const result = evaluateTickerTapeField({
        session,
        submit: input,
        source
      });
      session = result.session;
      return {
        feedback: result.feedback,
        session: freezeSession(cloneSession(session))
      };
    },
    applyDrafts(drafts: readonly DataWorkspaceDraft[]) {
      session = restoreEndpointPlaceholders(
        applyFieldDrafts(session, tickerTapeDataWorkspaceSpec, drafts)
      );
      return freezeSession(cloneSession(session));
    },
    resetSession() {
      const wasActive = session.active;
      session = restoreEndpointPlaceholders(
        createEmptySession(tickerTapeDataWorkspaceSpec)
      );
      session.active = wasActive;
    },
    invalidateAll(reason: string) {
      session = restoreEndpointPlaceholders(
        invalidateAllTrials(session, tickerTapeDataWorkspaceSpec, reason)
      );
    },
    invalidateVColumn(reason: string) {
      const next = cloneSession(session);
      next.completed = false;
      for (const trial of next.trials) {
        const current = trial.fields.v;
        if (!current) continue;
        trial.fields.v = {
          ...current,
          checked: false,
          stale: true,
          feedback: { ok: false, layer: 'relation', message: reason }
        };
      }
      next.summary.aFit = markFieldStale(next.summary.aFit);
      session = restoreEndpointPlaceholders(next);
    },
    syncInstrument() {
      // Paper tape has no instrument identity to synchronize.
    },
    addTrial() {
      session = restoreEndpointPlaceholders(
        addSessionTrial(session, tickerTapeDataWorkspaceSpec)
      );
      return freezeSession(cloneSession(session));
    },
    removeTrial(rowId: string, confirmed = false) {
      const result = removeSessionTrial(
        session,
        tickerTapeDataWorkspaceSpec,
        rowId,
        confirmed
      );
      session = restoreEndpointPlaceholders(result.session);
      return { ...result, session: freezeSession(cloneSession(session)) };
    }
  };
  return host;
}
