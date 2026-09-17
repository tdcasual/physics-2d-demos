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
  ampereForce: number;
  weight: number;
  normalForce: number;
  rawNormal: number;
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
  slope: AmpereVector;
  outwardNormal: AmpereVector;
};

const GRAVITY = 10;
const ROD_LENGTH = 1;
const DEG = Math.PI / 180;
const FIELD_IDS: AmpereFieldDirection[] = [
  'up',
  'down',
  'right',
  'left',
  'normalUp',
  'normalDown'
];

export const ampereBalanceConstants = {
  gravity: GRAVITY,
  rodLength: ROD_LENGTH,
  baseWidth: 760,
  baseHeight: 660,
  gridStep: 48,
  planeTopX: 88,
  planeTopY: 118,
  planeEndX: 700,
  planeBaseY: 596,
  blockT: 0.57,
  blockRadius: 22,
  vectorScale: 28,
  contactEps: 5e-3,
  fieldArrowLength: 36,
  fieldColumnGap: 118,
  fieldRowGap: 96,
  fieldPad: 72,
  frictionLift: 14,
  axisDashLength: 64,
  axisLabelDistance: 78,
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
  balanceSlopeEps: 0.08
} as const;

const C = ampereBalanceConstants;

const DEFAULTS: AmpereBalanceParams = {
  inclineAngle: C.defaultInclineAngle,
  magneticField: C.defaultMagneticField,
  current: C.defaultCurrent,
  mass: C.defaultMass,
  fieldDirection: 'down',
  currentDirection: 'out',
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parseFieldDirection(
  value: unknown,
  fallback: AmpereFieldDirection = 'down'
): AmpereFieldDirection {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return FIELD_IDS[value] ?? fallback;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return FIELD_IDS[Number(value)] ?? fallback;
  }
  return FIELD_IDS.includes(value as AmpereFieldDirection)
    ? (value as AmpereFieldDirection)
    : fallback;
}

export function parseCurrentDirection(
  value: unknown,
  fallback: AmpereCurrentDirection = 'out'
): AmpereCurrentDirection {
  if (value === 'in' || value === 1 || value === '1') return 'in';
  if (value === 'out' || value === 0 || value === '0') return 'out';
  return fallback;
}

function normalize(
  input: Partial<AmpereBalanceParams>,
  previous = DEFAULTS
): AmpereBalanceParams {
  return {
    inclineAngle: clamp(
      finite(input.inclineAngle, previous.inclineAngle),
      C.inclineAngleMin,
      C.inclineAngleMax
    ),
    magneticField: clamp(
      finite(input.magneticField, previous.magneticField),
      C.magneticFieldMin,
      C.magneticFieldMax
    ),
    current: clamp(
      finite(input.current, previous.current),
      C.currentMin,
      C.currentMax
    ),
    mass: clamp(finite(input.mass, previous.mass), C.massMin, C.massMax),
    fieldDirection: parseFieldDirection(
      input.fieldDirection,
      previous.fieldDirection
    ),
    currentDirection: parseCurrentDirection(
      input.currentDirection,
      previous.currentDirection
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function unit(vector: AmpereVector): AmpereVector {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 1e-9) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

export function dot(a: AmpereVector, b: AmpereVector): number {
  return a.x * b.x + a.y * b.y;
}

/** Screen-space downslope unit: +x right, +y down, θ from +x toward +y. */
export function slopeUnit(angleDeg: number): AmpereVector {
  const theta = angleDeg * DEG;
  return { x: Math.cos(theta), y: Math.sin(theta) };
}

/** Outward normal (away from the wedge). */
export function outwardNormalUnit(angleDeg: number): AmpereVector {
  const theta = angleDeg * DEG;
  return { x: Math.sin(theta), y: -Math.cos(theta) };
}

export function fieldUnit(
  direction: AmpereFieldDirection,
  angleDeg: number
): AmpereVector {
  if (direction === 'up') return { x: 0, y: -1 };
  if (direction === 'right') return { x: 1, y: 0 };
  if (direction === 'left') return { x: -1, y: 0 };
  if (direction === 'normalUp') return outwardNormalUnit(angleDeg);
  if (direction === 'normalDown') {
    const n = outwardNormalUnit(angleDeg);
    return { x: -n.x, y: -n.y };
  }
  return { x: 0, y: 1 };
}

/**
 * Screen y-down, rod along +z_physics with ⊙ = current out.
 * Physics (y up, z out): F = Iẑ × B = (−Iz By_up, Iz Bx).
 * Screen: By_up = −By, Fy_screen = −Fy_up ⇒ F = (Iz By, −Iz Bx).
 */
export function ampereDirectionScreen(
  field: AmpereVector,
  current: AmpereCurrentDirection
): AmpereVector {
  const iz = current === 'out' ? 1 : -1;
  return unit({ x: iz * field.y, y: -iz * field.x });
}

export function ampereForceMagnitude(params: AmpereBalanceParams): number {
  return params.magneticField * params.current * ROD_LENGTH;
}

export function ampereBalanceValues(params: AmpereBalanceParams) {
  const fieldVector = fieldUnit(params.fieldDirection, params.inclineAngle);
  const ampereDir = ampereDirectionScreen(fieldVector, params.currentDirection);
  const ampereForce = ampereForceMagnitude(params);
  const ampereVector = {
    x: ampereDir.x * ampereForce,
    y: ampereDir.y * ampereForce
  };
  const weight = params.mass * GRAVITY;
  const weightVector = { x: 0, y: weight };
  const slope = slopeUnit(params.inclineAngle);
  const outwardNormal = outwardNormalUnit(params.inclineAngle);
  const external = {
    x: weightVector.x + ampereVector.x,
    y: weightVector.y + ampereVector.y
  };
  const rawNormal = -dot(external, outwardNormal);
  const contact =
    rawNormal > -C.contactEps && rawNormal < C.contactEps ? 0 : rawNormal;
  const normalForce = Math.max(0, contact);
  const slopeNet = dot(external, slope);
  const detached = contact < 0;
  const frictionRequired = normalForce < C.contactEps ? 0 : Math.abs(slopeNet);
  const parallelAccel = slopeNet / Math.max(params.mass, 1e-6);
  const trend: AmpereBalanceState['trend'] =
    Math.abs(slopeNet) < C.balanceSlopeEps
      ? '近似平衡'
      : slopeNet > 0
        ? '下滑趋势'
        : '上滑趋势';
  const frictionSign = slopeNet > 0 ? -1 : 1;
  return {
    fieldVector,
    ampereVector,
    ampereForce,
    weight,
    weightVector,
    rawNormal,
    normalForce,
    frictionRequired,
    slopeNet,
    acceleration: parallelAccel,
    detached,
    trend,
    slope,
    outwardNormal,
    normalVector: {
      x: outwardNormal.x * normalForce,
      y: outwardNormal.y * normalForce
    },
    frictionVector: {
      x: slope.x * frictionRequired * frictionSign,
      y: slope.y * frictionRequired * frictionSign
    }
  };
}

/** B = mg tanθ / (IL) with FA horizontal left (B up, I out). */
export const BALANCE_B =
  (C.defaultMass *
    GRAVITY *
    Math.tan((C.defaultInclineAngle * Math.PI) / 180)) /
  (C.defaultCurrent * ROD_LENGTH);

/** Slider-representable I (0.01 A) so B=1.00 T balances G sinθ. */
export const BALANCE_I = Number(
  (
    (C.defaultMass *
      GRAVITY *
      Math.sin((C.defaultInclineAngle * Math.PI) / 180)) /
    (C.defaultMagneticField *
      Math.cos((C.defaultInclineAngle * Math.PI) / 180) *
      ROD_LENGTH)
  ).toFixed(2)
);

/** FA vertical up cancels mg ⇒ N ≈ 0. B right, I out. */
export const SUPPORT_ZERO_B =
  (C.defaultMass * GRAVITY) / (C.defaultCurrent * ROD_LENGTH);

export const ampereBalancePresets = {
  balance: {
    inclineAngle: 30,
    magneticField: 1,
    current: BALANCE_I,
    mass: 0.8,
    fieldDirection: 'up' as const,
    currentDirection: 'out' as const
  },
  supportZero: {
    inclineAngle: 30,
    magneticField: 1.74,
    current: 4.6,
    mass: 0.8,
    fieldDirection: 'right' as const,
    currentDirection: 'out' as const
  },
  detach: {
    inclineAngle: 30,
    magneticField: 2.4,
    current: 4.6,
    mass: 0.8,
    fieldDirection: 'right' as const,
    currentDirection: 'out' as const
  }
} as const;

export const ampereBalanceUrlKeys = [
  'inclineAngle',
  'magneticField',
  'current',
  'mass',
  'fieldDirection',
  'currentDirection'
] as const;

/** Two-decimal readout without "-0.00". */
export function formatFixed(value: number, digits = 2): string {
  const threshold = 0.5 * 10 ** -digits;
  if (!Number.isFinite(value) || Math.abs(value) < threshold) {
    return (0).toFixed(digits);
  }
  return value.toFixed(digits);
}

export function encodeFieldDirection(direction: AmpereFieldDirection): number {
  const index = FIELD_IDS.indexOf(direction);
  return index < 0 ? 1 : index;
}

export function encodeCurrentDirection(
  direction: AmpereCurrentDirection
): number {
  return direction === 'in' ? 1 : 0;
}

export function ampereBalanceUrlPayload(
  params: AmpereBalanceParams
): Record<string, number | string> {
  return {
    inclineAngle: params.inclineAngle,
    magneticField: params.magneticField,
    current: params.current,
    mass: params.mass,
    fieldDirection: encodeFieldDirection(params.fieldDirection),
    currentDirection: encodeCurrentDirection(params.currentDirection)
  };
}

export function ampereBalanceUrlReset(): Record<string, undefined> {
  return {
    inclineAngle: undefined,
    magneticField: undefined,
    current: undefined,
    mass: undefined,
    fieldDirection: undefined,
    currentDirection: undefined
  };
}

/** URL apply for selectors uses setControlActive with parsed ids, not setControlValue. */
export function applyAmpereBalanceUrlParam(
  key: string,
  value: number | string,
  ctx: {
    scene: { setParams: (partial: Partial<AmpereBalanceParams>) => unknown };
    setControlActive: (key: string, id: string) => void;
    setControlValue: (key: string, value: number | string | boolean) => void;
  }
): boolean {
  if (key === 'fieldDirection') {
    const direction = parseFieldDirection(value);
    ctx.scene.setParams({ fieldDirection: direction });
    ctx.setControlActive(key, direction);
    return true;
  }
  if (key === 'currentDirection') {
    const direction = parseCurrentDirection(value);
    ctx.scene.setParams({ currentDirection: direction });
    ctx.setControlActive(key, direction);
    return true;
  }
  if (key === 'autoRun') {
    ctx.scene.setParams({ autoRun: Number(value) > 0 });
    return true;
  }
  if (
    key === 'inclineAngle' ||
    key === 'magneticField' ||
    key === 'current' ||
    key === 'mass'
  ) {
    const number = Number(value);
    if (!Number.isFinite(number)) return false;
    ctx.scene.setParams({ [key]: number } as Partial<AmpereBalanceParams>);
    ctx.setControlValue(key, number);
    return true;
  }
  return false;
}

export function createAmpereBalanceSim(
  initial: Partial<AmpereBalanceParams> = {}
) {
  const seed = normalize(initial);
  let params = { ...seed };
  let time = 0;
  function getState(): AmpereBalanceState {
    return {
      params: { ...params },
      time,
      ...ampereBalanceValues(params)
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): AmpereBalanceParams => ({ ...params }),
    setParams(next: Partial<AmpereBalanceParams>): AmpereBalanceParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(_dt: number): void {
      /* Static force diagram: no time evolution. */
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
