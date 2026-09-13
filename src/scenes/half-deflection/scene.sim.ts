import { clamp } from '../../core/math';

export type MeterMethod = 'current' | 'voltage';

export type HalfDeflectionParams = {
  method: MeterMethod;
  mainSwitch: boolean;
  auxiliarySwitch: boolean;
  rheostat: number;
  boxResistance: number;
  autoRun: boolean;
  showAnswer: boolean;
};

export type MeasurementRecord = {
  stage: '满偏' | '半偏';
  auxiliarySwitch: boolean;
  rheostat: number;
  reading: number;
  boxResistance: number;
};

export type HalfDeflectionState = {
  params: HalfDeflectionParams;
  time: number;
  meterReading: number;
  fullScale: number;
  halfTarget: number;
  meterResistance: number;
  estimate: number;
  needleAngle: number;
  status: string;
  records: MeasurementRecord[];
};

export const halfDeflectionConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  sourceX: 96,
  sourceWidth: 82,
  sourceHeight: 56,
  axisY: 414,
  meterX: 270,
  meterY: 166,
  meterRadius: 86,
  meterFaceWidth: 142,
  meterFaceHeight: 112,
  meterDisplayWidth: 112,
  meterDisplayHeight: 28,
  meterTickOuter: 56,
  resistorX: 520,
  resistorY: 336,
  resistorWidth: 146,
  resistorHeight: 52,
  boxX: 228,
  boxY: 424,
  boxWidth: 168,
  boxHeight: 58,
  switchX: 530,
  switchY: 508,
  switchWidth: 112,
  switchHeight: 42,
  auxiliarySwitchX: 346,
  auxiliarySwitchY: 456,
  sourceY: 642,
  wireLeft: 90,
  wireRight: 700,
  meterInternalCurrent: 100,
  meterInternalVoltage: 1000,
  supplyVoltage: 6,
  defaultRheostat: 4000,
  defaultBoxResistance: 100,
  rheostatMin: 500,
  rheostatMax: 4000,
  boxResistanceMin: 0,
  boxResistanceMax: 5000,
  titleY: 40,
  panelRuleY: 70,
  metricsCardY: 88,
  metricsCardHeight: 244,
  recordCardY: 348,
  recordCardHeight: 206,
  formulaCardY: 578,
  formulaCardHeight: 132,
  gridStep: 54,
  needleLength: 62,
  cardRadius: 12
} as const;

const DEFAULTS: HalfDeflectionParams = {
  method: 'current',
  mainSwitch: true,
  auxiliarySwitch: false,
  rheostat: halfDeflectionConstants.defaultRheostat,
  boxResistance: halfDeflectionConstants.defaultBoxResistance,
  autoRun: true,
  showAnswer: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<HalfDeflectionParams>,
  previous = DEFAULTS
): HalfDeflectionParams {
  return {
    method:
      input.method === 'voltage' || input.method === 'current'
        ? input.method
        : previous.method,
    mainSwitch: input.mainSwitch ?? previous.mainSwitch,
    auxiliarySwitch: input.auxiliarySwitch ?? previous.auxiliarySwitch,
    rheostat: clamp(
      finite(input.rheostat, previous.rheostat),
      halfDeflectionConstants.rheostatMin,
      halfDeflectionConstants.rheostatMax
    ),
    boxResistance: clamp(
      finite(input.boxResistance, previous.boxResistance),
      halfDeflectionConstants.boxResistanceMin,
      halfDeflectionConstants.boxResistanceMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showAnswer: input.showAnswer ?? previous.showAnswer
  };
}

export function createHalfDeflectionSim(
  initial: Partial<HalfDeflectionParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  let records: MeasurementRecord[] = [];

  function getState(): HalfDeflectionState {
    const meterResistance =
      params.method === 'current'
        ? halfDeflectionConstants.meterInternalCurrent
        : halfDeflectionConstants.meterInternalVoltage;
    const rheostatFactor = clamp(
      halfDeflectionConstants.defaultRheostat / params.rheostat,
      0.45,
      1
    );
    const fullScale = params.mainSwitch
      ? (params.method === 'current' ? 1 : 3) * rheostatFactor
      : 0;
    const parallelRatio =
      params.boxResistance / (params.boxResistance + meterResistance);
    const meterReading = params.mainSwitch
      ? fullScale * (params.auxiliarySwitch ? parallelRatio : 1)
      : 0;
    const estimate = params.auxiliarySwitch ? params.boxResistance : 0;
    const halfTarget = fullScale * 0.5;
    const needleAngle =
      -1.05 + (meterReading / Math.max(0.01, fullScale)) * 2.1;
    const status = !params.mainSwitch
      ? 'S₁ 断开'
      : !params.auxiliarySwitch
        ? '调 R₁ 至满偏'
        : Math.abs(meterReading - halfTarget) < 0.08
          ? '半偏：读取 R₂'
          : '调 R₂ 至半偏';
    return {
      params: { ...params },
      time,
      meterReading,
      fullScale,
      halfTarget,
      meterResistance,
      estimate,
      needleAngle,
      status,
      records: records.map((record) => ({ ...record }))
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): HalfDeflectionParams => ({ ...params }),
    setParams(next: Partial<HalfDeflectionParams>): HalfDeflectionParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    record(stage: '满偏' | '半偏'): void {
      const state = getState();
      records = [
        ...records,
        {
          stage,
          auxiliarySwitch: params.auxiliarySwitch,
          rheostat: params.rheostat,
          reading: state.meterReading,
          boxResistance: params.boxResistance
        }
      ].slice(-2);
    },
    clearRecords(): void {
      records = [];
    },
    step(dt: number): void {
      if (params.autoRun) time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      records = [];
      time = 0;
    }
  };
}
