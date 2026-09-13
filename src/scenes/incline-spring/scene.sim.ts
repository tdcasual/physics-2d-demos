import { clamp } from '../../core/math';

export type InclineMode = 'smooth' | 'resist' | 'stuck';
export type InclineSpringParams = {
  mode: InclineMode;
  friction: number;
  stiffness: number;
  mass: number;
  position: number;
  autoRun: boolean;
};
export type InclineSpringState = InclineSpringParams & {
  time: number;
  velocity: number;
  acceleration: number;
  springForce: number;
  gravityAlong: number;
  normalForce: number;
  height: number;
  springEnergy: number;
  gravitationalEnergy: number;
  kineticEnergy: number;
  frictionHeat: number;
  totalEnergy: number;
  status: string;
};

export const inclineSpringConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  fieldTop: 58,
  fieldBottom: 650,
  slopeLeft: 120,
  slopeTop: 180,
  slopeRight: 760,
  slopeBottom: 550,
  slopeThickness: 70,
  slopeLength: 3,
  angle: Math.PI / 6,
  gravity: 9.8,
  anchorPosition: 2.92,
  blockSize: 54,
  springTurns: 9,
  springAmplitude: 18,
  positionMin: 0.55,
  positionMax: 2.55,
  frictionMin: 0,
  frictionMax: 0.6,
  stiffnessMin: 40,
  stiffnessMax: 220,
  massMin: 0.5,
  massMax: 4,
  defaultFriction: 0.2,
  defaultStiffness: 120,
  defaultMass: 2,
  animationPeriod: 12,
  energyTrackLeft: 150,
  energyTrackRight: 724,
  energyTrackWidth: 574,
  energyCardY: 590,
  energyCardHeight: 150,
  energyRowY: 650,
  energyRowGap: 20,
  energyLabelX: 52,
  energyValueX: 760
} as const;

const DEFAULTS: InclineSpringParams = {
  mode: 'resist',
  friction: inclineSpringConstants.defaultFriction,
  stiffness: inclineSpringConstants.defaultStiffness,
  mass: inclineSpringConstants.defaultMass,
  position: 1.8,
  autoRun: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<InclineSpringParams>,
  previous = DEFAULTS
): InclineSpringParams {
  const mode =
    input.mode === 'smooth' || input.mode === 'stuck' || input.mode === 'resist'
      ? input.mode
      : previous.mode;
  return {
    mode,
    friction: clamp(
      finite(input.friction, previous.friction),
      inclineSpringConstants.frictionMin,
      inclineSpringConstants.frictionMax
    ),
    stiffness: clamp(
      finite(input.stiffness, previous.stiffness),
      inclineSpringConstants.stiffnessMin,
      inclineSpringConstants.stiffnessMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      inclineSpringConstants.massMin,
      inclineSpringConstants.massMax
    ),
    position: clamp(
      finite(input.position, previous.position),
      inclineSpringConstants.positionMin,
      inclineSpringConstants.positionMax
    ),
    autoRun:
      typeof input.autoRun === 'boolean' ? input.autoRun : previous.autoRun
  };
}
function derive(
  params: InclineSpringParams,
  time: number,
  velocity: number,
  heat: number
): InclineSpringState {
  const c = inclineSpringConstants;
  const springExtension = Math.max(0, c.anchorPosition - params.position);
  const springForce = params.stiffness * springExtension;
  const gravityAlong = params.mass * c.gravity * Math.sin(c.angle);
  const normalForce = params.mass * c.gravity * Math.cos(c.angle);
  const frictionForce =
    params.mode === 'smooth'
      ? 0
      : params.mode === 'stuck'
        ? Math.min(gravityAlong, params.friction * normalForce)
        : params.friction * normalForce;
  const direction = Math.abs(velocity) < 0.005 ? 1 : Math.sign(velocity);
  const acceleration =
    (gravityAlong - springForce - frictionForce * direction) / params.mass;
  const height =
    Math.max(0, c.slopeLength - params.position) * Math.sin(c.angle);
  const gravitationalEnergy = params.mass * c.gravity * height;
  const springEnergy = 0.5 * params.stiffness * springExtension ** 2;
  const kineticEnergy = 0.5 * params.mass * velocity ** 2;
  return {
    ...params,
    time,
    velocity,
    acceleration,
    springForce,
    gravityAlong,
    normalForce,
    height,
    springEnergy,
    gravitationalEnergy,
    kineticEnergy,
    frictionHeat: heat,
    totalEnergy: gravitationalEnergy + springEnergy + kineticEnergy + heat,
    status:
      params.mode === 'smooth'
        ? '光滑斜面：机械能守恒'
        : params.mode === 'stuck'
          ? '极限状态：滑块将要下滑'
          : '阻尼滑动：摩擦生热'
  };
}

export function createInclineSpringSim(
  initial: Partial<InclineSpringParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  let velocity = 0.45;
  let heat = 0;
  return {
    getState: (): InclineSpringState => derive(params, time, velocity, heat),
    getSnapshot: (): InclineSpringState => derive(params, time, velocity, heat),
    getParams: (): InclineSpringParams => ({ ...params }),
    setParams(next: Partial<InclineSpringParams>): InclineSpringParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      velocity = 0.45;
      heat = 0;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const safeDt = clamp(finite(dt, 0), 0, 0.05);
      const before = derive(params, time, velocity, heat);
      const friction =
        params.mode === 'smooth' ? 0 : params.friction * before.normalForce;
      const sign =
        Math.abs(velocity) < 0.005
          ? Math.sign(before.gravityAlong - before.springForce) || 1
          : Math.sign(velocity);
      const acceleration =
        (before.gravityAlong - before.springForce - friction * sign) /
        params.mass;
      const nextVelocity = clamp(velocity + acceleration * safeDt, -4, 4);
      params.position = clamp(
        params.position + (velocity + nextVelocity) * 0.5 * safeDt,
        inclineSpringConstants.positionMin,
        inclineSpringConstants.positionMax
      );
      velocity = nextVelocity * (params.mode === 'stuck' ? 0.98 : 1);
      heat += friction * Math.abs(velocity) * safeDt;
      time = (time + safeDt) % inclineSpringConstants.animationPeriod;
    }
  };
}
