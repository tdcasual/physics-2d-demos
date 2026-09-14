import { clamp } from '../../core/math';

export type GalileoInclineParams = {
  theta2: number;
  mu: number;
  autoRun: boolean;
  showVectors: boolean;
};
export type GalileoInclineState = GalileoInclineParams & {
  time: number;
  released: boolean;
  segment: 'left' | 'right' | 'limit' | 'rest';
  progress: number;
  position: number;
  velocity: number;
  acceleration: number;
  height: number;
  potentialEnergy: number;
  kineticEnergy: number;
  totalEnergy: number;
  maxHeight: number;
  normalForce: number;
  frictionForce: number;
  ballX: number;
  ballY: number;
  rightTopY: number;
  g: number;
  mass: number;
};

export const galileoInclineConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 780,
  panelX: 796,
  panelWidth: 404,
  theta1: 45,
  thetaMin: 0,
  thetaMax: 60,
  defaultTheta2: 36,
  muMin: 0,
  muMax: 0.4,
  defaultMu: 0,
  gridStep: 58,
  gridTop: 66,
  g: 10,
  mass: 1,
  startHeight: 1,
  bottomX: 390,
  bottomY: 634,
  leftStartX: 100,
  leftStartY: 278,
  rightRun: 330,
  rightTopMinY: 250,
  rightTopMaxY: 634,
  ballRadius: 18,
  energyX: 48,
  energyY: 56,
  energyWidth: 330,
  energyHeight: 166,
  panelInset: 24,
  panelTitleY: 40,
  panelRuleY: 72,
  panelStatusY: 94,
  panelStatusHeight: 56,
  panelReadoutY: 168,
  panelReadoutHeight: 206,
  panelFormulaY: 392,
  panelFormulaHeight: 202,
  panelHintY: 618,
  panelHintHeight: 92,
  axisLength: 92
} as const;

const DEFAULTS: GalileoInclineParams = {
  theta2: galileoInclineConstants.defaultTheta2,
  mu: galileoInclineConstants.defaultMu,
  autoRun: true,
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
  input: Partial<GalileoInclineParams>,
  previous = DEFAULTS
): GalileoInclineParams {
  return {
    theta2: clamp(
      finite(input.theta2, previous.theta2),
      galileoInclineConstants.thetaMin,
      galileoInclineConstants.thetaMax
    ),
    mu: clamp(
      finite(input.mu, previous.mu),
      galileoInclineConstants.muMin,
      galileoInclineConstants.muMax
    ),
    autoRun: asFlag(input.autoRun, previous.autoRun),
    showVectors: asFlag(input.showVectors, previous.showVectors)
  };
}
function rightTopY(theta2: number): number {
  const rise =
    galileoInclineConstants.rightRun * Math.tan((theta2 * Math.PI) / 180) * 0.9;
  return clamp(
    galileoInclineConstants.bottomY - rise,
    galileoInclineConstants.rightTopMinY,
    galileoInclineConstants.rightTopMaxY
  );
}

function derive(
  params: GalileoInclineParams,
  time: number,
  released: boolean,
  position: number,
  velocity: number
): GalileoInclineState {
  const C = galileoInclineConstants;
  const theta2Rad = (params.theta2 * Math.PI) / 180;
  const leftLength = C.startHeight / Math.sin((C.theta1 * Math.PI) / 180);
  const rightLength =
    params.theta2 < 0.5 ? 6 : C.startHeight / Math.sin(theta2Rad);
  const maxHeightIdeal = C.startHeight;
  const totalEnergy = C.mass * C.g * C.startHeight;
  const positionClamped = clamp(position, 0, leftLength + rightLength);
  const onLeft = positionClamped <= leftLength;
  const leftDistance = Math.min(positionClamped, leftLength);
  const rightDistance = Math.max(0, positionClamped - leftLength);
  const height = onLeft
    ? C.startHeight - leftDistance * Math.sin((C.theta1 * Math.PI) / 180)
    : rightDistance * Math.sin(theta2Rad);
  const potentialEnergy = C.mass * C.g * Math.max(0, height);
  const frictionWork =
    params.mu *
    C.mass *
    C.g *
    (Math.cos((C.theta1 * Math.PI) / 180) * leftDistance +
      Math.cos(theta2Rad) * rightDistance);
  const kineticEnergy = Math.max(
    0,
    totalEnergy - potentialEnergy - frictionWork
  );
  const v = Math.max(0, velocity);
  const acceleration = onLeft
    ? C.g *
      (Math.sin((C.theta1 * Math.PI) / 180) -
        params.mu * Math.cos((C.theta1 * Math.PI) / 180))
    : -C.g * (Math.sin(theta2Rad) + params.mu * Math.cos(theta2Rad));
  const normalForce = onLeft
    ? C.mass * C.g * Math.cos((C.theta1 * Math.PI) / 180)
    : C.mass * C.g * Math.cos(theta2Rad);
  const frictionForce = params.mu * normalForce;
  const idealLimit =
    params.mu === 0 &&
    params.theta2 < 0.5 &&
    released &&
    positionClamped >= leftLength;
  let segment: GalileoInclineState['segment'] = idealLimit
    ? 'limit'
    : onLeft
      ? 'left'
      : released && v > 0.01
        ? 'right'
        : 'rest';
  if (!released) segment = 'rest';
  const leftProgress = clamp(leftDistance / leftLength, 0, 1);
  const rightProgress = clamp(
    rightDistance / Math.max(rightLength, 0.01),
    0,
    1
  );
  const progress = onLeft ? leftProgress : rightProgress;
  const rightTop = rightTopY(params.theta2);
  const ballX = onLeft
    ? C.leftStartX + (C.bottomX - C.leftStartX) * leftProgress
    : C.bottomX + C.rightRun * rightProgress;
  const ballY = onLeft
    ? C.leftStartY + (C.bottomY - C.leftStartY) * leftProgress
    : C.bottomY + (rightTop - C.bottomY) * rightProgress;
  return {
    ...params,
    time,
    released,
    segment,
    progress,
    position: positionClamped,
    velocity: v,
    acceleration,
    height,
    potentialEnergy,
    kineticEnergy: Math.max(0, kineticEnergy),
    totalEnergy,
    maxHeight: maxHeightIdeal,
    normalForce,
    frictionForce,
    ballX,
    ballY,
    rightTopY: rightTop,
    g: C.g,
    mass: C.mass
  };
}

export function galileoInclineAt(
  params: GalileoInclineParams,
  time = 0
): GalileoInclineState {
  return derive(normalize(params), Math.max(0, finite(time, 0)), false, 0, 0);
}

export function createGalileoInclineSim(
  initial: Partial<GalileoInclineParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  let released = false;
  let position = 0;
  let velocity = 0;
  return {
    getState: (): GalileoInclineState =>
      derive(params, time, released, position, velocity),
    getSnapshot: (): GalileoInclineState =>
      derive(params, time, released, position, velocity),
    getParams: (): GalileoInclineParams => ({ ...params }),
    setParams(next: Partial<GalileoInclineParams>): GalileoInclineParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    release(): void {
      released = true;
    },
    step(dt: number): void {
      if (!params.autoRun || !released) return;
      const delta = clamp(finite(dt, 0), 0, 0.05);
      const state = derive(params, time, released, position, velocity);
      const leftLength = C_LEFT_LENGTH;
      const theta2Rad = (params.theta2 * Math.PI) / 180;
      const rightLength =
        params.theta2 < 0.5
          ? 6
          : galileoInclineConstants.startHeight / Math.sin(theta2Rad);
      const acceleration =
        state.position < leftLength
          ? state.acceleration
          : -galileoInclineConstants.g *
            (Math.sin(theta2Rad) + params.mu * Math.cos(theta2Rad));
      velocity = Math.max(0, velocity + acceleration * delta);
      position += velocity * delta;
      if (position >= leftLength + rightLength && params.theta2 >= 0.5) {
        position = leftLength + rightLength;
        velocity = 0;
      }
      if (
        state.position < leftLength &&
        position >= leftLength &&
        velocity <= 0.01
      ) {
        position = leftLength;
        velocity = 0;
      }
      time += delta;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      released = false;
      position = 0;
      velocity = 0;
    }
  };
}

const C_LEFT_LENGTH =
  galileoInclineConstants.startHeight /
  Math.sin((galileoInclineConstants.theta1 * Math.PI) / 180);
