import { clamp } from '../../core/math';

export type ClosedPowerParams = {
  emf: number;
  internalResistance: number;
  externalResistance: number;
  autoRun: boolean;
  showPowerArea: boolean;
};

export type ClosedPowerState = {
  params: ClosedPowerParams;
  time: number;
  current: number;
  terminalVoltage: number;
  internalDrop: number;
  totalPower: number;
  internalPower: number;
  outputPower: number;
  maxOutputPower: number;
  efficiency: number;
  powerRatio: number;
  matched: boolean;
  status: '最大输出' | '非最大输出';
};

export const closedPowerConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  circuitLeft: 54,
  circuitRight: 700,
  circuitTop: 116,
  circuitBottom: 250,
  sourceX: 120,
  meterX: 310,
  resistorX: 500,
  powerSummaryX: 188,
  powerSummaryY: 174,
  powerSummaryWidth: 328,
  powerSummaryHeight: 100,
  graphLeft: 72,
  graphTop: 340,
  graphWidth: 630,
  graphHeight: 302,
  graphMaxResistance: 20,
  titleY: 38,
  panelRuleY: 70,
  metricsCardY: 86,
  metricsCardHeight: 266,
  formulaCardY: 370,
  formulaCardHeight: 214,
  defaultEmf: 8,
  defaultInternalResistance: 3,
  defaultExternalResistance: 20,
  emfMin: 2,
  emfMax: 16,
  internalResistanceMin: 1,
  internalResistanceMax: 8,
  externalResistanceMin: 0,
  externalResistanceMax: 20,
  cardRadius: 12
} as const;

const DEFAULTS: ClosedPowerParams = {
  emf: closedPowerConstants.defaultEmf,
  internalResistance: closedPowerConstants.defaultInternalResistance,
  externalResistance: closedPowerConstants.defaultExternalResistance,
  autoRun: true,
  showPowerArea: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<ClosedPowerParams>,
  previous = DEFAULTS
): ClosedPowerParams {
  return {
    emf: clamp(
      finite(input.emf, previous.emf),
      closedPowerConstants.emfMin,
      closedPowerConstants.emfMax
    ),
    internalResistance: clamp(
      finite(input.internalResistance, previous.internalResistance),
      closedPowerConstants.internalResistanceMin,
      closedPowerConstants.internalResistanceMax
    ),
    externalResistance: clamp(
      finite(input.externalResistance, previous.externalResistance),
      closedPowerConstants.externalResistanceMin,
      closedPowerConstants.externalResistanceMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showPowerArea: input.showPowerArea ?? previous.showPowerArea
  };
}

export function closedPowerMeasures(
  params: Pick<
    ClosedPowerParams,
    'emf' | 'internalResistance' | 'externalResistance'
  >
) {
  const totalResistance = params.internalResistance + params.externalResistance;
  const current = params.emf / Math.max(0.001, totalResistance);
  const terminalVoltage = current * params.externalResistance;
  const internalDrop = current * params.internalResistance;
  const totalPower = params.emf * current;
  const internalPower = current * current * params.internalResistance;
  const outputPower = terminalVoltage * current;
  const maxOutputPower = params.emf ** 2 / (4 * params.internalResistance);
  const efficiency = outputPower / Math.max(0.001, totalPower);
  const powerRatio = outputPower / Math.max(0.001, maxOutputPower);
  const matched =
    Math.abs(params.externalResistance - params.internalResistance) < 0.05;
  return {
    current,
    terminalVoltage,
    internalDrop,
    totalPower,
    internalPower,
    outputPower,
    maxOutputPower,
    efficiency,
    powerRatio,
    matched,
    status: matched ? ('最大输出' as const) : ('非最大输出' as const)
  };
}

export function createClosedPowerSim(initial: Partial<ClosedPowerParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): ClosedPowerState {
    return { params: { ...params }, time, ...closedPowerMeasures(params) };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): ClosedPowerParams => ({ ...params }),
    setParams(next: Partial<ClosedPowerParams>): ClosedPowerParams {
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
