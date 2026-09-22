/**
 * 双缝干涉数据处理任务：测条纹间距并求波长 λ = d · 平均Δx / L。
 *
 * 不自动填表；x1/x2 在提交当时与仪器位置核对；n 是亮纹间隔数。
 */

import {
  addSessionTrial,
  allTrialsComplete,
  applyFieldDrafts,
  checkInstrumentReading,
  checkNumericFormat,
  checkPositionRawFormat,
  cloneSession,
  createEmptySession,
  freezeSession,
  getSummaryField,
  getTrialField,
  invalidateAllTrials,
  nextFailedAttempts,
  parseStudentNumber,
  positionFormatKindFromSnapshot,
  quantizeExactDiscreteMm,
  readingStrategyOf,
  removeSessionTrial,
  withAttemptReference,
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
  type FieldFeedback,
  type MeasurementSnapshot
} from '../../platform/data-workspace';
import { doubleSlitFringeOrder } from './snapshot-meta';
import {
  checkAverageSpacing,
  checkDifference,
  checkFringeSpacing,
  checkIntervalCountFromOrders,
  checkSameInstrument,
  checkWavelengthNm,
  wavelengthNmFromAverage
} from './wavelength';
import {
  computeRealDeltaXmm,
  DEFAULT_L,
  isWhiteLight,
  PHYSICAL_D_SCALE,
  type DoubleSlitParams
} from './scene.sim';
import {
  CALIPER_PRECISION_MM,
  CALIPER_READING_STRATEGY,
  DOUBLE_SLIT_MAX_ROWS,
  DOUBLE_SLIT_TRIAL_COUNT,
  MICROMETER_MAX_MM,
  MICROMETER_PRECISION_MM,
  MICROMETER_READING_STRATEGY
} from './reading-constants';
export {
  CALIPER_PRECISION_MM,
  CALIPER_READING_STRATEGY,
  DOUBLE_SLIT_MAX_ROWS,
  DOUBLE_SLIT_TRIAL_COUNT,
  MICROMETER_MAX_MM,
  MICROMETER_PRECISION_MM,
  MICROMETER_READING_STRATEGY
};

const POSITION_MAX_MM = 40;
const N_MAX = 30;

export type DataWorkspaceExpected = {
  dMm: number;
  L_m: number;
  theoreticalDeltaXmm: number;
  theoreticalLambdaNm: number;
};

export const doubleSlitDataWorkspaceSpec: DataWorkspaceSpec = {
  id: 'double-slit-wavelength',
  title: '测条纹间距求波长',
  chartAnalysis: false,
  enabledSteps: ['reading', 'data', 'calculation'],
  trialCount: DOUBLE_SLIT_MAX_ROWS,
  minRows: 1,
  maxRows: DOUBLE_SLIT_MAX_ROWS,
  initialRows: 1,
  stageMode: 'instrument-only',
  rowFields: [
    { id: 'x1', label: 'x₁', unit: 'mm', inputMode: 'decimal' },
    { id: 'x2', label: 'x₂', unit: 'mm', inputMode: 'decimal' },
    {
      id: 'n',
      label: 'n',
      inputMode: 'numeric',
      dependsOn: [
        { scope: 'row', field: 'x1' },
        { scope: 'row', field: 'x2' }
      ]
    },
    {
      id: 'D',
      label: 'D = x₂ − x₁',
      unit: 'mm',
      inputMode: 'decimal',
      dependsOn: [
        { scope: 'row', field: 'x1' },
        { scope: 'row', field: 'x2' }
      ]
    },
    {
      id: 'deltaX',
      label: 'Δx = D / n',
      unit: 'mm',
      inputMode: 'decimal',
      dependsOn: [
        { scope: 'row', field: 'D' },
        { scope: 'row', field: 'n' }
      ]
    }
  ],
  summaryFields: [
    {
      id: 'averageDeltaX',
      label: '平均 Δx',
      unit: 'mm',
      inputMode: 'decimal',
      gated: true,
      dependsOn: [{ scope: 'all-rows', field: 'deltaX' }],
      readinessHint: '请先完成当前 {rowCount} 组 Δx 校对',
      readinessHintOne: '请先完成本组 Δx 校对'
    },
    {
      id: 'lambda',
      label: 'λ = d·平均Δx / L',
      unit: 'nm',
      inputMode: 'decimal',
      gated: true,
      dependsOn: [{ scope: 'summary', field: 'averageDeltaX' }],
      readinessHint: '请先校对平均 Δx'
    }
  ],
  summary: { contextKnownKeys: ['d', 'L'] },
  result: {
    field: 'lambda',
    template: '测得波长 λ = {value} {unit}',
    digits: 0
  },
  completionField: 'lambda',
  lockInstrumentFromField: 'x1'
};

export type DoubleSlitMeasurementSource = {
  getParams(): DoubleSlitParams;
  capture(): MeasurementSnapshot | null;
};

export function slitDistanceMm(slitDistance: number): number {
  // PHYSICAL_D_SCALE 以米/单位计（scene.sim），此处口径为 mm：m→mm 须 ×1000。
  return slitDistance * PHYSICAL_D_SCALE * 1000;
}

export function screenDistanceM(params: DoubleSlitParams): number {
  return params.L ?? DEFAULT_L;
}

export function expectedQuantities(
  params: DoubleSlitParams
): DataWorkspaceExpected {
  const dMm = slitDistanceMm(params.slitDistance);
  const L_m = screenDistanceM(params);
  const theoreticalDeltaXmm = computeRealDeltaXmm(
    params.lambda,
    params.slitDistance,
    L_m
  );
  return {
    dMm,
    L_m,
    theoreticalDeltaXmm,
    theoreticalLambdaNm: wavelengthNmFromAverage(dMm, theoreticalDeltaXmm, L_m)
  };
}

export function doubleSlitEligibility(
  params: DoubleSlitParams,
  instrumentReady: boolean
): DataWorkspaceEligibility {
  if (params.step !== 6) {
    return { ok: false, reason: '请先进入第 6 步（目镜观察）后再处理数据' };
  }
  if (isWhiteLight(params) || params.lightMode !== 'mono') {
    return { ok: false, reason: '请使用单色光；当前条件不适合精确测波长' };
  }
  if (!instrumentReady) {
    return { ok: false, reason: '测量仪器尚未就绪，请稍候' };
  }
  return { ok: true };
}

export function doubleSlitKnowns(
  params: DoubleSlitParams
): DataWorkspaceKnown[] {
  const dMm = slitDistanceMm(params.slitDistance);
  const Lcm = screenDistanceM(params) * 100;
  return [
    { key: 'd', label: '双缝间距 d', value: `${dMm.toFixed(2)} mm` },
    { key: 'L', label: '缝屏距 L', value: `${Lcm.toFixed(0)} cm` }
  ];
}

export function doubleSlitHint(_params: DoubleSlitParams): string {
  return '单位 mm，与仪器一致。';
}

function rangeFeedback(
  value: number,
  min: number,
  max: number,
  message: string
): FieldFeedback | null {
  if (value < min || value > max) {
    return { ok: false, layer: 'range', message };
  }
  return null;
}

function asState(
  raw: string,
  value: number,
  feedback: FieldFeedback,
  snapshot?: MeasurementSnapshot,
  failedAttempts?: number
): FieldCheckState {
  return {
    raw,
    value,
    checked: feedback.ok,
    stale: false,
    snapshot,
    feedback,
    failedAttempts
  };
}

function positionReference(snapshot: MeasurementSnapshot): string {
  if (snapshot.instrumentId === 'micrometer') {
    return snapshot.readingMm.toFixed(3);
  }
  const strategy = readingStrategyOf(snapshot);
  const stepMm =
    strategy.kind === 'exact-discrete' ? strategy.stepMm : CALIPER_PRECISION_MM;
  return quantizeExactDiscreteMm(snapshot.readingMm, stepMm).toFixed(2);
}

function finishPositionSubmit(options: {
  session: DataWorkspaceSession;
  trialIndex: number;
  field: 'x1' | 'x2';
  raw: string;
  value: number;
  feedback: FieldFeedback;
  snapshot: MeasurementSnapshot | null;
}): DataWorkspaceFieldResult {
  const { session, trialIndex, field, raw, value, snapshot } = options;
  const prev = getTrialField(session.trials[trialIndex], field);
  const count = Boolean(snapshot?.aligned) && !options.feedback.ok;
  const failedAttempts = nextFailedAttempts(prev?.failedAttempts, {
    ok: options.feedback.ok,
    count
  });
  const reference =
    snapshot && failedAttempts >= 3 ? positionReference(snapshot) : undefined;
  const feedback = withAttemptReference(
    options.feedback,
    failedAttempts,
    reference
  );
  return {
    feedback,
    session: writeCheckedField(
      session,
      trialIndex,
      field,
      asState(raw, value, feedback, snapshot ?? undefined, failedAttempts),
      doubleSlitDataWorkspaceSpec
    )
  };
}

export function evaluateDoubleSlitField(options: {
  session: DataWorkspaceSession;
  submit: DataWorkspaceFieldSubmit;
  snapshot: MeasurementSnapshot | null;
  expected: DataWorkspaceExpected;
}): DataWorkspaceFieldResult {
  const { session, submit, snapshot, expected } = options;
  const field = submit.field;
  const trialIndex = submit.trialIndex ?? 0;
  const trial = session.trials[trialIndex];
  const displayDigits = snapshot?.displayDigits ?? 3;
  const precisionMm = snapshot?.precisionMm ?? CALIPER_PRECISION_MM;

  const expectedUnit = field === 'lambda' ? 'nm' : 'mm';
  if (field === 'n') {
    // n 是亮纹间隔数：整数字面量闸拒 "3.0" / "3e0"；带单位后缀的输入
    // 放行到下方 parsed.unit 检查，保住「不要带长度单位」的 unit 层文案。
    const integerFb = checkNumericFormat(submit.raw, {
      integer: true,
      formatMessage: 'n 应为正整数'
    });
    if (integerFb) {
      return {
        feedback: integerFb,
        session: writeCheckedField(
          session,
          trialIndex,
          field,
          {
            raw: submit.raw,
            value: Number.NaN,
            checked: false,
            stale: false,
            feedback: integerFb
          },
          doubleSlitDataWorkspaceSpec
        )
      };
    }
  }
  if (field === 'x1' || field === 'x2') {
    const kind = positionFormatKindFromSnapshot(snapshot);
    if (kind) {
      const formatFb = checkPositionRawFormat(submit.raw, kind);
      if (formatFb) {
        return finishPositionSubmit({
          session,
          trialIndex,
          field,
          raw: submit.raw,
          value: Number.NaN,
          feedback: formatFb,
          snapshot
        });
      }
    }
  }
  const parsed = parseStudentNumber(submit.raw, expectedUnit);
  if (!parsed.ok) {
    if (field === 'x1' || field === 'x2') {
      return finishPositionSubmit({
        session,
        trialIndex,
        field,
        raw: submit.raw,
        value: Number.NaN,
        feedback: parsed,
        snapshot
      });
    }
    return {
      feedback: parsed,
      session: writeCheckedField(
        session,
        trialIndex,
        field,
        {
          raw: submit.raw,
          value: Number.NaN,
          checked: false,
          stale: false,
          feedback: parsed
        },
        doubleSlitDataWorkspaceSpec
      )
    };
  }
  if (field === 'n' && parsed.unit) {
    const unitFb: FieldFeedback = {
      ok: false,
      layer: 'unit',
      message: 'n 是间隔数，不要带长度单位'
    };
    return {
      feedback: unitFb,
      session: writeCheckedField(
        session,
        trialIndex,
        field,
        {
          raw: submit.raw,
          value: parsed.value,
          checked: false,
          stale: false,
          feedback: unitFb
        },
        doubleSlitDataWorkspaceSpec
      )
    };
  }

  const value = parsed.value;

  if (field === 'x1' || field === 'x2') {
    const range = rangeFeedback(
      value,
      0,
      POSITION_MAX_MM,
      '读数超出仪器量程，请确认单位是 mm'
    );
    let feedback = range ?? checkInstrumentReading(value, snapshot);
    if (feedback.ok && field === 'x2') {
      const mismatch = checkSameInstrument(
        getTrialField(trial, 'x1')?.snapshot,
        snapshot ?? undefined
      );
      if (mismatch) feedback = mismatch;
    }
    if (
      feedback.ok &&
      session.lockedInstrumentId &&
      snapshot &&
      snapshot.instrumentId !== session.lockedInstrumentId
    ) {
      feedback = {
        ok: false,
        layer: 'instrument',
        message: '已更换仪器，请用同一台仪器重测本组'
      };
    }
    return finishPositionSubmit({
      session,
      trialIndex,
      field,
      raw: submit.raw,
      value,
      feedback,
      snapshot
    });
  }

  if (field === 'n') {
    if (!Number.isInteger(value)) {
      const feedback: FieldFeedback = {
        ok: false,
        layer: 'format',
        message: 'n 应为正整数'
      };
      return {
        feedback,
        session: writeCheckedField(
          session,
          trialIndex,
          field,
          asState(submit.raw, value, feedback),
          doubleSlitDataWorkspaceSpec
        )
      };
    }
    const range = rangeFeedback(
      value,
      1,
      N_MAX,
      '间隔数超出合理范围，请重新数两端之间的间隔'
    );
    const x1 = getTrialField(trial, 'x1');
    const x2 = getTrialField(trial, 'x2');
    const order1 = doubleSlitFringeOrder(x1?.snapshot);
    const order2 = doubleSlitFringeOrder(x2?.snapshot);
    let feedback: FieldFeedback;
    if (range) feedback = range;
    else if (!x1?.checked || !x2?.checked || x1.stale || x2.stale) {
      feedback = { ok: false, layer: 'relation', message: '请先校对 x1 和 x2' };
    } else if (
      order1 == null ||
      order2 == null ||
      !x1.snapshot?.aligned ||
      !x2.snapshot?.aligned
    ) {
      feedback = {
        ok: false,
        layer: 'instrument',
        message: '请先对准亮纹后再数间隔'
      };
    } else {
      feedback = checkIntervalCountFromOrders(value, order1, order2);
    }
    return {
      feedback,
      session: writeCheckedField(
        session,
        trialIndex,
        field,
        asState(submit.raw, value, feedback),
        doubleSlitDataWorkspaceSpec
      )
    };
  }

  if (field === 'D') {
    const x1 = getTrialField(trial, 'x1');
    const x2 = getTrialField(trial, 'x2');
    let feedback: FieldFeedback;
    if (!x1?.checked || !x2?.checked || x1.stale || x2.stale) {
      feedback = { ok: false, layer: 'relation', message: '请先校对 x1 和 x2' };
    } else {
      feedback = checkDifference(
        value,
        x1.value,
        x2.value,
        x1.snapshot?.displayDigits ?? displayDigits
      );
    }
    return {
      feedback,
      session: writeCheckedField(
        session,
        trialIndex,
        field,
        asState(submit.raw, value, feedback),
        doubleSlitDataWorkspaceSpec
      )
    };
  }

  if (field === 'deltaX') {
    const D = getTrialField(trial, 'D');
    const n = getTrialField(trial, 'n');
    let feedback: FieldFeedback;
    if (!D?.checked || !n?.checked || D.stale || n.stale) {
      feedback = { ok: false, layer: 'relation', message: '请先校对 D 和 n' };
    } else {
      feedback = checkFringeSpacing(value, D.value, n.value, displayDigits);
    }
    return {
      feedback,
      session: writeCheckedField(
        session,
        trialIndex,
        field,
        asState(submit.raw, value, feedback),
        doubleSlitDataWorkspaceSpec
      )
    };
  }

  if (field === 'averageDeltaX') {
    const deltaXs = session.trials
      .map((row) => getTrialField(row, 'deltaX'))
      .filter((item): item is FieldCheckState =>
        Boolean(item?.checked && item.feedback?.ok && !item.stale)
      )
      .map((item) => item.value);
    let feedback: FieldFeedback;
    if (!allTrialsComplete(session, doubleSlitDataWorkspaceSpec)) {
      feedback = {
        ok: false,
        layer: 'relation',
        message: '请先完成当前各组 Δx 的校对'
      };
    } else {
      feedback = checkAverageSpacing(value, deltaXs, displayDigits);
    }
    return {
      feedback,
      session: writeCheckedField(
        session,
        undefined,
        field,
        asState(submit.raw, value, feedback),
        doubleSlitDataWorkspaceSpec
      )
    };
  }

  const avg = getSummaryField(session, 'averageDeltaX');
  let feedback: FieldFeedback;
  if (!avg?.checked || avg.stale) {
    feedback = {
      ok: false,
      layer: 'relation',
      message: '请先校对平均条纹间距'
    };
  } else {
    feedback = checkWavelengthNm(
      value,
      expected.dMm,
      avg.value,
      expected.L_m,
      precisionMm
    );
  }
  return {
    feedback,
    session: writeCheckedField(
      session,
      undefined,
      'lambda',
      asState(submit.raw, value, feedback),
      doubleSlitDataWorkspaceSpec
    )
  };
}

export function createDoubleSlitDataWorkspace(
  source: DoubleSlitMeasurementSource
): DataWorkspaceHost {
  let session = createEmptySession(doubleSlitDataWorkspaceSpec);

  const host: DataWorkspaceHost = {
    getSpec: () => doubleSlitDataWorkspaceSpec,
    getEligibility: () => {
      const params = source.getParams();
      return doubleSlitEligibility(params, source.capture() != null);
    },
    getSession: () => freezeSession(cloneSession(session)),
    applyDrafts(drafts: readonly DataWorkspaceDraft[]) {
      session = applyFieldDrafts(session, doubleSlitDataWorkspaceSpec, drafts);
      return freezeSession(cloneSession(session));
    },
    getKnowns: () => doubleSlitKnowns(source.getParams()),
    getHint: () => doubleSlitHint(source.getParams()),
    setActive(active: boolean) {
      session = { ...session, active };
    },
    submitField(input: DataWorkspaceFieldSubmit): DataWorkspaceFieldResult {
      const snapshot = source.capture();
      const result = evaluateDoubleSlitField({
        session,
        submit: input,
        snapshot,
        expected: expectedQuantities(source.getParams())
      });
      session = result.session;
      return result;
    },
    resetSession() {
      const wasActive = session.active;
      session = createEmptySession(doubleSlitDataWorkspaceSpec);
      session.active = wasActive;
    },
    syncInstrument(instrumentId: string) {
      if (
        session.lockedInstrumentId &&
        session.lockedInstrumentId !== instrumentId
      ) {
        session = invalidateAllTrials(
          session,
          doubleSlitDataWorkspaceSpec,
          '已切换仪器，请用同一台仪器重新测量'
        );
      }
    },
    addTrial() {
      session = addSessionTrial(session, doubleSlitDataWorkspaceSpec);
      return session;
    },
    removeTrial(rowId: string, confirmed = false) {
      const result = removeSessionTrial(
        session,
        doubleSlitDataWorkspaceSpec,
        rowId,
        confirmed
      );
      session = result.session;
      return result;
    }
  };
  return host;
}
