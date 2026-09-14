import { clamp } from '../../core/math';
export type MaxwellParams = {
  temperature: number;
  molarMass: number;
  autoRun: boolean;
};
export type MaxwellState = MaxwellParams & {
  mostProbable: number;
  meanSpeed: number;
  rmsSpeed: number;
  peakDensity: number;
  time: number;
};
export const maxwellConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 820,
  panelX: 820,
  panelWidth: 460,
  temperatureMin: 200,
  temperatureMax: 1200,
  molarMassMin: 4,
  molarMassMax: 40,
  gasConstant: 8.314,
  cardRadius: 12
} as const;
const DEFAULTS: MaxwellParams = {
  temperature: 600,
  molarMass: 28,
  autoRun: true
};
function finite(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function normalize(
  input: Partial<MaxwellParams>,
  previous = DEFAULTS
): MaxwellParams {
  return {
    temperature: clamp(
      finite(input.temperature, previous.temperature),
      maxwellConstants.temperatureMin,
      maxwellConstants.temperatureMax
    ),
    molarMass: clamp(
      finite(input.molarMass, previous.molarMass),
      maxwellConstants.molarMassMin,
      maxwellConstants.molarMassMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}
export function calculateMaxwell(
  params: MaxwellParams,
  time = 0
): MaxwellState {
  const mass = params.molarMass / 1000;
  const R = maxwellConstants.gasConstant;
  const mostProbable = Math.sqrt((2 * R * params.temperature) / mass);
  const meanSpeed = Math.sqrt((8 * R * params.temperature) / (Math.PI * mass));
  const rmsSpeed = Math.sqrt((3 * R * params.temperature) / mass);
  const peakDensity = 4 / Math.sqrt(Math.E * Math.PI) / mostProbable;
  return { ...params, mostProbable, meanSpeed, rmsSpeed, peakDensity, time };
}
export function maxwellDensity(speed: number, params: MaxwellParams): number {
  const mass = params.molarMass / 1000;
  const a =
    mass / (2 * Math.PI * maxwellConstants.gasConstant * params.temperature);
  return (
    4 *
    Math.PI *
    Math.pow(a, 1.5) *
    speed *
    speed *
    Math.exp(
      (-mass * speed * speed) /
        (2 * maxwellConstants.gasConstant * params.temperature)
    )
  );
}
export function createMaxwellSim(initial: Partial<MaxwellParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): MaxwellState {
    return calculateMaxwell(params, time);
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): MaxwellParams => ({ ...params }),
    setParams(next: Partial<MaxwellParams>): MaxwellParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
