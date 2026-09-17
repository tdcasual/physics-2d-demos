import { clamp } from '../../core/math';

export type RodModel = 'resistor' | 'capacitor';

export type RodParams = {
  model: RodModel;
  fieldStrength: number;
  railGap: number;
  externalForce: number;
  mass: number;
  resistance: number;
  capacitance: number;
  autoRun: boolean;
};

export type RodState = {
  params: RodParams;
  time: number;
  position: number;
  velocity: number;
  acceleration: number;
  current: number;
  magneticForce: number;
  emf: number;
  heatingPower: number;
  terminalVelocity: number | null;
  equivalentMass: number;
  finished: boolean;
};

export const rodModelConstants = {
  startPosition: 0,
  railLength: 6,
  timeMax: 10,
  fieldMin: 0.2,
  fieldMax: 3,
  railGapMin: 0.5,
  railGapMax: 2,
  forceMin: 0.5,
  forceMax: 6,
  massMin: 0.2,
  massMax: 2,
  resistanceMin: 0.2,
  resistanceMax: 4,
  capacitanceMin: 0.1,
  capacitanceMax: 2,
  graphFallbackWidth: 640,
  graphFallbackHeight: 240,
  stageFallbackWidth: 800,
  stageFallbackHeight: 320
} as const;

const C = rodModelConstants;

const DEFAULTS: RodParams = {
  model: 'resistor',
  fieldStrength: 1,
  railGap: 1,
  externalForce: 2,
  mass: 0.5,
  resistance: 1,
  capacitance: 0.5,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === 'on' || v === 'yes') return true;
    if (v === 'false' || v === 'off' || v === 'no' || v === '') return false;
  }
  return fallback;
}

export function asRodModel(value: unknown): RodModel | null {
  if (value === 'resistor' || value === 0 || value === '0') return 'resistor';
  if (value === 'capacitor' || value === 1 || value === '1') return 'capacitor';
  return null;
}

function normalize(input: Partial<RodParams>, previous = DEFAULTS): RodParams {
  return {
    model: asRodModel(input.model) ?? previous.model,
    fieldStrength: clamp(
      finite(input.fieldStrength, previous.fieldStrength),
      C.fieldMin,
      C.fieldMax
    ),
    railGap: clamp(
      finite(input.railGap, previous.railGap),
      C.railGapMin,
      C.railGapMax
    ),
    externalForce: clamp(
      finite(input.externalForce, previous.externalForce),
      C.forceMin,
      C.forceMax
    ),
    mass: clamp(finite(input.mass, previous.mass), C.massMin, C.massMax),
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      C.resistanceMin,
      C.resistanceMax
    ),
    capacitance: clamp(
      finite(input.capacitance, previous.capacitance),
      C.capacitanceMin,
      C.capacitanceMax
    ),
    autoRun: asBool(input.autoRun, previous.autoRun)
  };
}

/** γ = B²L²/R. Independent of the active model. */
export function magneticDrag(params: RodParams): number {
  return (
    (params.fieldStrength *
      params.fieldStrength *
      params.railGap *
      params.railGap) /
    params.resistance
  );
}

export function dragCoefficient(params: RodParams): number {
  return magneticDrag(params);
}

export function resistorTerminalVelocity(params: RodParams): number {
  const gamma = magneticDrag(params);
  return gamma > 0 ? params.externalForce / gamma : 0;
}

export function resistorTimeConstant(params: RodParams): number {
  const gamma = magneticDrag(params);
  return gamma > 0 ? params.mass / gamma : Number.POSITIVE_INFINITY;
}

/** v(t) = vₘ(1 − e^{−t/τ}) from rest, τ = m/γ. */
export function resistorVelocityAt(params: RodParams, time: number): number {
  const t = Math.max(0, time);
  const terminal = resistorTerminalVelocity(params);
  const tau = resistorTimeConstant(params);
  if (!Number.isFinite(tau) || tau <= 0) return 0;
  return terminal * (1 - Math.exp(-t / tau));
}

/** x(t) = vₘ t − vₘ τ(1 − e^{−t/τ}) from rest. */
export function resistorPositionAt(params: RodParams, time: number): number {
  const t = Math.max(0, time);
  const terminal = resistorTerminalVelocity(params);
  const tau = resistorTimeConstant(params);
  if (!Number.isFinite(tau) || tau <= 0) return 0;
  return terminal * (t - tau * (1 - Math.exp(-t / tau)));
}

export function capacitorEquivalentMass(params: RodParams): number {
  return (
    params.mass +
    params.fieldStrength *
      params.fieldStrength *
      params.railGap *
      params.railGap *
      params.capacitance
  );
}

export function equivalentMass(params: RodParams): number {
  return params.model === 'capacitor'
    ? capacitorEquivalentMass(params)
    : params.mass;
}

/** a = F / (m + B²L²C), constant. */
export function capacitorAcceleration(params: RodParams): number {
  const massStar = capacitorEquivalentMass(params);
  return massStar > 0 ? params.externalForce / massStar : 0;
}

export function capacitorVelocityAt(params: RodParams, time: number): number {
  return capacitorAcceleration(params) * Math.max(0, time);
}

export function capacitorPositionAt(params: RodParams, time: number): number {
  const t = Math.max(0, time);
  return 0.5 * capacitorAcceleration(params) * t * t;
}

export function velocityAt(params: RodParams, time: number): number {
  return params.model === 'capacitor'
    ? capacitorVelocityAt(params, time)
    : resistorVelocityAt(params, time);
}

export function positionAt(params: RodParams, time: number): number {
  return params.model === 'capacitor'
    ? capacitorPositionAt(params, time)
    : resistorPositionAt(params, time);
}

export function accelerationAt(params: RodParams, velocity: number): number {
  if (params.model === 'capacitor') return capacitorAcceleration(params);
  return (params.externalForce - magneticDrag(params) * velocity) / params.mass;
}

export function currentAt(params: RodParams, velocity: number): number {
  if (params.model === 'capacitor') {
    return (
      params.capacitance *
      params.fieldStrength *
      params.railGap *
      capacitorAcceleration(params)
    );
  }
  return (params.fieldStrength * params.railGap * velocity) / params.resistance;
}

export function timeToRail(params: RodParams): number {
  const length = C.railLength;
  if (params.model === 'capacitor') {
    const a = capacitorAcceleration(params);
    if (a <= 0) return Number.POSITIVE_INFINITY;
    return Math.sqrt((2 * length) / a);
  }
  const terminal = resistorTerminalVelocity(params);
  const tau = resistorTimeConstant(params);
  if (terminal <= 0 || !Number.isFinite(tau) || tau <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  let t = length / terminal + tau;
  for (let index = 0; index < 24; index += 1) {
    const err = resistorPositionAt(params, t) - length;
    const slope = resistorVelocityAt(params, t);
    if (Math.abs(err) < 1e-12) break;
    if (slope <= 1e-12) break;
    t = Math.max(0, t - err / slope);
  }
  return t;
}

export function motionEndTime(params: RodParams): number {
  return Math.min(C.timeMax, timeToRail(params));
}

function derive(params: RodParams, time: number): RodState {
  const end = motionEndTime(params);
  const t = clamp(time, 0, end);
  const velocity = velocityAt(params, t);
  const acceleration = accelerationAt(params, velocity);
  const current = currentAt(params, velocity);
  const emf = params.fieldStrength * params.railGap * velocity;
  const magneticForce = params.fieldStrength * params.railGap * current;
  const terminalVelocity =
    params.model === 'resistor' ? resistorTerminalVelocity(params) : null;
  return {
    params: { ...params },
    time: t,
    position: clamp(positionAt(params, t), 0, C.railLength),
    velocity,
    acceleration,
    current,
    magneticForce,
    emf,
    heatingPower:
      params.model === 'resistor' ? current * current * params.resistance : 0,
    terminalVelocity,
    equivalentMass: equivalentMass(params),
    finished: t >= end - 1e-9
  };
}

function physicsChanged(previous: RodParams, next: RodParams): boolean {
  return (
    previous.model !== next.model ||
    previous.fieldStrength !== next.fieldStrength ||
    previous.railGap !== next.railGap ||
    previous.externalForce !== next.externalForce ||
    previous.mass !== next.mass ||
    previous.resistance !== next.resistance ||
    previous.capacitance !== next.capacitance
  );
}

export function createRodModelSim(initial: Partial<RodParams> = {}) {
  let params = normalize(initial);
  let time = 0;

  function rewindMotion(): void {
    time = 0;
  }

  return {
    getState: (): RodState => derive(params, time),
    getSnapshot: (): RodState => derive(params, time),
    getParams: (): RodParams => ({ ...params }),
    setParams(next: Partial<RodParams>): RodParams {
      const previous = params;
      params = normalize({ ...params, ...next }, params);
      if (physicsChanged(previous, params)) rewindMotion();
      return { ...params };
    },
    setTime(next: number): number {
      time = clamp(finite(next, time), 0, motionEndTime(params));
      if (time >= motionEndTime(params) - 1e-9) {
        params = { ...params, autoRun: false };
      }
      return time;
    },
    step(dt: number): void {
      const delta = finite(dt, 0);
      if (!params.autoRun || delta <= 0) return;
      const end = motionEndTime(params);
      time = Math.min(end, time + delta);
      if (time >= end - 1e-9) {
        time = end;
        params = { ...params, autoRun: false };
      }
    },
    rewind(): void {
      rewindMotion();
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}

export function restoredUrlParams(params: RodParams): {
  model: 0 | 1;
  fieldStrength: number;
  railGap: number;
  externalForce: number;
  mass: number;
  resistance: number;
  capacitance: number;
  autoRun: 0 | 1;
} {
  return {
    model: params.model === 'capacitor' ? 1 : 0,
    fieldStrength: params.fieldStrength,
    railGap: params.railGap,
    externalForce: params.externalForce,
    mass: params.mass,
    resistance: params.resistance,
    capacitance: params.capacitance,
    autoRun: params.autoRun ? 1 : 0
  };
}
