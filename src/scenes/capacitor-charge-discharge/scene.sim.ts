import { clamp } from '../../core/math';

export type CapacitorParams = {
  mode: 0 | 1 | 2;
  voltage: number;
  resistance: number;
  capacitance: number;
  autoRun: boolean;
  showCurrent: boolean;
};

export type CapacitorState = {
  params: CapacitorParams;
  time: number;
  tau: number;
  voltageAcross: number;
  currentMilliamp: number;
  chargeMicrocoulomb: number;
  progress: number;
  atTauVoltage: number;
};

export const capacitorConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 790,
  panelWidth: 388,
  panelTop: 20,
  panelBottom: 738,
  graphLeft: 70,
  graphRight: 735,
  voltageGraphTop: 466,
  voltageGraphBottom: 590,
  currentGraphTop: 616,
  currentGraphBottom: 726,
  minVoltage: 3,
  maxVoltage: 9,
  minResistance: 10,
  maxResistance: 30,
  minCapacitance: 100,
  maxCapacitance: 300,
  defaultVoltage: 6,
  defaultResistance: 20,
  defaultCapacitance: 200,
  maxTauCount: 5,
  layout: {
    batteryX: 74,
    batteryY: 224,
    resistorX: 422,
    componentY: 136,
    capacitorX: 602,
    meterX: 700,
    meterY: 134,
    wireLeft: 346,
    switchX: 370,
    switchOpenX: 407,
    switchClosedX: 394,
    switchY: 119,
    wireBottom: 346,
    batteryBottom: 275,
    meterBottom: 166,
    meterTop: 102,
    labelChargeX: 112,
    labelChargeY: 102,
    labelOpenY: 151,
    labelDischargeY: 190,
    voltageLabelY: 322,
    currentLabelX: 350,
    gridTop: 30,
    gridBottom: 390,
    circuitX: 18,
    circuitY: 22,
    circuitHeight: 376,
    circuitRadius: 18,
    graphCardY: 416,
    graphCardHeight: 330,
    graphCardRadius: 16,
    fontBold: 700,
    resistorHalf: 48,
    resistorLead: 76,
    resistorBodyWidth: 96,
    resistorBodyHeight: 36,
    capacitorLead: 77,
    capacitorPlateHalf: 42,
    capacitorPlateGap: 29,
    panelRadius: 18,
    panelTitleX: 30,
    panelTitleY: 43,
    panelRuleY: 73,
    panelCardX: 28,
    panelCardInset: 56,
    panelStatusCardX: 28,
    panelReadoutHeight: 116,
    panelFormulaY: 306,
    panelFormulaHeight: 122,
    panelTauCardHeight: 48,
    panelStatusY: 462,
    panelStatusHeight: 62,
    graphCardX: 18,
    panelTitleRight: 28,
    currentHintY: 76,
    panelReadoutY: 95,
    panelReadoutTextX: 50,
    panelReadoutTitleY: 122,
    panelVoltageY: 157,
    panelCurrentY: 186,
    panelChargeY: 215,
    panelTauCardY: 228,
    panelTauTextY: 252,
    panelFormulaTextX: 50,
    panelFormulaTextY: 336,
    panelFormulaY2: 374,
    panelFormulaY3: 399,
    panelStatusTextY: 493
  },
  sampleDt: 0.016
} as const;

const DEFAULT_PARAMS: CapacitorParams = {
  mode: 1,
  voltage: capacitorConstants.defaultVoltage,
  resistance: capacitorConstants.defaultResistance,
  capacitance: capacitorConstants.defaultCapacitance,
  autoRun: true,
  showCurrent: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return fallback;
}

function modeValue(value: unknown, fallback: 0 | 1 | 2): 0 | 1 | 2 {
  const n = Number(value);
  return n === 0 || n === 1 || n === 2 ? n : fallback;
}

function normalize(
  input: Partial<CapacitorParams>,
  previous = DEFAULT_PARAMS
): CapacitorParams {
  return {
    mode: modeValue(input.mode, previous.mode),
    voltage: clamp(
      finite(input.voltage, previous.voltage),
      capacitorConstants.minVoltage,
      capacitorConstants.maxVoltage
    ),
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      capacitorConstants.minResistance,
      capacitorConstants.maxResistance
    ),
    capacitance: clamp(
      finite(input.capacitance, previous.capacitance),
      capacitorConstants.minCapacitance,
      capacitorConstants.maxCapacitance
    ),
    autoRun: asBoolean(input.autoRun, previous.autoRun),
    showCurrent: asBoolean(input.showCurrent, previous.showCurrent)
  };
}

export function capacitorTau(
  resistanceKiloohm: number,
  capacitanceMicrofarad: number
): number {
  return Math.max(
    0,
    (finite(resistanceKiloohm, 0) * finite(capacitanceMicrofarad, 0)) / 1000
  );
}

export function capacitorAt(
  mode: 0 | 1 | 2,
  voltage: number,
  resistance: number,
  capacitance: number,
  time: number
): Pick<
  CapacitorState,
  | 'voltageAcross'
  | 'currentMilliamp'
  | 'chargeMicrocoulomb'
  | 'tau'
  | 'progress'
  | 'atTauVoltage'
> {
  const e = Math.max(0, finite(voltage, 0));
  const r = Math.max(0.001, finite(resistance, 1));
  const c = Math.max(0, finite(capacitance, 0));
  const tau = capacitorTau(r, c);
  const t = Math.max(0, finite(time, 0));
  const progress =
    tau > 0 ? clamp(t / tau, 0, capacitorConstants.maxTauCount) : 0;
  const exponential = tau > 0 ? Math.exp(-t / tau) : 0;
  const initialMilliamp = e / r;
  const voltageAcross =
    mode === 1 ? e * (1 - exponential) : mode === 2 ? e * exponential : 0;
  const currentMilliamp =
    mode === 1
      ? initialMilliamp * exponential
      : mode === 2
        ? -initialMilliamp * exponential
        : 0;
  return {
    tau,
    progress,
    voltageAcross,
    currentMilliamp,
    chargeMicrocoulomb: c * voltageAcross,
    atTauVoltage: e * (1 - Math.exp(-1))
  };
}

export function createCapacitorSim(initial: Partial<CapacitorParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): CapacitorState {
    return {
      params: { ...params },
      time,
      ...capacitorAt(
        params.mode,
        params.voltage,
        params.resistance,
        params.capacitance,
        time
      )
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): CapacitorParams => ({ ...params }),
    setParams(next: Partial<CapacitorParams>): CapacitorParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun || params.mode === 0) return;
      const maxTime =
        capacitorTau(params.resistance, params.capacitance) *
        capacitorConstants.maxTauCount;
      time = Math.min(maxTime, time + Math.max(0, finite(dt, 0)));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
