import { clamp } from '../../core/math';

export type FieldDirection = 'into' | 'out';

export type ChargedParticleParams = {
  mass: number;
  charge: number;
  velocity: number;
  magneticField: number;
  fieldDirection: FieldDirection;
  autoRun: boolean;
  showVelocity: boolean;
  showForce: boolean;
};

export type ChargedParticleState = {
  params: ChargedParticleParams;
  time: number;
  radius: number;
  period: number;
  forceMagnitude: number;
  radiusPx: number;
  angle: number;
  angularSpeed: number;
  angularSign: number;
  position: { x: number; y: number };
  velocityAngle: number;
  forceAngle: number;
};

export const chargedParticleConstants = {
  baseWidth: 900,
  baseHeight: 640,
  centerX: 450,
  centerY: 320,
  fieldLeft: 48,
  fieldRight: 852,
  fieldTop: 40,
  fieldBottom: 600,
  gridStep: 68,
  fieldMark: 6,
  particleRadius: 14,
  orbitScale: 1.05,
  minRadiusPx: 64,
  maxRadiusPx: 196,
  velocityArrowLength: 56,
  forceArrowLength: 44,
  labelOffset: 18,
  startAngle: 0.72,
  sampleDt: 0.016
} as const;

const MASS_MIN = 1;
const MASS_MAX = 8;
const CHARGE_MIN = -2;
const CHARGE_MAX = 2;
const CHARGE_DEADZONE = 0.05;
const CHARGE_FLOOR = 0.5;
const VELOCITY_MIN = 10;
const VELOCITY_MAX = 80;
const FIELD_MIN = 0.2;
const FIELD_MAX = 4;

const DEFAULTS: ChargedParticleParams = {
  mass: 4,
  charge: 1,
  velocity: 40,
  magneticField: 1,
  fieldDirection: 'into',
  autoRun: true,
  showVelocity: true,
  showForce: true
};

export function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === '1' ||
      normalized === 'true' ||
      normalized === 'on' ||
      normalized === 'yes'
    )
      return true;
    if (
      normalized === '0' ||
      normalized === 'false' ||
      normalized === 'off' ||
      normalized === 'no' ||
      normalized === ''
    )
      return false;
  }
  return fallback;
}

export function asFieldDirection(value: unknown): FieldDirection | undefined {
  if (value === 'into' || value === 'out') return value;
  if (value === 1 || value === '1') return 'out';
  if (value === 0 || value === '0') return 'into';
  if (typeof value === 'number' && Number.isFinite(value))
    return value > 0 ? 'out' : 'into';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === 'into' ||
      normalized === 'in' ||
      normalized === 'x' ||
      normalized === '×'
    )
      return 'into';
    if (
      normalized === 'out' ||
      normalized === 'dot' ||
      normalized === '·' ||
      normalized === '.'
    )
      return 'out';
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed > 0 ? 'out' : 'into';
  }
  return undefined;
}

function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeCharge(value: unknown, fallback: number): number {
  const candidate = clamp(finite(value, fallback), CHARGE_MIN, CHARGE_MAX);
  if (!Number.isFinite(candidate) || Math.abs(candidate) < CHARGE_DEADZONE) {
    return candidate < 0 ? -CHARGE_FLOOR : CHARGE_FLOOR;
  }
  return candidate;
}

function normalize(
  input: Partial<ChargedParticleParams> & Record<string, unknown>,
  previous = DEFAULTS
): ChargedParticleParams {
  return {
    mass: clamp(finite(input.mass, previous.mass), MASS_MIN, MASS_MAX),
    charge: normalizeCharge(input.charge, previous.charge),
    velocity: clamp(
      finite(input.velocity, previous.velocity),
      VELOCITY_MIN,
      VELOCITY_MAX
    ),
    magneticField: clamp(
      finite(input.magneticField, previous.magneticField),
      FIELD_MIN,
      FIELD_MAX
    ),
    fieldDirection:
      asFieldDirection(input.fieldDirection) ?? previous.fieldDirection,
    autoRun:
      input.autoRun === undefined
        ? previous.autoRun
        : asBool(input.autoRun, previous.autoRun),
    showVelocity:
      input.showVelocity === undefined
        ? previous.showVelocity
        : asBool(input.showVelocity, previous.showVelocity),
    showForce:
      input.showForce === undefined
        ? previous.showForce
        : asBool(input.showForce, previous.showForce)
  };
}

function fieldSign(direction: FieldDirection): number {
  return direction === 'out' ? 1 : -1;
}

/** R = mv / (|q|B). Independent derivation: centripetal = Lorentz. */
export function orbitRadius(
  params: Pick<
    ChargedParticleParams,
    'mass' | 'charge' | 'velocity' | 'magneticField'
  >
): number {
  const qB = Math.abs(params.charge) * params.magneticField;
  if (!(qB > 0) || !Number.isFinite(qB)) return 0;
  return (params.mass * params.velocity) / qB;
}

/** T = 2πm / (|q|B). Period does not depend on v. */
export function orbitPeriod(
  params: Pick<ChargedParticleParams, 'mass' | 'charge' | 'magneticField'>
): number {
  const qB = Math.abs(params.charge) * params.magneticField;
  if (!(qB > 0) || !Number.isFinite(qB)) return 0;
  return (2 * Math.PI * params.mass) / qB;
}

/** |F| = |q| v B */
export function lorentzForceMagnitude(
  params: Pick<ChargedParticleParams, 'charge' | 'velocity' | 'magneticField'>
): number {
  return Math.abs(params.charge) * params.velocity * params.magneticField;
}

export function visualOrbitRadius(physicalRadius: number): number {
  return clamp(
    physicalRadius * chargedParticleConstants.orbitScale,
    chargedParticleConstants.minRadiusPx,
    chargedParticleConstants.maxRadiusPx
  );
}

export function orbitFitsDesignFrame(physicalRadius: number): boolean {
  const reach =
    visualOrbitRadius(physicalRadius) +
    chargedParticleConstants.particleRadius +
    chargedParticleConstants.velocityArrowLength +
    chargedParticleConstants.labelOffset;
  const { centerX, centerY, baseWidth, baseHeight } = chargedParticleConstants;
  const inset = 8;
  return (
    centerX - reach >= inset &&
    centerY - reach >= inset &&
    centerX + reach <= baseWidth - inset &&
    centerY + reach <= baseHeight - inset
  );
}

export function createChargedParticleSim(
  initial: Partial<ChargedParticleParams> = {}
) {
  let params = normalize(initial);
  const baseline: ChargedParticleParams = { ...params };
  let time = 0;

  function getState(): ChargedParticleState {
    const radius = orbitRadius(params);
    const period = orbitPeriod(params);
    const radiusPx = visualOrbitRadius(radius);
    const angularSign =
      Math.sign(params.charge) * fieldSign(params.fieldDirection) || -1;
    const angularSpeed =
      (Math.abs(params.charge) * params.magneticField) / params.mass;
    const angle =
      chargedParticleConstants.startAngle + angularSign * angularSpeed * time;
    const position = {
      x: chargedParticleConstants.centerX + radiusPx * Math.cos(angle),
      y: chargedParticleConstants.centerY + radiusPx * Math.sin(angle)
    };
    const velocityAngle = angle + (angularSign * Math.PI) / 2;
    const forceAngle = angle + Math.PI;
    return {
      params: { ...params },
      time,
      radius,
      period,
      forceMagnitude: lorentzForceMagnitude(params),
      radiusPx,
      angle,
      angularSpeed,
      angularSign,
      position,
      velocityAngle,
      forceAngle
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): ChargedParticleParams => ({ ...params }),
    setParams(next: Partial<ChargedParticleParams>): ChargedParticleParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...baseline };
      time = 0;
    }
  };
}
