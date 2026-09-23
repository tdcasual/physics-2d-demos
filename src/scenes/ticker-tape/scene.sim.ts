/**
 * 打点计时器纸带 — 运动学与表处理。
 * 位移以 cm 存储（对齐毫米尺读数）；速度/加速度在派生时换成 SI。
 */

import { roundToSignificantDigits } from '../../platform/data-workspace';

export const TICK_PERIOD_S = 0.02;
export const COUNTING_POINT_COUNT = 7;
export const COUNTING_INTERVAL_TICKS = 5;
export const DENSE_TICKS_BEFORE_ORIGIN = 10;
/** 计数段之后多留打点，让 O 能沿纸带拖得更远。 */
export const TRAIL_TICKS_AFTER_COUNTING = 30;
/** 纸带总打点数（含密点与计数段之后的余量），与开关无关。 */
export const LAST_TICK =
  DENSE_TICKS_BEFORE_ORIGIN +
  (COUNTING_POINT_COUNT - 1) * COUNTING_INTERVAL_TICKS +
  TRAIL_TICKS_AFTER_COUNTING;

export type TapeKind = 'uniform' | 'ua' | 'ud' | 'variable';
export type NoiseLevel = 'off' | 'typical' | 'large';

export const TAPE_KINDS: readonly TapeKind[] = [
  'uniform',
  'ua',
  'ud',
  'variable'
];

/** 纸带上被打偏的点数（打点不稳 / 摩擦），不是尺的估读。 */
export const TAPE_OUTLIER_COUNT: Record<NoiseLevel, number> = {
  off: 0,
  typical: 1,
  large: 2
};

/** 误差点沿纸带的位移（cm），大到在 v–t 上明显偏离直线。 */
export const TAPE_OUTLIER_SHIFT_CM: Record<NoiseLevel, number> = {
  off: 0,
  typical: 0.32,
  large: 0.56
};

export type TickerTapeParams = {
  speed: number;
  tapeKind: TapeKind;
  countEvery: 1 | 5;
  noise: NoiseLevel;
  showA: boolean;
  /** 派生量（v、逐差 a、拟合斜率 a）判分要求的有效数字位数（2–4，默认 3）。 */
  vSigFigs: number;
};

export type TimingDot = {
  t: number;
  xCm: number;
};

export type TickerTapeState = {
  t: number;
  tMax: number;
  playing: boolean;
  finished: boolean;
  tapeKind: TapeKind;
  countEvery: 1 | 5;
  noise: NoiseLevel;
  showA: boolean;
  T: number;
  timingDots: TimingDot[];
  originTickIndex: number;
  countingTickIndices: number[];
  trueXCm: number[];
  tapeXCm: number[];
  measuredXCm: Array<number | null>;
  deltaXCm: Array<number | null>;
  vMs: Array<number | null>;
  aMs2: number | null;
  /** 派生量（v、逐差 a、拟合斜率 a）判分要求的有效数字位数。 */
  significantDigits: number;
};

const DEFAULTS: TickerTapeParams = {
  speed: 1,
  tapeKind: 'ua',
  countEvery: 1,
  noise: 'off',
  showA: false,
  vSigFigs: 3
};

/** 有效位数设置的合法范围（含端点）。 */
export const SIG_FIGS_RANGE = { min: 2, max: 4 } as const;

export function clampVSignificantDigits(value: number): number {
  if (!Number.isFinite(value)) return DEFAULTS.vSigFigs;
  return Math.max(
    SIG_FIGS_RANGE.min,
    Math.min(SIG_FIGS_RANGE.max, Math.round(value))
  );
}

export function countingPeriodS(countEvery: number): number {
  return TICK_PERIOD_S * countEvery;
}

/** x 为 cm。Δx_0 空，其后 x_i − x_{i-1}。缺测则该格空。 */
export function computeDeltaXCm(
  xCm: ReadonlyArray<number | null>
): Array<number | null> {
  return xCm.map((x, i) => {
    if (i === 0) return null;
    const prev = xCm[i - 1];
    if (x === null || prev === null) return null;
    return x - prev;
  });
}

/**
 * 中间时刻公式：v_n = (x_{n+1} − x_{n-1}) / (2T)，x 为 cm，v 为 m/s。
 * 端点无双侧数据则为 null。
 */
export function computeVMs(
  xCm: ReadonlyArray<number | null>,
  periodS: number
): Array<number | null> {
  const twoT = 2 * periodS;
  return xCm.map((x, i) => {
    if (i === 0 || i === xCm.length - 1) return null;
    const prev = xCm[i - 1];
    const next = xCm[i + 1];
    if (prev === null || next === null || x === null) return null;
    return (next - prev) / 100 / twoT;
  });
}

/**
 * 逐差加速度（m/s²）。5 点时与 2019 全国Ⅰ卷
 * a = (CD + DE − AB − BC) / (4 T²) = (x_last − 2 x_mid + x_0) / (4 T²) 一致。
 */
export function computeSuccessiveAMs2(
  xCm: ReadonlyArray<number | null>,
  periodS: number
): number | null {
  const n = xCm.length;
  if (n < 5) return null;
  const k = Math.floor((n - 1) / 2);
  const iMid = k;
  const iLast = 2 * k;
  const x0 = xCm[0];
  const xMid = xCm[iMid];
  const xLast = xCm[iLast];
  if (x0 === null || xMid === null || xLast === null) return null;
  const tBlock = k * periodS;
  return (xLast - 2 * xMid + x0) / 100 / (tBlock * tBlock);
}

export function fitLine(points: ReadonlyArray<{ t: number; y: number }>): {
  slope: number;
  intercept: number;
} | null {
  if (points.length < 2) return null;
  let sumT = 0;
  let sumY = 0;
  let sumTT = 0;
  let sumTY = 0;
  for (const p of points) {
    sumT += p.t;
    sumY += p.y;
    sumTT += p.t * p.t;
    sumTY += p.t * p.y;
  }
  const m = points.length;
  const den = m * sumTT - sumT * sumT;
  if (Math.abs(den) < 1e-18) return null;
  const slope = (m * sumTY - sumT * sumY) / den;
  const intercept = (sumY - slope * sumT) / m;
  return { slope, intercept };
}

/** y = a t² + b t + c。匀加速 x–t 是抛物线，不能用直线拟合。 */
export function fitQuadratic(
  points: ReadonlyArray<{ t: number; y: number }>
): { a: number; b: number; c: number } | null {
  if (points.length < 3) return null;
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let sy = 0;
  let s1y = 0;
  let s2y = 0;
  for (const p of points) {
    const t = p.t;
    const t2 = t * t;
    s0 += 1;
    s1 += t;
    s2 += t2;
    s3 += t2 * t;
    s4 += t2 * t2;
    sy += p.y;
    s1y += t * p.y;
    s2y += t2 * p.y;
  }
  const aug = [
    [s0, s1, s2, sy],
    [s1, s2, s3, s1y],
    [s2, s3, s4, s2y]
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    }
    if (Math.abs(aug[pivot][col]) < 1e-18) return null;
    if (pivot !== col) {
      const tmp = aug[col];
      aug[col] = aug[pivot];
      aug[pivot] = tmp;
    }
    const div = aug[col][col];
    for (let j = col; j < 4; j++) aug[col][j] /= div;
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const f = aug[row][col];
      for (let j = col; j < 4; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  return { c: aug[0][3], b: aug[1][3], a: aug[2][3] };
}

export function fitLineDroppingOutliers(
  points: ReadonlyArray<{ t: number; y: number }>
): {
  fit: { slope: number; intercept: number } | null;
  outlierIndices: number[];
} {
  const fitAll = fitLine(points);
  if (!fitAll || points.length < 4) {
    return { fit: fitAll, outlierIndices: [] };
  }
  const residuals = points.map((p) =>
    Math.abs(p.y - (fitAll.slope * p.t + fitAll.intercept))
  );
  const maxI = residuals.indexOf(Math.max(...residuals));
  const others = residuals.filter((_, i) => i !== maxI);
  const meanOthers =
    others.reduce((sum, r) => sum + r, 0) / Math.max(1, others.length);
  const cutoff = Math.max(0.05, 3 * meanOthers);
  const outlierIndices = residuals
    .map((r, i) => (r > cutoff ? i : -1))
    .filter((i) => i >= 0);
  if (outlierIndices.length === 0) return { fit: fitAll, outlierIndices: [] };
  const kept = points.filter((_, i) => !outlierIndices.includes(i));
  return { fit: fitLine(kept) ?? fitAll, outlierIndices };
}

export function roundCm(value: number): number {
  return Math.round(value * 100) / 100;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyRow(n: number): Array<number | null> {
  return Array.from({ length: n }, () => null);
}

/** x(t)（cm）。variable 用分段加速度，Δx 不等差。 */
export function xCmAt(kind: TapeKind, t: number): number {
  const tClamped = Math.max(0, t);
  switch (kind) {
    case 'uniform':
      return 8 * tClamped;
    case 'ua':
      return 20 * tClamped * tClamped;
    case 'ud': {
      // v0=0.32 m/s, a=−0.32 m/s²，停于 t=1 s，之后保持静止，避免纸带回头
      const tStop = Math.min(tClamped, 1);
      return 32 * tStop - 16 * tStop * tStop;
    }
    case 'variable':
      if (tClamped <= 0.5) return 10 * tClamped * tClamped;
      return 2.5 + 10 * (tClamped - 0.5) + 40 * (tClamped - 0.5) ** 2;
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

function buildTimingDots(kind: TapeKind): TimingDot[] {
  const dots: TimingDot[] = [];
  for (let i = 0; i <= LAST_TICK; i++) {
    const t = i * TICK_PERIOD_S;
    dots.push({ t, xCm: xCmAt(kind, t) });
  }
  return dots;
}

/** 毫米尺量程（cm）。O 拖拽上限保证 7 个计数点都落在尺内，一次读出。 */
export const RULER_RANGE_CM = 15;

/** 全局上限：计数段不超出纸带末尾。 */
export function maxOriginTickIndex(): number {
  return LAST_TICK - (COUNTING_POINT_COUNT - 1) * COUNTING_INTERVAL_TICKS;
}

/**
 * 按纸带种类的 O 点拖拽上限：最大的 originTickIndex，使计数段跨度
 * x(originT + 0.6 s) − x(originT) 不超过尺量程 RULER_RANGE_CM。
 * uniform/ud 跨度恒定或有界，上限即全局 maxOriginTickIndex()；
 * ua/variable 跨度随 originT 增大，上限收紧。
 */
export function maxOriginTickIndexFor(kind: TapeKind): number {
  const global = maxOriginTickIndex();
  const spanS =
    (COUNTING_POINT_COUNT - 1) * countingPeriodS(COUNTING_INTERVAL_TICKS);
  let result = 0;
  for (let origin = 0; origin <= global; origin += 1) {
    const originT = origin * TICK_PERIOD_S;
    const span = xCmAt(kind, originT + spanS) - xCmAt(kind, originT);
    if (span > RULER_RANGE_CM + 1e-9) break;
    result = origin;
  }
  return result;
}

export function clampOriginTickIndex(index: number, kind: TapeKind): number {
  const rounded = Math.round(index);
  return Math.max(0, Math.min(maxOriginTickIndexFor(kind), rounded));
}

export function countingTickIndices(
  originTickIndex: number,
  kind: TapeKind
): number[] {
  const origin = clampOriginTickIndex(originTickIndex, kind);
  return Array.from(
    { length: COUNTING_POINT_COUNT },
    (_, n) => origin + n * COUNTING_INTERVAL_TICKS
  );
}

function trueCountingXCm(kind: TapeKind, originTickIndex: number): number[] {
  const origin = clampOriginTickIndex(originTickIndex, kind);
  const originT = origin * TICK_PERIOD_S;
  const originX = xCmAt(kind, originT);
  const T = countingPeriodS(COUNTING_INTERVAL_TICKS);
  return Array.from({ length: COUNTING_POINT_COUNT }, (_, n) =>
    roundCm(xCmAt(kind, originT + n * T) - originX)
  );
}

function countingXFromDots(
  dots: ReadonlyArray<TimingDot>,
  countingIdx: ReadonlyArray<number>
): number[] {
  const origin = dots[countingIdx[0]];
  if (!origin) return countingIdx.map(() => 0);
  return countingIdx.map((i) => roundCm(dots[i].xCm - origin.xCm));
}

/** 在计数点中挑若干点沿纸带打偏，模拟打点不稳 / 摩擦。 */
export function applyTapeOutliers(
  dots: ReadonlyArray<TimingDot>,
  countingIdx: ReadonlyArray<number>,
  noise: NoiseLevel,
  seed = 1
): TimingDot[] {
  const nOut = TAPE_OUTLIER_COUNT[noise];
  const shift = TAPE_OUTLIER_SHIFT_CM[noise];
  const copy = dots.map((d) => ({ t: d.t, xCm: d.xCm }));
  if (nOut === 0 || shift === 0) return copy;
  const interior = countingIdx.slice(1, -1);
  if (interior.length === 0) return copy;
  const rng = mulberry32(seed);
  const chosen: number[] = [];
  const pool = [...interior];
  while (chosen.length < Math.min(nOut, pool.length)) {
    const k = Math.floor(rng() * pool.length);
    const idx = pool.splice(k, 1)[0];
    if (idx !== undefined) chosen.push(idx);
  }
  for (const i of chosen) {
    const prev = copy[i - 1]?.xCm ?? copy[i].xCm - shift;
    const next = copy[i + 1]?.xCm ?? copy[i].xCm + shift;
    const sign = rng() < 0.5 ? -1 : 1;
    const raw = copy[i].xCm + sign * shift;
    const lo = Math.min(prev, next) + 0.05;
    const hi = Math.max(prev, next) - 0.05;
    copy[i] = { t: copy[i].t, xCm: roundCm(Math.min(hi, Math.max(lo, raw))) };
  }
  return copy;
}

export function createTickerTapeSim(initial: Partial<TickerTapeParams> = {}) {
  let params: TickerTapeParams = { ...DEFAULTS, ...initial };
  let t = 0;
  let playing = false;
  let measuredXCm: Array<number | null> = emptyRow(COUNTING_POINT_COUNT);
  let deltaXCm: Array<number | null> = emptyRow(COUNTING_POINT_COUNT);
  let vMs: Array<number | null> = emptyRow(COUNTING_POINT_COUNT);
  let noiseSeed = 1;
  let originTickIndex = DENSE_TICKS_BEFORE_ORIGIN;

  function tMax(): number {
    return LAST_TICK * TICK_PERIOD_S;
  }

  function clearStudentTable(): void {
    measuredXCm = emptyRow(COUNTING_POINT_COUNT);
    deltaXCm = emptyRow(COUNTING_POINT_COUNT);
    vMs = emptyRow(COUNTING_POINT_COUNT);
  }

  function dotsNow(): TimingDot[] {
    const countingIdx = countingTickIndices(originTickIndex, params.tapeKind);
    // 误差是打点打偏，不是尺的估读；按尺填入读的是打偏后的点迹。
    return applyTapeOutliers(
      buildTimingDots(params.tapeKind),
      countingIdx,
      params.noise,
      noiseSeed
    );
  }

  t = tMax();

  function snapshot(): TickerTapeState {
    // 表与 T 固定按每 5 个打点（高考纸带题）；countEvery 只改点迹视觉。
    const T = countingPeriodS(COUNTING_INTERVAL_TICKS);
    const countingIdx = countingTickIndices(originTickIndex, params.tapeKind);
    const timingDots = dotsNow();
    const trueXCm = trueCountingXCm(params.tapeKind, originTickIndex);
    const tapeXCm = countingXFromDots(timingDots, countingIdx);
    const maxT = tMax();
    return {
      t,
      tMax: maxT,
      playing,
      finished: t >= maxT - 1e-9,
      tapeKind: params.tapeKind,
      countEvery: params.countEvery,
      noise: params.noise,
      showA: params.showA,
      T,
      timingDots,
      originTickIndex,
      countingTickIndices: countingIdx,
      trueXCm,
      tapeXCm,
      measuredXCm: [...measuredXCm],
      deltaXCm: [...deltaXCm],
      vMs: [...vMs],
      aMs2: params.showA ? computeSuccessiveAMs2(measuredXCm, T) : null,
      significantDigits: params.vSigFigs
    };
  }

  return {
    getState: snapshot,
    getParams(): TickerTapeParams {
      return { ...params };
    },
    setParams(next: Partial<TickerTapeParams>): TickerTapeParams {
      const tapeChanged =
        next.tapeKind !== undefined && next.tapeKind !== params.tapeKind;
      const noiseChanged =
        next.noise !== undefined && next.noise !== params.noise;
      const sigBefore = params.vSigFigs;
      params = {
        ...params,
        ...next,
        vSigFigs: clampVSignificantDigits(next.vSigFigs ?? params.vSigFigs)
      };
      if (tapeChanged) {
        clearStudentTable();
      } else if (noiseChanged) {
        noiseSeed += 1;
        clearStudentTable();
      } else if (params.vSigFigs !== sigBefore) {
        // x/Δx 不受影响；已写的 v 按新位数重取整，表格校对由 data-task 失效。
        vMs = vMs.map((v) =>
          v === null ? null : roundToSignificantDigits(v, params.vSigFigs)
        );
      }
      return { ...params };
    },
    fillFromRuler(): void {
      const countingIdx = countingTickIndices(originTickIndex, params.tapeKind);
      measuredXCm = countingXFromDots(dotsNow(), countingIdx);
      // Δx / v 留给学生手算，不在填尺时代填。
      deltaXCm = emptyRow(COUNTING_POINT_COUNT);
      vMs = emptyRow(COUNTING_POINT_COUNT);
    },
    setMeasuredX(index: number, value: number | null): void {
      if (index < 0 || index >= measuredXCm.length) return;
      measuredXCm[index] =
        value === null || !Number.isFinite(value) ? null : roundCm(value);
    },
    setDeltaX(index: number, value: number | null): void {
      if (index <= 0 || index >= deltaXCm.length) return;
      deltaXCm[index] =
        value === null || !Number.isFinite(value) ? null : roundCm(value);
    },
    setV(index: number, value: number | null): void {
      if (index < 0 || index >= vMs.length) return;
      vMs[index] =
        value === null || !Number.isFinite(value)
          ? null
          : roundToSignificantDigits(value, params.vSigFigs);
    },
    setOriginTickIndex(index: number): void {
      const next = clampOriginTickIndex(index, params.tapeKind);
      if (next === originTickIndex) return;
      originTickIndex = next;
      clearStudentTable();
    },
    step(dt: number): void {
      if (!playing) return;
      t = Math.min(tMax(), t + dt);
      if (t >= tMax() - 1e-9) playing = false;
    },
    startPlayback(): void {
      t = 0;
      playing = true;
    },
    pausePlayback(): void {
      playing = false;
    },
    showAllDots(): void {
      playing = false;
      t = tMax();
    },
    reset(): void {
      playing = false;
      t = tMax();
      originTickIndex = DENSE_TICKS_BEFORE_ORIGIN;
      clearStudentTable();
    }
  };
}

export type TickerTapeSim = ReturnType<typeof createTickerTapeSim>;
