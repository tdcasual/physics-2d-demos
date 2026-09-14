import { clamp } from '../../core/math';

export type ConicalPendulumParams = {
  height: number;
  theta: number;
  autoRun: boolean;
  showVectors: boolean;
};

export type ConicalPendulumState = ConicalPendulumParams & {
  time: number;
  phase: number;
  g: number;
  mass: number;
  radius: number;
  stringLength: number;
  omega: number;
  period: number;
  linearSpeed: number;
  centripetalForce: number;
  tension: number;
};

export const conicalPendulumConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 776,
  panelWidth: 424,
  heightMin: 1,
  heightMax: 5,
  defaultHeight: 3,
  thetaMin: 20,
  thetaMax: 70,
  defaultTheta: 57,
  g: 10,
  mass: 1,
  gridStep: 58,
  gridTop: 66,
  panelInset: 26,
  panelTitleY: 40,
  panelRuleY: 74,
  panelStatusY: 100,
  panelStatusHeight: 64,
  panelReadoutY: 184,
  panelReadoutHeight: 218,
  panelFormulaY: 428,
  panelFormulaHeight: 192,
  panelHintY: 642,
  panelHintHeight: 84,
  supportX: 382,
  supportY: 146,
  supportWidth: 142,
  supportHeight: 48,
  pivotX: 452,
  pivotY: 194,
  orbitCenterX: 452,
  orbitCenterY: 506,
  orbitRadiusPx: 204,
  ballRadius: 20,
  insetX: 510,
  insetY: 92,
  insetWidth: 218,
  insetHeight: 176,
  insetPivotX: 560,
  insetPivotY: 136,
  insetBallX: 672,
  insetBallY: 214,
  stringScale: 92,
  vectorScale: 7,
  axisLength: 190,
  decompositionArrow: 72,
  gravityArrow: 92,
  velocityArrow: 54
} as const;

const DEFAULTS: ConicalPendulumParams = {
  height: conicalPendulumConstants.defaultHeight,
  theta: conicalPendulumConstants.defaultTheta,
  autoRun: true,
  showVectors: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asFlag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
}

function normalize(
  input: Partial<ConicalPendulumParams>,
  previous = DEFAULTS
): ConicalPendulumParams {
  return {
    height: clamp(
      finite(input.height, previous.height),
      conicalPendulumConstants.heightMin,
      conicalPendulumConstants.heightMax
    ),
    theta: clamp(
      finite(input.theta, previous.theta),
      conicalPendulumConstants.thetaMin,
      conicalPendulumConstants.thetaMax
    ),
    autoRun: asFlag(input.autoRun, previous.autoRun),
    showVectors: asFlag(input.showVectors, previous.showVectors)
  };
}

function derive(
  params: ConicalPendulumParams,
  time: number
): ConicalPendulumState {
  const thetaRad = (params.theta * Math.PI) / 180;
  const g = conicalPendulumConstants.g;
  const mass = conicalPendulumConstants.mass;
  const radius = params.height * Math.tan(thetaRad);
  const stringLength = params.height / Math.cos(thetaRad);
  const omega = Math.sqrt(g / params.height);
  const period = (2 * Math.PI) / omega;
  const centripetalForce = mass * g * Math.tan(thetaRad);
  const tension = (mass * g) / Math.cos(thetaRad);
  return {
    ...params,
    time,
    phase: (time * omega) % (Math.PI * 2),
    g,
    mass,
    radius,
    stringLength,
    omega,
    period,
    linearSpeed: omega * radius,
    centripetalForce,
    tension
  };
}

export function conicalPendulumAt(
  params: ConicalPendulumParams,
  time = 0
): ConicalPendulumState {
  return derive(normalize(params), Math.max(0, finite(time, 0)));
}

export function createConicalPendulumSim(
  initial: Partial<ConicalPendulumParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): ConicalPendulumState => derive(params, time),
    getSnapshot: (): ConicalPendulumState => derive(params, time),
    getParams: (): ConicalPendulumParams => ({ ...params }),
    setParams(next: Partial<ConicalPendulumParams>): ConicalPendulumParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += clamp(finite(dt, 0), 0, 0.1);
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
