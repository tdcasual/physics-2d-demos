import { clamp } from '../../core/math';

export type VariableWorkMode = 'linear' | 'power' | 'piecewise';

export type VariableWorkParams = {
  mode: VariableWorkMode;
  mass: number;
  k: number;
  power: number;
  microsteps: number;
};

export type VariableWorkRect = { x: number; width: number; height: number };

export type VariableWorkState = {
  params: VariableWorkParams;
  time: number;
  x: number;
  force: number;
  velocity: number;
  power: number;
  work: number;
  kineticGain: number;
  riemannWork: number;
  riemannError: number;
  riemannBias: 'under' | 'over' | 'equal';
  rectangles: VariableWorkRect[];
  finished: boolean;
  playing: boolean;
};

export const variableWorkConstants = {
  defaultMass: 2,
  defaultK: 2,
  defaultPower: 10,
  defaultMicrosteps: 0,
  massMin: 0.5,
  massMax: 5,
  kMin: 0.5,
  kMax: 6,
  powerMin: 2,
  powerMax: 40,
  microstepsMin: 0,
  microstepsMax: 32,
  x0: 0.5,
  powerV0: 1,
  xMax: 8,
  trackMax: 10,
  pieceBreak: 3,
  stageFallbackWidth: 800,
  stageFallbackHeight: 420,
  graphFallbackWidth: 640,
  graphFallbackHeight: 240
} as const;

const C = variableWorkConstants;

const DEFAULTS: VariableWorkParams = {
  mode: 'linear',
  mass: C.defaultMass,
  k: C.defaultK,
  power: C.defaultPower,
  microsteps: C.defaultMicrosteps
};

function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  return fallback;
}

export function asMode(value: unknown): VariableWorkMode {
  if (value === 'power' || value === 1 || value === '1') return 'power';
  if (value === 'piecewise' || value === 2 || value === '2') return 'piecewise';
  return 'linear';
}

export function modeIndex(mode: VariableWorkMode): number {
  if (mode === 'power') return 1;
  if (mode === 'piecewise') return 2;
  return 0;
}

export function shouldShowK(mode: VariableWorkMode): boolean {
  return mode !== 'power';
}

export function shouldShowPower(mode: VariableWorkMode): boolean {
  return mode === 'power';
}

function normalize(
  input: Partial<VariableWorkParams>,
  previous = DEFAULTS
): VariableWorkParams {
  return {
    mode: input.mode === undefined ? previous.mode : asMode(input.mode),
    mass: clamp(finite(input.mass, previous.mass), C.massMin, C.massMax),
    k: clamp(finite(input.k, previous.k), C.kMin, C.kMax),
    power: clamp(finite(input.power, previous.power), C.powerMin, C.powerMax),
    microsteps: Math.round(
      clamp(
        finite(input.microsteps, previous.microsteps),
        C.microstepsMin,
        C.microstepsMax
      )
    )
  };
}

/** Speed at position x for constant power starting at (x0, v0). */
export function powerSpeedAtX(params: VariableWorkParams, x: number): number {
  const dx = Math.max(0, x - C.x0);
  const cubed =
    C.powerV0 * C.powerV0 * C.powerV0 +
    (3 * params.power * dx) / Math.max(params.mass, 1e-6);
  return Math.cbrt(Math.max(cubed, 0));
}

/** F(x). Power: 0 before x₀, then F=P/v. */
export function forceAt(params: VariableWorkParams, x: number): number {
  const s = Math.max(0, x);
  if (params.mode === 'power') {
    if (x < C.x0) return 0;
    return params.power / Math.max(powerSpeedAtX(params, s), 1e-6);
  }
  if (params.mode === 'piecewise') {
    if (s <= C.pieceBreak) return params.k * s;
    return Math.max(
      0,
      params.k * C.pieceBreak - 0.5 * params.k * (s - C.pieceBreak)
    );
  }
  return params.k * s;
}

/** ∫_0^x F(s) ds (graph area from the origin). */
export function workFromOrigin(params: VariableWorkParams, x: number): number {
  const s = Math.max(0, x);
  if (params.mode === 'power') {
    return params.power * timeToReach(params, s);
  }
  if (params.mode === 'piecewise') {
    if (s <= C.pieceBreak) return 0.5 * params.k * s * s;
    const dx = s - C.pieceBreak;
    return (
      0.5 * params.k * C.pieceBreak * C.pieceBreak +
      params.k * C.pieceBreak * dx -
      0.25 * params.k * dx * dx
    );
  }
  return 0.5 * params.k * s * s;
}

/** Work from the motion start. Power: Pt = ½m(v²−v₀²). Equals ΔK. */
export function workFromStart(params: VariableWorkParams, x: number): number {
  if (params.mode === 'power') {
    const v = powerSpeedAtX(params, x);
    return Math.max(0, 0.5 * params.mass * (v * v - C.powerV0 * C.powerV0));
  }
  return Math.max(0, workFromOrigin(params, x) - workFromOrigin(params, C.x0));
}

export function omega(params: VariableWorkParams): number {
  return Math.sqrt(params.k / Math.max(params.mass, 1e-6));
}

export function powerVelocity(params: VariableWorkParams, t: number): number {
  return Math.sqrt(
    C.powerV0 * C.powerV0 + (2 * params.power * Math.max(0, t)) / params.mass
  );
}

/** x(t)=x₀+(m/3P)[(v₀²+2Pt/m)^{3/2}−v₀³] for constant power. */
export function powerPosition(params: VariableWorkParams, t: number): number {
  const v = powerVelocity(params, t);
  return (
    C.x0 +
    (params.mass / (3 * Math.max(params.power, 1e-9))) *
      (v * v * v - C.powerV0 * C.powerV0 * C.powerV0)
  );
}

export function timeToReach(params: VariableWorkParams, x: number): number {
  const target = clamp(x, 0, C.xMax);
  if (params.mode === 'power') {
    const v = powerSpeedAtX(params, target);
    return (
      (params.mass * (v * v - C.powerV0 * C.powerV0)) /
      (2 * Math.max(params.power, 1e-9))
    );
  }
  if (params.mode === 'linear') {
    const w = omega(params);
    if (target <= C.x0) return 0;
    return Math.acosh(target / C.x0) / w;
  }
  return piecewiseTimeToX(params, target);
}

type PiecewisePack = {
  w: number;
  w2: number;
  t1: number;
  v1: number;
  amp: number;
  D: number;
  xEq: number;
  tEnd: number;
};

const piecewisePackMemo = { key: '', pack: null as PiecewisePack | null };

/** F=k x_b - (k/2)(x-x_b) = 0 at x=3 x_b. */
export function piecewiseXEq(): number {
  return C.pieceBreak + C.pieceBreak / 0.5;
}

function piecewisePack(params: VariableWorkParams): PiecewisePack {
  const key = `${params.mass}:${params.k}`;
  if (piecewisePackMemo.key === key && piecewisePackMemo.pack) {
    return piecewisePackMemo.pack;
  }
  const w = omega(params);
  const t1 = C.pieceBreak <= C.x0 ? 0 : Math.acosh(C.pieceBreak / C.x0) / w;
  const v1 = C.x0 * w * Math.sinh(w * t1);
  const w2 = Math.sqrt(params.k / (2 * Math.max(params.mass, 1e-6)));
  const xEq = piecewiseXEq();
  const amp = xEq - C.pieceBreak;
  const D = v1 / Math.max(w2, 1e-9);
  let theta = 0.2;
  const target = C.xMax;
  for (let i = 0; i < 12; i += 1) {
    const f = xEq - amp * Math.cos(theta) + D * Math.sin(theta) - target;
    const df = amp * Math.sin(theta) + D * Math.cos(theta);
    theta -= f / (Math.abs(df) < 1e-9 ? 1e-9 : df);
    if (theta < 0) theta = 0;
  }
  const pack: PiecewisePack = {
    w,
    w2,
    t1,
    v1,
    amp,
    D,
    xEq,
    tEnd: t1 + theta / w2
  };
  piecewisePackMemo.key = key;
  piecewisePackMemo.pack = pack;
  return pack;
}

export function piecewiseOmega2(params: VariableWorkParams): number {
  return piecewisePack(params).w2;
}

export function piecewiseBreakTime(params: VariableWorkParams): number {
  return piecewisePack(params).t1;
}

export function piecewiseBreakSpeed(params: VariableWorkParams): number {
  return piecewisePack(params).v1;
}

function piecewiseStateAfterBreak(
  pack: PiecewisePack,
  tau: number
): { x: number; velocity: number } {
  const th = pack.w2 * Math.max(0, tau);
  return {
    x: pack.xEq - pack.amp * Math.cos(th) + pack.D * Math.sin(th),
    velocity: pack.amp * pack.w2 * Math.sin(th) + pack.v1 * Math.cos(th)
  };
}

function piecewiseTauForX(pack: PiecewisePack, x: number): number {
  const target = clamp(x, C.pieceBreak, C.xMax);
  let theta = 0.2;
  for (let i = 0; i < 12; i += 1) {
    const f =
      pack.xEq - pack.amp * Math.cos(theta) + pack.D * Math.sin(theta) - target;
    const df = pack.amp * Math.sin(theta) + pack.D * Math.cos(theta);
    theta -= f / (Math.abs(df) < 1e-9 ? 1e-9 : df);
    if (theta < 0) theta = 0;
  }
  return theta / pack.w2;
}

function piecewiseTimeToX(params: VariableWorkParams, x: number): number {
  const end = Math.max(C.x0, x);
  if (end <= C.x0) return 0;
  const pack = piecewisePack(params);
  if (end <= C.pieceBreak) return Math.acosh(end / C.x0) / pack.w;
  return pack.t1 + piecewiseTauForX(pack, end);
}

const endTimeMemo = { key: '', value: 0 };

export function endTime(params: VariableWorkParams): number {
  const key = `${params.mode}:${params.mass}:${params.k}:${params.power}`;
  if (endTimeMemo.key === key) return endTimeMemo.value;
  const value =
    params.mode === 'piecewise'
      ? piecewisePack(params).tEnd
      : timeToReach(params, C.xMax);
  endTimeMemo.key = key;
  endTimeMemo.value = value;
  return value;
}

export function sampleAt(
  params: VariableWorkParams,
  time: number
): {
  x: number;
  velocity: number;
  force: number;
  work: number;
  power: number;
  kineticGain: number;
  finished: boolean;
  time: number;
} {
  const tEnd = endTime(params);
  const finished = time >= tEnd - 1e-9;
  const t = finished ? tEnd : Math.max(0, time);
  let x: number;
  let velocity: number;
  if (params.mode === 'power') {
    x = Math.min(C.xMax, powerPosition(params, t));
    velocity = powerVelocity(params, t);
  } else if (params.mode === 'linear') {
    const w = omega(params);
    x = Math.min(C.xMax, C.x0 * Math.cosh(w * t));
    velocity = C.x0 * w * Math.sinh(w * t);
  } else {
    const pack = piecewisePack(params);
    const motion = piecewiseMotionAtTime(pack, t);
    x = Math.min(C.xMax, motion.x);
    velocity = motion.velocity;
  }
  const work = workFromStart(params, x);
  const force = forceAt(params, x);
  const power = force * velocity;
  return {
    x,
    velocity,
    force,
    work,
    power,
    kineticGain: work,
    finished,
    time: t
  };
}

function piecewiseMotionAtTime(
  pack: PiecewisePack,
  t: number
): { x: number; velocity: number } {
  if (t <= 0) return { x: C.x0, velocity: 0 };
  if (t <= pack.t1) {
    return {
      x: C.x0 * Math.cosh(pack.w * t),
      velocity: C.x0 * pack.w * Math.sinh(pack.w * t)
    };
  }
  return piecewiseStateAfterBreak(pack, t - pack.t1);
}

/** Left edge of the F-x work integral: motion starts at x0 for every mode. */
export function fillStartX(_params?: VariableWorkParams): number {
  return C.x0;
}

/** Trapezoid of F(x) on [x0, x]; equals analytical W. */
export function integrateForce(
  params: VariableWorkParams,
  x: number,
  n = 64
): number {
  const start = fillStartX(params);
  const end = Math.max(start, x);
  if (end - start < 1e-9 || n <= 0) return 0;
  const dx = (end - start) / n;
  let value = 0;
  for (let i = 0; i < n; i += 1) {
    const xa = start + i * dx;
    const xb = xa + dx;
    value += 0.5 * (forceAt(params, xa) + forceAt(params, xb)) * dx;
  }
  return value;
}

/** Trapezoid of P(t) on [0, t]; equals W. */
export function integratePower(
  params: VariableWorkParams,
  t: number,
  n = 48
): number {
  const end = Math.max(0, t);
  if (end < 1e-9 || n <= 0) return 0;
  const dt = end / n;
  let value = 0;
  for (let i = 0; i < n; i += 1) {
    const pa = sampleAt(params, i * dt).power;
    const pb = sampleAt(params, (i + 1) * dt).power;
    value += 0.5 * (pa + pb) * dt;
  }
  return value;
}

/**
 * Left-endpoint Riemann sum of F on [fillStartX, x].
 * For increasing F=kx this underestimates the triangle; finer n converges.
 */
export function riemannWork(
  params: VariableWorkParams,
  x: number,
  n: number
): { value: number; rectangles: VariableWorkRect[] } {
  const start = fillStartX(params);
  const end = Math.max(start, x);
  if (n <= 0 || end - start < 1e-9) {
    return { value: 0, rectangles: [] };
  }
  const width = (end - start) / n;
  const rectangles: VariableWorkRect[] = [];
  let value = 0;
  for (let i = 0; i < n; i += 1) {
    const left = start + i * width;
    const height = forceAt(params, left);
    rectangles.push({ x: left, width, height });
    value += height * width;
  }
  return { value, rectangles };
}

export function riemannBias(
  exact: number,
  approx: number
): 'under' | 'over' | 'equal' {
  const d = approx - exact;
  if (Math.abs(d) < 1e-6) return 'equal';
  return d < 0 ? 'under' : 'over';
}

export function restoredUrlParams(
  params: VariableWorkParams,
  isPlaying = false
): Record<string, string | number> {
  return {
    mode: modeIndex(params.mode),
    mass: params.mass,
    k: params.k,
    power: params.power,
    microsteps: params.microsteps,
    autoRun: isPlaying ? 1 : 0
  };
}

export function createVariableWorkSim(
  initial: Partial<VariableWorkParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  let playing = false;

  function snapshot(): VariableWorkState {
    const sample = sampleAt(params, time);
    const riemann = riemannWork(params, sample.x, params.microsteps);
    return {
      params: { ...params },
      time: sample.time,
      x: sample.x,
      force: sample.force,
      velocity: sample.velocity,
      power: sample.power,
      work: sample.work,
      kineticGain: sample.kineticGain,
      riemannWork: riemann.value,
      riemannError: Math.abs(sample.work - riemann.value),
      riemannBias: riemannBias(sample.work, riemann.value),
      rectangles: riemann.rectangles,
      finished: sample.finished,
      playing: playing && !sample.finished
    };
  }

  return {
    getState: snapshot,
    getSnapshot: snapshot,
    getParams: (): VariableWorkParams => ({ ...params }),
    setParams(next: Partial<VariableWorkParams>) {
      const prev = { ...params };
      params = normalize({ ...params, ...next }, params);
      const motionChanged =
        prev.mode !== params.mode ||
        prev.mass !== params.mass ||
        prev.k !== params.k ||
        prev.power !== params.power;
      if (motionChanged) time = 0;
      else {
        const tEnd = endTime(params);
        if (time > tEnd) time = tEnd;
      }
      return { ...params };
    },
    step(dt: number) {
      if (!playing) return;
      const sample = sampleAt(params, time);
      if (sample.finished) {
        playing = false;
        time = sample.time;
        return;
      }
      time = Math.min(endTime(params), time + Math.max(0, finite(dt, 0)));
      if (time >= endTime(params) - 1e-9) playing = false;
    },
    start() {
      if (sampleAt(params, time).finished) time = 0;
      playing = true;
    },
    pause() {
      playing = false;
    },
    rewind() {
      time = 0;
      playing = false;
    },
    reset() {
      params = { ...defaults };
      time = 0;
      playing = false;
    }
  };
}
