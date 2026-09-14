import { clamp } from '../../core/math';

export type ElectrostaticInductionMode =
  | 'separate'
  | 'grounding'
  | 'equilibrium';
export type RodPolarity = 'positive' | 'negative';
export type InductionAction = 'approach' | 'separate' | 'moveRod';
export type ElectrostaticInductionParams = {
  mode: ElectrostaticInductionMode;
  rodPolarity: RodPolarity;
  showCharges: boolean;
  autoRun: boolean;
};
export type ElectrostaticInductionState = ElectrostaticInductionParams & {
  time: number;
  phase: 'neutral' | 'induced' | 'separated' | 'grounded';
  rodDistance: number;
  chargeA: number;
  chargeB: number;
  internalField: number;
  potential: number;
  electronShift: number;
  status: string;
};

export const electrostaticInductionConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  rodNearX: 190,
  rodFarX: 42,
  rodWidth: 180,
  rodHeight: 54,
  sphereAX: 560,
  sphereBX: 760,
  sphereY: 390,
  sphereRadius: 92,
  trackY: 626,
  standTop: 482,
  standBottom: 616,
  modeMin: 0,
  modeMax: 2,
  rodPolarityMin: 0,
  rodPolarityMax: 1,
  chargePoints: 12,
  particleRadius: 7,
  chargeSpread: 68,
  gridStep: 48,
  titleX: 36,
  titleY: 34,
  cardX: 36,
  cardY: 76,
  cardWidth: 1128,
  cardHeight: 100,
  cardAccentHeight: 52,
  bottomY: 680,
  bottomX: 36,
  bottomWidth: 1128,
  bottomHeight: 52,
  groundWireRightOffset: 120,
  groundToothStartOffset: 110,
  groundToothEndOffset: 120,
  groundLabelOffset: 90,
  railLeftX: 90,
  railRightX: 1060,
  textSize: 16
} as const;

const C = electrostaticInductionConstants;
const PARTICLE_POINTS = [
  { x: -0.72, y: -0.48 },
  { x: -0.42, y: -0.68 },
  { x: -0.12, y: -0.54 },
  { x: 0.2, y: -0.72 },
  { x: 0.55, y: -0.48 },
  { x: -0.72, y: -0.08 },
  { x: -0.36, y: -0.22 },
  { x: 0, y: -0.08 },
  { x: 0.36, y: -0.22 },
  { x: 0.72, y: -0.08 },
  { x: -0.54, y: 0.32 },
  { x: -0.14, y: 0.48 },
  { x: 0.24, y: 0.34 },
  { x: 0.62, y: 0.48 },
  { x: -0.32, y: 0.72 },
  { x: 0.12, y: 0.68 },
  { x: 0.52, y: 0.72 }
] as const;
const DEFAULTS: ElectrostaticInductionParams = {
  mode: 'separate',
  rodPolarity: 'positive',
  showCharges: true,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function flag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
}
function normalize(
  input: Partial<ElectrostaticInductionParams>,
  previous = DEFAULTS
): ElectrostaticInductionParams {
  return {
    mode:
      input.mode === 'grounding' ||
      input.mode === 'equilibrium' ||
      input.mode === 'separate'
        ? input.mode
        : previous.mode,
    rodPolarity:
      input.rodPolarity === 'negative' || input.rodPolarity === 'positive'
        ? input.rodPolarity
        : previous.rodPolarity,
    showCharges: flag(input.showCharges, previous.showCharges),
    autoRun: flag(input.autoRun, previous.autoRun)
  };
}

function derive(
  params: ElectrostaticInductionParams,
  time: number,
  phase: ElectrostaticInductionState['phase'],
  rodDistance: number
): ElectrostaticInductionState {
  const induced = phase !== 'neutral';
  const polarity = params.rodPolarity === 'positive' ? 1 : -1;
  const separated = phase === 'separated' || phase === 'grounded';
  const chargeA = separated ? -polarity : 0;
  const chargeB =
    params.mode === 'grounding' && phase === 'grounded'
      ? 0
      : separated
        ? polarity
        : 0;
  const electronShift = induced
    ? polarity * (phase === 'grounded' ? 0.82 : 0.62)
    : 0;
  const internalField =
    phase === 'neutral'
      ? 1
      : phase === 'grounded' || params.mode === 'equilibrium'
        ? 0
        : 0.18;
  const potential =
    phase === 'neutral' ? 0 : params.mode === 'equilibrium' ? 100 : 92;
  const status =
    phase === 'neutral'
      ? '导体接触·整体中性'
      : phase === 'induced'
        ? '电子重排·静电感应'
        : phase === 'grounded'
          ? '接地·电子转移'
          : '分离完成·保留电荷';
  return {
    ...params,
    time: Math.max(0, finite(time, 0)),
    phase,
    rodDistance,
    chargeA,
    chargeB,
    internalField,
    potential,
    electronShift,
    status
  };
}

export function electrostaticInductionAt(
  params: Partial<ElectrostaticInductionParams> = {},
  time = 0,
  phase: ElectrostaticInductionState['phase'] = 'neutral',
  rodDistance = C.rodNearX
): ElectrostaticInductionState {
  return derive(normalize(params), time, phase, rodDistance);
}

export function createElectrostaticInductionSim(
  initial: Partial<ElectrostaticInductionParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  let phase: ElectrostaticInductionState['phase'] = 'neutral';
  let rodDistance: number = C.rodNearX;
  return {
    getState: (): ElectrostaticInductionState =>
      derive(params, time, phase, rodDistance),
    getSnapshot: (): ElectrostaticInductionState =>
      derive(params, time, phase, rodDistance),
    getParams: (): ElectrostaticInductionParams => ({ ...params }),
    setParams(
      next: Partial<ElectrostaticInductionParams>
    ): ElectrostaticInductionParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun && phase !== 'neutral')
        time += clamp(finite(dt, 0), 0, 0.1);
    },
    act(action: InductionAction): void {
      if (action === 'approach') {
        phase = 'induced';
        rodDistance = C.rodNearX;
      } else if (action === 'separate') {
        phase = params.mode === 'grounding' ? 'grounded' : 'separated';
        rodDistance = C.rodNearX;
      } else {
        phase = phase === 'neutral' ? 'neutral' : phase;
        rodDistance = C.rodFarX;
      }
      time = 0;
    },
    reset(): void {
      params = { ...DEFAULTS };
      phase = 'neutral';
      rodDistance = C.rodNearX;
      time = 0;
    }
  };
}

export { PARTICLE_POINTS };
