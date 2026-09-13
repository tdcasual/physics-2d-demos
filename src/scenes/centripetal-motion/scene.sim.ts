import { clamp } from '../../core/math';

export type CentripetalParams = {
  mass: number;
  radius: number;
  angularVelocity: number;
  autoRun: boolean;
};

export type CentripetalState = {
  params: CentripetalParams;
  time: number;
  angle: number;
  speed: number;
  centripetalAcceleration: number;
  centripetalForce: number;
  period: number;
  phase: number;
};

export const centripetalConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  diagramX: 42,
  diagramY: 48,
  diagramWidth: 688,
  diagramHeight: 660,
  centerX: 390,
  centerY: 382,
  radiusScale: 78,
  radiusMin: 1,
  radiusMax: 4,
  massMin: 0.5,
  massMax: 5,
  angularVelocityMin: 0.5,
  angularVelocityMax: 3,
  graphGridStep: 64,
  panelCardX: 786,
  panelCardWidth: 382,
  headerRuleY: 72,
  formulaY: 100,
  formulaHeight: 150,
  formulaSecondRowOffset: 76,
  controlY: 270,
  controlHeight: 240,
  readoutY: 530,
  readoutHeight: 178,
  animationPeriod: 12,
  initialAngle: Math.PI * 1.08,
  arrowBaseSpeed: 70,
  arrowBaseForce: 82,
  defaultMass: 2,
  defaultRadius: 2.5,
  defaultAngularVelocity: 1.5
} as const;

const DEFAULTS: CentripetalParams = {
  mass: centripetalConstants.defaultMass,
  radius: centripetalConstants.defaultRadius,
  angularVelocity: centripetalConstants.defaultAngularVelocity,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<CentripetalParams>,
  previous = DEFAULTS
): CentripetalParams {
  return {
    mass: clamp(
      finite(input.mass, previous.mass),
      centripetalConstants.massMin,
      centripetalConstants.massMax
    ),
    radius: clamp(
      finite(input.radius, previous.radius),
      centripetalConstants.radiusMin,
      centripetalConstants.radiusMax
    ),
    angularVelocity: clamp(
      finite(input.angularVelocity, previous.angularVelocity),
      centripetalConstants.angularVelocityMin,
      centripetalConstants.angularVelocityMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function tangentialSpeed(params: CentripetalParams): number {
  return params.angularVelocity * params.radius;
}

export function centripetalAcceleration(params: CentripetalParams): number {
  return params.angularVelocity * params.angularVelocity * params.radius;
}

export function centripetalForce(params: CentripetalParams): number {
  return params.mass * centripetalAcceleration(params);
}

export function period(params: CentripetalParams): number {
  return (2 * Math.PI) / params.angularVelocity;
}

function derive(
  params: CentripetalParams,
  time: number,
  angle: number
): CentripetalState {
  return {
    params: { ...params },
    time,
    angle,
    speed: tangentialSpeed(params),
    centripetalAcceleration: centripetalAcceleration(params),
    centripetalForce: centripetalForce(params),
    period: period(params),
    phase: time / centripetalConstants.animationPeriod
  };
}

export function createCentripetalSim(initial: Partial<CentripetalParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let angle = centripetalConstants.initialAngle;
  return {
    getState: (): CentripetalState => derive(params, time, angle),
    getSnapshot: (): CentripetalState => derive(params, time, angle),
    getParams: (): CentripetalParams => ({ ...params }),
    setParams(next: Partial<CentripetalParams>): CentripetalParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const duration = Math.max(0, finite(dt, 0));
      time += duration;
      angle += params.angularVelocity * duration;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      angle = centripetalConstants.initialAngle;
    }
  };
}
