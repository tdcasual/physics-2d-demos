import { clamp } from '../../core/math';

export type MetalRodMode = 'coast' | 'pull';

export type MetalRodParams = {
  mode: MetalRodMode;
  magneticField: number;
  resistance: number;
  mass: number;
  initialVelocity: number;
  autoRun: boolean;
};

export type MetalRodState = MetalRodParams & {
  time: number;
  position: number;
  velocity: number;
  acceleration: number;
  emf: number;
  current: number;
  magneticForce: number;
  electricPower: number;
  forcePower: number;
  status: string;
};

export const metalRodConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  gridStep: 54,
  railLeft: 92,
  railRight: 744,
  railTop: 202,
  railBottom: 476,
  rodWidth: 18,
  rodMinX: 150,
  rodMaxX: 690,
  resistorX: 118,
  resistorY: 338,
  resistorHeight: 82,
  loopLeft: 118,
  loopRight: 716,
  loopTop: 202,
  loopBottom: 476,
  infoX: 36,
  infoY: 36,
  infoWidth: 300,
  infoHeight: 144,
  readoutX: 882,
  readoutY: 330,
  readoutWidth: 280,
  readoutHeight: 240,
  trackX: 36,
  trackY: 176,
  trackWidth: 784,
  trackHeight: 350,
  rodScale: 360,
  rodLength: 1.5,
  driveForce: 1.5,
  magneticFieldMin: 0,
  magneticFieldMax: 2,
  resistanceMin: 0.5,
  resistanceMax: 4,
  massMin: 0.2,
  massMax: 2,
  velocityMin: 0,
  velocityMax: 24,
  animationPeriod: 12
} as const;

const DEFAULTS: MetalRodParams = {
  mode: 'coast',
  magneticField: 1,
  resistance: 2,
  mass: 1,
  initialVelocity: 20,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<MetalRodParams>,
  previous = DEFAULTS
): MetalRodParams {
  return {
    mode:
      input.mode === 'pull'
        ? 'pull'
        : input.mode === 'coast'
          ? 'coast'
          : previous.mode,
    magneticField: clamp(
      finite(input.magneticField, previous.magneticField),
      metalRodConstants.magneticFieldMin,
      metalRodConstants.magneticFieldMax
    ),
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      metalRodConstants.resistanceMin,
      metalRodConstants.resistanceMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      metalRodConstants.massMin,
      metalRodConstants.massMax
    ),
    initialVelocity: clamp(
      finite(input.initialVelocity, previous.initialVelocity),
      metalRodConstants.velocityMin,
      metalRodConstants.velocityMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function dragCoefficient(params: MetalRodParams): number {
  return (
    (params.magneticField *
      params.magneticField *
      metalRodConstants.rodLength ** 2) /
    params.resistance
  );
}

export function accelerationAt(
  params: MetalRodParams,
  velocity: number
): number {
  const magneticDrag = dragCoefficient(params) * Math.max(0, velocity);
  return (
    (params.mode === 'pull' ? metalRodConstants.driveForce : 0) / params.mass -
    magneticDrag / params.mass
  );
}

function derive(
  params: MetalRodParams,
  time: number,
  position: number,
  velocity: number
): MetalRodState {
  const safeVelocity = Math.max(0, velocity);
  const emf = params.magneticField * metalRodConstants.rodLength * safeVelocity;
  const current = emf / params.resistance;
  const magneticForce =
    params.magneticField * metalRodConstants.rodLength * current;
  const acceleration = accelerationAt(params, safeVelocity);
  return {
    ...params,
    time,
    position,
    velocity: safeVelocity,
    acceleration,
    emf,
    current,
    magneticForce,
    electricPower: current * current * params.resistance,
    forcePower:
      (params.mode === 'pull' ? metalRodConstants.driveForce : 0) *
      safeVelocity,
    status:
      params.mode === 'pull'
        ? '恒定拉力加速'
        : safeVelocity < 0.08
          ? '已停下'
          : '初速度阻尼滑行'
  };
}

export function createMetalRodSim(initial: Partial<MetalRodParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let position = 0;
  let velocity = params.initialVelocity;
  return {
    getState: (): MetalRodState => derive(params, time, position, velocity),
    getSnapshot: (): MetalRodState => derive(params, time, position, velocity),
    getParams: (): MetalRodParams => ({ ...params }),
    setParams(next: Partial<MetalRodParams>): MetalRodParams {
      const previousVelocity = velocity;
      params = normalize({ ...params, ...next }, params);
      if (next.initialVelocity !== undefined) velocity = params.initialVelocity;
      else if (next.mode !== undefined) velocity = previousVelocity;
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const duration = clamp(finite(dt, 0), 0, 0.05);
      const subSteps = Math.max(1, Math.ceil(duration * 20));
      const subDt = duration / subSteps;
      for (let index = 0; index < subSteps; index += 1) {
        const acceleration = accelerationAt(params, velocity);
        velocity = Math.max(0, velocity + acceleration * subDt);
        position = (position + velocity * subDt) % metalRodConstants.rodLength;
        time = (time + subDt) % metalRodConstants.animationPeriod;
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      position = 0;
      velocity = params.initialVelocity;
    }
  };
}
