import { clamp } from '../../core/math';

export type ChargedParticleKind = 'proton' | 'alpha' | 'electron';
export type ChargedSuperpositionParams = {
  particle: ChargedParticleKind;
  accelVoltage: number;
  deflectVoltage: number;
  autoRun: boolean;
  slowMode: boolean;
  showVectors: boolean;
};
export type ChargedSuperpositionState = ChargedSuperpositionParams & {
  time: number;
  progress: number;
  particleMass: number;
  charge: number;
  chargeMassRatio: number;
  exitSpeed: number;
  screenOffsetMm: number;
  screenOffsetPx: number;
  exitAngleDeg: number;
  particleX: number;
  particleY: number;
  reverseLineX: number;
  reverseLineY: number;
  status: '待发射' | '偏转飞行中' | '顺利飞出打屏';
};

export const chargedSuperpositionConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  particleStartX: 72,
  centerY: 342,
  accelStartX: 126,
  accelEndX: 246,
  plateStartX: 326,
  plateEndX: 702,
  screenX: 1100,
  screenTop: 88,
  screenBottom: 614,
  plateTopY: 250,
  plateBottomY: 434,
  plateHeight: 28,
  accelVoltageMin: 50,
  accelVoltageMax: 400,
  defaultAccelVoltage: 200,
  deflectVoltageMin: -60,
  deflectVoltageMax: 60,
  defaultDeflectVoltage: 30,
  electronMass: 9.1093837e-31,
  nucleonMass: 1.6726219e-27,
  elementaryCharge: 1.602176634e-19,
  pathScale: 442,
  pixelsPerMm: 2.1,
  maxDeflectionPx: 140,
  gridStep: 48,
  gridTop: 36,
  particleRadius: 9,
  reverseLineLength: 240,
  fieldArrowStep: 76,
  fieldArrowLength: 46
} as const;

const PARTICLES: Record<
  ChargedParticleKind,
  { mass: number; charge: number; label: string }
> = {
  proton: {
    mass: chargedSuperpositionConstants.nucleonMass,
    charge: chargedSuperpositionConstants.elementaryCharge,
    label: '质子 H⁺'
  },
  alpha: {
    mass: chargedSuperpositionConstants.nucleonMass * 4,
    charge: chargedSuperpositionConstants.elementaryCharge * 2,
    label: 'α粒子 He²⁺'
  },
  electron: {
    mass: chargedSuperpositionConstants.electronMass,
    charge: -chargedSuperpositionConstants.elementaryCharge,
    label: '电子 e⁻'
  }
};

const DEFAULTS: ChargedSuperpositionParams = {
  particle: 'proton',
  accelVoltage: chargedSuperpositionConstants.defaultAccelVoltage,
  deflectVoltage: chargedSuperpositionConstants.defaultDeflectVoltage,
  autoRun: true,
  slowMode: false,
  showVectors: true
};
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
  input: Partial<ChargedSuperpositionParams>,
  previous = DEFAULTS
): ChargedSuperpositionParams {
  return {
    particle:
      input.particle && input.particle in PARTICLES
        ? input.particle
        : previous.particle,
    accelVoltage: clamp(
      finite(input.accelVoltage, previous.accelVoltage),
      chargedSuperpositionConstants.accelVoltageMin,
      chargedSuperpositionConstants.accelVoltageMax
    ),
    deflectVoltage: clamp(
      finite(input.deflectVoltage, previous.deflectVoltage),
      chargedSuperpositionConstants.deflectVoltageMin,
      chargedSuperpositionConstants.deflectVoltageMax
    ),
    autoRun: asFlag(input.autoRun, previous.autoRun),
    slowMode: asFlag(input.slowMode, previous.slowMode),
    showVectors: asFlag(input.showVectors, previous.showVectors)
  };
}

function derive(
  params: ChargedSuperpositionParams,
  time: number,
  progress: number
): ChargedSuperpositionState {
  const C = chargedSuperpositionConstants;
  const particle = PARTICLES[params.particle];
  const exitSpeed = Math.sqrt(
    (2 * Math.abs(particle.charge) * params.accelVoltage) / particle.mass
  );
  const ratio =
    params.accelVoltage > 0 ? params.deflectVoltage / params.accelVoltage : 0;
  const signedScale = particle.charge < 0 ? -1 : 1;
  const screenOffsetPx = clamp(
    signedScale * ratio * C.pathScale,
    -C.maxDeflectionPx,
    C.maxDeflectionPx
  );
  const screenOffsetMm = screenOffsetPx / C.pixelsPerMm;
  const exitAngleDeg =
    Math.atan2(screenOffsetPx, C.screenX - C.plateEndX) * (180 / Math.PI);
  const p = clamp(progress, 0, 1);
  const particleX = C.particleStartX + (C.screenX - C.particleStartX) * p;
  const fieldProgress = clamp(
    (particleX - C.plateStartX) / (C.screenX - C.plateStartX),
    0,
    1
  );
  const particleY = C.centerY + screenOffsetPx * fieldProgress * fieldProgress;
  const reverseLineX = C.plateEndX - C.reverseLineLength * (1 - p);
  const reverseLineY =
    C.centerY +
    screenOffsetPx *
      clamp((reverseLineX - C.plateEndX) / (C.screenX - C.plateEndX), 0, 1);
  const status: ChargedSuperpositionState['status'] =
    p <= 0.001 ? '待发射' : p < 0.98 ? '偏转飞行中' : '顺利飞出打屏';
  return {
    ...params,
    time,
    progress: p,
    particleMass: particle.mass,
    charge: particle.charge,
    chargeMassRatio: particle.charge / particle.mass,
    exitSpeed,
    screenOffsetMm,
    screenOffsetPx,
    exitAngleDeg,
    particleX,
    particleY,
    reverseLineX,
    reverseLineY,
    status
  };
}

export function chargedSuperpositionAt(
  params: ChargedSuperpositionParams,
  time = 0,
  progress = 0
): ChargedSuperpositionState {
  return derive(normalize(params), Math.max(0, finite(time, 0)), progress);
}

export function createChargedSuperpositionSim(
  initial: Partial<ChargedSuperpositionParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  let progress = 0;
  return {
    getState: (): ChargedSuperpositionState => derive(params, time, progress),
    getSnapshot: (): ChargedSuperpositionState =>
      derive(params, time, progress),
    getParams: (): ChargedSuperpositionParams => ({ ...params }),
    setParams(
      next: Partial<ChargedSuperpositionParams>
    ): ChargedSuperpositionParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = clamp(finite(dt, 0), 0, 0.1) * (params.slowMode ? 0.35 : 1);
      time += delta;
      progress = (progress + delta * 0.18) % 1;
    },
    relaunch(): void {
      time = 0;
      progress = 0;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      progress = 0;
    }
  };
}

export function asChargedParticleKind(
  value: unknown
): ChargedParticleKind | null {
  if (value === 0 || value === '0' || value === 'proton') return 'proton';
  if (value === 1 || value === '1' || value === 'alpha') return 'alpha';
  if (value === 2 || value === '2' || value === 'electron') return 'electron';
  return null;
}
export function chargedParticleIndex(value: ChargedParticleKind): number {
  return value === 'proton' ? 0 : value === 'alpha' ? 1 : 2;
}
export const chargedParticleLabels = PARTICLES;
