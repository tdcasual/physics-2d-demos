import { clamp } from '../../core/math';

export type SelectorCharge = 'positive' | 'negative';

export type VelocitySelectorParams = {
  electricField: number;
  magneticField: number;
  initialSpeed: number;
  plateGap: number;
  charge: SelectorCharge;
  autoRun: boolean;
  showField: boolean;
  showVectors: boolean;
};

export type VelocitySelectorState = {
  params: VelocitySelectorParams;
  time: number;
  progress: number;
  balanceSpeed: number;
  electricForce: number;
  magneticForce: number;
  netForce: number;
  acceleration: number;
  deflection: number;
  status: '速度匹配' | '速度过大' | '速度过小';
  trajectory: Array<{ x: number; y: number }>;
  particlePosition: { x: number; y: number };
};

export const velocitySelectorConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 820,
  panelX: 820,
  panelWidth: 460,
  channelLeft: 142,
  channelRight: 748,
  topPlateY: 164,
  bottomPlateY: 348,
  axisY: 256,
  panelRuleY: 86,
  fieldTop: 102,
  fieldBottom: 408,
  graphTop: 458,
  graphHeight: 142,
  defaultElectricField: 1,
  defaultMagneticField: 1,
  defaultInitialSpeed: 1,
  defaultPlateGap: 1,
  electricFieldMin: 0.4,
  electricFieldMax: 2,
  magneticFieldMin: 0.4,
  magneticFieldMax: 2,
  initialSpeedMin: 0.2,
  initialSpeedMax: 2,
  plateGapMin: 0.8,
  plateGapMax: 1.6,
  timeScale: 1.6,
  deflectionScale: 150,
  cardRadius: 12
} as const;

const DEFAULTS: VelocitySelectorParams = {
  electricField: velocitySelectorConstants.defaultElectricField,
  magneticField: velocitySelectorConstants.defaultMagneticField,
  initialSpeed: velocitySelectorConstants.defaultInitialSpeed,
  plateGap: velocitySelectorConstants.defaultPlateGap,
  charge: 'positive',
  autoRun: true,
  showField: true,
  showVectors: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<VelocitySelectorParams>,
  previous = DEFAULTS
): VelocitySelectorParams {
  return {
    electricField: clamp(
      finite(input.electricField, previous.electricField),
      velocitySelectorConstants.electricFieldMin,
      velocitySelectorConstants.electricFieldMax
    ),
    magneticField: clamp(
      finite(input.magneticField, previous.magneticField),
      velocitySelectorConstants.magneticFieldMin,
      velocitySelectorConstants.magneticFieldMax
    ),
    initialSpeed: clamp(
      finite(input.initialSpeed, previous.initialSpeed),
      velocitySelectorConstants.initialSpeedMin,
      velocitySelectorConstants.initialSpeedMax
    ),
    plateGap: clamp(
      finite(input.plateGap, previous.plateGap),
      velocitySelectorConstants.plateGapMin,
      velocitySelectorConstants.plateGapMax
    ),
    charge: input.charge === 'negative' ? 'negative' : previous.charge,
    autoRun: input.autoRun ?? previous.autoRun,
    showField: input.showField ?? previous.showField,
    showVectors: input.showVectors ?? previous.showVectors
  };
}

export function calculateVelocitySelector(
  params: Pick<
    VelocitySelectorParams,
    'electricField' | 'magneticField' | 'initialSpeed' | 'plateGap' | 'charge'
  >
) {
  const balanceSpeed = params.electricField / params.magneticField;
  const electricForce = params.electricField;
  const magneticForce = params.initialSpeed * params.magneticField;
  const signedDirection = params.charge === 'positive' ? 1 : -1;
  const netForce = signedDirection * (electricForce - magneticForce);
  const acceleration = netForce / Math.max(0.1, params.plateGap);
  const status =
    Math.abs(params.initialSpeed - balanceSpeed) < 0.06
      ? ('速度匹配' as const)
      : params.initialSpeed > balanceSpeed
        ? ('速度过大' as const)
        : ('速度过小' as const);
  return {
    balanceSpeed,
    electricForce: signedDirection * electricForce,
    magneticForce: -signedDirection * magneticForce,
    netForce,
    acceleration,
    status
  };
}

export function velocitySelectorSample(
  params: Pick<
    VelocitySelectorParams,
    'electricField' | 'magneticField' | 'initialSpeed' | 'plateGap' | 'charge'
  >,
  progress: number
) {
  const normalizedProgress = clamp(finite(progress, 0), 0, 1);
  const result = calculateVelocitySelector(params);
  const deflection =
    0.5 *
    result.acceleration *
    (normalizedProgress * velocitySelectorConstants.timeScale) ** 2;
  return {
    ...result,
    progress: normalizedProgress,
    deflection
  };
}

function buildTrajectory(
  params: VelocitySelectorParams
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index <= 80; index += 1) {
    const progress = index / 80;
    const sample = velocitySelectorSample(params, progress);
    points.push({ x: progress, y: sample.deflection });
  }
  return points;
}

export function createVelocitySelectorSim(
  initial: Partial<VelocitySelectorParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): VelocitySelectorState {
    const cycle = 1;
    const progress = time % cycle;
    const sample = velocitySelectorSample(params, progress);
    const x =
      velocitySelectorConstants.channelLeft +
      progress *
        (velocitySelectorConstants.channelRight -
          velocitySelectorConstants.channelLeft);
    const y =
      velocitySelectorConstants.axisY -
      sample.deflection * velocitySelectorConstants.deflectionScale;
    return {
      params: { ...params },
      time,
      ...sample,
      trajectory: buildTrajectory(params),
      particlePosition: {
        x,
        y: clamp(
          y,
          velocitySelectorConstants.fieldTop + 18,
          velocitySelectorConstants.fieldBottom - 18
        )
      }
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): VelocitySelectorParams => ({ ...params }),
    setParams(next: Partial<VelocitySelectorParams>): VelocitySelectorParams {
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
