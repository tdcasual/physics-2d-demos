import { clamp } from '../../core/math';

export type AmpereFieldDirection =
  | 'up'
  | 'down'
  | 'right'
  | 'left'
  | 'normalUp'
  | 'normalDown';
export type AmpereCurrentDirection = 'out' | 'in';

export type AmpereBalanceParams = {
  inclineAngle: number;
  magneticField: number;
  current: number;
  mass: number;
  fieldDirection: AmpereFieldDirection;
  currentDirection: AmpereCurrentDirection;
  autoRun: boolean;
};

export type AmpereVector = { x: number; y: number };

export type AmpereBalanceState = {
  params: AmpereBalanceParams;
  time: number;
  blockOffset: number;
  ampereForce: number;
  weight: number;
  normalForce: number;
  frictionRequired: number;
  slopeNet: number;
  acceleration: number;
  detached: boolean;
  trend: '上滑趋势' | '下滑趋势' | '近似平衡';
  fieldVector: AmpereVector;
  ampereVector: AmpereVector;
  weightVector: AmpereVector;
  normalVector: AmpereVector;
  frictionVector: AmpereVector;
};

const GRAVITY = 10;
const ROD_LENGTH = 1;
const DEG = Math.PI / 180;

export const ampereBalanceConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelWidth: 382,
  panelX: 786,
  panelInset: 22,
  titleY: 42,
  ruleX: 54,
  ruleY: 70,
  ruleWidth: 510,
  ruleHeight: 68,
  fieldTop: 168,
  fieldBottom: 610,
  fieldArrowStartX: 112,
  fieldArrowEndX: 706,
  fieldArrowStartY: 194,
  fieldArrowEndY: 578,
  fieldColumnGap: 118,
  fieldRowGap: 96,
  gridStep: 64,
  planeTopX: 100,
  planeTopY: 300,
  planeEndX: 700,
  planeEndY: 646,
  planeBaseY: 646,
  blockT: 0.57,
  blockRadius: 24,
  vectorScale: 34,
  forceVectorCap: 166,
  weightVectorCap: 148,
  panelCardX: 808,
  panelCardWidth: 338,
  headerRuleY: 74,
  fieldCardY: 92,
  fieldCardHeight: 154,
  presetCardY: 258,
  presetCardHeight: 104,
  paramCardY: 374,
  paramCardHeight: 222,
  readoutCardY: 608,
  readoutCardHeight: 136,
  readoutRowGap: 26,
  axisDashLength: 74,
  axisLabelDistance: 88,
  angleMarkerOffset: 92,
  groundExtension: 54,
  defaultInclineAngle: 30,
  defaultMagneticField: 1,
  defaultCurrent: 4.6,
  defaultMass: 0.8,
  inclineAngleMin: 10,
  inclineAngleMax: 55,
  magneticFieldMin: 0,
  magneticFieldMax: 3,
  currentMin: 0,
  currentMax: 8,
  massMin: 0.2,
  massMax: 3,
  animationPeriod: 4.5
} as const;

const DEFAULTS: AmpereBalanceParams = {
  inclineAngle: ampereBalanceConstants.defaultInclineAngle,
  magneticField: ampereBalanceConstants.defaultMagneticField,
  current: ampereBalanceConstants.defaultCurrent,
  mass: ampereBalanceConstants.defaultMass,
  fieldDirection: 'down',
  currentDirection: 'out',
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function fieldDirection(value: unknown): AmpereFieldDirection {
  return value === 'up' ||
    value === 'right' ||
    value === 'left' ||
    value === 'normalUp' ||
    value === 'normalDown'
    ? value
    : 'down';
}

function currentDirection(value: unknown): AmpereCurrentDirection {
  return value === 'in' ? 'in' : 'out';
}

function normalize(
  input: Partial<AmpereBalanceParams>,
  previous = DEFAULTS
): AmpereBalanceParams {
  return {
    inclineAngle: clamp(
      finite(input.inclineAngle, previous.inclineAngle),
      ampereBalanceConstants.inclineAngleMin,
      ampereBalanceConstants.inclineAngleMax
    ),
    magneticField: clamp(
      finite(input.magneticField, previous.magneticField),
      ampereBalanceConstants.magneticFieldMin,
      ampereBalanceConstants.magneticFieldMax
    ),
    current: clamp(
      finite(input.current, previous.current),
      ampereBalanceConstants.currentMin,
      ampereBalanceConstants.currentMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      ampereBalanceConstants.massMin,
      ampereBalanceConstants.massMax
    ),
    fieldDirection: fieldDirection(
      input.fieldDirection ?? previous.fieldDirection
    ),
    currentDirection: currentDirection(
      input.currentDirection ?? previous.currentDirection
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

function directionVector(
  direction: AmpereFieldDirection,
  angle: number
): AmpereVector {
  const theta = angle * DEG;
  if (direction === 'up') return { x: 0, y: -1 };
  if (direction === 'right') return { x: 1, y: 0 };
  if (direction === 'left') return { x: -1, y: 0 };
  if (direction === 'normalUp')
    return { x: Math.sin(theta), y: -Math.cos(theta) };
  if (direction === 'normalDown')
    return { x: -Math.sin(theta), y: Math.cos(theta) };
  return { x: 0, y: 1 };
}

function unit(vector: AmpereVector): AmpereVector {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 1e-9) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

function dot(a: AmpereVector, b: AmpereVector): number {
  return a.x * b.x + a.y * b.y;
}

export function ampereForceMagnitude(params: AmpereBalanceParams): number {
  return params.magneticField * params.current * ROD_LENGTH;
}

export function ampereBalanceValues(params: AmpereBalanceParams) {
  const theta = params.inclineAngle * DEG;
  const fieldVector = directionVector(
    params.fieldDirection,
    params.inclineAngle
  );
  const currentSign = params.currentDirection === 'out' ? 1 : -1;
  const ampereDirection = unit({
    x: fieldVector.y * currentSign,
    y: -fieldVector.x * currentSign
  });
  const ampereForce = ampereForceMagnitude(params);
  const ampereVector = {
    x: ampereDirection.x * ampereForce,
    y: ampereDirection.y * ampereForce
  };
  const weight = params.mass * GRAVITY;
  const weightVector = { x: 0, y: weight };
  const slope = { x: Math.cos(theta), y: Math.sin(theta) };
  const normal = { x: Math.sin(theta), y: -Math.cos(theta) };
  const external = {
    x: weightVector.x + ampereVector.x,
    y: weightVector.y + ampereVector.y
  };
  const rawNormal = -dot(external, normal);
  const normalForce = Math.max(0, rawNormal);
  const slopeNet = dot(external, slope);
  const frictionRequired = Math.abs(slopeNet);
  const acceleration = slopeNet / Math.max(params.mass, 0.01);
  const detached = rawNormal < -0.02;
  const trend: AmpereBalanceState['trend'] =
    Math.abs(slopeNet) < 0.08
      ? '近似平衡'
      : slopeNet > 0
        ? '下滑趋势'
        : '上滑趋势';
  const frictionDirection = slopeNet >= 0 ? -1 : 1;
  return {
    fieldVector,
    ampereVector,
    ampereForce,
    weight,
    weightVector,
    normalForce,
    frictionRequired,
    slopeNet,
    acceleration,
    detached,
    trend,
    normalVector: { x: normal.x * normalForce, y: normal.y * normalForce },
    frictionVector: {
      x: slope.x * frictionRequired * frictionDirection,
      y: slope.y * frictionRequired * frictionDirection
    }
  };
}

export function createAmpereBalanceSim(
  initial: Partial<AmpereBalanceParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): AmpereBalanceState {
    const values = ampereBalanceValues(params);
    const blockOffset = params.autoRun
      ? Math.sin(
          (time / ampereBalanceConstants.animationPeriod) * Math.PI * 2
        ) * 0.14
      : 0;
    return { params: { ...params }, time, blockOffset, ...values };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): AmpereBalanceParams => ({ ...params }),
    setParams(next: Partial<AmpereBalanceParams>): AmpereBalanceParams {
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
