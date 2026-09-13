import { clamp } from '../../core/math';

export type MolecularParams = {
  distanceRatio: number;
  epsilon: number;
  showRepulsive: boolean;
  showAttractive: boolean;
  autoRun: boolean;
};

export type MolecularState = MolecularParams & {
  time: number;
  distanceRatio: number;
  repulsiveForce: number;
  attractiveForce: number;
  netForce: number;
  potentialEnergy: number;
  status: '斥力主导' | '平衡位置' | '引力主导';
  equilibriumRatio: number;
};

export const molecularConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  graphLeft: 78,
  graphRight: 716,
  forceTop: 94,
  forceBottom: 318,
  forceZeroY: 206,
  energyTop: 414,
  energyBottom: 650,
  energyZeroY: 540,
  xMin: 0.55,
  xMax: 3.6,
  forceMin: -3.5,
  forceMax: 6.5,
  energyMin: -1.25,
  energyMax: 5,
  gridStep: 64,
  atomLeftX: 874,
  atomRightX: 1052,
  atomY: 106,
  atomRadius: 34,
  atomCardY: 28,
  atomCardHeight: 162,
  statusCardY: 214,
  statusCardHeight: 78,
  readoutCardY: 308,
  readoutCardHeight: 170,
  labelCardY: 510,
  labelCardHeight: 130,
  distanceMin: 0.55,
  distanceMax: 3.6,
  epsilonMin: 0.5,
  epsilonMax: 2,
  animationPeriod: 3.6,
  thermalAmplitude: 0.16,
  thermalFrequency: 2.4,
  atomForceNearGap: 60,
  atomForceFarGap: 92,
  atomForceHeadGap: 72,
  atomRepelNearGap: 50,
  atomRepelFarGap: 86,
  atomRepelHeadGap: 74,
  atomMeasureLineOffset: 64,
  atomMeasureTickOffset: 57,
  atomMeasureTickEnd: 71,
  atomMeasureLabelOffset: 80,
  legendSecondStart: 190,
  legendSecondEnd: 242,
  legendSecondText: 254,
  legendFirstEnd: 76,
  legendFirstText: 88,
  legendRowOneOffset: 58,
  legendRowTwoOffset: 94
} as const;

const DEFAULTS: MolecularParams = {
  distanceRatio: 1.55,
  epsilon: 1,
  showRepulsive: true,
  showAttractive: true,
  autoRun: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<MolecularParams>,
  previous = DEFAULTS
): MolecularParams {
  return {
    distanceRatio: clamp(
      finite(input.distanceRatio, previous.distanceRatio),
      molecularConstants.distanceMin,
      molecularConstants.distanceMax
    ),
    epsilon: clamp(
      finite(input.epsilon, previous.epsilon),
      molecularConstants.epsilonMin,
      molecularConstants.epsilonMax
    ),
    showRepulsive: input.showRepulsive ?? previous.showRepulsive,
    showAttractive: input.showAttractive ?? previous.showAttractive,
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function molecularForces(
  distanceRatio: number,
  epsilon = 1
): { repulsive: number; attractive: number; net: number; potential: number } {
  const r = Math.max(0.45, distanceRatio);
  const inv6 = 1 / r ** 6;
  const attractive = (-12 * epsilon * inv6) / r;
  const repulsive = (12 * epsilon * inv6 * inv6) / r;
  return {
    repulsive,
    attractive,
    net: repulsive + attractive,
    potential: epsilon * (inv6 * inv6 - 2 * inv6)
  };
}

function derive(params: MolecularParams, time: number): MolecularState {
  const distanceRatio = params.autoRun
    ? clamp(
        params.distanceRatio +
          molecularConstants.thermalAmplitude *
            Math.sin(time * molecularConstants.thermalFrequency),
        molecularConstants.distanceMin,
        molecularConstants.distanceMax
      )
    : params.distanceRatio;
  const values = molecularForces(distanceRatio, params.epsilon);
  const status: MolecularState['status'] =
    Math.abs(values.net) < 0.08
      ? '平衡位置'
      : values.net > 0
        ? '斥力主导'
        : '引力主导';
  return {
    ...params,
    time,
    distanceRatio,
    repulsiveForce: values.repulsive,
    attractiveForce: values.attractive,
    netForce: values.net,
    potentialEnergy: values.potential,
    status,
    equilibriumRatio: 1
  };
}

export function createMolecularSim(initial: Partial<MolecularParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): MolecularState => derive(params, time),
    getSnapshot: (): MolecularState => derive(params, time),
    getParams: (): MolecularParams => ({ ...params }),
    setParams(next: Partial<MolecularParams>): MolecularParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) {
        time =
          (time + Math.max(0, finite(dt, 0))) %
          molecularConstants.animationPeriod;
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
