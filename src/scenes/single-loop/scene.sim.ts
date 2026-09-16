import { clamp } from '../../core/math';

export type LoopRegion = 'before' | 'entering' | 'inside' | 'exiting' | 'after';

export type SingleLoopParams = {
  initialVelocity: number;
  fieldStrength: number;
  mass: number;
  resistance: number;
  autoRun: boolean;
};

export type SingleLoopState = {
  params: SingleLoopParams;
  time: number;
  position: number;
  velocity: number;
  current: number;
  acceleration: number;
  emf: number;
  magneticForce: number;
  overlap: number;
  region: LoopRegion;
  finished: boolean;
};

export type GraphPoint = { x: number; y: number };

export const singleLoopConstants = {
  /** Cutting length d (project fixed value). */
  loopHeight: 1.2,
  /** Loop length L along the motion. */
  loopWidth: 1,
  /** Bounded-field width D. */
  physicalFieldWidth: 4,
  startPosition: -0.5,
  endPosition: 5.6,
  worldXMin: -1.8,
  worldXMax: 6.5,
  graphXMin: 0,
  graphXMax: 6,
  velocityMin: 2,
  velocityMax: 20,
  fieldMin: 0.2,
  fieldMax: 3,
  massMin: 0.5,
  massMax: 4,
  resistanceMin: 0.5,
  resistanceMax: 8,
  stallSpeed: 1e-7,
  graphFallbackWidth: 640,
  graphFallbackHeight: 240,
  stageFallbackWidth: 800,
  stageFallbackHeight: 320
} as const;

const C = singleLoopConstants;

const DEFAULTS: SingleLoopParams = {
  initialVelocity: 10,
  fieldStrength: 1.5,
  mass: 2,
  resistance: 2,
  autoRun: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === 'on' || v === 'yes') return true;
    if (v === 'false' || v === 'off' || v === 'no' || v === '') return false;
  }
  return fallback;
}

function normalize(
  input: Partial<SingleLoopParams>,
  previous = DEFAULTS
): SingleLoopParams {
  return {
    initialVelocity: clamp(
      finite(input.initialVelocity, previous.initialVelocity),
      C.velocityMin,
      C.velocityMax
    ),
    fieldStrength: clamp(
      finite(input.fieldStrength, previous.fieldStrength),
      C.fieldMin,
      C.fieldMax
    ),
    mass: clamp(finite(input.mass, previous.mass), C.massMin, C.massMax),
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      C.resistanceMin,
      C.resistanceMax
    ),
    autoRun: asBool(input.autoRun, previous.autoRun)
  };
}

/** x is the front-edge coordinate: enter [0, L), inside [L, D], exit (D, D+L). */
export function regionAt(position: number): LoopRegion {
  if (position < 0) return 'before';
  if (position < C.loopWidth) return 'entering';
  if (position <= C.physicalFieldWidth) return 'inside';
  if (position < C.physicalFieldWidth + C.loopWidth) return 'exiting';
  return 'after';
}

export function regionLabel(region: LoopRegion): string {
  if (region === 'before') return '未进入';
  if (region === 'entering') return '进入区';
  if (region === 'inside') return '匀速区';
  if (region === 'exiting') return '穿出区';
  return '已穿出';
}

export function dampingRate(params: SingleLoopParams): number {
  const d = C.loopHeight;
  return (
    (params.fieldStrength * params.fieldStrength * d * d) /
    (params.mass * params.resistance)
  );
}

function cutting(region: LoopRegion): boolean {
  return region === 'entering' || region === 'exiting';
}

/**
 * Asymptotic stall coordinate on the v-x line, or +∞ if the loop exits.
 * v = 0 is reached only as t → ∞, so animation clamps to this x.
 */
export function stallPosition(params: SingleLoopParams): number {
  const k = dampingRate(params);
  const v0 = params.initialVelocity;
  if (k <= 0 || v0 <= 0) return Number.POSITIVE_INFINITY;
  const enterEnd = v0 / k;
  if (enterEnd < C.loopWidth) return enterEnd;
  const vInside = v0 - k * C.loopWidth;
  if (vInside <= 0) return C.loopWidth;
  const exitEnd = C.physicalFieldWidth + vInside / k;
  if (exitEnd < C.physicalFieldWidth + C.loopWidth) return exitEnd;
  return Number.POSITIVE_INFINITY;
}

export function velocityAtPosition(
  params: SingleLoopParams,
  position: number
): number {
  const k = dampingRate(params);
  const v0 = params.initialVelocity;
  if (position <= 0) return v0;
  const enterDx = Math.min(position, C.loopWidth);
  const afterEnter = v0 - k * enterDx;
  if (afterEnter <= 0) return 0;
  if (position <= C.physicalFieldWidth) return afterEnter;
  const exitDx = Math.min(
    Math.max(position - C.physicalFieldWidth, 0),
    C.loopWidth
  );
  return Math.max(0, afterEnter - k * exitDx);
}

export function currentAtPosition(
  params: SingleLoopParams,
  position: number
): number {
  const region = regionAt(position);
  if (!cutting(region)) return 0;
  const velocity = velocityAtPosition(params, position);
  if (velocity <= 0) return 0;
  const amp =
    (params.fieldStrength * C.loopHeight * velocity) / params.resistance;
  return region === 'entering' ? amp : -amp;
}

export function overlapAt(position: number): number {
  const left = position - C.loopWidth;
  const right = position;
  return clamp(
    Math.min(right, C.physicalFieldWidth) - Math.max(left, 0),
    0,
    C.loopWidth
  );
}

function maxPosition(params: SingleLoopParams): number {
  const stall = stallPosition(params);
  if (!Number.isFinite(stall)) return C.endPosition;
  return Math.min(C.endPosition, stall);
}

function isFinished(params: SingleLoopParams, position: number): boolean {
  const velocity = velocityAtPosition(params, position);
  return velocity <= C.stallSpeed || position >= C.endPosition - 1e-9;
}

function stepUniform(
  x: number,
  v: number,
  dt: number,
  xLimit: number
): { x: number; remaining: number } {
  if (v <= C.stallSpeed) return { x, remaining: 0 };
  if (x >= xLimit - 1e-12) return { x: xLimit, remaining: dt };
  const tHit = (xLimit - x) / v;
  if (dt <= tHit) return { x: x + v * dt, remaining: 0 };
  return { x: xLimit, remaining: dt - tHit };
}

/** Integrate dx/dt = vRef − k (x − xRef) up to xLimit or dt. */
function stepDamped(
  x: number,
  vRef: number,
  xRef: number,
  k: number,
  dt: number,
  xLimit: number
): { x: number; remaining: number } {
  const v = vRef - k * (x - xRef);
  if (v <= C.stallSpeed) return { x, remaining: 0 };
  if (k <= 1e-12) return stepUniform(x, v, dt, xLimit);
  const stall = xRef + vRef / k;
  if (xLimit >= stall - 1e-12) {
    const xNew = stall - (stall - x) * Math.exp(-k * dt);
    return { x: Math.min(xNew, stall), remaining: 0 };
  }
  const num = stall - xLimit;
  const den = stall - x;
  if (den <= 1e-15 || num <= 0) return { x: Math.min(x, xLimit), remaining: 0 };
  const tHit = -Math.log(num / den) / k;
  if (dt <= tHit) {
    return { x: stall - den * Math.exp(-k * dt), remaining: 0 };
  }
  return { x: xLimit, remaining: dt - tHit };
}

export function advancePosition(
  params: SingleLoopParams,
  position: number,
  dt: number
): number {
  let remaining = Math.max(0, finite(dt, 0));
  let x = position;
  const k = dampingRate(params);
  const v0 = params.initialVelocity;
  const L = C.loopWidth;
  const D = C.physicalFieldWidth;
  const cap = maxPosition(params);
  let hops = 0;
  while (remaining > 1e-12 && hops < 8) {
    hops += 1;
    if (x >= cap - 1e-12) {
      x = cap;
      break;
    }
    const v = velocityAtPosition(params, x);
    if (v <= C.stallSpeed) break;
    if (x < 0) {
      const stepped = stepUniform(x, v0, remaining, Math.min(0, cap));
      x = stepped.x;
      remaining = stepped.remaining;
      continue;
    }
    if (x < L) {
      const stepped = stepDamped(x, v0, 0, k, remaining, Math.min(L, cap));
      x = stepped.x;
      remaining = stepped.remaining;
      continue;
    }
    if (x < D) {
      const vIn = Math.max(0, v0 - k * L);
      const stepped = stepUniform(x, vIn, remaining, Math.min(D, cap));
      x = stepped.x;
      remaining = stepped.remaining;
      continue;
    }
    if (x < D + L) {
      const vIn = Math.max(0, v0 - k * L);
      const stepped = stepDamped(x, vIn, D, k, remaining, Math.min(D + L, cap));
      x = stepped.x;
      remaining = stepped.remaining;
      continue;
    }
    const vAfter = Math.max(0, v0 - 2 * k * L);
    const stepped = stepUniform(x, vAfter, remaining, cap);
    x = stepped.x;
    remaining = stepped.remaining;
  }
  return clamp(x, C.worldXMin, cap);
}

export function derive(
  params: SingleLoopParams,
  time: number,
  position: number
): SingleLoopState {
  const region = regionAt(position);
  const velocity = velocityAtPosition(params, position);
  const current = currentAtPosition(params, position);
  const active = cutting(region) && velocity > 0;
  const k = dampingRate(params);
  const emf = active ? params.fieldStrength * C.loopHeight * velocity : 0;
  const magneticForce = active ? -k * params.mass * velocity : 0;
  return {
    params: { ...params },
    time,
    position,
    velocity,
    current,
    acceleration: active ? -k * velocity : 0,
    emf,
    magneticForce,
    overlap: overlapAt(position),
    region,
    finished: isFinished(params, position)
  };
}

function vxCorner(params: SingleLoopParams, x: number): GraphPoint {
  return { x, y: velocityAtPosition(params, x) };
}

/** Piecewise v-x corners (linear enter/exit, flat inside). */
export function vxPolyline(params: SingleLoopParams): GraphPoint[] {
  const L = C.loopWidth;
  const D = C.physicalFieldWidth;
  const stall = stallPosition(params);
  const points: GraphPoint[] = [vxCorner(params, 0)];
  if (stall < L) {
    points.push(vxCorner(params, stall), { x: C.graphXMax, y: 0 });
    return points;
  }
  points.push(vxCorner(params, L), vxCorner(params, D));
  if (stall < D + L) {
    points.push(vxCorner(params, stall), { x: C.graphXMax, y: 0 });
    return points;
  }
  points.push(vxCorner(params, D + L), vxCorner(params, C.graphXMax));
  return points;
}

function ixAt(params: SingleLoopParams, x: number): GraphPoint {
  return { x, y: currentAtPosition(params, x) };
}

/** i-x polyline with explicit jumps at x = L and x = D. */
export function ixPolyline(params: SingleLoopParams): GraphPoint[] {
  const L = C.loopWidth;
  const D = C.physicalFieldWidth;
  const stall = stallPosition(params);
  const jump = 1e-9;
  if (stall < L) {
    return [
      ixAt(params, 0),
      ixAt(params, Math.max(0, stall - jump)),
      { x: stall, y: 0 },
      { x: C.graphXMax, y: 0 }
    ];
  }
  const points: GraphPoint[] = [
    ixAt(params, 0),
    ixAt(params, L - jump),
    { x: L, y: 0 },
    { x: D, y: 0 }
  ];
  if (stall < D + L) {
    points.push(
      ixAt(params, D + jump),
      ixAt(params, Math.max(D, stall - jump)),
      { x: stall, y: 0 },
      { x: C.graphXMax, y: 0 }
    );
    return points;
  }
  points.push(
    ixAt(params, D + jump),
    ixAt(params, D + L - jump),
    { x: D + L, y: 0 },
    { x: C.graphXMax, y: 0 }
  );
  return points;
}

export function createSingleLoopSim(initial: Partial<SingleLoopParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let position: number = C.startPosition;

  function rewindMotion(): void {
    time = 0;
    position = C.startPosition;
  }

  function physicsChanged(
    previous: SingleLoopParams,
    next: SingleLoopParams
  ): boolean {
    return (
      previous.initialVelocity !== next.initialVelocity ||
      previous.fieldStrength !== next.fieldStrength ||
      previous.mass !== next.mass ||
      previous.resistance !== next.resistance
    );
  }

  return {
    getState: (): SingleLoopState => derive(params, time, position),
    getSnapshot: (): SingleLoopState => derive(params, time, position),
    getParams: (): SingleLoopParams => ({ ...params }),
    setParams(next: Partial<SingleLoopParams>): SingleLoopParams {
      const previous = params;
      params = normalize({ ...params, ...next }, params);
      // Model changes restart from the left. Do not clamp x backward onto
      // a new stall — that would teleport the loop.
      if (physicsChanged(previous, params)) rewindMotion();
      return { ...params };
    },
    setPosition(next: number): number {
      position = clamp(
        finite(next, position),
        C.worldXMin,
        maxPosition(params)
      );
      return position;
    },
    step(dt: number): void {
      const delta = finite(dt, 0);
      if (!params.autoRun || delta <= 0) return;
      position = advancePosition(params, position, delta);
      time += delta;
      if (isFinished(params, position)) {
        params = { ...params, autoRun: false };
      }
    },
    rewind(): void {
      rewindMotion();
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      position = C.startPosition;
    }
  };
}

export function restoredUrlParams(params: SingleLoopParams): {
  initialVelocity: number;
  fieldStrength: number;
  mass: number;
  resistance: number;
  autoRun: 0 | 1;
} {
  return {
    initialVelocity: params.initialVelocity,
    fieldStrength: params.fieldStrength,
    mass: params.mass,
    resistance: params.resistance,
    autoRun: params.autoRun ? 1 : 0
  };
}
