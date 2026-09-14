import { clamp } from '../../core/math';

export type MassSpectrometerParams = {
  voltage: number;
  fieldStrength: number;
  showProtium: boolean;
  showDeuterium: boolean;
  showTritium: boolean;
  autoRun: boolean;
  showVectors: boolean;
};

export type IsotopeKey = 'protium' | 'deuterium' | 'tritium';
export type MassSpectrometerParticle = {
  key: IsotopeKey;
  label: string;
  massNumber: number;
  color: string;
  speed: number;
  radius: number;
  radiusPx: number;
  progress: number;
  x: number;
  y: number;
  detected: boolean;
};

export type MassSpectrometerState = MassSpectrometerParams & {
  time: number;
  phase: number;
  particles: MassSpectrometerParticle[];
  measuredRadius: number;
  calculatedMass: number;
  separation: number;
  status: 'accelerating' | 'deflecting' | 'detected';
};

export const massSpectrometerConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  panelX: 830,
  panelWidth: 370,
  sourceX: 222,
  sourceY: 72,
  entryX: 240,
  plateLeft: 158,
  plateRight: 322,
  plateTop: 126,
  plateBottom: 300,
  baselineY: 326,
  fieldTop: 350,
  fieldBottom: 760,
  radiusScale: 16000,
  minRadiusPx: 76,
  maxRadiusPx: 268,
  sourcePhaseEnd: 0.22,
  playbackRate: 0.22,
  atomicMassUnit: 1.6605390666e-27,
  elementaryCharge: 1.602176634e-19,
  voltageMin: 10,
  voltageMax: 80,
  fieldMin: 0.04,
  fieldMax: 0.16,
  defaultVoltage: 31,
  defaultField: 0.1,
  detectorScale: 1,
  particleRadius: 8,
  gridStep: 58,
  fieldMarkStep: 60,
  graphTop: 530,
  panelInset: 28,
  panelTitleY: 42,
  panelRuleY: 72,
  panelDataY: 96,
  panelDataHeight: 208,
  panelFormulaY: 324,
  panelFormulaHeight: 166,
  panelHintY: 510,
  panelHintHeight: 112
} as const;

const DEFAULTS: MassSpectrometerParams = {
  voltage: massSpectrometerConstants.defaultVoltage,
  fieldStrength: massSpectrometerConstants.defaultField,
  showProtium: true,
  showDeuterium: true,
  showTritium: true,
  autoRun: true,
  showVectors: true
};

const isotopeInfo: Array<{
  key: IsotopeKey;
  label: string;
  massNumber: number;
  color: string;
  offset: number;
}> = [
  {
    key: 'protium',
    label: '氢 (¹H⁺)',
    massNumber: 1,
    color: '#ef4050',
    offset: 0
  },
  {
    key: 'deuterium',
    label: '氘 (²H⁺)',
    massNumber: 2,
    color: '#16a28d',
    offset: 0.045
  },
  {
    key: 'tritium',
    label: '氚 (³H⁺)',
    massNumber: 3,
    color: '#2585b7',
    offset: 0.09
  }
];

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asFlag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
}

function normalize(
  input: Partial<MassSpectrometerParams>,
  previous = DEFAULTS
): MassSpectrometerParams {
  return {
    voltage: clamp(
      finite(input.voltage, previous.voltage),
      massSpectrometerConstants.voltageMin,
      massSpectrometerConstants.voltageMax
    ),
    fieldStrength: clamp(
      finite(input.fieldStrength, previous.fieldStrength),
      massSpectrometerConstants.fieldMin,
      massSpectrometerConstants.fieldMax
    ),
    showProtium: asFlag(input.showProtium, previous.showProtium),
    showDeuterium: asFlag(input.showDeuterium, previous.showDeuterium),
    showTritium: asFlag(input.showTritium, previous.showTritium),
    autoRun: asFlag(input.autoRun, previous.autoRun),
    showVectors: asFlag(input.showVectors, previous.showVectors)
  };
}

function particleKinematics(
  massNumber: number,
  params: MassSpectrometerParams
): { speed: number; radius: number; radiusPx: number } {
  const mass = massNumber * massSpectrometerConstants.atomicMassUnit;
  const q = massSpectrometerConstants.elementaryCharge;
  const speed = Math.sqrt((2 * q * params.voltage) / mass);
  const radius = (mass * speed) / (q * params.fieldStrength);
  const radiusPx = clamp(
    radius * massSpectrometerConstants.radiusScale,
    massSpectrometerConstants.minRadiusPx,
    massSpectrometerConstants.maxRadiusPx
  );
  return { speed, radius, radiusPx };
}

function pointOnPath(
  progress: number,
  radiusPx: number
): { x: number; y: number } {
  const sourceEnd = massSpectrometerConstants.sourcePhaseEnd;
  if (progress <= sourceEnd) {
    const t = progress / sourceEnd;
    return {
      x: massSpectrometerConstants.entryX,
      y:
        massSpectrometerConstants.sourceY +
        40 +
        t *
          (massSpectrometerConstants.baselineY -
            (massSpectrometerConstants.sourceY + 40))
    };
  }
  const arcT = (progress - sourceEnd) / (1 - sourceEnd);
  const theta = Math.PI - clamp(arcT, 0, 1) * Math.PI;
  return {
    x: massSpectrometerConstants.entryX + radiusPx * (1 + Math.cos(theta)),
    y: massSpectrometerConstants.baselineY + radiusPx * Math.sin(theta)
  };
}

function stateAt(
  params: MassSpectrometerParams,
  time: number,
  phase: number
): MassSpectrometerState {
  const particles = isotopeInfo.map((info) => {
    const kinematics = particleKinematics(info.massNumber, params);
    const progress = (phase + info.offset) % 1;
    const point = pointOnPath(progress, kinematics.radiusPx);
    return {
      key: info.key,
      label: info.label,
      massNumber: info.massNumber,
      color: info.color,
      ...kinematics,
      progress,
      x: point.x,
      y: point.y,
      detected: progress >= 0.985
    };
  });
  const reference = particles[1];
  const measuredRadius = reference.radius;
  const q = massSpectrometerConstants.elementaryCharge;
  const calculatedMassKg =
    (params.fieldStrength ** 2 * measuredRadius ** 2 * q) /
    (2 * params.voltage);
  const calculatedMass =
    calculatedMassKg / massSpectrometerConstants.atomicMassUnit;
  return {
    ...params,
    time,
    phase,
    particles,
    measuredRadius,
    calculatedMass,
    separation: particles[2].radiusPx - particles[0].radiusPx,
    status:
      phase < massSpectrometerConstants.sourcePhaseEnd
        ? 'accelerating'
        : phase > 0.92
          ? 'detected'
          : 'deflecting'
  };
}

export function massSpectrometerAt(
  params: MassSpectrometerParams,
  phase: number,
  time = 0
): MassSpectrometerState {
  const normalizedPhase = ((phase % 1) + 1) % 1;
  return stateAt(
    normalize(params),
    Math.max(0, finite(time, 0)),
    normalizedPhase
  );
}

export function createMassSpectrometerSim(
  initial: Partial<MassSpectrometerParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  let phase = 0;
  return {
    getState: (): MassSpectrometerState => stateAt(params, time, phase),
    getSnapshot: (): MassSpectrometerState => stateAt(params, time, phase),
    getParams: (): MassSpectrometerParams => ({ ...params }),
    setParams(next: Partial<MassSpectrometerParams>): MassSpectrometerParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const duration = clamp(finite(dt, 0), 0, 0.1);
      time += duration;
      phase += duration * massSpectrometerConstants.playbackRate;
      if (phase >= 1) phase -= Math.floor(phase);
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      phase = 0;
    }
  };
}
