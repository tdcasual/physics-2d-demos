import { clamp } from '../../core/math';
export type RingPendulumParams = {
  ringMass: number;
  ballMass: number;
  length: number;
  angle: number;
  showForces: boolean;
  showTrail: boolean;
  autoRun: boolean;
};
export type RingPendulumState = RingPendulumParams & {
  theta: number;
  ringPosition: number;
  ringVelocity: number;
  ballVelocity: number;
  horizontalMomentum: number;
  ringKinetic: number;
  ballKinetic: number;
  potential: number;
  totalEnergy: number;
  time: number;
};
export const ringPendulumConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 820,
  panelX: 820,
  panelWidth: 460,
  ringMassMin: 0.5,
  ringMassMax: 5,
  ballMassMin: 0.2,
  ballMassMax: 3,
  lengthMin: 0.8,
  lengthMax: 2.5,
  angleMin: 0.15,
  angleMax: 1.4,
  gravity: 9.8,
  cardRadius: 12
} as const;
const DEFAULTS: RingPendulumParams = {
  ringMass: 2,
  ballMass: 1,
  length: 1.5,
  angle: 0.84,
  showForces: true,
  showTrail: true,
  autoRun: true
};
function finite(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function normalize(
  input: Partial<RingPendulumParams>,
  previous = DEFAULTS
): RingPendulumParams {
  return {
    ringMass: clamp(
      finite(input.ringMass, previous.ringMass),
      ringPendulumConstants.ringMassMin,
      ringPendulumConstants.ringMassMax
    ),
    ballMass: clamp(
      finite(input.ballMass, previous.ballMass),
      ringPendulumConstants.ballMassMin,
      ringPendulumConstants.ballMassMax
    ),
    length: clamp(
      finite(input.length, previous.length),
      ringPendulumConstants.lengthMin,
      ringPendulumConstants.lengthMax
    ),
    angle: clamp(
      finite(input.angle, previous.angle),
      ringPendulumConstants.angleMin,
      ringPendulumConstants.angleMax
    ),
    showForces: input.showForces ?? previous.showForces,
    showTrail: input.showTrail ?? previous.showTrail,
    autoRun: input.autoRun ?? previous.autoRun
  };
}
export function calculateRingPendulum(
  params: RingPendulumParams,
  time: number
): RingPendulumState {
  const theta = params.autoRun
    ? Math.max(0.06, params.angle * Math.cos(time * 0.9))
    : params.angle;
  const potential =
    params.ballMass *
    ringPendulumConstants.gravity *
    params.length *
    (1 - Math.cos(theta));
  const initialPotential =
    params.ballMass *
    ringPendulumConstants.gravity *
    params.length *
    (1 - Math.cos(params.angle));
  const kineticTotal = Math.max(0, initialPotential - potential);
  const coupling =
    (params.ballMass ** 2 * Math.cos(theta) ** 2) / params.ringMass;
  const ballVelocity = Math.sqrt(
    (2 * kineticTotal) / Math.max(params.ballMass + coupling, 0.01)
  );
  const ringVelocity =
    -((params.ballMass * Math.cos(theta)) / params.ringMass) * ballVelocity;
  const ballKinetic = 0.5 * params.ballMass * ballVelocity ** 2;
  const ringKinetic = 0.5 * params.ringMass * ringVelocity ** 2;
  const totalEnergy = potential + ballKinetic + ringKinetic;
  return {
    ...params,
    theta,
    ringPosition: -ringVelocity * time,
    ringVelocity,
    ballVelocity,
    horizontalMomentum:
      params.ringMass * ringVelocity +
      params.ballMass * ballVelocity * Math.cos(theta),
    ringKinetic,
    ballKinetic,
    potential,
    totalEnergy,
    time
  };
}
export function createRingPendulumSim(
  initial: Partial<RingPendulumParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): RingPendulumState {
    return calculateRingPendulum(params, time);
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): RingPendulumParams => ({ ...params }),
    setParams(next: Partial<RingPendulumParams>): RingPendulumParams {
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
