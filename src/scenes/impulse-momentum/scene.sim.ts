import { clamp } from '../../core/math';

export type ImpulseForceModel = 'constant' | 'triangle' | 'halfSine' | 'ramp';

export type ImpulseMomentumParams = {
  forceModel: ImpulseForceModel;
  mass: number;
  initialVelocity: number;
  peakForce: number;
  autoRun: boolean;
  showArea: boolean;
};

export type ImpulseMomentumState = {
  params: ImpulseMomentumParams;
  time: number;
  force: number;
  impulse: number;
  initialMomentum: number;
  momentumChange: number;
  momentum: number;
  velocity: number;
  position: number;
  finished: boolean;
};

export const impulseMomentumConstants = {
  timeMin: 0,
  timeMax: 5,
  pulseEnd: 4,
  rampEnd: 2,
  massMin: 0.5,
  massMax: 4,
  velocityMin: -4,
  velocityMax: 8,
  forceMinControl: 2,
  forceMaxControl: 20,
  graphFallbackWidth: 640,
  graphFallbackHeight: 240,
  stageFallbackWidth: 800,
  stageFallbackHeight: 320
} as const;

const C = impulseMomentumConstants;

const DEFAULTS: ImpulseMomentumParams = {
  forceModel: 'constant',
  mass: 2,
  initialVelocity: 0,
  peakForce: 10,
  autoRun: false,
  showArea: true
};

const MODELS: ImpulseForceModel[] = [
  'constant',
  'triangle',
  'halfSine',
  'ramp'
];

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string' && value.toLowerCase() === 'true') return true;
  if (typeof value === 'string' && value.toLowerCase() === 'false')
    return false;
  return fallback;
}

export function asImpulseForceModel(
  value: unknown
): ImpulseForceModel | undefined {
  if (
    value === 'constant' ||
    value === 'triangle' ||
    value === 'halfSine' ||
    value === 'ramp'
  ) {
    return value;
  }
  if (typeof value === 'number' && Number.isInteger(value) && MODELS[value]) {
    return MODELS[value];
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const index = Number(value);
    return MODELS[index];
  }
  return undefined;
}

export function parseForceModel(
  value: unknown,
  fallback: ImpulseForceModel = 'constant'
): ImpulseForceModel {
  return asImpulseForceModel(value) ?? fallback;
}

function normalize(
  input: Partial<ImpulseMomentumParams>,
  previous = DEFAULTS
): ImpulseMomentumParams {
  return {
    forceModel: parseForceModel(input.forceModel, previous.forceModel),
    mass: clamp(finite(input.mass, previous.mass), C.massMin, C.massMax),
    initialVelocity: clamp(
      finite(input.initialVelocity, previous.initialVelocity),
      C.velocityMin,
      C.velocityMax
    ),
    peakForce: clamp(
      finite(input.peakForce, previous.peakForce),
      C.forceMinControl,
      C.forceMaxControl
    ),
    autoRun: asBool(input.autoRun, previous.autoRun),
    showArea: asBool(input.showArea, previous.showArea)
  };
}

/** Horizontal force F_x(t) ≥ 0 for the four source-supported models. */
export function forceAt(
  model: ImpulseForceModel,
  time: number,
  peakForce: number
): number {
  const t = Math.max(0, time);
  const F = Math.max(0, peakForce);
  if (model === 'constant') return F;
  if (model === 'triangle') {
    if (t <= C.rampEnd) return F * (t / C.rampEnd);
    if (t <= C.pulseEnd) return F * ((C.pulseEnd - t) / C.rampEnd);
    return 0;
  }
  if (model === 'halfSine') {
    return t <= C.pulseEnd ? F * Math.sin((Math.PI * t) / C.pulseEnd) : 0;
  }
  return F * Math.min(1, t / C.rampEnd);
}

/**
 * Closed-form I_x(0→t) = ∫ F_x dτ for each model.
 * Triangle 0–2 s rise / 2–4 s fall; half-sine pulse ends at 4 s;
 * ramp reaches F_max at 2 s then stays constant.
 */
export function impulseAt(
  model: ImpulseForceModel,
  time: number,
  peakForce: number
): number {
  const t = clamp(time, C.timeMin, C.timeMax);
  const F = Math.max(0, peakForce);
  if (model === 'constant') return F * t;
  if (model === 'triangle') {
    if (t <= C.rampEnd) return (F * t * t) / 4;
    if (t <= C.pulseEnd) return F + (F / 2) * (4 * t - (t * t) / 2 - 6);
    return 2 * F;
  }
  if (model === 'halfSine') {
    if (t <= C.pulseEnd) {
      return (
        F * (C.pulseEnd / Math.PI) * (1 - Math.cos((Math.PI * t) / C.pulseEnd))
      );
    }
    return (F * 8) / Math.PI;
  }
  if (t <= C.rampEnd) return (F * t * t) / 4;
  return F * (t - 1);
}

function integratePosition(params: ImpulseMomentumParams, end: number): number {
  if (end <= 0) return 0;
  const steps = Math.max(1, Math.ceil(end * 200));
  const dt = end / steps;
  let position = 0;
  let previous = params.initialVelocity;
  for (let index = 1; index <= steps; index += 1) {
    const time = index * dt;
    const velocity =
      params.initialVelocity +
      impulseAt(params.forceModel, time, params.peakForce) / params.mass;
    position += ((previous + velocity) / 2) * dt;
    previous = velocity;
  }
  return position;
}

function derive(
  params: ImpulseMomentumParams,
  time: number
): ImpulseMomentumState {
  const t = clamp(time, C.timeMin, C.timeMax);
  const impulse = impulseAt(params.forceModel, t, params.peakForce);
  const initialMomentum = params.mass * params.initialVelocity;
  const velocity = params.initialVelocity + impulse / params.mass;
  return {
    params: { ...params },
    time: t,
    force: forceAt(params.forceModel, t, params.peakForce),
    impulse,
    initialMomentum,
    momentumChange: impulse,
    momentum: initialMomentum + impulse,
    velocity,
    position: integratePosition(params, t),
    finished: t >= C.timeMax - 1e-9
  };
}

export function createImpulseMomentumSim(
  initial: Partial<ImpulseMomentumParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): ImpulseMomentumState => derive(params, time),
    getSnapshot: (): ImpulseMomentumState => derive(params, time),
    getParams: (): ImpulseMomentumParams => ({ ...params }),
    setParams(next: Partial<ImpulseMomentumParams>): ImpulseMomentumParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    setTime(next: number): number {
      time = clamp(finite(next, time), C.timeMin, C.timeMax);
      if (time < C.timeMax - 1e-9) return time;
      params = { ...params, autoRun: false };
      return time;
    },
    step(dt: number): void {
      const delta = finite(dt, 0);
      if (!params.autoRun || delta <= 0) return;
      time = Math.min(C.timeMax, time + delta);
      if (time >= C.timeMax - 1e-9) {
        time = C.timeMax;
        params = { ...params, autoRun: false };
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}

export function restoredUrlParams(params: ImpulseMomentumParams): {
  forceModel: ImpulseForceModel;
  mass: number;
  initialVelocity: number;
  peakForce: number;
  showArea: 0 | 1;
  autoRun: 0 | 1;
} {
  return {
    forceModel: params.forceModel,
    mass: params.mass,
    initialVelocity: params.initialVelocity,
    peakForce: params.peakForce,
    showArea: params.showArea ? 1 : 0,
    autoRun: params.autoRun ? 1 : 0
  };
}
