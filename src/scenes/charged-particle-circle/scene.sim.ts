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
  position: { x: number; y: number };
  velocityAngle: number;
  forceAngle: number;
  status: string;
};

export const chargedParticleConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 850,
  panelWidth: 350,
  panelInset: 22,
  centerX: 408,
  centerY: 405,
  fieldLeft: 36,
  fieldRight: 820,
  fieldTop: 66,
  fieldBottom: 710,
  particleRadius: 16,
  orbitScale: 1.4,
  minRadiusPx: 74,
  maxRadiusPx: 276,
  visualOmegaScale: 0.95,
  gridStep: 60,
  formulaCardY: 470,
  formulaCardHeight: 184,
  panelRuleY: 70,
  footerRuleY: 676,
  sampleDt: 0.016
} as const;

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

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeCharge(value: unknown, fallback: number): number {
  const candidate = clamp(finite(value, fallback), -2, 2);
  if (Math.abs(candidate) < 0.05) return candidate < 0 ? -0.5 : 0.5;
  return candidate;
}

function normalize(
  input: Partial<ChargedParticleParams>,
  previous = DEFAULTS
): ChargedParticleParams {
  return {
    mass: clamp(finite(input.mass, previous.mass), 1, 8),
    charge: normalizeCharge(input.charge, previous.charge),
    velocity: clamp(finite(input.velocity, previous.velocity), 10, 80),
    magneticField: clamp(
      finite(input.magneticField, previous.magneticField),
      0.2,
      4
    ),
    fieldDirection:
      input.fieldDirection === 'out'
        ? 'out'
        : input.fieldDirection === 'into'
          ? 'into'
          : previous.fieldDirection,
    autoRun: input.autoRun ?? previous.autoRun,
    showVelocity: input.showVelocity ?? previous.showVelocity,
    showForce: input.showForce ?? previous.showForce
  };
}

function fieldSign(direction: FieldDirection): number {
  return direction === 'out' ? 1 : -1;
}

export function orbitRadius(
  params: Pick<
    ChargedParticleParams,
    'mass' | 'charge' | 'velocity' | 'magneticField'
  >
): number {
  return (
    (params.mass * params.velocity) /
    (Math.abs(params.charge) * params.magneticField)
  );
}

export function orbitPeriod(
  params: Pick<ChargedParticleParams, 'mass' | 'charge' | 'magneticField'>
): number {
  return (
    (2 * Math.PI * params.mass) /
    (Math.abs(params.charge) * params.magneticField)
  );
}

export function createChargedParticleSim(
  initial: Partial<ChargedParticleParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  function getState(): ChargedParticleState {
    const radius = orbitRadius(params);
    const period = orbitPeriod(params);
    const radiusPx = clamp(
      radius * chargedParticleConstants.orbitScale,
      chargedParticleConstants.minRadiusPx,
      chargedParticleConstants.maxRadiusPx
    );
    const angularSign =
      Math.sign(params.charge) * fieldSign(params.fieldDirection);
    const angularSpeed =
      ((Math.abs(params.charge) * params.magneticField) / params.mass) *
      chargedParticleConstants.visualOmegaScale;
    const angle = 0.72 + angularSign * angularSpeed * time;
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
      forceMagnitude:
        Math.abs(params.charge) * params.velocity * params.magneticField,
      radiusPx,
      angle,
      position,
      velocityAngle,
      forceAngle,
      status: `R = ${radius.toFixed(0)} · T = ${(period / Math.PI).toFixed(1)}π`
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
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
