import { clamp } from '../../core/math';
export type PendulumMode = 'balance' | 'oscillate' | 'explore';
export type PendulumParams = {
  mode: PendulumMode;
  voltage: number;
  showForces: boolean;
  showVelocity: boolean;
};
export type PendulumState = {
  params: PendulumParams;
  time: number;
  theta: number;
  angularVelocity: number;
  fieldRatio: number;
  electricForce: number;
  tension: number;
  speed: number;
  kinetic: number;
};
export const electricPendulumConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  leftPlateX: 92,
  rightPlateX: 618,
  plateTop: 176,
  plateBottom: 560,
  pivotX: 354,
  pivotY: 116,
  pivotHalfWidth: 66,
  pendulumLength: 420,
  ballRadius: 26,
  panelRuleY: 72,
  modeCardY: 84,
  modeCardHeight: 126,
  paramCardY: 222,
  paramCardHeight: 160,
  readoutCardY: 394,
  readoutCardHeight: 222,
  noteCardY: 632,
  noteCardHeight: 96,
  defaultVoltage: 0.5,
  voltageMin: 0,
  voltageMax: 1,
  gravity: 10,
  mass: 1,
  charge: 1,
  animationPeriod: 5
} as const;
const DEFAULTS: PendulumParams = {
  mode: 'balance',
  voltage: 0.5,
  showForces: true,
  showVelocity: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<PendulumParams>,
  previous = DEFAULTS
): PendulumParams {
  return {
    mode:
      input.mode === 'oscillate' || input.mode === 'explore'
        ? input.mode
        : 'balance',
    voltage: clamp(
      finite(input.voltage, previous.voltage),
      electricPendulumConstants.voltageMin,
      electricPendulumConstants.voltageMax
    ),
    showForces: input.showForces ?? previous.showForces,
    showVelocity: input.showVelocity ?? previous.showVelocity
  };
}
export function createElectricPendulumSim(
  initial: Partial<PendulumParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  function getState(): PendulumState {
    const ratio =
      params.mode === 'balance'
        ? params.voltage
        : params.mode === 'oscillate'
          ? 0.5 + 0.45 * Math.sin(time * 1.25)
          : params.voltage;
    const theta = ((ratio * 42 - 21) * Math.PI) / 180;
    const angularVelocity =
      params.mode === 'balance' ? 0 : 0.45 * Math.cos(time * 1.25);
    const fieldRatio = params.voltage;
    const electricForce = fieldRatio;
    const speed =
      Math.abs(angularVelocity) *
        electricPendulumConstants.pendulumLength *
        0.01 +
      fieldRatio * 0.6;
    const tension = Math.cos(theta) + electricForce * Math.sin(theta);
    return {
      params: { ...params },
      time,
      theta,
      angularVelocity,
      fieldRatio,
      electricForce,
      tension,
      speed,
      kinetic: 0.5 * electricPendulumConstants.mass * speed * speed
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): PendulumParams => ({ ...params }),
    setParams(next: Partial<PendulumParams>) {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number) {
      if (params.mode !== 'balance') time += Math.max(0, finite(dt, 0));
    },
    reset() {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
