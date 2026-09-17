import { clamp } from '../../core/math';

export type MechanicalEnergyEnvironment = 'ideal' | 'resist';

export type MechanicalEnergyParams = {
  environment: MechanicalEnergyEnvironment;
  resistance: number;
  mass: number;
  gravity: number;
  pointPeriod: number;
  autoRun: boolean;
};

export type MechanicalEnergyPoint = {
  label: string;
  index: number;
  time: number;
  height: number;
  speed: number;
  potentialLoss: number;
  kineticGain: number;
  dissipation: number;
};

export type MechanicalEnergyTapeDot = {
  time: number;
  height: number;
  counting: boolean;
  label: string | null;
};

export type MechanicalEnergyGraphPoint = {
  height: number;
  halfV2: number;
  label: string;
};

export type MechanicalEnergyState = {
  params: MechanicalEnergyParams;
  time: number;
  acceleration: number;
  resistanceForce: number;
  height: number;
  speed: number;
  potentialLoss: number;
  kineticGain: number;
  dissipation: number;
  finished: boolean;
  points: MechanicalEnergyPoint[];
  tapeDots: MechanicalEnergyTapeDot[];
  graphPoints: MechanicalEnergyGraphPoint[];
};

export const COUNT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

/** Cover teaching window: a = 9.4 m/s² at g = 9.8, so k = 1 − 9.4/9.8. */
export const COVER_ACCELERATION = 9.4;
export const COVER_GRAVITY = 9.8;
export const COVER_RESISTANCE = 1 - COVER_ACCELERATION / COVER_GRAVITY;

export const mechanicalEnergyConstants = {
  tickPeriod: 0.02,
  countPointCount: COUNT_LABELS.length,
  resistanceMin: 0,
  resistanceMax: 0.25,
  massMin: 0.5,
  massMax: 2,
  gravityMin: 8,
  gravityMax: 12,
  pointPeriodMin: 0.02,
  pointPeriodMax: 0.1,
  defaultResistance: COVER_RESISTANCE,
  defaultMass: 1,
  defaultGravity: COVER_GRAVITY,
  defaultPointPeriod: 0.04,
  rulerCentimetres: 20,
  graphFallbackWidth: 640,
  graphFallbackHeight: 240,
  stageFallbackWidth: 800,
  stageFallbackHeight: 420
} as const;

const C = mechanicalEnergyConstants;

const DEFAULTS: MechanicalEnergyParams = {
  environment: 'resist',
  resistance: C.defaultResistance,
  mass: C.defaultMass,
  gravity: C.defaultGravity,
  pointPeriod: C.defaultPointPeriod,
  autoRun: false
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
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === 'true' || text === 'on' || text === 'yes') return true;
    if (text === 'false' || text === 'off' || text === 'no' || text === '') {
      return false;
    }
  }
  return fallback;
}

export function asEnvironment(
  value: unknown
): MechanicalEnergyEnvironment | undefined {
  if (value === 'ideal' || value === 0 || value === '0') return 'ideal';
  if (value === 'resist' || value === 1 || value === '1') return 'resist';
  return undefined;
}

function snapPointPeriod(value: number): number {
  const stepped = Math.round(value / C.tickPeriod) * C.tickPeriod;
  return clamp(Number(stepped.toFixed(2)), C.pointPeriodMin, C.pointPeriodMax);
}

function normalize(
  input: Partial<MechanicalEnergyParams>,
  previous = DEFAULTS
): MechanicalEnergyParams {
  return {
    environment: asEnvironment(input.environment) ?? previous.environment,
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      C.resistanceMin,
      C.resistanceMax
    ),
    mass: clamp(finite(input.mass, previous.mass), C.massMin, C.massMax),
    gravity: clamp(
      finite(input.gravity, previous.gravity),
      C.gravityMin,
      C.gravityMax
    ),
    pointPeriod: snapPointPeriod(
      finite(input.pointPeriod, previous.pointPeriod)
    ),
    autoRun: asBool(input.autoRun, previous.autoRun)
  };
}

function physicsChanged(
  previous: MechanicalEnergyParams,
  next: MechanicalEnergyParams
): boolean {
  return (
    previous.environment !== next.environment ||
    previous.resistance !== next.resistance ||
    previous.mass !== next.mass ||
    previous.gravity !== next.gravity ||
    previous.pointPeriod !== next.pointPeriod
  );
}

/**
 * 恒定阻力模型：阻力系数 k∈[0, 0.25] 无量纲，F_r = k mg。
 * 理想环境忽略 k，a = g；阻力环境 a = g(1 − k)。
 */
export function resistanceCoefficient(params: MechanicalEnergyParams): number {
  return params.environment === 'ideal' ? 0 : params.resistance;
}

export function resistanceForce(params: MechanicalEnergyParams): number {
  return resistanceCoefficient(params) * params.mass * params.gravity;
}

export function effectiveAcceleration(params: MechanicalEnergyParams): number {
  return params.gravity * (1 - resistanceCoefficient(params));
}

export function endTime(params: MechanicalEnergyParams): number {
  return (C.countPointCount + 1) * params.pointPeriod;
}

/** h(t) = ½ a t²，从静止释放。 */
export function heightAt(acceleration: number, time: number): number {
  const t = Math.max(0, finite(time, 0));
  const a = finite(acceleration, 0);
  return 0.5 * a * t * t;
}

/** v(t) = a t，从静止释放。 */
export function trueSpeedAt(acceleration: number, time: number): number {
  const t = Math.max(0, finite(time, 0));
  return finite(acceleration, 0) * t;
}

/**
 * 计数点瞬时速度：中心差分 vₙ = (hₙ₊₁ − hₙ₋₁) / (2 T₀)。
 * 左右样本必须是真实计数时刻，不镜像、不单侧外推。
 */
export function measuredSpeedAt(
  params: MechanicalEnergyParams,
  index: number
): number | null {
  if (!Number.isInteger(index) || index < 1) return null;
  const T0 = params.pointPeriod;
  const a = effectiveAcceleration(params);
  const hPrev = heightAt(a, (index - 1) * T0);
  const hNext = heightAt(a, (index + 1) * T0);
  return (hNext - hPrev) / (2 * T0);
}

export function potentialLoss(
  params: MechanicalEnergyParams,
  height: number
): number {
  return params.mass * params.gravity * Math.max(0, height);
}

export function kineticGain(
  params: MechanicalEnergyParams,
  speed: number
): number {
  return 0.5 * params.mass * speed * speed;
}

export function dissipationWork(
  params: MechanicalEnergyParams,
  height: number
): number {
  return resistanceForce(params) * Math.max(0, height);
}

function nearMultiple(time: number, period: number): boolean {
  if (period <= 0) return false;
  const n = Math.round(time / period);
  return Math.abs(time - n * period) <= 1e-9 * Math.max(1, period);
}

export function formatFixed(value: number, digits = 3): string {
  return value.toFixed(digits);
}

export function formatResistance(value: number): string {
  return formatFixed(value, 4);
}

export function shouldShowResistance(
  environment: MechanicalEnergyEnvironment
): boolean {
  return environment === 'resist';
}

export function restoredUrlParams(params: MechanicalEnergyParams): {
  environment: 0 | 1;
  resistance: number;
  mass: number;
  gravity: number;
  pointPeriod: number;
  autoRun: 0 | 1;
} {
  return {
    environment: params.environment === 'ideal' ? 0 : 1,
    resistance: params.resistance,
    mass: params.mass,
    gravity: params.gravity,
    pointPeriod: params.pointPeriod,
    autoRun: params.autoRun ? 1 : 0
  };
}

export function tapeDotsAt(
  params: MechanicalEnergyParams,
  time: number
): MechanicalEnergyTapeDot[] {
  const elapsed = Math.max(0, finite(time, 0));
  if (elapsed <= 0 && !params.autoRun) return [];
  const a = effectiveAcceleration(params);
  const T = C.tickPeriod;
  const T0 = params.pointPeriod;
  const last = Math.min(elapsed, endTime(params));
  const dots: MechanicalEnergyTapeDot[] = [];
  const maxN = Math.floor(last / T + 1e-9);
  for (let n = 0; n <= maxN; n += 1) {
    const stamp = n * T;
    const countIndex = nearMultiple(stamp, T0) ? Math.round(stamp / T0) : -1;
    const labeled =
      countIndex >= 1 && countIndex <= C.countPointCount
        ? COUNT_LABELS[countIndex - 1]
        : countIndex === 0
          ? 'O'
          : null;
    dots.push({
      time: stamp,
      height: heightAt(a, stamp),
      counting: countIndex >= 1 && countIndex <= C.countPointCount,
      label: labeled
    });
  }
  return dots;
}

export function countPointsAt(
  params: MechanicalEnergyParams,
  time: number
): MechanicalEnergyPoint[] {
  const elapsed = Math.max(0, finite(time, 0));
  const T0 = params.pointPeriod;
  const a = effectiveAcceleration(params);
  const points: MechanicalEnergyPoint[] = [];
  for (let index = 1; index <= C.countPointCount; index += 1) {
    // Need a real next counting sample for the center difference.
    if (elapsed + 1e-9 < (index + 1) * T0) break;
    const stamp = index * T0;
    const speed = measuredSpeedAt(params, index);
    if (speed === null) break;
    const height = heightAt(a, stamp);
    points.push({
      label: COUNT_LABELS[index - 1],
      index,
      time: stamp,
      height,
      speed,
      potentialLoss: potentialLoss(params, height),
      kineticGain: kineticGain(params, speed),
      dissipation: dissipationWork(params, height)
    });
  }
  return points;
}

function derive(
  params: MechanicalEnergyParams,
  time: number
): MechanicalEnergyState {
  const tEnd = endTime(params);
  const t = clamp(finite(time, 0), 0, tEnd);
  const acceleration = effectiveAcceleration(params);
  const height = heightAt(acceleration, t);
  const speed = trueSpeedAt(acceleration, t);
  const points = countPointsAt(params, t);
  return {
    params: { ...params },
    time: t,
    acceleration,
    resistanceForce: resistanceForce(params),
    height,
    speed,
    potentialLoss: potentialLoss(params, height),
    kineticGain: kineticGain(params, speed),
    dissipation: dissipationWork(params, height),
    finished: t >= tEnd - 1e-9,
    points,
    tapeDots: tapeDotsAt(params, t),
    graphPoints: points.map((point) => ({
      height: point.height,
      halfV2: 0.5 * point.speed * point.speed,
      label: point.label
    }))
  };
}

export function createMechanicalEnergySim(
  initial: Partial<MechanicalEnergyParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  return {
    getState: (): MechanicalEnergyState => derive(params, time),
    getSnapshot: (): MechanicalEnergyState => derive(params, time),
    getParams: (): MechanicalEnergyParams => ({ ...params }),
    setParams(next: Partial<MechanicalEnergyParams>): MechanicalEnergyParams {
      const previous = params;
      params = normalize({ ...params, ...next }, params);
      if (physicsChanged(previous, params)) time = 0;
      return { ...params };
    },
    step(dt: number): void {
      const delta = finite(dt, 0);
      if (!params.autoRun || delta <= 0) return;
      const tEnd = endTime(params);
      time = Math.min(tEnd, time + delta);
      if (time >= tEnd - 1e-9) {
        time = tEnd;
        params = { ...params, autoRun: false };
      }
    },
    rewind(): void {
      time = 0;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
