import { clamp } from '../../core/math';

export type MechanicalEnergyEnvironment = 'ideal' | 'resist';

export type MechanicalEnergyParams = {
  environment: MechanicalEnergyEnvironment;
  resistance: number;
  mass: number;
  gravity: number;
  pointPeriod: number;
  autoRun: boolean;
};

export type MechanicalEnergyPoint = {
  label: string;
  time: number;
  height: number;
  speed: number;
  potentialLoss: number;
  kineticGain: number;
};

export type MechanicalEnergyState = {
  params: MechanicalEnergyParams;
  released: boolean;
  time: number;
  acceleration: number;
  points: MechanicalEnergyPoint[];
  tapeDots: number[];
  graphPoints: Array<{ height: number; halfV2: number }>;
};

export const mechanicalEnergyConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  apparatusTitleY: 42,
  tapeTopY: 92,
  tapeBottomY: 546,
  tapeX: 310,
  rulerY: 618,
  rulerWidth: 610,
  rulerHeight: 54,
  graphX: 52,
  graphY: 682,
  graphWidth: 676,
  graphHeight: 50,
  graphTop: 696,
  gridStep: 64,
  standX: 414,
  standTop: 64,
  standHeight: 486,
  deviceX: 270,
  deviceY: 116,
  deviceWidth: 118,
  deviceHeight: 54,
  deviceTopX: 286,
  deviceTopY: 101,
  deviceTopWidth: 82,
  wheelX: 318,
  wheelY: 143,
  ropeRedStartX: 360,
  ropeRedStartY: 151,
  ropeRedEndX: 320,
  ropeRedEndY: 516,
  ropeBlackStartX: 382,
  ropeBlackStartY: 151,
  ropeBlackEndX: 344,
  ropeBlackEndY: 516,
  weightBlockWidth: 44,
  weightBlockHeight: 62,
  baseX: 248,
  baseY: 612,
  apparatusBaseWidth: 170,
  footX: 218,
  footY: 632,
  footWidth: 230,
  rulerX: 86,
  rulerLabelX: 490,
  tableColumnOffsets: [18, 76, 148, 226, 304],
  panelRuleY: 72,
  coreCardY: 84,
  coreCardHeight: 112,
  parameterCardY: 208,
  parameterCardHeight: 164,
  actionCardY: 388,
  actionCardHeight: 84,
  tableCardY: 484,
  tableCardHeight: 244,
  rowGap: 26,
  tapeSpacing: 32,
  tapeDotRadius: 4,
  weightRadius: 22,
  defaultResistance: 0.06,
  defaultMass: 1,
  defaultGravity: 9.8,
  defaultPointPeriod: 0.04,
  resistanceMin: 0,
  resistanceMax: 0.25,
  massMin: 0.5,
  massMax: 2,
  gravityMin: 8,
  gravityMax: 12,
  pointPeriodMin: 0.02,
  pointPeriodMax: 0.1,
  sampleCount: 5,
  sampleTimes: 0.04,
  animationDuration: 0.28
} as const;

const DEFAULTS: MechanicalEnergyParams = {
  environment: 'resist',
  resistance: mechanicalEnergyConstants.defaultResistance,
  mass: mechanicalEnergyConstants.defaultMass,
  gravity: mechanicalEnergyConstants.defaultGravity,
  pointPeriod: mechanicalEnergyConstants.defaultPointPeriod,
  autoRun: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<MechanicalEnergyParams>,
  previous = DEFAULTS
): MechanicalEnergyParams {
  return {
    environment: input.environment === 'ideal' ? 'ideal' : 'resist',
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      mechanicalEnergyConstants.resistanceMin,
      mechanicalEnergyConstants.resistanceMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      mechanicalEnergyConstants.massMin,
      mechanicalEnergyConstants.massMax
    ),
    gravity: clamp(
      finite(input.gravity, previous.gravity),
      mechanicalEnergyConstants.gravityMin,
      mechanicalEnergyConstants.gravityMax
    ),
    pointPeriod: clamp(
      finite(input.pointPeriod, previous.pointPeriod),
      mechanicalEnergyConstants.pointPeriodMin,
      mechanicalEnergyConstants.pointPeriodMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function effectiveAcceleration(params: MechanicalEnergyParams): number {
  return (
    params.gravity *
    (params.environment === 'ideal' ? 1 : 1 - params.resistance)
  );
}

export function mechanicalEnergyPoint(
  params: MechanicalEnergyParams,
  index: number
): MechanicalEnergyPoint {
  const time = Math.max(0, index) * params.pointPeriod;
  const acceleration = effectiveAcceleration(params);
  const height = 0.5 * acceleration * time * time;
  const speed = acceleration * time;
  const potentialLoss = params.mass * params.gravity * height;
  const kineticGain = 0.5 * params.mass * speed * speed;
  const labels = ['A', 'B', 'C', 'D', 'E'];
  return {
    label: labels[Math.min(labels.length - 1, Math.max(0, index - 1))],
    time,
    height,
    speed,
    potentialLoss,
    kineticGain
  };
}

export function createMechanicalEnergySim(
  initial: Partial<MechanicalEnergyParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let released = true;
  let time = 0;
  function getState(): MechanicalEnergyState {
    const elapsed = Math.min(mechanicalEnergyConstants.animationDuration, time);
    const points = Array.from(
      { length: mechanicalEnergyConstants.sampleCount },
      (_, index) => mechanicalEnergyPoint(params, index + 1)
    );
    const acceleration = effectiveAcceleration(params);
    const tapeDots = Array.from(
      { length: 14 },
      (_, index) => index * params.pointPeriod * 0.5
    );
    const graphPoints = points.map((point) => ({
      height: point.height,
      halfV2: 0.5 * point.speed * point.speed
    }));
    return {
      params: { ...params },
      released,
      time: elapsed,
      acceleration,
      points,
      tapeDots,
      graphPoints
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): MechanicalEnergyParams => ({ ...params }),
    setParams(next: Partial<MechanicalEnergyParams>): MechanicalEnergyParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun || !released) return;
      time += Math.max(0, finite(dt, 0));
      if (time > mechanicalEnergyConstants.animationDuration) time = 0;
    },
    release(): void {
      released = true;
      time = 0;
    },
    reset(): void {
      params = { ...defaults };
      released = true;
      time = 0;
    }
  };
}
