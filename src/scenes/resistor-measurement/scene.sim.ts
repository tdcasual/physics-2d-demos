import { clamp } from '../../core/math';

export type ResistorCircuitMode = 'divider' | 'limiting';
export type ResistorMeterMode = 'external' | 'internal';

export type ResistorParams = {
  circuitMode: ResistorCircuitMode;
  meterMode: ResistorMeterMode;
  targetResistance: number;
  ammeterResistance: number;
  voltmeterResistance: number;
  supplyVoltage: number;
  rheostatPosition: number;
  autoRun: boolean;
};

export type ResistorState = {
  params: ResistorParams;
  time: number;
  rheostatResistance: number;
  loadResistance: number;
  sourceOutput: number;
  voltageAcrossTarget: number;
  voltageMeasured: number;
  actualCurrent: number;
  measuredCurrent: number;
  measuredResistance: number;
  errorPercent: number;
  status: string;
  flowPhase: number;
};

export const resistorConstants = {
  baseWidth: 960,
  baseHeight: 720,
  sourceVoltage: 6,
  ammeterResistance: 1,
  voltmeterResistance: 250,
  rheostatMaxResistance: 80,
  rheostatMinResistance: 4,
  targetMinResistance: 5,
  targetMaxResistance: 60,
  ammeterMinResistance: 0.1,
  ammeterMaxResistance: 10,
  voltmeterMinResistance: 50,
  voltmeterMaxResistance: 2000,
  supplyMin: 3,
  supplyMax: 12,
  flowPeriod: 1
} as const;

const DEFAULTS: ResistorParams = {
  circuitMode: 'divider',
  meterMode: 'external',
  targetResistance: 25,
  ammeterResistance: resistorConstants.ammeterResistance,
  voltmeterResistance: resistorConstants.voltmeterResistance,
  supplyVoltage: resistorConstants.sourceVoltage,
  rheostatPosition: 0.9,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
    if (v === '0' || v === 'false' || v === 'off' || v === 'no' || v === '')
      return false;
  }
  return fallback;
}

export function asCircuitMode(value: unknown): ResistorCircuitMode | undefined {
  if (value === 'divider' || value === 'limiting') return value;
  if (value === 0 || value === '0') return 'divider';
  if (value === 1 || value === '1') return 'limiting';
  if (typeof value === 'number' && Number.isFinite(value))
    return value > 0 ? 'limiting' : 'divider';
  return undefined;
}

export function asMeterMode(value: unknown): ResistorMeterMode | undefined {
  if (value === 'external' || value === 'internal') return value;
  if (value === 0 || value === '0') return 'external';
  if (value === 1 || value === '1') return 'internal';
  if (typeof value === 'number' && Number.isFinite(value))
    return value > 0 ? 'internal' : 'external';
  return undefined;
}

export function parallel(a: number, b: number): number {
  const den = a + b;
  if (!Number.isFinite(den) || Math.abs(den) < 1e-9) return 0;
  return (a * b) / den;
}

export function measuredFromMeters(
  meterMode: ResistorMeterMode,
  rx: number,
  ra: number,
  rv: number
): number {
  return meterMode === 'external' ? parallel(rx, rv) : rx + ra;
}

function normalize(
  input: Partial<ResistorParams>,
  previous = DEFAULTS
): ResistorParams {
  return {
    circuitMode: asCircuitMode(input.circuitMode) ?? previous.circuitMode,
    meterMode: asMeterMode(input.meterMode) ?? previous.meterMode,
    targetResistance: clamp(
      finite(input.targetResistance, previous.targetResistance),
      resistorConstants.targetMinResistance,
      resistorConstants.targetMaxResistance
    ),
    ammeterResistance: clamp(
      finite(input.ammeterResistance, previous.ammeterResistance),
      resistorConstants.ammeterMinResistance,
      resistorConstants.ammeterMaxResistance
    ),
    voltmeterResistance: clamp(
      finite(input.voltmeterResistance, previous.voltmeterResistance),
      resistorConstants.voltmeterMinResistance,
      resistorConstants.voltmeterMaxResistance
    ),
    supplyVoltage: clamp(
      finite(input.supplyVoltage, previous.supplyVoltage),
      resistorConstants.supplyMin,
      resistorConstants.supplyMax
    ),
    rheostatPosition: clamp(
      finite(input.rheostatPosition, previous.rheostatPosition),
      0,
      1
    ),
    autoRun:
      input.autoRun === undefined
        ? previous.autoRun
        : asBool(input.autoRun, previous.autoRun)
  };
}

function derive(params: ResistorParams, time: number): ResistorState {
  const rx = params.targetResistance;
  const ra = params.ammeterResistance;
  const rv = params.voltmeterResistance;
  const loadResistance = measuredFromMeters(params.meterMode, rx, ra, rv);
  const rheostatResistance =
    resistorConstants.rheostatMinResistance +
    params.rheostatPosition *
      (resistorConstants.rheostatMaxResistance -
        resistorConstants.rheostatMinResistance);

  let sourceOutput = params.supplyVoltage;
  let voltageAcrossTarget: number;
  if (params.circuitMode === 'limiting') {
    const total = rheostatResistance + loadResistance;
    voltageAcrossTarget =
      params.supplyVoltage * (loadResistance / Math.max(1e-9, total));
  } else {
    const top =
      resistorConstants.rheostatMaxResistance * (1 - params.rheostatPosition);
    const bottom =
      resistorConstants.rheostatMaxResistance * params.rheostatPosition;
    const theveninResistance =
      top > 1e-9 && bottom > 1e-9 ? parallel(top, bottom) : 0;
    sourceOutput = params.supplyVoltage * params.rheostatPosition;
    voltageAcrossTarget =
      (sourceOutput * loadResistance) /
      Math.max(1e-9, theveninResistance + loadResistance);
  }

  const measuredCurrent = voltageAcrossTarget / Math.max(1e-9, loadResistance);
  const voltageOnRx =
    params.meterMode === 'internal'
      ? measuredCurrent * rx
      : voltageAcrossTarget;
  const actualCurrent = voltageOnRx / Math.max(1e-9, rx);
  const voltageMeasured =
    params.meterMode === 'internal'
      ? measuredCurrent * (rx + ra)
      : voltageAcrossTarget;
  const measuredResistance = voltageMeasured / Math.max(1e-9, measuredCurrent);
  const errorPercent = ((measuredResistance - rx) / rx) * 100;
  const status =
    params.meterMode === 'external'
      ? '外接：电压表分流，R测 < Rx'
      : '内接：电流表分压，R测 > Rx';
  return {
    params: { ...params },
    time,
    rheostatResistance,
    loadResistance,
    sourceOutput,
    voltageAcrossTarget,
    voltageMeasured,
    actualCurrent,
    measuredCurrent,
    measuredResistance,
    errorPercent,
    status,
    flowPhase: time * (0.6 + Math.min(2.4, measuredCurrent * 6))
  };
}

export function createResistorSim(initial: Partial<ResistorParams> = {}) {
  let params = normalize(initial);
  const baseline: ResistorParams = { ...params };
  let time = 0;
  return {
    getState: (): ResistorState => derive(params, time),
    getSnapshot: (): ResistorState => derive(params, time),
    getParams: (): ResistorParams => ({ ...params }),
    setParams(next: Partial<ResistorParams>): ResistorParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...baseline };
      time = 0;
    }
  };
}
