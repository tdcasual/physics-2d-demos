import { clamp } from '../../core/math';

export type FrictionMode = 'single' | 'stacked';
export type FrictionParams = {
  mode: FrictionMode;
  force: number;
  mass: number;
  upperMass: number;
  lowerMass: number;
  muK: number;
  autoRun: boolean;
};
export type FrictionState = FrictionParams & {
  time: number;
  position: number;
  normal: number;
  maxStatic: number;
  kinetic: number;
  friction: number;
  acceleration: number;
  relativeAcceleration: number;
  status: '静止' | '整体滑动' | '上块相对滑动';
};

export const frictionConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  graphLeft: 72,
  graphRight: 716,
  diagramGroundY: 322,
  blockX: 278,
  blockWidth: 160,
  blockHeight: 92,
  upperBlockWidth: 132,
  upperBlockHeight: 68,
  forceArrowY: 264,
  normalArrowX: 358,
  normalArrowLength: 56,
  weightArrowX: 424,
  graphTop: 454,
  graphBottom: 690,
  graphZeroY: 650,
  graphForceMax: 40,
  graphFrictionMax: 28,
  gridStep: 64,
  panelCardY: 30,
  panelCardHeight: 144,
  stateCardY: 194,
  stateCardHeight: 106,
  readoutCardY: 320,
  readoutCardHeight: 184,
  ruleCardY: 526,
  ruleCardHeight: 154,
  forceMin: 0,
  forceMax: 40,
  massMin: 0.5,
  massMax: 5,
  muMin: 0.1,
  muMax: 0.8,
  gravity: 10,
  animationPeriod: 5,
  groundStartX: 62,
  groundEndX: 704,
  animationOffset: 160,
  arrowLengthMax: 160
} as const;
const DEFAULTS: FrictionParams = {
  mode: 'single',
  force: 21.5,
  mass: 2,
  upperMass: 1,
  lowerMass: 2,
  muK: 0.4,
  autoRun: false
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<FrictionParams>,
  prev = DEFAULTS
): FrictionParams {
  return {
    mode:
      input.mode === 'stacked'
        ? 'stacked'
        : input.mode === 'single'
          ? 'single'
          : prev.mode,
    force: clamp(
      finite(input.force, prev.force),
      frictionConstants.forceMin,
      frictionConstants.forceMax
    ),
    mass: clamp(
      finite(input.mass, prev.mass),
      frictionConstants.massMin,
      frictionConstants.massMax
    ),
    upperMass: clamp(
      finite(input.upperMass, prev.upperMass),
      frictionConstants.massMin,
      frictionConstants.massMax
    ),
    lowerMass: clamp(
      finite(input.lowerMass, prev.lowerMass),
      frictionConstants.massMin,
      frictionConstants.massMax
    ),
    muK: clamp(
      finite(input.muK, prev.muK),
      frictionConstants.muMin,
      frictionConstants.muMax
    ),
    autoRun: input.autoRun ?? prev.autoRun
  };
}
export function deriveFriction(
  params: FrictionParams,
  time = 0
): FrictionState {
  const totalMass =
    params.mode === 'stacked'
      ? params.upperMass + params.lowerMass
      : params.mass;
  const normal = totalMass * frictionConstants.gravity;
  const kinetic = params.muK * normal;
  const maxStatic = 1.25 * kinetic;
  const moving = params.force > maxStatic;
  const friction = moving ? kinetic : params.force;
  const acceleration = moving ? (params.force - friction) / totalMass : 0;
  let relativeAcceleration = 0;
  let status: FrictionState['status'] = moving ? '整体滑动' : '静止';
  if (params.mode === 'stacked' && moving) {
    const required = params.upperMass * acceleration;
    const upperLimit =
      params.muK * params.upperMass * frictionConstants.gravity;
    if (required > upperLimit) {
      relativeAcceleration = acceleration - upperLimit / params.upperMass;
      status = '上块相对滑动';
    }
  }
  const position = params.autoRun
    ? 0.35 * Math.sin((time / frictionConstants.animationPeriod) * Math.PI * 2)
    : 0;
  return {
    ...params,
    time,
    position,
    normal,
    maxStatic,
    kinetic,
    friction,
    acceleration,
    relativeAcceleration,
    status
  };
}
export function createFrictionSim(initial: Partial<FrictionParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): FrictionState => deriveFriction(params, time),
    getSnapshot: (): FrictionState => deriveFriction(params, time),
    getParams: (): FrictionParams => ({ ...params }),
    setParams(next: Partial<FrictionParams>) {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number) {
      if (params.autoRun)
        time =
          (time + Math.max(0, finite(dt, 0))) %
          frictionConstants.animationPeriod;
    },
    reset() {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
