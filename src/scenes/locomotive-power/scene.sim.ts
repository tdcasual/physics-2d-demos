import { clamp } from '../../core/math';

export type LocomotiveMode = 'power' | 'acceleration';
export type LocomotiveParams = {
  mode: LocomotiveMode;
  ratedPower: number;
  acceleration: number;
  dragForce: number;
  autoRun: boolean;
};
export type LocomotiveState = LocomotiveParams & {
  time: number;
  velocity: number;
  displacement: number;
  accelerationNow: number;
  tractionForce: number;
  actualPower: number;
  terminalSpeed: number;
  mass: number;
  history: Array<{ time: number; velocity: number }>;
};

export const locomotiveConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  panelX: 830,
  panelWidth: 370,
  mass: 2500,
  initialVelocity: 1,
  ratedPowerMin: 8,
  ratedPowerMax: 40,
  accelerationMin: 0.2,
  accelerationMax: 2,
  dragMin: 400,
  dragMax: 2000,
  defaultRatedPower: 18,
  defaultAcceleration: 1,
  defaultDrag: 1200,
  maxTime: 40,
  sampleCount: 64,
  graphX: 48,
  graphY: 280,
  graphWidth: 742,
  graphHeight: 418,
  graphInsetLeft: 48,
  graphInsetRight: 20,
  graphInsetTop: 52,
  graphInsetBottom: 44,
  graphTimeMax: 40,
  graphSpeedMax: 30,
  trainY: 164,
  trainScale: 4.6,
  trainStartX: 132,
  trainTrackY: 242,
  trainBodyWidth: 156,
  trainBodyHeight: 64,
  trainWindowInset: 15,
  trainWindowWidth: 40,
  trainWindowHeight: 24,
  trainSecondWindowX: 64,
  trainCabinX: 113,
  trainCabinWidth: 28,
  wheelFrontX: 35,
  wheelRearX: 125,
  tangentHalfWidth: 82,
  panelTitleY: 42,
  panelRuleY: 72,
  panelModeY: 94,
  panelModeHeight: 72,
  panelReadoutY: 184,
  panelReadoutHeight: 224,
  panelFormulaY: 426,
  panelFormulaHeight: 150,
  panelHintY: 594,
  panelHintHeight: 112,
  panelInset: 28
} as const;

const DEFAULTS: LocomotiveParams = {
  mode: 'power',
  ratedPower: locomotiveConstants.defaultRatedPower,
  acceleration: locomotiveConstants.defaultAcceleration,
  dragForce: locomotiveConstants.defaultDrag,
  autoRun: true
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
  input: Partial<LocomotiveParams>,
  previous = DEFAULTS
): LocomotiveParams {
  return {
    mode:
      input.mode === 'power' || input.mode === 'acceleration'
        ? input.mode
        : previous.mode,
    ratedPower: clamp(
      finite(input.ratedPower, previous.ratedPower),
      locomotiveConstants.ratedPowerMin,
      locomotiveConstants.ratedPowerMax
    ),
    acceleration: clamp(
      finite(input.acceleration, previous.acceleration),
      locomotiveConstants.accelerationMin,
      locomotiveConstants.accelerationMax
    ),
    dragForce: clamp(
      finite(input.dragForce, previous.dragForce),
      locomotiveConstants.dragMin,
      locomotiveConstants.dragMax
    ),
    autoRun: asFlag(input.autoRun, previous.autoRun)
  };
}

function accelerationAt(params: LocomotiveParams, velocity: number): number {
  if (params.mode === 'acceleration') return params.acceleration;
  const traction =
    (params.ratedPower * 1000) /
    Math.max(velocity, locomotiveConstants.initialVelocity);
  return Math.max(0, (traction - params.dragForce) / locomotiveConstants.mass);
}

function stateAt(
  params: LocomotiveParams,
  time: number,
  displacement: number,
  velocity: number
): LocomotiveState {
  const accelerationNow = accelerationAt(params, velocity);
  const tractionForce =
    params.mode === 'power'
      ? (params.ratedPower * 1000) /
        Math.max(velocity, locomotiveConstants.initialVelocity)
      : locomotiveConstants.mass * params.acceleration + params.dragForce;
  const actualPower = (tractionForce * velocity) / 1000;
  const terminalSpeed =
    params.mode === 'power'
      ? (params.ratedPower * 1000) / params.dragForce
      : Number.POSITIVE_INFINITY;
  const history: Array<{ time: number; velocity: number }> = [];
  let sampleVelocity = locomotiveConstants.initialVelocity;
  let previous = 0;
  for (let index = 0; index <= locomotiveConstants.sampleCount; index += 1) {
    const sampleTime = (time * index) / locomotiveConstants.sampleCount;
    const dt = sampleTime - previous;
    sampleVelocity += accelerationAt(params, sampleVelocity) * dt;
    history.push({
      time: sampleTime,
      velocity:
        index === 0 ? locomotiveConstants.initialVelocity : sampleVelocity
    });
    previous = sampleTime;
  }
  return {
    ...params,
    time,
    velocity,
    displacement,
    accelerationNow,
    tractionForce,
    actualPower,
    terminalSpeed,
    mass: locomotiveConstants.mass,
    history
  };
}

export function locomotiveAt(
  params: LocomotiveParams,
  time: number
): LocomotiveState {
  const normalized = normalize(params);
  let velocity = locomotiveConstants.initialVelocity;
  let displacement = velocity * Math.max(0, time);
  const steps = Math.max(1, Math.ceil(Math.max(0, time) / 0.01));
  const dt = Math.max(0, time) / steps;
  displacement = 0;
  for (let index = 0; index < steps; index += 1) {
    velocity += accelerationAt(normalized, velocity) * dt;
    displacement += velocity * dt;
  }
  return stateAt(normalized, Math.max(0, time), displacement, velocity);
}

export function createLocomotiveSim(initial: Partial<LocomotiveParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let velocity = locomotiveConstants.initialVelocity;
  let displacement = 0;
  return {
    getState: (): LocomotiveState =>
      stateAt(params, time, displacement, velocity),
    getSnapshot: (): LocomotiveState =>
      stateAt(params, time, displacement, velocity),
    getParams: (): LocomotiveParams => ({ ...params }),
    setParams(next: Partial<LocomotiveParams>): LocomotiveParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const duration = clamp(finite(dt, 0), 0, 0.1);
      const subSteps = Math.max(1, Math.ceil(duration / 0.01));
      const subDt = duration / subSteps;
      for (let index = 0; index < subSteps; index += 1) {
        const acceleration = accelerationAt(params, velocity);
        displacement += velocity * subDt + 0.5 * acceleration * subDt * subDt;
        velocity += acceleration * subDt;
        time += subDt;
      }
      if (time >= locomotiveConstants.maxTime) {
        time = 0;
        velocity = locomotiveConstants.initialVelocity;
        displacement = 0;
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      velocity = locomotiveConstants.initialVelocity;
      displacement = 0;
    }
  };
}
