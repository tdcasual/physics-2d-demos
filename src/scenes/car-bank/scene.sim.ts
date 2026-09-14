import { clamp } from '../../core/math';

export type CarBankParams = {
  bankAngle: number;
  speed: number;
  autoRun: boolean;
  showVectors: boolean;
};

export type CarBankState = CarBankParams & {
  time: number;
  angleRad: number;
  radius: number;
  mass: number;
  gravity: number;
  criticalSpeed: number;
  centripetalForce: number;
  normalForce: number;
  frictionForce: number;
  frictionLimit: number;
  frictionRatio: number;
  safe: boolean;
  trend: '低速·向内侧滑' | '临界状态' | '高速·向外侧滑';
  frictionDirection: '沿路面向上' | '沿路面向下' | '无需摩擦';
};

export const carBankConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 776,
  panelWidth: 424,
  angleMin: 10,
  angleMax: 45,
  defaultAngle: 30,
  speedMin: 10,
  speedMax: 40,
  defaultSpeed: 28.5,
  radius: 102,
  mass: 1000,
  gravity: 9.8,
  frictionCoefficient: 0.35,
  gridStep: 58,
  gridTop: 66,
  panelInset: 26,
  panelTitleY: 40,
  panelRuleY: 74,
  panelStatusY: 100,
  panelStatusHeight: 70,
  panelReadoutY: 188,
  panelReadoutHeight: 184,
  panelEquationY: 398,
  panelEquationHeight: 158,
  panelHintY: 584,
  panelHintHeight: 110,
  trackInsetX: 76,
  trackInsetY: 92,
  trackInsetWidth: 190,
  trackInsetHeight: 132,
  trackRadius: 50,
  rampLeft: 48,
  rampBottom: 700,
  rampRight: 730,
  rampTop: 330,
  rampWidth: 682,
  rampHeight: 370,
  carX: 488,
  carY: 470,
  carWidth: 96,
  carHeight: 38,
  arrowScale: 0.024,
  arrowMin: 42,
  arrowMax: 150,
  axisLength: 160
} as const;

const DEFAULTS: CarBankParams = {
  bankAngle: carBankConstants.defaultAngle,
  speed: carBankConstants.defaultSpeed,
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
  input: Partial<CarBankParams>,
  previous = DEFAULTS
): CarBankParams {
  return {
    bankAngle: clamp(
      finite(input.bankAngle, previous.bankAngle),
      carBankConstants.angleMin,
      carBankConstants.angleMax
    ),
    speed: clamp(
      finite(input.speed, previous.speed),
      carBankConstants.speedMin,
      carBankConstants.speedMax
    ),
    autoRun: asFlag(input.autoRun, previous.autoRun),
    showVectors: asFlag(input.showVectors, previous.showVectors)
  };
}

function derive(params: CarBankParams, time: number): CarBankState {
  const theta = (params.bankAngle * Math.PI) / 180;
  const radius = carBankConstants.radius;
  const mass = carBankConstants.mass;
  const gravity = carBankConstants.gravity;
  const centripetalForce = (mass * params.speed * params.speed) / radius;
  const criticalSpeed = Math.sqrt(radius * gravity * Math.tan(theta));
  const normalForce =
    mass * gravity * Math.cos(theta) + centripetalForce * Math.sin(theta);
  const signedFriction =
    centripetalForce * Math.cos(theta) - mass * gravity * Math.sin(theta);
  const frictionForce = Math.abs(signedFriction);
  const frictionLimit = carBankConstants.frictionCoefficient * normalForce;
  const frictionRatio = frictionLimit > 0 ? frictionForce / frictionLimit : 0;
  const trend =
    params.speed > criticalSpeed + 0.15
      ? '高速·向外侧滑'
      : params.speed < criticalSpeed - 0.15
        ? '低速·向内侧滑'
        : '临界状态';
  const frictionDirection =
    frictionForce < 0.01
      ? '无需摩擦'
      : signedFriction >= 0
        ? '沿路面向下'
        : '沿路面向上';
  return {
    ...params,
    time,
    angleRad: ((time * params.speed) / radius) % (Math.PI * 2),
    radius,
    mass,
    gravity,
    criticalSpeed,
    centripetalForce,
    normalForce,
    frictionForce,
    frictionLimit,
    frictionRatio,
    safe: frictionRatio <= 1,
    trend,
    frictionDirection
  };
}

export function carBankAt(params: CarBankParams, time = 0): CarBankState {
  return derive(normalize(params), Math.max(0, finite(time, 0)));
}

export function createCarBankSim(initial: Partial<CarBankParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): CarBankState => derive(params, time),
    getSnapshot: (): CarBankState => derive(params, time),
    getParams: (): CarBankParams => ({ ...params }),
    setParams(next: Partial<CarBankParams>): CarBankParams {
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
