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

export const emfInternalConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  fieldLeft: 42,
  fieldRight: 730,
  fieldTop: 104,
  fieldBottom: 708,
  circuitTop: 112,
  circuitBottom: 392,
  graphX: 42,
  graphY: 414,
  graphWidth: 688,
  graphHeight: 294,
  graphLeft: 76,
  graphRight: 702,
  graphTop: 456,
  graphBottom: 674,
  graphCurrentBaseMax: 3,
  graphVoltageMax: 6.5,
  graphGridStep: 64,
  sourceX: 112,
  sourceY: 202,
  sourceWidth: 118,
  sourceHeight: 62,
  switchX: 258,
  ammeterX: 386,
  ammeterY: 202,
  voltmeterX: 344,
  voltmeterY: 318,
  meterRadius: 40,
  rheostatX: 500,
  rheostatY: 202,
  rheostatWidth: 182,
  rheostatHeight: 42,
  wireLeft: 58,
  wireRight: 722,
  wireBottom: 348,
  cardX: 786,
  cardWidth: 382,
  headerRuleY: 72,
  readoutY: 100,
  readoutHeight: 132,
  recordsY: 248,
  recordsHeight: 166,
  fitY: 430,
  fitHeight: 172,
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
  pointRadius: 6
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

function normalize(
  input: Partial<EmfInternalParams>,
  previous = DEFAULTS
): EmfInternalParams {
  return {
    sourceVoltage: clamp(
      finite(input.sourceVoltage, previous.sourceVoltage),
      emfInternalConstants.sourceOptionsMin,
      emfInternalConstants.sourceOptionsMax
    ),
    internalResistance: clamp(
      finite(input.internalResistance, previous.internalResistance),
      emfInternalConstants.resistanceMin,
      emfInternalConstants.resistanceMax
    ),
    rheostatResistance: clamp(
      finite(input.rheostatResistance, previous.rheostatResistance),
      emfInternalConstants.rheostatMin,
      emfInternalConstants.rheostatMax
    ),
    switchClosed: input.switchClosed ?? previous.switchClosed,
    systematicError: input.systematicError ?? previous.systematicError,
    autoRun: input.autoRun ?? previous.autoRun
  };
}

function measurement(params: EmfInternalParams): {
  terminalVoltage: number;
  current: number;
  trueCurrent: number;
} {
  if (!params.switchClosed) {
    return { terminalVoltage: 0, current: 0, trueCurrent: 0 };
  }
  const load = params.rheostatResistance;
  const r = params.internalResistance;
  if (!params.systematicError) {
    const current = params.sourceVoltage / (r + load);
    return {
      terminalVoltage: current * load,
      current,
      trueCurrent: current
    };
  }
  const rv = emfInternalConstants.voltmeterResistance;
  const parallelLoad = (load * rv) / Math.max(0.001, load + rv);
  const totalCurrent = params.sourceVoltage / (r + parallelLoad);
  const terminalVoltage = totalCurrent * parallelLoad;
  const current = terminalVoltage / load;
  return {
    terminalVoltage,
    current,
    trueCurrent: terminalVoltage / load
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
  if (variance < 0.000001) return null;
  const slope = covariance / variance;
  const emf = meanU - slope * meanI;
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
      ? '已闭合 · 已考虑电压表分流'
      : '已闭合 · 理想读数'
    : '开关断开';
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
  let params = normalize(initial);
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
      time += Math.max(0, finite(dt, 0));
      if (time > emfInternalConstants.flowPeriod)
        time %= emfInternalConstants.flowPeriod;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      records = [];
      fit = null;
    }
  };
}
