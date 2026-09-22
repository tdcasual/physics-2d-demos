/**
 * 打点计时器纸带数据处理任务。
 *
 * 学生只需从纸带读取 x，随后手算 Δx、v，并用 v–t 图像拟合加速度。
 * 真值始终来自场景状态中的带误差纸带位置 tapeXCm。
 */

import {
  addSessionTrial,
  applyFieldDrafts,
  cloneSession,
  createEmptySession,
  fieldIsOk,
  freezeSession,
  getSummaryField,
  getTrialField,
  invalidateAllTrials,
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
  unit: string
): FieldFeedback {
  if (Math.abs(value - expected) <= tolerance + 1e-9) return ok();
  if (
    Math.abs(value * 100 - expected) <= tolerance + 1e-9 ||
    Math.abs(value / 100 - expected) <= tolerance + 1e-9
  ) {
    return {
      ok: false,
      layer: 'unit',
      message: `数值与答案相差 100 倍，请确认单位是 ${unit}`
    };
  }
  return {
    ok: false,
    layer: 'range',
    message: `与纸带读数不符（允许误差 ±${tolerance.toFixed(2)} ${unit}）`
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
    const feedback = parsed.feedback.ok
      ? magnitudeFeedback(parsed.value, expected, 0.05, 'cm')
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
    let feedback = parsed.feedback;
    if (feedback.ok && (!fieldIsOk(prev) || !fieldIsOk(current))) {
      feedback = relation('请先校对相邻点的 x');
    } else if (feedback.ok) {
      feedback = magnitudeFeedback(
        parsed.value,
        current!.value - prev!.value,
        0.02,
        'cm'
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
    let feedback = parsed.feedback;
    if (feedback.ok && (!fieldIsOk(prev) || !fieldIsOk(next))) {
      feedback = relation('请先校对相邻点的 x');
    } else if (feedback.ok) {
      feedback = magnitudeFeedback(
        parsed.value,
        (next!.value - prev!.value) / 100 / (2 * state.T),
        0.01,
        'm/s'
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
    let feedback = parsed.feedback;
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
              Math.max(0.05, Math.abs(expected) * 0.02),
              'm/s²'
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
    let feedback = parsed.feedback;
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
              Math.max(0.05, Math.abs(expected) * 0.05),
              'm/s²'
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
    getHint: () => 'x 单位 cm（毫米尺估读到 0.01 cm）；v 单位 m/s。',
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
