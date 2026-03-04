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

type VelocityFn = (t: number) => number;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toFiniteOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeParams(input: Partial<ChaseMeetParams>): ResolvedChaseMeetParams {
  return {
    totalTime: clamp(toFiniteOr(input.totalTime, 10), 1, 120),
    dt: clamp(toFiniteOr(input.dt, 0.02), 0.005, 1),
    x0A: toFiniteOr(input.x0A, 0),
    x0B: toFiniteOr(input.x0B, 10),
    vExprA: typeof input.vExprA === 'string' && input.vExprA.trim().length > 0 ? input.vExprA.trim() : '0',
    vExprB: typeof input.vExprB === 'string' && input.vExprB.trim().length > 0 ? input.vExprB.trim() : '0'
  };
}

function createVelocityFunction(expression: string): VelocityFn {
  const expr = expression.trim();
  if (expr.length === 0) {
    return () => 0;
  }

  try {
    const fn = new Function('t', `return ${expr};`) as (t: number) => unknown;
    const testValue = Number(fn(0));
    if (!Number.isFinite(testValue)) {
      return () => 0;
    }
    return (t: number) => {
      const value = Number(fn(t));
      return Number.isFinite(value) ? value : 0;
    };
  } catch {
    return () => 0;
  }
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
    xA += vA * params.dt;
    xB += vB * params.dt;
    t += params.dt;
    samples.push({ t, xA, xB, vA, vB });
  }

  return samples;
}

function resolveBounds(samples: ChaseMeetSample[]): ChaseMeetBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxSpeed = 0;

  for (const sample of samples) {
    if (Number.isFinite(sample.xA)) {
      minX = Math.min(minX, sample.xA);
      maxX = Math.max(maxX, sample.xA);
    }
    if (Number.isFinite(sample.xB)) {
      minX = Math.min(minX, sample.xB);
      maxX = Math.max(maxX, sample.xB);
    }
    if (Number.isFinite(sample.vA)) {
      maxSpeed = Math.max(maxSpeed, Math.abs(sample.vA));
    }
    if (Number.isFinite(sample.vB)) {
      maxSpeed = Math.max(maxSpeed, Math.abs(sample.vB));
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX === maxX) {
    minX = 0;
    maxX = 1;
  }
  if (maxSpeed <= 0 || !Number.isFinite(maxSpeed)) {
    maxSpeed = 1;
  }

  return { minX, maxX, maxSpeed };
}

function resolveMeetMessage(samples: ChaseMeetSample[]): string {
  for (let i = 1; i < samples.length; i += 1) {
    const s0 = samples[i - 1];
    const s1 = samples[i];
    const d0 = s0.xA - s0.xB;
    const d1 = s1.xA - s1.xB;

    if (d0 === 0) {
      return `首次相遇大约在 t ≈ ${s0.t.toFixed(2)} s, x ≈ ${s0.xA.toFixed(2)} m`;
    }

    if (d0 * d1 < 0) {
      const alpha = Math.abs(d0) / (Math.abs(d0) + Math.abs(d1));
      const tMeet = s0.t + alpha * (s1.t - s0.t);
      const xMeet = s0.xA + alpha * (s1.xA - s0.xA);
      return `首次相遇大约在 t ≈ ${tMeet.toFixed(2)} s, x ≈ ${xMeet.toFixed(2)} m`;
    }
  }
  return '尚未相遇';
}

function nearestSample(samples: ChaseMeetSample[], t: number): ChaseMeetSample {
  let best = samples[0];
  let bestDistance = Math.abs(samples[0].t - t);

  for (let i = 1; i < samples.length; i += 1) {
    const distance = Math.abs(samples[i].t - t);
    if (distance < bestDistance) {
      best = samples[i];
      bestDistance = distance;
    }
  }

  return best;
}

export function createChaseMeetSim(initial: Partial<ChaseMeetParams>) {
  let params = normalizeParams(initial);
  let velocityA = createVelocityFunction(params.vExprA);
  let velocityB = createVelocityFunction(params.vExprB);
  let samples = preSample(params, velocityA, velocityB);
  let bounds = resolveBounds(samples);
  let meetMessage = resolveMeetMessage(samples);
  let currentTime = 0;

  function rebuild(nextParams: Partial<ChaseMeetParams>): void {
    params = normalizeParams({ ...params, ...nextParams });
    velocityA = createVelocityFunction(params.vExprA);
    velocityB = createVelocityFunction(params.vExprB);
    samples = preSample(params, velocityA, velocityB);
    bounds = resolveBounds(samples);
    meetMessage = resolveMeetMessage(samples);
    currentTime = 0;
  }

  function buildState(): ChaseMeetState {
    const clampedTime = clamp(currentTime, 0, params.totalTime);
    const sample = nearestSample(samples, clampedTime);
    return {
      t: clampedTime,
      xA: sample.xA,
      xB: sample.xB,
      vA: sample.vA,
      vB: sample.vB,
      distance: Math.abs(sample.xB - sample.xA),
      meetMessage
    };
  }

  return {
    getState(): ChaseMeetState {
      return buildState();
    },
    getParams(): ResolvedChaseMeetParams {
      return { ...params };
    },
    getSnapshot(): ChaseMeetSnapshot {
      return {
        state: buildState(),
        params: { ...params },
        samples,
        bounds
      };
    },
    setParams(next: Partial<ChaseMeetParams>): ResolvedChaseMeetParams {
      rebuild(next);
      return { ...params };
    },
    step(dt: number): void {
      void dt;
      currentTime = Math.min(params.totalTime, currentTime + params.dt);
    },
    reset(): void {
      currentTime = 0;
    }
  };
}
