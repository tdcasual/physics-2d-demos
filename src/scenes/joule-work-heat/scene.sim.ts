import { clamp } from '../../core/math';

export type JouleMode = 0 | 1;
export type JouleParams = {
  mode: JouleMode;
  mass: number;
  height: number;
  waterMass: number;
  voltage: number;
  current: number;
  duration: number;
  autoRun: boolean;
};

export type JouleState = JouleParams & {
  time: number;
  dropFraction: number;
  mechanicalWork: number;
  electricWork: number;
  activeWork: number;
  temperatureRise: number;
  temperature: number;
  paddleAngle: number;
  system: string;
};

export const jouleConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  gravity: 10,
  specificHeat: 4200,
  ambientTemperature: 20,
  mechanicalDuration: 8,
  voltageMin: 6,
  voltageMax: 24,
  currentMin: 0.5,
  currentMax: 4,
  durationMin: 0,
  durationMax: 300
} as const;

const DEFAULT_PARAMS: JouleParams = {
  mode: 0,
  mass: 42,
  height: 15,
  waterMass: 2,
  voltage: 12,
  current: 2,
  duration: 26.3,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<JouleParams>,
  previous = DEFAULT_PARAMS
): JouleParams {
  return {
    mode: input.mode === 0 || input.mode === 1 ? input.mode : previous.mode,
    mass: clamp(finite(input.mass, previous.mass), 10, 60),
    height: clamp(finite(input.height, previous.height), 5, 20),
    waterMass: clamp(finite(input.waterMass, previous.waterMass), 1, 4),
    voltage: clamp(
      finite(input.voltage, previous.voltage),
      jouleConstants.voltageMin,
      jouleConstants.voltageMax
    ),
    current: clamp(
      finite(input.current, previous.current),
      jouleConstants.currentMin,
      jouleConstants.currentMax
    ),
    duration: clamp(
      finite(input.duration, previous.duration),
      jouleConstants.durationMin,
      jouleConstants.durationMax
    ),
    autoRun:
      typeof input.autoRun === 'boolean' ? input.autoRun : previous.autoRun
  };
}

function derive(params: JouleParams, time: number): JouleState {
  const mechanicalWork = params.mass * jouleConstants.gravity * params.height;
  const electricWork = params.voltage * params.current * params.duration;
  const dropFraction =
    params.mode === 0
      ? clamp(time / jouleConstants.mechanicalDuration, 0, 1)
      : 0;
  const electricFraction =
    params.mode === 1 ? clamp(time / Math.max(0.1, params.duration), 0, 1) : 0;
  const activeFraction = params.mode === 0 ? dropFraction : electricFraction;
  const activeWork =
    (params.mode === 0 ? mechanicalWork : electricWork) * activeFraction;
  const temperatureRise =
    activeWork / (jouleConstants.specificHeat * params.waterMass);
  return {
    ...params,
    time,
    dropFraction,
    mechanicalWork,
    electricWork,
    activeWork,
    temperatureRise,
    temperature: jouleConstants.ambientTemperature + temperatureRise,
    paddleAngle: time * 2.8,
    system: '绝热封闭系统：Q = 0'
  };
}

export function createJouleSim(initial: Partial<JouleParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  function getState(): JouleState {
    return derive(params, time);
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): JouleParams => ({ ...params }),
    setParams(next: Partial<JouleParams>): JouleParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    matchWork(): JouleParams {
      const work = params.mass * jouleConstants.gravity * params.height;
      const duration = clamp(
        work / (params.voltage * params.current),
        jouleConstants.durationMin,
        jouleConstants.durationMax
      );
      params = normalize({ ...params, duration }, params);
      return { ...params };
    },
    reset(): void {
      params = { ...DEFAULT_PARAMS };
      time = 0;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += clamp(finite(dt, 0), 0, 0.05);
      const maxTime =
        params.mode === 0
          ? jouleConstants.mechanicalDuration
          : Math.max(0.1, params.duration);
      if (time > maxTime) time = maxTime;
    }
  };
}
