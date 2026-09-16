import { clamp } from '../../core/math';

export type EmfInternalParams = {
  sourceVoltage: number;
  internalResistance: number;
  rheostatResistance: number;
  switchClosed: boolean;
  systematicError: boolean;
  autoRun: boolean;
};

export type EmfRecord = {
  voltage: number;
  current: number;
  resistance: number;
};

export type EmfFit = {
  emf: number;
  internalResistance: number;
  slope: number;
};

export type EmfInternalState = {
  params: EmfInternalParams;
  time: number;
  rheostatResistance: number;
  terminalVoltage: number;
  current: number;
  trueCurrent: number;
  sourceVoltage: number;
  internalResistance: number;
  records: EmfRecord[];
  fit: EmfFit | null;
  status: string;
  phase: number;
};

export const SOURCE_VOLTAGE_OPTIONS = [1.5, 3, 6] as const;
export const INTERNAL_RESISTANCE_OPTIONS = [0.5, 1, 2] as const;

export const emfInternalConstants = {
  baseWidth: 900,
  baseHeight: 380,
  sourceX: 118,
  sourceY: 150,
  sourceWidth: 108,
  sourceHeight: 56,
  switchX: 248,
  ammeterX: 372,
  ammeterY: 150,
  voltmeterX: 330,
  voltmeterY: 268,
  meterRadius: 36,
  rheostatX: 468,
  rheostatY: 150,
  rheostatWidth: 196,
  rheostatHeight: 40,
  wireLeft: 48,
  wireRight: 852,
  wireBottom: 320, // below voltmeter body; cell-side lead must not meet the return rail
  sourceOptionsMin: 1.5,
  sourceOptionsMax: 6,
  resistanceMin: 0.5,
  resistanceMax: 2,
  rheostatMin: 1,
  rheostatMax: 15,
  voltmeterResistance: 100,
  ammeterResistance: 0.1,
  maxRecords: 6,
  flowPeriod: 72,
  flowSpacing: 28,
  pointRadius: 6,
  graphFallbackWidth: 640,
  graphFallbackHeight: 240,
  graphCurrentBaseMax: 3,
  graphVoltageBaseMax: 3
} as const;

const DEFAULTS: EmfInternalParams = {
  sourceVoltage: 1.5,
  internalResistance: 0.5,
  rheostatResistance: 5,
  switchClosed: true,
  systematicError: false,
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

function snapTo(value: number, options: readonly number[]): number {
  return options.reduce((best, option) =>
    Math.abs(option - value) < Math.abs(best - value) ? option : best
  );
}

export function asSourceVoltage(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const snapped = snapTo(n, SOURCE_VOLTAGE_OPTIONS);
  return SOURCE_VOLTAGE_OPTIONS.includes(
    snapped as (typeof SOURCE_VOLTAGE_OPTIONS)[number]
  )
    ? snapped
    : undefined;
}

export function asInternalResistance(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const snapped = snapTo(n, INTERNAL_RESISTANCE_OPTIONS);
  return INTERNAL_RESISTANCE_OPTIONS.includes(
    snapped as (typeof INTERNAL_RESISTANCE_OPTIONS)[number]
  )
    ? snapped
    : undefined;
}

function normalize(
  input: Partial<EmfInternalParams>,
  previous = DEFAULTS
): EmfInternalParams {
  const sourceVoltage =
    asSourceVoltage(input.sourceVoltage) ??
    asSourceVoltage(previous.sourceVoltage) ??
    DEFAULTS.sourceVoltage;
  const internalResistance =
    asInternalResistance(input.internalResistance) ??
    asInternalResistance(previous.internalResistance) ??
    DEFAULTS.internalResistance;
  return {
    sourceVoltage,
    internalResistance,
    rheostatResistance: clamp(
      finite(input.rheostatResistance, previous.rheostatResistance),
      emfInternalConstants.rheostatMin,
      emfInternalConstants.rheostatMax
    ),
    switchClosed:
      input.switchClosed === undefined
        ? previous.switchClosed
        : asBool(input.switchClosed, previous.switchClosed),
    systematicError:
      input.systematicError === undefined
        ? previous.systematicError
        : asBool(input.systematicError, previous.systematicError),
    autoRun:
      input.autoRun === undefined
        ? previous.autoRun
        : asBool(input.autoRun, previous.autoRun)
  };
}

function measurement(params: EmfInternalParams): {
  terminalVoltage: number;
  current: number;
  trueCurrent: number;
} {
  const load = Math.max(
    emfInternalConstants.rheostatMin,
    params.rheostatResistance
  );
  const r = Math.max(
    emfInternalConstants.resistanceMin,
    params.internalResistance
  );
  const e = params.sourceVoltage;
  const rv = emfInternalConstants.voltmeterResistance;
  if (!params.switchClosed) {
    // Cell-side voltmeter still sees the source. Ideal: U=E, I=0.
    // Finite meter: the only closed path is E–r–Rv, so U=E Rv/(r+Rv).
    if (!params.systematicError) {
      return { terminalVoltage: e, current: 0, trueCurrent: 0 };
    }
    const totalCurrent = e / (r + rv);
    const terminalVoltage = totalCurrent * rv;
    return {
      terminalVoltage: Number.isFinite(terminalVoltage) ? terminalVoltage : 0,
      current: 0,
      trueCurrent: Number.isFinite(totalCurrent) ? totalCurrent : 0
    };
  }
  if (!params.systematicError) {
    const current = e / (r + load);
    const safe = Number.isFinite(current) ? current : 0;
    return {
      terminalVoltage: safe * load,
      current: safe,
      trueCurrent: safe
    };
  }
  const parallelLoad = (load * rv) / Math.max(1e-6, load + rv);
  const totalCurrent = e / (r + parallelLoad);
  const terminalVoltage = totalCurrent * parallelLoad;
  const branchCurrent = terminalVoltage / load;
  return {
    terminalVoltage: Number.isFinite(terminalVoltage) ? terminalVoltage : 0,
    current: Number.isFinite(branchCurrent) ? branchCurrent : 0,
    trueCurrent: Number.isFinite(totalCurrent) ? totalCurrent : 0
  };
}

function fitRecords(records: EmfRecord[]): EmfFit | null {
  if (records.length < 2) return null;
  const meanI =
    records.reduce((sum, point) => sum + point.current, 0) / records.length;
  const meanU =
    records.reduce((sum, point) => sum + point.voltage, 0) / records.length;
  let covariance = 0;
  let variance = 0;
  records.forEach((point) => {
    covariance += (point.current - meanI) * (point.voltage - meanU);
    variance += (point.current - meanI) ** 2;
  });
  if (!(variance > 1e-9) || !Number.isFinite(variance)) return null;
  const slope = covariance / variance;
  if (!Number.isFinite(slope)) return null;
  const emf = meanU - slope * meanI;
  if (!Number.isFinite(emf)) return null;
  return { emf, internalResistance: Math.abs(slope), slope };
}

function derive(
  params: EmfInternalParams,
  time: number,
  records: EmfRecord[],
  fit: EmfFit | null
): EmfInternalState {
  const reading = measurement(params);
  const status = params.switchClosed
    ? params.systematicError
      ? '已闭合 · 分流'
      : '已闭合'
    : '断开';
  return {
    params: { ...params },
    time,
    rheostatResistance: params.rheostatResistance,
    terminalVoltage: reading.terminalVoltage,
    current: reading.current,
    trueCurrent: reading.trueCurrent,
    sourceVoltage: params.sourceVoltage,
    internalResistance: params.internalResistance,
    records: records.map((record) => ({ ...record })),
    fit: fit ? { ...fit } : null,
    status,
    phase: time * (0.8 + reading.current * 5)
  };
}

export function createEmfInternalSim(initial: Partial<EmfInternalParams> = {}) {
  const initialParams = normalize(initial);
  let params = { ...initialParams };
  let time = 0;
  let records: EmfRecord[] = [];
  let fit: EmfFit | null = null;
  return {
    getState: (): EmfInternalState => derive(params, time, records, fit),
    getSnapshot: (): EmfInternalState => derive(params, time, records, fit),
    getParams: (): EmfInternalParams => ({ ...params }),
    setParams(next: Partial<EmfInternalParams>): EmfInternalParams {
      params = normalize({ ...params, ...next }, params);
      fit = null;
      return { ...params };
    },
    toggleSwitch(): boolean {
      params = normalize(
        { ...params, switchClosed: !params.switchClosed },
        params
      );
      return params.switchClosed;
    },
    recordPoint(): boolean {
      if (
        !params.switchClosed ||
        records.length >= emfInternalConstants.maxRecords
      )
        return false;
      const reading = measurement(params);
      records = [
        ...records,
        {
          voltage: reading.terminalVoltage,
          current: reading.current,
          resistance: params.rheostatResistance
        }
      ];
      fit = null;
      return true;
    },
    fitRecords(): EmfFit | null {
      fit = fitRecords(records);
      return fit ? { ...fit } : null;
    },
    clearRecords(): void {
      records = [];
      fit = null;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = Math.max(0, finite(dt, 0));
      time += delta;
      if (time > emfInternalConstants.flowPeriod)
        time %= emfInternalConstants.flowPeriod;
    },
    reset(): void {
      params = { ...initialParams };
      time = 0;
      records = [];
      fit = null;
    }
  };
}

export function restoredUrlParams(params: EmfInternalParams): {
  sourceVoltage: number;
  internalResistance: number;
  rheostatResistance: number;
  switchClosed: number;
  systematicError: number;
  autoRun: number;
} {
  return {
    sourceVoltage: params.sourceVoltage,
    internalResistance: params.internalResistance,
    rheostatResistance: params.rheostatResistance,
    switchClosed: params.switchClosed ? 1 : 0,
    systematicError: params.systematicError ? 1 : 0,
    autoRun: params.autoRun ? 1 : 0
  };
}
