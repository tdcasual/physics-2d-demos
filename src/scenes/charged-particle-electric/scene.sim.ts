import { clamp } from '../../core/math';

export type ElectricParticle = 'proton' | 'alpha' | 'electron';

export type ChargedParticleElectricParams = {
  particle: ElectricParticle;
  accelVoltage: number;
  deflectVoltage: number;
  plateGap: number;
  autoRun: boolean;
  showComponents: boolean;
  showReverse: boolean;
};

export type ChargedParticleElectricState = {
  params: ChargedParticleElectricParams;
  time: number;
  v0: number;
  y: number;
  tanTheta: number;
  theta: number;
  screenY: number;
  field: number;
  acceleration: number;
  particleSign: number;
  stage: 'accelerating' | 'deflecting' | 'screen';
  progress: number;
  particlePosition: { x: number; y: number };
};

export const chargedParticleElectricConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 780,
  panelX: 808,
  panelWidth: 368,
  panelInset: 22,
  emitterX: 92,
  axisY: 390,
  accelPlateX: 230,
  accelPlateTop: 232,
  accelPlateBottom: 548,
  accelPlateHeight: 112,
  deflectStartX: 360,
  deflectEndX: 620,
  deflectTopY: 292,
  deflectBottomY: 488,
  screenX: 742,
  fieldTop: 72,
  fieldBottom: 688,
  gridStep: 56,
  particleRadius: 10,
  fieldArrowCount: 8,
  defaultAccelVoltage: 200,
  defaultDeflectVoltage: 60,
  defaultPlateGap: 12,
  accelVoltageMin: 50,
  accelVoltageMax: 500,
  deflectVoltageMin: -100,
  deflectVoltageMax: 100,
  plateGapMin: 6,
  plateGapMax: 20,
  plateLength: 0.28,
  screenDistance: 0.2,
  accelDuration: 0.85,
  deflectDuration: 2.1,
  screenDuration: 0.85,
  maxVisualDeflection: 138,
  reverseExtension: 142,
  titleY: 38,
  panelRuleY: 68,
  formulaCardY: 476,
  formulaCardHeight: 178,
  metricsCardY: 82,
  metricsCardHeight: 330,
  cardRadius: 12
} as const;

type ParticlePhysical = { mass: number; charge: number; label: string };

const PARTICLES: Record<ElectricParticle, ParticlePhysical> = {
  proton: { mass: 1.6726e-27, charge: 1.6022e-19, label: '质子 p (¹H⁺)' },
  alpha: { mass: 6.6447e-27, charge: 3.2044e-19, label: 'α 粒子 (⁴₂He²⁺)' },
  electron: { mass: 9.1094e-31, charge: -1.6022e-19, label: '电子 (e⁻)' }
};

const DEFAULTS: ChargedParticleElectricParams = {
  particle: 'proton',
  accelVoltage: chargedParticleElectricConstants.defaultAccelVoltage,
  deflectVoltage: chargedParticleElectricConstants.defaultDeflectVoltage,
  plateGap: chargedParticleElectricConstants.defaultPlateGap,
  autoRun: true,
  showComponents: true,
  showReverse: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<ChargedParticleElectricParams>,
  previous = DEFAULTS
): ChargedParticleElectricParams {
  return {
    particle:
      input.particle === 'alpha' ||
      input.particle === 'electron' ||
      input.particle === 'proton'
        ? input.particle
        : previous.particle,
    accelVoltage: clamp(
      finite(input.accelVoltage, previous.accelVoltage),
      chargedParticleElectricConstants.accelVoltageMin,
      chargedParticleElectricConstants.accelVoltageMax
    ),
    deflectVoltage: clamp(
      finite(input.deflectVoltage, previous.deflectVoltage),
      chargedParticleElectricConstants.deflectVoltageMin,
      chargedParticleElectricConstants.deflectVoltageMax
    ),
    plateGap: clamp(
      finite(input.plateGap, previous.plateGap),
      chargedParticleElectricConstants.plateGapMin,
      chargedParticleElectricConstants.plateGapMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showComponents: input.showComponents ?? previous.showComponents,
    showReverse: input.showReverse ?? previous.showReverse
  };
}

export function particleLabel(particle: ElectricParticle): string {
  return PARTICLES[particle].label;
}

export function particleSpeed(
  particle: ElectricParticle,
  accelVoltage: number
): number {
  const data = PARTICLES[particle];
  return Math.sqrt(
    (2 * Math.abs(data.charge) * Math.max(0, accelVoltage)) / data.mass
  );
}

export function electricDeflection(
  params: Pick<
    ChargedParticleElectricParams,
    'particle' | 'accelVoltage' | 'deflectVoltage' | 'plateGap'
  >
) {
  const data = PARTICLES[params.particle];
  const v0 = particleSpeed(params.particle, params.accelVoltage);
  const gapMeters = Math.max(0.001, params.plateGap / 100);
  const electricField = Math.abs(params.deflectVoltage) / gapMeters;
  const signedAcceleration =
    (data.charge * params.deflectVoltage) / (data.mass * gapMeters);
  const plateTime =
    chargedParticleElectricConstants.plateLength / Math.max(1, v0);
  const y = 0.5 * signedAcceleration * plateTime * plateTime;
  const vy = signedAcceleration * plateTime;
  const tanTheta = vy / Math.max(1, v0);
  const screenY =
    y + tanTheta * chargedParticleElectricConstants.screenDistance;
  return {
    v0,
    field: electricField,
    acceleration: Math.abs(signedAcceleration),
    y,
    tanTheta,
    theta: Math.atan(tanTheta) * (180 / Math.PI),
    screenY,
    particleSign: Math.sign(data.charge) || 1
  };
}

export function createChargedParticleElectricSim(
  initial: Partial<ChargedParticleElectricParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): ChargedParticleElectricState {
    const result = electricDeflection(params);
    const cycle =
      chargedParticleElectricConstants.accelDuration +
      chargedParticleElectricConstants.deflectDuration +
      chargedParticleElectricConstants.screenDuration;
    const current = time % cycle;
    const accelEnd = chargedParticleElectricConstants.accelDuration;
    const deflectEnd =
      accelEnd + chargedParticleElectricConstants.deflectDuration;
    let stage: ChargedParticleElectricState['stage'] = 'screen';
    let progress = 1;
    let x = chargedParticleElectricConstants.screenX;
    let y = chargedParticleElectricConstants.axisY + result.screenY * 850;
    if (current < accelEnd) {
      stage = 'accelerating';
      progress = current / accelEnd;
      x =
        chargedParticleElectricConstants.emitterX +
        (chargedParticleElectricConstants.deflectStartX -
          chargedParticleElectricConstants.emitterX) *
          progress;
      y = chargedParticleElectricConstants.axisY;
    } else if (current < deflectEnd) {
      stage = 'deflecting';
      progress =
        (current - accelEnd) / chargedParticleElectricConstants.deflectDuration;
      const curve = progress * progress;
      x =
        chargedParticleElectricConstants.deflectStartX +
        (chargedParticleElectricConstants.deflectEndX -
          chargedParticleElectricConstants.deflectStartX) *
          progress;
      y = chargedParticleElectricConstants.axisY + result.y * 850 * curve;
    } else {
      stage = 'screen';
      progress =
        (current - deflectEnd) /
        chargedParticleElectricConstants.screenDuration;
      x =
        chargedParticleElectricConstants.deflectEndX +
        (chargedParticleElectricConstants.screenX -
          chargedParticleElectricConstants.deflectEndX) *
          progress;
      y =
        chargedParticleElectricConstants.axisY +
        result.screenY * 850 * progress;
    }
    return {
      params: { ...params },
      time,
      v0: result.v0,
      y: result.y,
      tanTheta: result.tanTheta,
      theta: result.theta,
      screenY: result.screenY,
      field: result.field,
      acceleration: result.acceleration,
      particleSign: result.particleSign,
      stage,
      progress,
      particlePosition: { x, y }
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): ChargedParticleElectricParams => ({ ...params }),
    setParams(
      next: Partial<ChargedParticleElectricParams>
    ): ChargedParticleElectricParams {
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
