/**
 * 平抛运动实验数据处理任务。
 *
 * 学生只从描好的轨迹上读取 A–E 五个点的坐标 (x, y)，初速度 v₀ 在最后
 * 核算一次。两种情形：
 * - 记录了抛出点 O：坐标相对 O，v₀ = x·√(g / 2y)。
 * - 未记录抛出点：以 A 为原点（A 的坐标为 (0, 0)），A–E 沿 x 等间距，
 *   用 Δy = gT² 求 T、v₀ = Δx / T，并另外推算抛出点坐标 (x₀, y₀)。
 * 坐标真值来自场景状态中的测量点；演算量的期望只由学生已校对的读数决定。
 */

import {
  addSessionTrial,
  applyFieldDrafts,
  calculationTolerance,
  checkNumericFormat,
  cloneSession,
  createEmptySession,
  fieldIsOk,
  freezeSession,
  getSummaryField,
  getTrialField,
  invalidateAllTrials,
  parseStudentNumber,
  removeSessionTrial,
  significantRoundingHalfUnit,
  withinEpsilon,
  withinTickTolerance,
  writeCheckedField,
  type DataWorkspaceDraft,
  type DataWorkspaceEligibility,
  type DataWorkspaceFieldResult,
  type DataWorkspaceFieldSpec,
  type DataWorkspaceFieldSubmit,
  type DataWorkspaceHost,
  type DataWorkspaceKnown,
  type DataWorkspaceSession,
  type DataWorkspaceSpec,
  type FieldCheckState,
  type FieldFeedback
} from '../../platform/data-workspace';
import {
  G_MS2,
  MEASURE_POINT_COUNT,
  MEASURE_POINT_LABELS,
  launchSpeedFromPointMs,
  type ProjectileLabState
} from './scene.sim';

const ROW_FIELDS: readonly DataWorkspaceFieldSpec[] = [
  { id: 'x', label: 'x', unit: 'cm', inputMode: 'decimal' },
  { id: 'y', label: 'y', unit: 'cm', inputMode: 'decimal' }
];

const ALL_COORDS = [
  { scope: 'all-rows', field: 'x' },
  { scope: 'all-rows', field: 'y' }
] as const;

const V0_FIELD: DataWorkspaceFieldSpec = {
  id: 'v0',
  label: '初速度 v₀',
  unit: 'm/s',
  inputMode: 'decimal',
  gated: true,
  dependsOn: ALL_COORDS,
  readinessHint: '请先校对全部坐标'
};

const BASE_SPEC = {
  chartAnalysis: false,
  stageHalfSplit: true,
  enabledSteps: ['reading', 'data', 'calculation'],
  minRows: MEASURE_POINT_COUNT,
  maxRows: MEASURE_POINT_COUNT,
  initialRows: MEASURE_POINT_COUNT,
  stageMode: 'full',
  // 行 = x / y，列 = A–E。
  tableOrientation: 'fields',
  // 白纸的缩放与平移由场景画布自己处理：要放大到能数清毫米格，
  // 远超舞台 CSS 缩放的上限，且矢量重绘才不糊。
  stagePanZoom: false,
  trialLabels: [...MEASURE_POINT_LABELS],
  rowFields: ROW_FIELDS,
  summary: { contextKnownKeys: ['g'] }
} satisfies Partial<DataWorkspaceSpec>;

/** 记录了抛出点：完整轨迹，只求 v₀。 */
export const projectileLabDataWorkspaceSpec: DataWorkspaceSpec = {
  ...BASE_SPEC,
  id: 'projectile-lab-v0',
  title: '平抛轨迹数据处理',
  summaryFields: [V0_FIELD],
  result: {
    field: 'v0',
    template: '小球平抛的初速度 v₀ = {value} {unit}',
    digits: 2
  },
  completionField: 'v0'
};

/** 未记录抛出点：以 A 为原点，求 v₀ 并推算抛出点坐标。 */
export const projectileLabNoOriginSpec: DataWorkspaceSpec = {
  ...BASE_SPEC,
  id: 'projectile-lab-no-origin',
  title: '平抛轨迹数据处理（未记录抛出点）',
  // v₀ 与抛出点坐标是同一次演算的结果：一个按钮一起核算。
  summaryCheck: 'together',
  summaryFields: [
    V0_FIELD,
    {
      id: 'launchX',
      label: '抛出点 x₀',
      unit: 'cm',
      inputMode: 'decimal',
      gated: true,
      dependsOn: ALL_COORDS,
      readinessHint: '请先校对全部坐标'
    },
    {
      id: 'launchY',
      label: '抛出点 y₀',
      unit: 'cm',
      inputMode: 'decimal',
      gated: true,
      dependsOn: ALL_COORDS,
      readinessHint: '请先校对全部坐标'
    }
  ],
  result: {
    field: 'v0',
    template: '小球平抛的初速度 v₀ = {value} {unit}',
    digits: 2
  },
  completionField: 'launchY'
};

/**
 * 测量判分契约（docs/plans/2026-09-22-measurement-grading-contract.md）：
 * 容差与位数只出现在此常量块，hint 与失败文案由这些常量拼装。
 *
 * 坐标在毫米方格上读数并估读到 0.01 cm，真值已量化在 0.01 cm 网格上，
 * 按整数刻度比较，允许 ±0.03 cm 的估读偏差。
 * v₀ 与抛出点坐标的期望完全由学生已校对的读数决定。取哪个点、哪几段
 * 来算都合理，因此期望是各种合理算法结果的区间，再留末位舍入的半单位。
 */
const COORD_DECIMALS = 2;
const COORD_TOLERANCE_CM = 0.03;
const TICKS_PER_CM = 100;
const V0_SIG_FIGS = 3;
const LAUNCH_DECIMALS = 1;
/** mm↔cm↔m 的倍率混淆提示窗口。 */
const LENGTH_UNIT_RATIOS = [10, 100] as const;
/** cm/s↔m/s 的倍率混淆提示窗口。 */
const SPEED_UNIT_RATIOS = [100] as const;

const HINT_FULL = `x、y 保留 ${COORD_DECIMALS} 位小数；v₀ 保留 ${V0_SIG_FIGS} 位有效数字`;
const HINT_NO_ORIGIN = `${HINT_FULL}；x₀、y₀ 保留 ${LAUNCH_DECIMALS} 位小数`;
const V0_FORMULA_FULL = 'v₀ = x·√(g / 2y)';
const V0_FORMULA_NO_ORIGIN = 'Δy = gT²，v₀ = Δx / T';
const LAUNCH_FORMULA = '先求某点的竖直分速度 v_y，再由 t = v_y / g 反推';
const ORIGIN_MESSAGE = 'A 点是坐标原点';

export type ProjectileLabMeasurementSource = {
  getState(): ProjectileLabState;
};

export type ProjectileLabDataWorkspaceHost = DataWorkspaceHost & {
  invalidateAll(reason: string): void;
};

type Range = { min: number; max: number };

function specFor(state: ProjectileLabState): DataWorkspaceSpec {
  return state.params.recordOrigin
    ? projectileLabDataWorkspaceSpec
    : projectileLabNoOriginSpec;
}

function ok(message = '校对通过'): FieldFeedback {
  return { ok: true, message };
}

function relation(message: string): FieldFeedback {
  return { ok: false, layer: 'relation', message };
}

function originState(): FieldCheckState {
  return {
    raw: (0).toFixed(COORD_DECIMALS),
    value: 0,
    checked: true,
    stale: false,
    feedback: ok(ORIGIN_MESSAGE)
  };
}

/** 未记录抛出点时 A 是原点：它的 (0, 0) 始终保持已校对。 */
function restoreOrigin(
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec
): DataWorkspaceSession {
  if (spec !== projectileLabNoOriginSpec) return session;
  const next = cloneSession(session);
  const first = next.trials[0];
  if (first) {
    first.fields.x = originState();
    first.fields.y = originState();
  }
  return next;
}

function rangeOf(values: readonly number[]): Range | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return { min: Math.min(...finite), max: Math.max(...finite) };
}

function withinRange(value: number, range: Range, slack: number): boolean {
  if (value < range.min) return withinEpsilon(value, range.min, slack);
  if (value > range.max) return withinEpsilon(value, range.max, slack);
  return true;
}

/** 记录了抛出点：每个点各给出一个 v₀（m/s）。 */
export function v0CandidatesFromOrigin(
  points: ReadonlyArray<{ x: number; y: number }>
): number[] {
  return points
    .map((point) => launchSpeedFromPointMs(point.x, point.y))
    .filter((value) => Number.isFinite(value));
}

export type NoOriginSolution = {
  /** 初速度（m/s）。 */
  v0: number;
  /** 抛出点相对 A 的坐标（cm）。 */
  launchX: number;
  launchY: number;
};

/**
 * 未记录抛出点：等 Δx 的五个点（cm，相对 A）给出的各种合理解法。
 * T 可取任意相邻三点的 Δy = gT²，或五点逐差 (y₄ − 2y₂ + y₀) = g(2T)²；
 * 抛出点可由 B、C、D 任一点的 v_y = (y_{后} − y_{前}) / 2T 反推。
 */
export function solveWithoutOrigin(
  points: ReadonlyArray<{ x: number; y: number }>
): NoOriginSolution[] {
  if (points.length < MEASURE_POINT_COUNT) return [];
  const g = G_MS2 * 100; // cm/s²
  const at = (i: number) => points[i]!;
  const timings: Array<{ T: number; dx: number }> = [];
  for (let i = 0; i + 2 < points.length; i += 1) {
    const d2y = at(i + 2).y - 2 * at(i + 1).y + at(i).y;
    if (d2y > 0) {
      timings.push({ T: Math.sqrt(d2y / g), dx: (at(i + 2).x - at(i).x) / 2 });
    }
  }
  const d2yWide = at(4).y - 2 * at(2).y + at(0).y;
  if (d2yWide > 0) {
    timings.push({
      T: Math.sqrt(d2yWide / (4 * g)),
      dx: (at(4).x - at(0).x) / 4
    });
  }
  const solutions: NoOriginSolution[] = [];
  for (const { T, dx } of timings) {
    const vx = dx / T; // cm/s
    for (let j = 1; j + 1 < points.length; j += 1) {
      const vy = (at(j + 1).y - at(j - 1).y) / (2 * T);
      const t = vy / g;
      solutions.push({
        v0: vx / 100,
        launchX: at(j).x - vx * t,
        launchY: at(j).y - 0.5 * g * t * t
      });
    }
  }
  return solutions;
}

function checkedPoints(
  session: DataWorkspaceSession
): Array<{ x: number; y: number }> | null {
  const points: Array<{ x: number; y: number }> = [];
  for (const trial of session.trials) {
    const x = getTrialField(trial, 'x');
    const y = getTrialField(trial, 'y');
    if (!fieldIsOk(x) || !fieldIsOk(y)) return null;
    points.push({ x: x!.value, y: y!.value });
  }
  return points.length >= MEASURE_POINT_COUNT ? points : null;
}

function unitFeedback(
  value: number,
  matches: (candidate: number) => boolean,
  ratios: readonly number[],
  unit: string
): FieldFeedback | null {
  for (const ratio of ratios) {
    if (matches(value * ratio) || matches(value / ratio)) {
      return {
        ok: false,
        layer: 'unit',
        message: `数值与答案相差 ${ratio} 倍，请确认单位是 ${unit}`
      };
    }
  }
  return null;
}

function gradeCoordinate(
  raw: string,
  name: string,
  expected: number,
  label: string
): { value: number; feedback: FieldFeedback } {
  const parsed = parseStudentNumber(raw, 'cm');
  const value = parsed.ok ? parsed.value : Number.NaN;
  const formatFb = checkNumericFormat(raw, {
    decimalPlaces: COORD_DECIMALS,
    formatMessage: `${name} 须为恰好 ${COORD_DECIMALS} 位小数（估读到 0.01 cm），不支持指数记法`
  });
  if (formatFb) return { value, feedback: formatFb };
  if (!parsed.ok) return { value, feedback: parsed };
  const matches = (candidate: number): boolean =>
    withinTickTolerance(
      candidate,
      expected,
      Math.round(COORD_TOLERANCE_CM * TICKS_PER_CM),
      TICKS_PER_CM
    );
  if (matches(value)) return { value, feedback: ok() };
  const unitFb =
    Math.abs(expected) > COORD_TOLERANCE_CM
      ? unitFeedback(value, matches, LENGTH_UNIT_RATIOS, 'cm')
      : null;
  return {
    value,
    feedback: unitFb ?? {
      ok: false,
      layer: 'range',
      message: `与轨迹上 ${label} 点的位置不符（允许误差 ±${COORD_TOLERANCE_CM.toFixed(COORD_DECIMALS)} cm）`
    }
  };
}

function gradeV0(
  raw: string,
  candidates: readonly number[],
  formula: string
): { value: number; feedback: FieldFeedback } {
  const parsed = parseStudentNumber(raw, 'm/s');
  const value = parsed.ok ? parsed.value : Number.NaN;
  const formatFb = checkNumericFormat(raw, {
    significantDigits: V0_SIG_FIGS,
    formatMessage: `v₀ 应为恰好 ${V0_SIG_FIGS} 位有效数字，不支持指数记法`
  });
  if (formatFb) return { value, feedback: formatFb };
  if (!parsed.ok) return { value, feedback: parsed };
  const range = rangeOf(candidates);
  if (!range) {
    return { value, feedback: relation('已校对的坐标无法求出 v₀，请检查读数') };
  }
  const slack = significantRoundingHalfUnit(range.max, V0_SIG_FIGS);
  const matches = (candidate: number): boolean =>
    withinRange(candidate, range, slack);
  if (matches(value)) return { value, feedback: ok() };
  return {
    value,
    feedback: unitFeedback(value, matches, SPEED_UNIT_RATIOS, 'm/s') ?? {
      ok: false,
      layer: 'range',
      message: `与已校对的坐标不符（${formula}，保留 ${V0_SIG_FIGS} 位有效数字）`
    }
  };
}

function gradeLaunchCoordinate(
  raw: string,
  name: string,
  candidates: readonly number[]
): { value: number; feedback: FieldFeedback } {
  const parsed = parseStudentNumber(raw, 'cm');
  const value = parsed.ok ? parsed.value : Number.NaN;
  const formatFb = checkNumericFormat(raw, {
    decimalPlaces: LAUNCH_DECIMALS,
    formatMessage: `${name} 须为恰好 ${LAUNCH_DECIMALS} 位小数，不支持指数记法`
  });
  if (formatFb) return { value, feedback: formatFb };
  if (!parsed.ok) return { value, feedback: parsed };
  const range = rangeOf(candidates);
  if (!range) {
    return {
      value,
      feedback: relation('已校对的坐标无法推算抛出点，请检查读数')
    };
  }
  if (withinRange(value, range, calculationTolerance(LAUNCH_DECIMALS))) {
    return { value, feedback: ok() };
  }
  const flipped = withinRange(
    -value,
    range,
    calculationTolerance(LAUNCH_DECIMALS)
  );
  return {
    value,
    feedback: {
      ok: false,
      layer: 'range',
      message: flipped
        ? `${name} 的正负号不对：抛出点在 A 点的左上方`
        : `与已校对的坐标不符（${LAUNCH_FORMULA}，保留 ${LAUNCH_DECIMALS} 位小数）`
    }
  };
}

export function evaluateProjectileLabField(options: {
  session: DataWorkspaceSession;
  submit: DataWorkspaceFieldSubmit;
  source: ProjectileLabMeasurementSource;
}): DataWorkspaceFieldResult {
  const { source, submit } = options;
  const state = source.getState();
  const spec = specFor(state);
  const noOrigin = spec === projectileLabNoOriginSpec;
  let session = options.session;
  const field = submit.field;

  const commit = (
    trialIndex: number | undefined,
    graded: { value: number; feedback: FieldFeedback }
  ): DataWorkspaceFieldResult => {
    session = writeCheckedField(
      session,
      trialIndex,
      field,
      {
        raw: submit.raw,
        value: graded.value,
        checked: graded.feedback.ok,
        stale: false,
        feedback: graded.feedback
      },
      spec
    );
    session = restoreOrigin(session, spec);
    // 全部演算量都通过才算完成（未记录抛出点时有三个）。
    session.completed = spec.summaryFields.every((def) =>
      fieldIsOk(getSummaryField(session, def.id))
    );
    return { feedback: graded.feedback, session };
  };

  if (field === 'x' || field === 'y') {
    const index = submit.trialIndex ?? 0;
    const point = state.measurePoints[index];
    if (!session.trials[index] || !point) {
      return { feedback: relation('请先描出轨迹'), session };
    }
    if (noOrigin && index === 0) {
      return {
        feedback: ok(ORIGIN_MESSAGE),
        session: restoreOrigin(session, spec)
      };
    }
    const absolute = field === 'x' ? point.x : point.y;
    const origin = field === 'x' ? state.axesOrigin.x : state.axesOrigin.y;
    return commit(
      index,
      gradeCoordinate(submit.raw, field, absolute - origin, point.label)
    );
  }

  if (!spec.summaryFields.some((def) => def.id === field)) {
    return {
      feedback: { ok: false, layer: 'format', message: '未知数据字段' },
      session
    };
  }

  const points = checkedPoints(session);
  if (!points) {
    return commit(undefined, {
      value: Number.NaN,
      feedback: relation('请先校对全部坐标')
    });
  }
  if (field === 'v0') {
    const candidates = noOrigin
      ? solveWithoutOrigin(points).map((solution) => solution.v0)
      : v0CandidatesFromOrigin(points);
    return commit(
      undefined,
      gradeV0(
        submit.raw,
        candidates,
        noOrigin ? V0_FORMULA_NO_ORIGIN : V0_FORMULA_FULL
      )
    );
  }
  const solutions = solveWithoutOrigin(points);
  return commit(
    undefined,
    field === 'launchX'
      ? gradeLaunchCoordinate(
          submit.raw,
          'x₀',
          solutions.map((solution) => solution.launchX)
        )
      : gradeLaunchCoordinate(
          submit.raw,
          'y₀',
          solutions.map((solution) => solution.launchY)
        )
  );
}

export function createProjectileLabDataWorkspace(
  source: ProjectileLabMeasurementSource
): ProjectileLabDataWorkspaceHost {
  let spec = specFor(source.getState());
  let session = restoreOrigin(createEmptySession(spec), spec);

  /** 「是否记录抛出点」改了，表格结构随之更换，旧数据作废。 */
  function syncSpec(): DataWorkspaceSpec {
    const next = specFor(source.getState());
    if (next !== spec) {
      const wasActive = session.active;
      spec = next;
      session = restoreOrigin(createEmptySession(spec), spec);
      session.active = wasActive;
    }
    return spec;
  }

  return {
    getSpec: () => syncSpec(),
    getEligibility(): DataWorkspaceEligibility {
      const state = source.getState();
      if (!state.traced) {
        return { ok: false, reason: '请先记录落点并描出轨迹' };
      }
      if (state.busy) return { ok: false, reason: '请等轨迹描完再处理数据' };
      return { ok: true };
    },
    getSession() {
      syncSpec();
      return freezeSession(cloneSession(session));
    },
    getKnowns(): DataWorkspaceKnown[] {
      return [
        { key: 'g', label: '重力加速度 g', value: `${G_MS2.toFixed(1)} m/s²` },
        {
          key: 'origin',
          label: '坐标原点',
          value: syncSpec() === projectileLabNoOriginSpec ? 'A 点' : '抛出点 O'
        }
      ];
    },
    getHint: () =>
      syncSpec() === projectileLabNoOriginSpec ? HINT_NO_ORIGIN : HINT_FULL,
    setActive(active: boolean) {
      syncSpec();
      session = { ...session, active };
    },
    submitField(input: DataWorkspaceFieldSubmit): DataWorkspaceFieldResult {
      syncSpec();
      const result = evaluateProjectileLabField({
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
      syncSpec();
      session = restoreOrigin(applyFieldDrafts(session, spec, drafts), spec);
      return freezeSession(cloneSession(session));
    },
    resetSession() {
      syncSpec();
      const wasActive = session.active;
      session = restoreOrigin(createEmptySession(spec), spec);
      session.active = wasActive;
    },
    invalidateAll(reason: string) {
      syncSpec();
      session = restoreOrigin(invalidateAllTrials(session, spec, reason), spec);
    },
    syncInstrument() {
      // 白纸读数不涉及仪器身份同步。
    },
    renderResult(current: DataWorkspaceSession): string | null {
      const v0 = getSummaryField(current, 'v0');
      if (!current.completed || !v0 || !fieldIsOk(v0)) return null;
      const speed = `小球平抛的初速度 v₀ = ${v0.value.toPrecision(V0_SIG_FIGS)} m/s`;
      if (syncSpec() !== projectileLabNoOriginSpec) return speed;
      const x0 = getSummaryField(current, 'launchX');
      const y0 = getSummaryField(current, 'launchY');
      if (!x0 || !y0) return speed;
      return `${speed}，抛出点坐标 (${x0.value.toFixed(LAUNCH_DECIMALS)}, ${y0.value.toFixed(LAUNCH_DECIMALS)}) cm`;
    },
    addTrial() {
      syncSpec();
      session = restoreOrigin(addSessionTrial(session, spec), spec);
      return freezeSession(cloneSession(session));
    },
    removeTrial(rowId: string, confirmed = false) {
      syncSpec();
      const result = removeSessionTrial(session, spec, rowId, confirmed);
      session = restoreOrigin(result.session, spec);
      return { ...result, session: freezeSession(cloneSession(session)) };
    }
  };
}
