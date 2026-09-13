import { clamp } from '../../core/math';

export type ResistorCircuitMode = 'divider' | 'limiting';
export type ResistorMeterMode = 'external' | 'internal';

export type ResistorParams = {
  circuitMode: ResistorCircuitMode;
  meterMode: ResistorMeterMode;
  targetResistance: number;
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
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  fieldLeft: 36,
  fieldRight: 730,
  fieldTop: 108,
  fieldBottom: 704,
  sourceVoltage: 6,
  ammeterResistance: 1,
  voltmeterResistance: 250,
  rheostatMaxResistance: 80,
  rheostatMinResistance: 4,
  targetMinResistance: 5,
  targetMaxResistance: 60,
  graphX: 808,
  graphY: 568,
  graphWidth: 342,
  graphHeight: 110,
  flowPeriod: 84,
  comparisonLineOffset: 58,
  cardX: 786,
  cardWidth: 382,
  headerRuleY: 72,
  readoutY: 94,
  readoutHeight: 172,
  formulaY: 282,
  formulaHeight: 120
} as const;

const DEFAULTS: ResistorParams = {
  circuitMode: 'divider',
  meterMode: 'external',
  targetResistance: 25,
  supplyVoltage: resistorConstants.sourceVoltage,
  rheostatPosition: 0.9,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<ResistorParams>,
  previous = DEFAULTS
): ResistorParams {
  return {
    circuitMode:
      input.circuitMode === 'limiting'
        ? 'limiting'
        : input.circuitMode === 'divider'
          ? 'divider'
          : previous.circuitMode,
    meterMode:
      input.meterMode === 'internal'
        ? 'internal'
        : input.meterMode === 'external'
          ? 'external'
          : previous.meterMode,
    targetResistance: clamp(
      finite(input.targetResistance, previous.targetResistance),
      resistorConstants.targetMinResistance,
      resistorConstants.targetMaxResistance
    ),
    supplyVoltage: clamp(
      finite(input.supplyVoltage, previous.supplyVoltage),
      3,
      12
    ),
    rheostatPosition: clamp(
      finite(input.rheostatPosition, previous.rheostatPosition),
      0,
      1
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

function parallel(a: number, b: number): number {
  return (a * b) / Math.max(0.001, a + b);
}

function derive(params: ResistorParams, time: number): ResistorState {
  const rx = params.targetResistance;
  const ra = resistorConstants.ammeterResistance;
  const rv = resistorConstants.voltmeterResistance;
  const loadResistance =
    params.meterMode === 'external' ? parallel(rx, rv) : rx + ra;
  const rheostatResistance =
    resistorConstants.rheostatMinResistance +
    params.rheostatPosition *
      (resistorConstants.rheostatMaxResistance -
        resistorConstants.rheostatMinResistance);

  let sourceOutput = params.supplyVoltage;
  let voltageAcrossTarget: number;
  if (params.circuitMode === 'limiting') {
    const total = rheostatResistance + loadResistance;
    voltageAcrossTarget = params.supplyVoltage * (loadResistance / total);
  } else {
    const top =
      resistorConstants.rheostatMaxResistance * (1 - params.rheostatPosition);
    const bottom =
      resistorConstants.rheostatMaxResistance * params.rheostatPosition;
    const theveninResistance =
      top > 0 && bottom > 0 ? parallel(top, bottom) : 0;
    sourceOutput = params.supplyVoltage * params.rheostatPosition;
    voltageAcrossTarget =
      (sourceOutput * loadResistance) /
      Math.max(0.001, theveninResistance + loadResistance);
  }

  const measuredCurrent = voltageAcrossTarget / Math.max(0.001, loadResistance);
  const actualCurrent = voltageAcrossTarget / rx;
  const voltageMeasured =
    params.meterMode === 'internal'
      ? measuredCurrent * (rx + ra)
      : voltageAcrossTarget;
  const measuredResistance =
    voltageMeasured / Math.max(0.0001, measuredCurrent);
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
    flowPhase: time * (0.8 + Math.min(2, measuredCurrent * 8))
  };
}

export function createResistorSim(initial: Partial<ResistorParams> = {}) {
  let params = normalize(initial);
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
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
