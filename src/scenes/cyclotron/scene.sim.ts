import { clamp } from '../../core/math';

export type CyclotronParticle = 'proton' | 'deuteron' | 'alpha';

export type CyclotronParams = {
  particle: CyclotronParticle;
  B: number;
  U: number;
  autoRun: boolean;
  showField: boolean;
};

export type CyclotronOrbit = {
  radius: number;
  startAngle: number;
  endAngle: number;
};

export type CyclotronState = {
  params: CyclotronParams;
  t: number;
  crossings: number;
  energy: number;
  maxEnergy: number;
  radius: number;
  periodRatio: number;
  orbits: CyclotronOrbit[];
  position: { x: number; y: number };
  velocityAngle: number;
  topPositive: boolean;
  exitSide: 'left' | 'right' | null;
  status: '加速中' | '可引出';
};

type ParticleData = { mass: number; charge: number; label: string };

export const PARTICLES: Record<CyclotronParticle, ParticleData> = {
  proton: { mass: 1, charge: 1, label: '质子' },
  deuteron: { mass: 2, charge: 1, label: '氘核' },
  alpha: { mass: 4, charge: 2, label: 'α粒子' }
};

const BASE_W = 640;
const BASE_H = 660;
const CENTER = { x: 320, y: 330 };
const DEE_RADIUS = 230;
const FIRST_RADIUS = 48;
const RADIUS_STEP = 34;
const MAX_CROSSINGS = 12;
const ENERGY_SCALE = 40;
const HALF_CROSSING_BASE = 0.34;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeParticle(value: unknown): CyclotronParticle {
  return value === 'deuteron' || value === 'alpha' ? value : 'proton';
}

function normalizeParams(input: Partial<CyclotronParams>): CyclotronParams {
  return {
    particle: normalizeParticle(input.particle),
    B: clamp(finite(input.B, 3), 1, 3),
    U: clamp(finite(input.U, 30), 10, 50),
    autoRun: input.autoRun !== false,
    showField: input.showField !== false
  };
}

export function cyclotronMaxEnergy(
  particle: CyclotronParticle,
  B: number,
  radius = DEE_RADIUS
): number {
  const data = PARTICLES[normalizeParticle(particle)];
  const field = clamp(finite(B, 3), 1, 3);
  const r = Math.max(0, finite(radius, DEE_RADIUS));
  return (
    (ENERGY_SCALE * data.charge * data.charge * field * field * r * r) /
    (data.mass * DEE_RADIUS * DEE_RADIUS)
  );
}

export function cyclotronPeriodRatio(
  particle: CyclotronParticle,
  B: number
): number {
  const data = PARTICLES[normalizeParticle(particle)];
  return data.mass / (data.charge * clamp(finite(B, 3), 1, 3));
}

export function cyclotronRadius(
  energy: number,
  maxEnergy: number,
  radius = DEE_RADIUS
): number {
  if (maxEnergy <= 0) return 0;
  return Math.min(
    Math.max(0, radius),
    Math.sqrt(Math.max(0, energy) / maxEnergy) * radius
  );
}

function orbitFor(index: number): CyclotronOrbit {
  const radius = Math.min(DEE_RADIUS - 10, FIRST_RADIUS + index * RADIUS_STEP);
  return index % 2 === 0
    ? { radius, startAngle: 0, endAngle: -Math.PI }
    : { radius, startAngle: 0, endAngle: Math.PI };
}

function positionOnOrbit(orbit: CyclotronOrbit, progress: number) {
  const angle =
    orbit.startAngle + (orbit.endAngle - orbit.startAngle) * progress;
  return {
    x: CENTER.x + orbit.radius * Math.cos(angle),
    y: CENTER.y + orbit.radius * Math.sin(angle)
  };
}

function computeState(params: CyclotronParams, t: number): CyclotronState {
  const data = PARTICLES[params.particle];
  const maxEnergy = cyclotronMaxEnergy(params.particle, params.B);
  const periodRatio = cyclotronPeriodRatio(params.particle, params.B);
  const crossingTime = HALF_CROSSING_BASE * periodRatio;
  const crossings = Math.min(MAX_CROSSINGS, Math.floor(t / crossingTime));
  const energy = Math.min(maxEnergy, crossings * data.charge * params.U);
  const radius = cyclotronRadius(energy, maxEnergy);
  const visibleCount = Math.max(6, crossings + 1);
  const orbits = Array.from({ length: visibleCount }, (_, index) =>
    orbitFor(index)
  );
  const activeIndex = Math.min(crossings, orbits.length - 1);
  const progress =
    crossings >= MAX_CROSSINGS
      ? 1
      : Math.min(0.98, (t - crossings * crossingTime) / crossingTime);
  const active = orbits[activeIndex];
  const position = positionOnOrbit(active, progress);
  const angle =
    active.startAngle + (active.endAngle - active.startAngle) * progress;
  const tangent =
    angle + (active.endAngle < active.startAngle ? -Math.PI / 2 : Math.PI / 2);
  return {
    params: { ...params },
    t,
    crossings,
    energy,
    maxEnergy,
    radius,
    periodRatio,
    orbits,
    position,
    velocityAngle: tangent,
    topPositive: crossings % 2 === 0,
    exitSide: crossings >= MAX_CROSSINGS ? 'right' : null,
    status: crossings >= MAX_CROSSINGS ? '可引出' : '加速中'
  };
}

export const cyclotronConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  center: CENTER,
  deeRadius: DEE_RADIUS,
  maxCrossings: MAX_CROSSINGS
};

export function createCyclotronSim(initial: Partial<CyclotronParams> = {}) {
  const initialParams = normalizeParams(initial);
  let params = { ...initialParams };
  let t = 0;

  return {
    getState(): CyclotronState {
      return computeState(params, t);
    },
    getSnapshot(): CyclotronState {
      return computeState(params, t);
    },
    getParams(): CyclotronParams {
      return { ...params };
    },
    setParams(next: Partial<CyclotronParams>): CyclotronParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    setParticle(particle: CyclotronParticle): CyclotronParams {
      params = normalizeParams({ ...params, particle });
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      t += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...initialParams };
      t = 0;
    }
  };
}
