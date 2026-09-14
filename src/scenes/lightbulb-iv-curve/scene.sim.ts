import { clamp } from '../../core/math';

export type LightbulbParams = {
  voltage: number;
  showIdeal: boolean;
  autoRun: boolean;
};
export type LightbulbPoint = { voltage: number; current: number };
export type LightbulbState = LightbulbParams & {
  time: number;
  current: number;
  resistance: number;
  power: number;
  temperatureRatio: number;
  idealCurrent: number;
  curve: LightbulbPoint[];
  recorded: LightbulbPoint[];
};

export const lightbulbConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  voltageMin: 0,
  voltageMax: 3.6,
  coldResistance: 6,
  thermalCoeff: 0.7,
  maxCurrent: 0.5
} as const;

const DEFAULTS: LightbulbParams = {
  voltage: 2.9,
  showIdeal: true,
  autoRun: false
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<LightbulbParams>,
  prev = DEFAULTS
): LightbulbParams {
  return {
    voltage: clamp(
      finite(input.voltage, prev.voltage),
      lightbulbConstants.voltageMin,
      lightbulbConstants.voltageMax
    ),
    showIdeal:
      typeof input.showIdeal === 'boolean' ? input.showIdeal : prev.showIdeal,
    autoRun: typeof input.autoRun === 'boolean' ? input.autoRun : prev.autoRun
  };
}
function derive(
  params: LightbulbParams,
  time: number,
  recorded: LightbulbPoint[]
): LightbulbState {
  const resistance =
    lightbulbConstants.coldResistance +
    lightbulbConstants.thermalCoeff * params.voltage * params.voltage;
  const current = params.voltage / Math.max(0.001, resistance);
  const idealCurrent = params.voltage / lightbulbConstants.coldResistance;
  const curve: LightbulbPoint[] = [];
  for (let i = 0; i <= 18; i += 1) {
    const voltage = (i / 18) * lightbulbConstants.voltageMax;
    curve.push({
      voltage,
      current:
        voltage /
        (lightbulbConstants.coldResistance +
          lightbulbConstants.thermalCoeff * voltage * voltage)
    });
  }
  return {
    ...params,
    time,
    current,
    resistance,
    power: params.voltage * current,
    temperatureRatio: clamp(
      params.voltage / lightbulbConstants.voltageMax,
      0,
      1
    ),
    idealCurrent,
    curve,
    recorded: recorded.map((point) => ({ ...point }))
  };
}
export function createLightbulbSim(initial: Partial<LightbulbParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let recorded: LightbulbPoint[] = [];
  return {
    getState(): LightbulbState {
      return derive(params, time, recorded);
    },
    getSnapshot(): LightbulbState {
      return derive(params, time, recorded);
    },
    getParams(): LightbulbParams {
      return { ...params };
    },
    setParams(next: Partial<LightbulbParams>): LightbulbParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    recordPoint(): void {
      const point = derive(params, time, recorded);
      if (
        !recorded.some((item) => Math.abs(item.voltage - point.voltage) < 0.02)
      )
        recorded.push({ voltage: params.voltage, current: point.current });
    },
    resetCurve(): void {
      recorded = [];
    },
    step(dt: number): void {
      if (params.autoRun) {
        time += clamp(finite(dt, 0), 0, 0.05);
        params = {
          ...params,
          voltage: ((time % 4) / 4) * lightbulbConstants.voltageMax
        };
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      recorded = [];
    }
  };
}
