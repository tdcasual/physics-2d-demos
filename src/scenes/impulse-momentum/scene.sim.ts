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
  modelLabel: string;
  phase: number;
};

export const impulseMomentumConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  fieldLeft: 42,
  fieldRight: 730,
  fieldTop: 72,
  fieldBottom: 300,
  trackY: 248,
  trackLeft: 86,
  trackRight: 704,
  cartWidth: 94,
  cartHeight: 54,
  wheelRadius: 10,
  graphX: 42,
  graphY: 332,
  graphWidth: 688,
  graphHeight: 376,
  graphLeft: 86,
  graphRight: 704,
  graphTop: 384,
  graphBottom: 668,
  timeMin: 0,
  timeMax: 5.2,
  forceMin: 0,
  forceMax: 20,
  graphGridStep: 64,
  cardX: 786,
  cardWidth: 382,
  headerRuleY: 72,
  modelY: 100,
  modelHeight: 112,
  readoutY: 228,
  readoutHeight: 214,
  formulaY: 464,
  formulaHeight: 166,
  massMin: 0.5,
  massMax: 4,
  velocityMin: -4,
  velocityMax: 8,
  forceMinControl: 2,
  forceMaxControl: 20,
  animationPeriod: 5.2,
  forceArrowScale: 7,
  velocityArrowScale: 7,
  positionScale: 22
} as const;

const DEFAULTS: ImpulseMomentumParams = {
  forceModel: 'constant',
  mass: 2,
  initialVelocity: 0,
  peakForce: 10,
  autoRun: true,
  showArea: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<ImpulseMomentumParams>,
  previous = DEFAULTS
): ImpulseMomentumParams {
  const forceModel =
    input.forceModel === 'triangle' ||
    input.forceModel === 'halfSine' ||
    input.forceModel === 'ramp' ||
    input.forceModel === 'constant'
      ? input.forceModel
      : previous.forceModel;
  return {
    forceModel,
    mass: clamp(
      finite(input.mass, previous.mass),
      impulseMomentumConstants.massMin,
      impulseMomentumConstants.massMax
    ),
    initialVelocity: clamp(
      finite(input.initialVelocity, previous.initialVelocity),
      impulseMomentumConstants.velocityMin,
      impulseMomentumConstants.velocityMax
    ),
    peakForce: clamp(
      finite(input.peakForce, previous.peakForce),
      impulseMomentumConstants.forceMinControl,
      impulseMomentumConstants.forceMaxControl
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showArea: input.showArea ?? previous.showArea
  };
}

export function asImpulseForceModel(
  value: unknown
): ImpulseForceModel | undefined {
  if (
    value === 'constant' ||
    value === 'triangle' ||
    value === 'halfSine' ||
    value === 'ramp'
  )
    return value;
  if (typeof value === 'number') {
    return (['constant', 'triangle', 'halfSine', 'ramp'][value] ??
      undefined) as ImpulseForceModel | undefined;
  }
  return undefined;
}

export function forceModelLabel(model: ImpulseForceModel): string {
  return {
    constant: '恒力',
    triangle: '三角形碰撞力',
    halfSine: '正弦半波冲击',
    ramp: '先增后恒力'
  }[model];
}

export function forceAt(
  model: ImpulseForceModel,
  time: number,
  peakForce: number
): number {
  const t = clamp(
    time,
    impulseMomentumConstants.timeMin,
    impulseMomentumConstants.timeMax
  );
  if (model === 'constant') return peakForce;
  if (model === 'triangle') {
    if (t <= 2) return peakForce * (t / 2);
    if (t <= 4) return peakForce * ((4 - t) / 2);
    return 0;
  }
  if (model === 'halfSine') {
    return t <= 4 ? peakForce * Math.sin((Math.PI * t) / 4) : 0;
  }
  return peakForce * Math.min(1, t / 2);
}

function integrateKinematics(
  params: ImpulseMomentumParams,
  time: number
): {
  impulse: number;
  position: number;
  velocity: number;
} {
  const end = clamp(
    time,
    impulseMomentumConstants.timeMin,
    impulseMomentumConstants.timeMax
  );
  const steps = Math.max(1, Math.ceil(end * 120));
  const dt = end / steps;
  let impulse = 0;
  let position = 0;
  let velocity = params.initialVelocity;
  for (let index = 0; index < steps; index += 1) {
    const midpoint = (index + 0.5) * dt;
    const nextImpulse =
      impulse + forceAt(params.forceModel, midpoint, params.peakForce) * dt;
    const nextVelocity = params.initialVelocity + nextImpulse / params.mass;
    position += ((velocity + nextVelocity) / 2) * dt;
    impulse = nextImpulse;
    velocity = nextVelocity;
  }
  return { impulse, position, velocity };
}

function derive(
  params: ImpulseMomentumParams,
  time: number
): ImpulseMomentumState {
  const t = clamp(
    time,
    impulseMomentumConstants.timeMin,
    impulseMomentumConstants.timeMax
  );
  const kinematics = integrateKinematics(params, t);
  const initialMomentum = params.mass * params.initialVelocity;
  return {
    params: { ...params },
    time: t,
    force: forceAt(params.forceModel, t, params.peakForce),
    impulse: kinematics.impulse,
    initialMomentum,
    momentumChange: kinematics.impulse,
    momentum: initialMomentum + kinematics.impulse,
    velocity: kinematics.velocity,
    position: kinematics.position,
    modelLabel: forceModelLabel(params.forceModel),
    phase: t / impulseMomentumConstants.animationPeriod
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
    step(dt: number): void {
      if (params.autoRun) {
        time = Math.min(
          impulseMomentumConstants.timeMax,
          time + Math.max(0, finite(dt, 0))
        );
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
