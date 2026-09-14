import { clamp } from '../../core/math';

export type InductionAcceleratorParams = {
  dBdt: number;
  showVectors: boolean;
  autoRun: boolean;
  slowMode: boolean;
};
export type InductionAcceleratorState = InductionAcceleratorParams & {
  time: number;
  angle: number;
  fieldDirection: 1 | -1;
  innerB: number;
  orbitB: number;
  speed: number;
  centripetalForce: number;
  lorentzForce: number;
  electricForce: number;
  status: string;
};
export const inductionAcceleratorConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  centerX: 470,
  centerY: 388,
  coreRadius: 178,
  innerRingRadius: 224,
  orbitRadius: 286,
  dBdtMin: -6,
  dBdtMax: 6,
  dBdtDefault: 3,
  innerBFactor: 3.316,
  speedFactor: 1e7,
  forceFactor: 20.62,
  angularFactor: 0.22,
  fieldMarkStep: 44,
  fieldMarkExtent: 150,
  ringDash: 10,
  particleRadius: 12,
  startAngle: 2.82,
  gridStep: 48
} as const;
const DEFAULTS: InductionAcceleratorParams = {
  dBdt: inductionAcceleratorConstants.dBdtDefault,
  showVectors: true,
  autoRun: true,
  slowMode: false
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function flag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
}
function normalize(
  input: Partial<InductionAcceleratorParams>,
  previous = DEFAULTS
): InductionAcceleratorParams {
  return {
    dBdt: clamp(
      finite(input.dBdt, previous.dBdt),
      inductionAcceleratorConstants.dBdtMin,
      inductionAcceleratorConstants.dBdtMax
    ),
    showVectors: flag(input.showVectors, previous.showVectors),
    autoRun: flag(input.autoRun, previous.autoRun),
    slowMode: flag(input.slowMode, previous.slowMode)
  };
}
function derive(
  params: InductionAcceleratorParams,
  time: number,
  angle: number
): InductionAcceleratorState {
  const c = inductionAcceleratorConstants;
  const safeTime = Math.max(0, time);
  const fieldDirection: 1 | -1 = params.dBdt < 0 ? -1 : 1;
  const innerB = Math.abs(params.dBdt) * c.innerBFactor;
  const orbitB = innerB / 2;
  const accelerationRatio = 1 + safeTime * 0.18;
  const speed = orbitB * c.speedFactor * accelerationRatio;
  const baseForce = Math.abs(params.dBdt) * c.forceFactor;
  const centripetalForce = baseForce * accelerationRatio;
  const lorentzForce = centripetalForce;
  const electricForce = baseForce;
  return {
    ...params,
    time: safeTime,
    angle,
    fieldDirection,
    innerB,
    orbitB,
    speed,
    centripetalForce,
    lorentzForce,
    electricForce,
    status: Math.abs(params.dBdt) < 0.05 ? '磁场基本不变' : '电子切向加速中'
  };
}
export function inductionAcceleratorAt(
  params: InductionAcceleratorParams,
  time = 0,
  angle = inductionAcceleratorConstants.startAngle
): InductionAcceleratorState {
  return derive(
    normalize(params),
    Math.max(0, finite(time, 0)),
    finite(angle, inductionAcceleratorConstants.startAngle)
  );
}
export function createInductionAcceleratorSim(
  initial: Partial<InductionAcceleratorParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  let angle = inductionAcceleratorConstants.startAngle;
  return {
    getState: (): InductionAcceleratorState => derive(params, time, angle),
    getSnapshot: (): InductionAcceleratorState => derive(params, time, angle),
    getParams: (): InductionAcceleratorParams => ({ ...params }),
    setParams(
      next: Partial<InductionAcceleratorParams>
    ): InductionAcceleratorParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    relaunch(): void {
      time = 0;
      angle = inductionAcceleratorConstants.startAngle;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      angle = inductionAcceleratorConstants.startAngle;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = clamp(finite(dt, 0), 0, 0.1) * (params.slowMode ? 0.35 : 1);
      time += delta;
      angle +=
        delta *
        (0.8 +
          Math.abs(params.dBdt) * inductionAcceleratorConstants.angularFactor);
    }
  };
}
