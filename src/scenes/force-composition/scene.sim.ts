import { clamp } from '../../core/math';

export type ForceCompositionTab =
  | 'synthesis'
  | 'range'
  | 'orthogonal'
  | 'effect';
export type ForceCompositionRule = 'parallelogram' | 'triangle';

export type ForceCompositionParams = {
  tab: ForceCompositionTab;
  rule: ForceCompositionRule;
  f1: number;
  f2: number;
  angle: number;
  orthogonalF: number;
  orthogonalAngle: number;
  gravity: number;
  inclineAngle: number;
  rangeSweep: boolean;
};

export type Vector = { x: number; y: number };

export type ForceCompositionState = {
  params: ForceCompositionParams;
  t: number;
  f1: Vector;
  f2: Vector;
  resultant: Vector;
  fx: Vector;
  fy: Vector;
  g1: Vector;
  g2: Vector;
  gravityVector: Vector;
};

const DEG = Math.PI / 180;
const BASE_W = 620;
const BASE_H = 660;
const ORIGIN = { x: 300, y: 350 };
// 原参考 SVG 的力值→像素换算（SCALE=4）
const VECTOR_SCALE = 4;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeTab(value: unknown): ForceCompositionTab {
  return value === 'range' || value === 'orthogonal' || value === 'effect'
    ? value
    : 'synthesis';
}

function normalizeRule(value: unknown): ForceCompositionRule {
  return value === 'triangle' ? value : 'parallelogram';
}

function normalizeParams(
  input: Partial<ForceCompositionParams>
): ForceCompositionParams {
  return {
    tab: normalizeTab(input.tab),
    rule: normalizeRule(input.rule),
    f1: clamp(finite(input.f1, 40), 10, 60),
    f2: clamp(finite(input.f2, 30), 10, 60),
    angle: clamp(finite(input.angle, 60), 0, 180),
    orthogonalF: clamp(finite(input.orthogonalF, 55), 10, 80),
    orthogonalAngle: clamp(finite(input.orthogonalAngle, 60), 0, 90),
    gravity: clamp(finite(input.gravity, 40), 10, 60),
    inclineAngle: clamp(finite(input.inclineAngle, 30), 15, 60),
    rangeSweep: input.rangeSweep !== false
  };
}

export function vectorMagnitude(v: Vector): number {
  return Math.hypot(v.x, v.y);
}

export function resultantMagnitude(
  f1: number,
  f2: number,
  angle: number
): number {
  return Math.sqrt(
    Math.max(0, f1 * f1 + f2 * f2 + 2 * f1 * f2 * Math.cos(angle * DEG))
  );
}

function vectorForAngle(magnitude: number, angle: number): Vector {
  const theta = angle * DEG;
  return { x: magnitude * Math.cos(theta), y: magnitude * Math.sin(theta) };
}

function add(a: Vector, b: Vector): Vector {
  return { x: a.x + b.x, y: a.y + b.y };
}

function computeState(
  params: ForceCompositionParams,
  t: number
): ForceCompositionState {
  const f1 = vectorForAngle(params.f1, 0);
  const f2 = vectorForAngle(params.f2, params.angle);
  const resultant = add(f1, f2);

  const orthogonal = vectorForAngle(params.orthogonalF, params.orthogonalAngle);
  const fx = { x: orthogonal.x, y: 0 };
  const fy = { x: 0, y: orthogonal.y };

  const incline = params.inclineAngle * DEG;
  const g = params.gravity;
  const g1 = {
    x: g * Math.sin(incline) * Math.cos(incline),
    y: -g * Math.sin(incline) ** 2
  };
  const g2 = {
    x: -g * Math.sin(incline) * Math.cos(incline),
    y: -g * Math.cos(incline) ** 2
  };
  const gravityVector = { x: 0, y: -g };

  return {
    params: { ...params },
    t,
    f1,
    f2,
    resultant,
    fx,
    fy,
    g1,
    g2,
    gravityVector
  };
}

export function createForceCompositionSim(
  initial: Partial<ForceCompositionParams> = {}
) {
  const initialParams = normalizeParams(initial);
  let params = { ...initialParams };
  let t = 0;

  function getState(): ForceCompositionState {
    return computeState(params, t);
  }

  return {
    getState,
    getParams(): ForceCompositionParams {
      return { ...params };
    },
    setParams(next: Partial<ForceCompositionParams>): ForceCompositionParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    step(dt: number): void {
      const delta = Math.max(0, finite(dt, 0));
      t += delta;
      if (params.tab === 'range' && params.rangeSweep) {
        params.angle = 90 + 90 * Math.sin(t * 0.8);
      }
    },
    reset(): void {
      params = { ...initialParams };
      t = 0;
    },
    pickHandle(
      x: number,
      y: number,
      radius = 18
    ): 'f1' | 'f2' | 'orthogonal' | null {
      const px = clamp(finite(x, 0), 0, 1) * BASE_W;
      const py = clamp(finite(y, 0), 0, 1) * BASE_H;
      const state = getState();
      const endpoints =
        params.tab === 'orthogonal'
          ? [
              {
                id: 'orthogonal' as const,
                x: state.fx.x + state.fy.x,
                y: state.fx.y + state.fy.y
              }
            ]
          : [
              { id: 'f1' as const, x: state.f1.x, y: state.f1.y },
              { id: 'f2' as const, x: state.f2.x, y: state.f2.y }
            ];
      let best: 'f1' | 'f2' | 'orthogonal' | null = null;
      let distance = radius;
      for (const endpoint of endpoints) {
        const ex = ORIGIN.x + endpoint.x * VECTOR_SCALE;
        const ey = ORIGIN.y - endpoint.y * VECTOR_SCALE;
        const d = Math.hypot(px - ex, py - ey);
        if (d <= distance) {
          best = endpoint.id;
          distance = d;
        }
      }
      return best;
    },
    moveHandle(handle: 'f1' | 'f2' | 'orthogonal', x: number, y: number): void {
      const px = clamp(finite(x, 0), 0, 1) * BASE_W;
      const py = clamp(finite(y, 0), 0, 1) * BASE_H;
      const dx = (px - ORIGIN.x) / VECTOR_SCALE;
      const dy = (ORIGIN.y - py) / VECTOR_SCALE;
      const magnitude = Math.max(10, Math.min(80, Math.hypot(dx, dy)));
      const angle = Math.max(0, Math.min(180, Math.atan2(dy, dx) / DEG));
      if (handle === 'orthogonal') {
        params.orthogonalF = clamp(magnitude, 10, 80);
        params.orthogonalAngle = clamp(angle, 0, 90);
      } else if (handle === 'f1') {
        params.f1 = clamp(Math.abs(dx), 10, 60);
      } else {
        params.f2 = clamp(magnitude, 10, 60);
        params.angle = clamp(angle, 0, 180);
      }
    }
  };
}

export const forceCompositionConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  origin: ORIGIN,
  vectorScale: VECTOR_SCALE
};
