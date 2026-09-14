import { clamp } from '../../core/math';

export type PendulumEnergyParams = {
  amplitude: number;
  length: number;
  gravity: number;
  mass: number;
  airDrag: boolean;
  autoRun: boolean;
};

export type PendulumEnergyState = PendulumEnergyParams & {
  time: number;
  period: number;
  angleRad: number;
  height: number;
  speed: number;
  velocity: number;
  potentialEnergy: number;
  kineticEnergy: number;
  mechanicalEnergy: number;
  initialEnergy: number;
};

export const pendulumEnergyConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  panelX: 830,
  panelWidth: 370,
  amplitudeMin: 5,
  amplitudeMax: 60,
  lengthMin: 0.5,
  lengthMax: 4,
  gravityMin: 1,
  gravityMax: 12,
  massMin: 0.05,
  massMax: 0.3,
  defaultAmplitude: 45,
  defaultLength: 2.5,
  defaultGravity: 9.8,
  defaultMass: 0.1,
  pivotX: 410,
  pivotY: 88,
  lengthScale: 150,
  bobRadius: 24,
  arcRadius: 300,
  // Canvas angles are measured clockwise from the +x axis; this spans the
  // lower swing envelope from the left release side through the bottom to
  // the right release side.
  arcStart: 0.52,
  arcEnd: 2.62,
  gridStep: 64,
  panelTitleX: 30,
  panelTitleY: 42,
  panelRuleY: 72,
  panelStatusY: 94,
  panelStatusHeight: 112,
  panelEnergyY: 222,
  panelEnergyHeight: 190,
  panelFormulaY: 432,
  panelFormulaHeight: 132,
  panelFormulaTitleY: 458,
  panelHintY: 592,
  panelHintHeight: 86,
  barX: 54,
  barWidth: 264,
  barHeight: 14,
  barOneY: 294,
  barTwoY: 344,
  barThreeY: 394,
  maxTime: 24,
  dragDecayRate: 0.08,
  sampleDt: 0.016,
  arrowScale: 72,
  speedLabelOffsetX: 34,
  speedLabelOffsetY: -34,
  energyLabelX: 30,
  energyValueX: 338,
  panelInset: 28,
  formulaTextX: 50,
  formulaLineOneY: 482,
  formulaLineTwoY: 514,
  formulaLineThreeY: 546,
  statusTextY: 128,
  statusValueY: 166,
  hintTextY: 620,
  hintSubTextY: 650
} as const;

const DEFAULTS: PendulumEnergyParams = {
  amplitude: pendulumEnergyConstants.defaultAmplitude,
  length: pendulumEnergyConstants.defaultLength,
  gravity: pendulumEnergyConstants.defaultGravity,
  mass: pendulumEnergyConstants.defaultMass,
  airDrag: false,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asFlag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  return fallback;
}

function normalize(
  input: Partial<PendulumEnergyParams>,
  previous = DEFAULTS
): PendulumEnergyParams {
  return {
    amplitude: clamp(
      finite(input.amplitude, previous.amplitude),
      pendulumEnergyConstants.amplitudeMin,
      pendulumEnergyConstants.amplitudeMax
    ),
    length: clamp(
      finite(input.length, previous.length),
      pendulumEnergyConstants.lengthMin,
      pendulumEnergyConstants.lengthMax
    ),
    gravity: clamp(
      finite(input.gravity, previous.gravity),
      pendulumEnergyConstants.gravityMin,
      pendulumEnergyConstants.gravityMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      pendulumEnergyConstants.massMin,
      pendulumEnergyConstants.massMax
    ),
    airDrag: asFlag(input.airDrag, previous.airDrag),
    autoRun: asFlag(input.autoRun, previous.autoRun)
  };
}

export function pendulumEnergyAt(
  params: PendulumEnergyParams,
  time: number
): PendulumEnergyState {
  const period = 2 * Math.PI * Math.sqrt(params.length / params.gravity);
  const omega = (2 * Math.PI) / period;
  const amplitudeRad = (params.amplitude * Math.PI) / 180;
  const angleRad = amplitudeRad * Math.cos(omega * time);
  const height = params.length * (1 - Math.cos(angleRad));
  const initialEnergy =
    params.mass * params.gravity * params.length * (1 - Math.cos(amplitudeRad));
  const mechanicalEnergy =
    initialEnergy *
    (params.airDrag
      ? Math.exp(-pendulumEnergyConstants.dragDecayRate * time)
      : 1);
  const potentialEnergy = params.mass * params.gravity * height;
  const kineticEnergy = Math.max(0, mechanicalEnergy - potentialEnergy);
  const velocity =
    -params.length * amplitudeRad * omega * Math.sin(omega * time);
  return {
    ...params,
    time,
    period,
    angleRad,
    height,
    speed: Math.sqrt(Math.max(0, (2 * kineticEnergy) / params.mass)),
    velocity,
    potentialEnergy,
    kineticEnergy,
    mechanicalEnergy,
    initialEnergy
  };
}

export function createPendulumEnergySim(
  initial: Partial<PendulumEnergyParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): PendulumEnergyState => pendulumEnergyAt(params, time),
    getSnapshot: (): PendulumEnergyState => pendulumEnergyAt(params, time),
    getParams: (): PendulumEnergyParams => ({ ...params }),
    setParams(next: Partial<PendulumEnergyParams>): PendulumEnergyParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time =
        (time + Math.max(0, finite(dt, 0))) % pendulumEnergyConstants.maxTime;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
