import { clamp } from '../../core/math';

export type BinaryStarsParams = {
  m1: number;
  m2: number;
  distance: number;
  autoRun: boolean;
  showVectors: boolean;
};

export type BinaryStarsState = {
  params: BinaryStarsParams;
  t: number;
  theta: number;
  omega: number;
  r1: number;
  r2: number;
  force: number;
  position1: { x: number; y: number };
  position2: { x: number; y: number };
  velocity1: { x: number; y: number };
  velocity2: { x: number; y: number };
};

const BASE_W = 900;
const BASE_H = 640;
const CENTER = { x: 292, y: 316 };
const ORBIT_SCALE = 8.5;
const G = 1;
const PHASE = 1.1;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeParams(input: Partial<BinaryStarsParams>): BinaryStarsParams {
  return {
    m1: clamp(finite(input.m1, 4), 1, 8),
    m2: clamp(finite(input.m2, 2), 1, 8),
    distance: clamp(finite(input.distance, 30), 20, 40),
    autoRun: input.autoRun !== false,
    showVectors: input.showVectors !== false
  };
}

export function binaryStarsRadii(
  m1: number,
  m2: number,
  distance: number
): { r1: number; r2: number } {
  const safeM1 = Math.max(0, finite(m1, 0));
  const safeM2 = Math.max(0, finite(m2, 0));
  const safeDistance = Math.max(0, finite(distance, 0));
  const total = safeM1 + safeM2;
  if (total <= 0) return { r1: 0, r2: 0 };
  return {
    r1: (safeDistance * safeM2) / total,
    r2: (safeDistance * safeM1) / total
  };
}

export function binaryStarsOmega(
  m1: number,
  m2: number,
  distance: number
): number {
  const safeDistance = Math.max(0.001, finite(distance, 1));
  return Math.sqrt(
    (G * (Math.max(0, finite(m1, 0)) + Math.max(0, finite(m2, 0)))) /
      safeDistance ** 3
  );
}

export function binaryStarsForce(
  m1: number,
  m2: number,
  distance: number
): number {
  const safeDistance = Math.max(0.001, finite(distance, 1));
  return (
    (G * Math.max(0, finite(m1, 0)) * Math.max(0, finite(m2, 0))) /
    safeDistance ** 2
  );
}

export const binaryStarsConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  center: CENTER,
  orbitScale: ORBIT_SCALE,
  phase: PHASE,
  fieldWidth: 590,
  panelWidth: 284,
  badgeX: 188,
  badgeWidth: 74,
  badgeHeight: 28,
  rowsStartY: 92,
  rowsStepY: 46,
  sectionOneTop: 188,
  sectionOneHeight: 198,
  sectionTwoTop: 406,
  sectionTwoHeight: 156,
  sectionWidth: 240,
  sectionInnerWidth: 208,
  valueBoxWidth: 48,
  valueBoxX: 216,
  dividerY: 56,
  sectionLineY: 229,
  sectionLineX: 246,
  forceLineY: 447,
  ratioBoxTop: 310,
  ratioBoxHeight: 58
};

function vectorAt(radius: number, theta: number, omega: number) {
  return {
    position: {
      x: CENTER.x + radius * ORBIT_SCALE * Math.cos(theta),
      y: CENTER.y + radius * ORBIT_SCALE * Math.sin(theta)
    },
    velocity: {
      x: -radius * omega * Math.sin(theta),
      y: radius * omega * Math.cos(theta)
    }
  };
}

function makeState(params: BinaryStarsParams, t: number): BinaryStarsState {
  const { r1, r2 } = binaryStarsRadii(params.m1, params.m2, params.distance);
  const omega = binaryStarsOmega(params.m1, params.m2, params.distance);
  const theta = PHASE + omega * t;
  const first = vectorAt(r1, theta, omega);
  const second = vectorAt(r2, theta + Math.PI, omega);
  return {
    params: { ...params },
    t,
    theta,
    omega,
    r1,
    r2,
    force: binaryStarsForce(params.m1, params.m2, params.distance),
    position1: first.position,
    position2: second.position,
    velocity1: first.velocity,
    velocity2: second.velocity
  };
}

export function createBinaryStarsSim(initial: Partial<BinaryStarsParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let t = 0;

  return {
    getState(): BinaryStarsState {
      return makeState(params, t);
    },
    getSnapshot(): BinaryStarsState {
      return makeState(params, t);
    },
    getParams(): BinaryStarsParams {
      return { ...params };
    },
    setParams(next: Partial<BinaryStarsParams>): BinaryStarsParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      t += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      t = 0;
    }
  };
}
