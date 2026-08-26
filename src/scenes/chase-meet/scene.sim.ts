export type ChaseMeetParams = {
  totalTime: number;
  dt: number;
  x0A: number;
  x0B: number;
  vExprA: string;
  vExprB: string;
};

export type ResolvedChaseMeetParams = ChaseMeetParams;

export type ChaseMeetSample = {
  t: number;
  xA: number;
  xB: number;
  vA: number;
  vB: number;
};

export type ChaseMeetBounds = {
  minX: number;
  maxX: number;
  maxSpeed: number;
};

export type ChaseMeetState = {
  t: number;
  xA: number;
  xB: number;
  vA: number;
  vB: number;
  distance: number;
  meetMessage: string;
};

export type ChaseMeetSnapshot = {
  state: ChaseMeetState;
  params: ResolvedChaseMeetParams;
  samples: ChaseMeetSample[];
  bounds: ChaseMeetBounds;
};

import { createVelocityFunction, type VelocityFn } from './expression-parser';
import { clamp } from '../../core/math';

function toFiniteOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeParams(
  input: Partial<ChaseMeetParams>
): ResolvedChaseMeetParams {
  return {
    totalTime: clamp(toFiniteOr(input.totalTime, 10), 1, 120),
    dt: clamp(toFiniteOr(input.dt, 0.02), 0.005, 1),
    x0A: toFiniteOr(input.x0A, 0),
    x0B: toFiniteOr(input.x0B, 10),
    vExprA:
      typeof input.vExprA === 'string' && input.vExprA.trim().length > 0
        ? input.vExprA.trim()
        : '0',
    vExprB:
      typeof input.vExprB === 'string' && input.vExprB.trim().length > 0
        ? input.vExprB.trim()
        : '0'
  };
}

function preSample(
  params: ResolvedChaseMeetParams,
  velocityA: VelocityFn,
  velocityB: VelocityFn
): ChaseMeetSample[] {
  const samples: ChaseMeetSample[] = [];
  let xA = params.x0A;
  let xB = params.x0B;
  let t = 0;

  samples.push({ t: 0, xA, xB, vA: velocityA(0), vB: velocityB(0) });

  while (t < params.totalTime) {
    const vA = velocityA(t);
    const vB = velocityB(t);
    const dt = Math.min(params.dt, params.totalTime - t);
    xA += vA * dt;
    xB += vB * dt;
    t += dt;
    samples.push({ t, xA, xB, vA, vB });
  }

  return samples;
}

function computeBounds(samples: ChaseMeetSample[]): ChaseMeetBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let maxSpeed = 0;

  for (const s of samples) {
    minX = Math.min(minX, s.xA, s.xB);
    maxX = Math.max(maxX, s.xA, s.xB);
    maxSpeed = Math.max(maxSpeed, Math.abs(s.vA), Math.abs(s.vB));
  }

  return { minX, maxX, maxSpeed };
}

export function createChaseMeetSim(initial: Partial<ChaseMeetParams> = {}) {
  let params = normalizeParams(initial);
  let velocityA = createVelocityFunction(params.vExprA);
  let velocityB = createVelocityFunction(params.vExprB);
  let samples = preSample(params, velocityA, velocityB);
  let bounds = computeBounds(samples);
  let t = 0;

  function regenerate() {
    velocityA = createVelocityFunction(params.vExprA);
    velocityB = createVelocityFunction(params.vExprB);
    samples = preSample(params, velocityA, velocityB);
    bounds = computeBounds(samples);
  }

  function tick() {
    t += params.dt;
    if (t > params.totalTime) {
      t = params.totalTime;
    }
  }

  function step(dt: number) {
    const steps = Math.max(1, Math.round(dt / params.dt));
    for (let i = 0; i < steps; i++) tick();
  }

  function reset() {
    t = 0;
  }

  function getSnapshot(): ChaseMeetSnapshot {
    const idx = Math.min(Math.floor(t / params.dt), samples.length - 1);
    const s = samples[idx];

    const distance = Math.abs(s.xB - s.xA);
    let meetMessage = '';
    if (distance < 0.1) {
      meetMessage = `相遇于 t=${s.t.toFixed(2)}s`;
    }

    const state: ChaseMeetState = {
      t: s.t,
      xA: s.xA,
      xB: s.xB,
      vA: s.vA,
      vB: s.vB,
      distance,
      meetMessage
    };

    return { state, params, samples, bounds };
  }

  function getState(): ChaseMeetState {
    return getSnapshot().state;
  }

  function getParams(): ResolvedChaseMeetParams {
    return params;
  }

  function setParams(next: Partial<ChaseMeetParams>): ResolvedChaseMeetParams {
    params = normalizeParams({ ...params, ...next });
    regenerate();
    reset();
    return params;
  }

  return { tick, step, reset, getSnapshot, getState, getParams, setParams };
}

export type ChaseMeetSim = ReturnType<typeof createChaseMeetSim>;
