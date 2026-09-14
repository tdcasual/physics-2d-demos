import { clamp } from '../../core/math';

export type SemicylinderStandardParams = {
  refractiveIndex: number;
  incidentAngle: number;
  showNormal: boolean;
  autoRun: boolean;
};
export type SemicylinderStandardStatus = '折射透出' | '临界角' | '全反射';
export type SemicylinderStandardState = SemicylinderStandardParams & {
  time: number;
  criticalAngle: number;
  refractedAngle: number | null;
  reflectedAngle: number | null;
  status: SemicylinderStandardStatus;
  sinRefracted: number;
  pulse: number;
};

export const semicylinderStandardConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  indexMin: 1.1,
  indexMax: 2.42,
  indexStep: 0.01,
  angleMin: 0,
  angleMax: 80,
  angleStep: 0.1,
  defaultIndex: 1.5,
  defaultAngle: 27,
  animationPeriod: 4,
  fieldLeft: 36,
  fieldRight: 756,
  centerX: 390,
  centerY: 414,
  radius: 260,
  interfaceLeft: 130,
  interfaceRight: 650,
  rayLength: 250,
  refractedRayLength: 250,
  panelX: 790,
  panelWidth: 382,
  panelY: 28,
  statusCardHeight: 108,
  formulaCardY: 154,
  formulaCardHeight: 162,
  metricsCardY: 334,
  metricsCardHeight: 190,
  noteCardY: 544,
  noteCardHeight: 146,
  cardRadius: 14,
  gridStep: 48,
  pulseRadius: 8,
  normalLength: 300,
  materialWater: 1.33,
  materialGlass: 1.52,
  materialDiamond: 2.42
} as const;

const C = semicylinderStandardConstants;
const DEFAULTS: SemicylinderStandardParams = {
  refractiveIndex: C.defaultIndex,
  incidentAngle: C.defaultAngle,
  showNormal: true,
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
  input: Partial<SemicylinderStandardParams>,
  previous = DEFAULTS
): SemicylinderStandardParams {
  return {
    refractiveIndex: clamp(
      finite(input.refractiveIndex, previous.refractiveIndex),
      C.indexMin,
      C.indexMax
    ),
    incidentAngle: clamp(
      finite(input.incidentAngle, previous.incidentAngle),
      C.angleMin,
      C.angleMax
    ),
    showNormal: flag(input.showNormal, previous.showNormal),
    autoRun: flag(input.autoRun, previous.autoRun)
  };
}

export function deriveSemicylinderStandard(
  params: SemicylinderStandardParams,
  time = 0
): SemicylinderStandardState {
  const criticalAngle = (Math.asin(1 / params.refractiveIndex) * 180) / Math.PI;
  const theta = (params.incidentAngle * Math.PI) / 180;
  const sinRefracted = params.refractiveIndex * Math.sin(theta);
  const isCritical = Math.abs(sinRefracted - 1) < 0.002;
  const totalInternalReflection = sinRefracted > 1.002;
  const refractedAngle = isCritical
    ? 90
    : sinRefracted <= 1
      ? (Math.asin(clamp(sinRefracted, -1, 1)) * 180) / Math.PI
      : null;
  return {
    ...params,
    time: Math.max(0, finite(time, 0)),
    criticalAngle,
    refractedAngle,
    reflectedAngle:
      totalInternalReflection || isCritical ? params.incidentAngle : null,
    status: totalInternalReflection
      ? '全反射'
      : isCritical
        ? '临界角'
        : '折射透出',
    sinRefracted,
    pulse: params.autoRun
      ? (Math.max(0, finite(time, 0)) % C.animationPeriod) / C.animationPeriod
      : 0
  };
}

export function createSemicylinderStandardSim(
  initial: Partial<SemicylinderStandardParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): SemicylinderStandardState =>
      deriveSemicylinderStandard(params, time),
    getSnapshot: (): SemicylinderStandardState =>
      deriveSemicylinderStandard(params, time),
    getParams: (): SemicylinderStandardParams => ({ ...params }),
    setParams(
      next: Partial<SemicylinderStandardParams>
    ): SemicylinderStandardParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) time += Math.min(Math.max(finite(dt, 0), 0), 0.1);
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
