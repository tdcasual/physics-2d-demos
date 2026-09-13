import { clamp } from '../../core/math';

export type ClosedCircuitParams = {
  emf: number;
  internalResistance: number;
  externalResistance: number;
  autoRun: boolean;
  showPowerArea: boolean;
};

export type ClosedCircuitState = {
  params: ClosedCircuitParams;
  time: number;
  current: number;
  terminalVoltage: number;
  internalDrop: number;
  totalPower: number;
  outputPower: number;
  maxOutputPower: number;
  maxPowerResistance: number;
  shortCircuitCurrent: number;
  powerRatio: number;
};

export const closedCircuitConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  gridStep: 54,
  sourceX: 120,
  sourceY: 150,
  resistorX: 480,
  resistorY: 150,
  meterX: 294,
  meterY: 150,
  graphLeft: 78,
  graphTop: 324,
  graphWidth: 610,
  graphHeight: 310,
  titleY: 38,
  panelRuleY: 70,
  metricsCardY: 88,
  metricsCardHeight: 260,
  powerCardY: 366,
  powerCardHeight: 150,
  formulaCardY: 540,
  formulaCardHeight: 122,
  defaultEmf: 12,
  defaultInternalResistance: 4,
  defaultExternalResistance: 4,
  emfMin: 4,
  emfMax: 24,
  internalResistanceMin: 1,
  internalResistanceMax: 10,
  externalResistanceMin: 0,
  externalResistanceMax: 20,
  cardRadius: 12
} as const;

const DEFAULTS: ClosedCircuitParams = {
  emf: closedCircuitConstants.defaultEmf,
  internalResistance: closedCircuitConstants.defaultInternalResistance,
  externalResistance: closedCircuitConstants.defaultExternalResistance,
  autoRun: true,
  showPowerArea: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<ClosedCircuitParams>,
  previous = DEFAULTS
): ClosedCircuitParams {
  return {
    emf: clamp(
      finite(input.emf, previous.emf),
      closedCircuitConstants.emfMin,
      closedCircuitConstants.emfMax
    ),
    internalResistance: clamp(
      finite(input.internalResistance, previous.internalResistance),
      closedCircuitConstants.internalResistanceMin,
      closedCircuitConstants.internalResistanceMax
    ),
    externalResistance: clamp(
      finite(input.externalResistance, previous.externalResistance),
      closedCircuitConstants.externalResistanceMin,
      closedCircuitConstants.externalResistanceMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showPowerArea: input.showPowerArea ?? previous.showPowerArea
  };
}

export function closedCircuitMeasures(
  params: Pick<
    ClosedCircuitParams,
    'emf' | 'internalResistance' | 'externalResistance'
  >
) {
  const current =
    params.emf /
    Math.max(0.001, params.internalResistance + params.externalResistance);
  const terminalVoltage = current * params.externalResistance;
  const internalDrop = current * params.internalResistance;
  const totalPower = params.emf * current;
  const outputPower = terminalVoltage * current;
  const maxOutputPower =
    (params.emf * params.emf) / (4 * params.internalResistance);
  return {
    current,
    terminalVoltage,
    internalDrop,
    totalPower,
    outputPower,
    maxOutputPower,
    maxPowerResistance: params.internalResistance,
    shortCircuitCurrent: params.emf / params.internalResistance,
    powerRatio: outputPower / Math.max(0.001, maxOutputPower)
  };
}

export function createClosedCircuitSim(
  initial: Partial<ClosedCircuitParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): ClosedCircuitState {
    return { params: { ...params }, time, ...closedCircuitMeasures(params) };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): ClosedCircuitParams => ({ ...params }),
    setParams(next: Partial<ClosedCircuitParams>): ClosedCircuitParams {
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
