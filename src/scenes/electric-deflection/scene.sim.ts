import { clamp } from '../../core/math';

export type DeflectionParticle = 'electron' | 'proton';

export type ElectricDeflectionParams = {
  particle: DeflectionParticle;
  voltage: number;
  plateGap: number;
  initialSpeed: number;
  autoRun: boolean;
  showField: boolean;
  showComponents: boolean;
};

export type ElectricDeflectionState = {
  params: ElectricDeflectionParams;
  time: number;
  field: number;
  acceleration: number;
  transitTime: number;
  deflection: number;
  screenDeflection: number;
  tanTheta: number;
  theta: number;
  particleSign: number;
  safe: boolean;
  status: '安全飞出' | '撞板';
  stage: 'approach' | 'inside' | 'screen';
  progress: number;
  particlePosition: { x: number; y: number };
};

export const electricDeflectionConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 780,
  panelX: 808,
  panelWidth: 368,
  panelInset: 22,
  emitterX: 76,
  axisY: 380,
  plateStartX: 250,
  plateEndX: 610,
  plateTopY: 230,
  plateBottomY: 530,
  defaultGapVisual: 220,
  gapVisualRange: 90,
  screenX: 724,
  fieldTop: 76,
  fieldBottom: 684,
  gridStep: 56,
  particleRadius: 10,
  fieldArrowCount: 8,
  defaultVoltage: 40,
  defaultPlateGap: 30,
  defaultInitialSpeed: 3,
  voltageMin: 0,
  voltageMax: 120,
  plateGapMin: 10,
  plateGapMax: 60,
  speedMin: 1,
  speedMax: 8,
  plateLength: 0.18,
  screenDistance: 0.08,
  approachDuration: 0.8,
  plateDuration: 1.8,
  screenDuration: 0.8,
  visualScale: 1200,
  maxVisualDeflection: 128,
  titleY: 38,
  panelRuleY: 68,
  metricsCardY: 84,
  metricsCardHeight: 280,
  formulaCardY: 382,
  formulaCardHeight: 190,
  cardRadius: 12
} as const;

type ParticlePhysical = { mass: number; charge: number; label: string };

const PARTICLES: Record<DeflectionParticle, ParticlePhysical> = {
  electron: { mass: 9.1094e-31, charge: -1.6022e-19, label: '电子 e⁻' },
  proton: { mass: 1.6726e-27, charge: 1.6022e-19, label: '质子 p⁺' }
};

const DEFAULTS: ElectricDeflectionParams = {
  particle: 'electron',
  voltage: electricDeflectionConstants.defaultVoltage,
  plateGap: electricDeflectionConstants.defaultPlateGap,
  initialSpeed: electricDeflectionConstants.defaultInitialSpeed,
  autoRun: true,
  showField: true,
  showComponents: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<ElectricDeflectionParams>,
  previous = DEFAULTS
): ElectricDeflectionParams {
  return {
    particle:
      input.particle === 'electron' || input.particle === 'proton'
        ? input.particle
        : previous.particle,
    voltage: clamp(
      finite(input.voltage, previous.voltage),
      electricDeflectionConstants.voltageMin,
      electricDeflectionConstants.voltageMax
    ),
    plateGap: clamp(
      finite(input.plateGap, previous.plateGap),
      electricDeflectionConstants.plateGapMin,
      electricDeflectionConstants.plateGapMax
    ),
    initialSpeed: clamp(
      finite(input.initialSpeed, previous.initialSpeed),
      electricDeflectionConstants.speedMin,
      electricDeflectionConstants.speedMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showField: input.showField ?? previous.showField,
    showComponents: input.showComponents ?? previous.showComponents
  };
}

export function particleLabel(particle: DeflectionParticle): string {
  return PARTICLES[particle].label;
}

export function calculateDeflection(
  params: Pick<
    ElectricDeflectionParams,
    'particle' | 'voltage' | 'plateGap' | 'initialSpeed'
  >
) {
  const data = PARTICLES[params.particle];
  const v0 = Math.max(1, params.initialSpeed * 1e6);
  const gapMeters = Math.max(0.001, params.plateGap / 100);
  const field = params.voltage / gapMeters;
  const signedAcceleration = (data.charge * field) / data.mass;
  const transitTime = electricDeflectionConstants.plateLength / v0;
  const deflection = 0.5 * signedAcceleration * transitTime ** 2;
  const tanTheta = (signedAcceleration * transitTime) / v0;
  const screenDeflection =
    deflection + tanTheta * electricDeflectionConstants.screenDistance;
  const safe = Math.abs(deflection) < gapMeters / 2;
  return {
    field,
    acceleration: Math.abs(signedAcceleration),
    transitTime,
    deflection,
    screenDeflection,
    tanTheta,
    theta: Math.atan(tanTheta) * (180 / Math.PI),
    particleSign: Math.sign(data.charge) || 1,
    safe,
    status: safe ? ('安全飞出' as const) : ('撞板' as const)
  };
}

export function createElectricDeflectionSim(
  initial: Partial<ElectricDeflectionParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): ElectricDeflectionState {
    const result = calculateDeflection(params);
    const cycle =
      electricDeflectionConstants.approachDuration +
      electricDeflectionConstants.plateDuration +
      electricDeflectionConstants.screenDuration;
    const approachEnd = electricDeflectionConstants.approachDuration;
    const plateEnd = approachEnd + electricDeflectionConstants.plateDuration;
    const current = time % cycle;
    let stage: ElectricDeflectionState['stage'] = 'screen';
    let progress = 1;
    let x = electricDeflectionConstants.screenX;
    let y =
      electricDeflectionConstants.axisY +
      result.screenDeflection * electricDeflectionConstants.visualScale;
    if (current < approachEnd) {
      stage = 'approach';
      progress = current / approachEnd;
      x =
        electricDeflectionConstants.emitterX +
        (electricDeflectionConstants.plateStartX -
          electricDeflectionConstants.emitterX) *
          progress;
      y = electricDeflectionConstants.axisY;
    } else if (current < plateEnd) {
      stage = 'inside';
      progress =
        (current - approachEnd) / electricDeflectionConstants.plateDuration;
      const curve = progress * progress;
      x =
        electricDeflectionConstants.plateStartX +
        (electricDeflectionConstants.plateEndX -
          electricDeflectionConstants.plateStartX) *
          progress;
      y =
        electricDeflectionConstants.axisY +
        result.deflection * electricDeflectionConstants.visualScale * curve;
    } else {
      stage = 'screen';
      progress =
        (current - plateEnd) / electricDeflectionConstants.screenDuration;
      x =
        electricDeflectionConstants.plateEndX +
        (electricDeflectionConstants.screenX -
          electricDeflectionConstants.plateEndX) *
          progress;
      y =
        electricDeflectionConstants.axisY +
        result.screenDeflection *
          electricDeflectionConstants.visualScale *
          progress;
    }
    return {
      params: { ...params },
      time,
      ...result,
      stage,
      progress,
      particlePosition: {
        x,
        y: clamp(
          y,
          electricDeflectionConstants.fieldTop + 24,
          electricDeflectionConstants.fieldBottom - 24
        )
      }
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): ElectricDeflectionParams => ({ ...params }),
    setParams(
      next: Partial<ElectricDeflectionParams>
    ): ElectricDeflectionParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
