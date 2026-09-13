import { clamp } from '../../core/math';

export type DynamicCircleTab =
  | 'scaling'
  | 'rotating'
  | 'translating'
  | 'comprehensive';
export type DynamicCircleBoundary = 'straight' | 'triangle' | 'circle';
export type DynamicCircleHandle =
  | 'boundary'
  | 'triangle'
  | 'circle-center'
  | 'circle-radius'
  | 'velocity'
  | null;

export type DynamicCircleParams = {
  tab: DynamicCircleTab;
  boundary: DynamicCircleBoundary;
  B: number;
  v: number;
  theta: number;
  y0: number;
  xBound: number;
  triX: number;
  triH: number;
  circleR: number;
  circleX: number;
  autoSweep: boolean;
  showCenter: boolean;
};

export type Point = { x: number; y: number };

export type DynamicCircleState = {
  params: DynamicCircleParams;
  t: number;
  source: Point;
  velocity: Point;
  radius: number;
  center: Point;
  trajectory: Point[];
  fanTrajectories: Point[][];
  auxiliaryRadii: number[];
  boundaryPath: Point[];
  fieldBounds: { left: number; right: number; top: number; bottom: number };
  criticalRadius: number | null;
  status: '束缚' | '飞出磁场';
  boundaryMetric: string;
};

export const dynamicCircleConstants = {
  baseWidth: 650,
  baseHeight: 660,
  fieldLeft: 250,
  fieldTop: 80,
  fieldBottom: 580,
  sourceX: 250,
  sourceY: 330,
  rotatingSourceX: 300,
  unitScale: 1,
  qOverM: 1
} as const;

const DEG = Math.PI / 180;
const TRAJECTORY_STEP = 1.5;
const TRAJECTORY_SAMPLES = 220;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeTab(value: unknown): DynamicCircleTab {
  return value === 'rotating' ||
    value === 'translating' ||
    value === 'comprehensive'
    ? value
    : 'scaling';
}

function normalizeBoundary(value: unknown): DynamicCircleBoundary {
  return value === 'triangle' || value === 'circle' ? value : 'straight';
}

function normalizeParams(
  input: Partial<DynamicCircleParams>,
  previous?: DynamicCircleParams
): DynamicCircleParams {
  const previousTab = previous?.tab ?? 'scaling';
  const tab = normalizeTab(input.tab ?? previousTab);
  const changedTab = tab !== previousTab;
  const defaults =
    changedTab && tab !== 'scaling'
      ? { B: 0.1, v: 15, theta: 0 }
      : { B: 0.1, v: 11.5, theta: -90 };
  return {
    tab,
    boundary: normalizeBoundary(input.boundary ?? previous?.boundary),
    B: clamp(finite(input.B, previous?.B ?? defaults.B), -0.25, 0.25),
    v: clamp(finite(input.v, previous?.v ?? defaults.v), 4, 25),
    theta: clamp(
      finite(input.theta, previous?.theta ?? defaults.theta),
      -90,
      90
    ),
    y0: clamp(finite(input.y0, previous?.y0 ?? 330), 150, 510),
    xBound: clamp(finite(input.xBound, previous?.xBound ?? 480), 320, 600),
    triX: clamp(finite(input.triX, previous?.triX ?? 480), 320, 600),
    triH: clamp(finite(input.triH, previous?.triH ?? 300), 150, 450),
    circleR: clamp(finite(input.circleR, previous?.circleR ?? 120), 50, 200),
    circleX: clamp(finite(input.circleX, previous?.circleX ?? 380), 280, 520),
    autoSweep: input.autoSweep ?? previous?.autoSweep ?? false,
    showCenter: input.showCenter ?? previous?.showCenter ?? true
  };
}

export function orbitRadius(v: number, B: number): number {
  const speed = Math.max(0, finite(v, 0));
  const field = Math.abs(finite(B, 0));
  return field < 1e-6 ? Number.POSITIVE_INFINITY : speed / field;
}

export function vectorFromAngle(magnitude: number, angle: number): Point {
  const theta = finite(angle, 0) * DEG;
  return { x: magnitude * Math.cos(theta), y: magnitude * Math.sin(theta) };
}

export function circleCenter(
  source: Point,
  radius: number,
  angle: number,
  B: number
): Point {
  if (!Number.isFinite(radius)) return { ...source };
  const direction = B < 0 ? -1 : 1;
  const theta = angle * DEG;
  return {
    x: source.x + direction * radius * Math.sin(theta),
    y: source.y - direction * radius * Math.cos(theta)
  };
}

export function orbitPoint(
  source: Point,
  radius: number,
  angle: number,
  B: number,
  distance: number
): Point {
  if (!Number.isFinite(radius)) {
    const direction = vectorFromAngle(1, angle);
    return {
      x: source.x + direction.x * distance,
      y: source.y + direction.y * distance
    };
  }
  const direction = B < 0 ? -1 : 1;
  const theta = angle * DEG;
  const center = circleCenter(source, radius, angle, B);
  const radialAngle = theta + (direction * Math.PI) / 2;
  const phi = radialAngle - (direction * distance) / radius;
  return {
    x: center.x + radius * Math.cos(phi),
    y: center.y + radius * Math.sin(phi)
  };
}

function sourceFor(params: DynamicCircleParams): Point {
  if (params.tab === 'rotating') {
    return {
      x: dynamicCircleConstants.rotatingSourceX,
      y: dynamicCircleConstants.sourceY
    };
  }
  if (params.tab === 'translating') {
    return { x: dynamicCircleConstants.sourceX, y: params.y0 };
  }
  return {
    x: dynamicCircleConstants.sourceX,
    y: dynamicCircleConstants.sourceY
  };
}

function angleFor(params: DynamicCircleParams): number {
  return params.tab === 'scaling' ? -90 : params.theta;
}

function fieldBounds(
  params: DynamicCircleParams
): DynamicCircleState['fieldBounds'] {
  if (params.boundary === 'circle') {
    return {
      left: params.circleX - params.circleR,
      right: params.circleX + params.circleR,
      top: 330 - params.circleR,
      bottom: 330 + params.circleR
    };
  }
  return {
    left: dynamicCircleConstants.fieldLeft,
    right: params.boundary === 'straight' ? params.xBound : params.triX,
    top:
      params.boundary === 'triangle'
        ? 330 - params.triH / 2
        : dynamicCircleConstants.fieldTop,
    bottom:
      params.boundary === 'triangle'
        ? 330 + params.triH / 2
        : dynamicCircleConstants.fieldBottom
  };
}

function boundaryPath(params: DynamicCircleParams): Point[] {
  if (params.boundary === 'circle') {
    const points: Point[] = [];
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * Math.PI * 2;
      points.push({
        x: params.circleX + params.circleR * Math.cos(a),
        y: 330 + params.circleR * Math.sin(a)
      });
    }
    return points;
  }
  if (params.boundary === 'triangle') {
    return [
      { x: dynamicCircleConstants.fieldLeft, y: 330 - params.triH / 2 },
      { x: params.triX, y: 330 },
      { x: dynamicCircleConstants.fieldLeft, y: 330 + params.triH / 2 },
      { x: dynamicCircleConstants.fieldLeft, y: 330 - params.triH / 2 }
    ];
  }
  return [
    { x: dynamicCircleConstants.fieldLeft, y: dynamicCircleConstants.fieldTop },
    { x: params.xBound, y: dynamicCircleConstants.fieldTop },
    { x: params.xBound, y: dynamicCircleConstants.fieldBottom },
    {
      x: dynamicCircleConstants.fieldLeft,
      y: dynamicCircleConstants.fieldBottom
    },
    { x: dynamicCircleConstants.fieldLeft, y: dynamicCircleConstants.fieldTop }
  ];
}

function insideField(point: Point, params: DynamicCircleParams): boolean {
  if (params.boundary === 'circle') {
    return (
      Math.hypot(point.x - params.circleX, point.y - 330) <= params.circleR + 2
    );
  }
  if (params.boundary === 'triangle') {
    const top = 330 - params.triH / 2;
    const bottom = 330 + params.triH / 2;
    if (
      point.x < dynamicCircleConstants.fieldLeft - 2 ||
      point.x > params.triX + 2
    )
      return false;
    const half = (params.triX - dynamicCircleConstants.fieldLeft) * 0.5;
    const center = dynamicCircleConstants.fieldLeft + half;
    const maxY =
      top +
      (bottom - top) *
        Math.min(
          1,
          Math.max(
            0,
            (point.x - dynamicCircleConstants.fieldLeft) /
              (params.triX - dynamicCircleConstants.fieldLeft)
          )
        );
    const allowed =
      Math.abs(point.y - 330) <=
      Math.max(
        0,
        half === 0
          ? 0
          : (params.triH / 2) *
              Math.min(
                1,
                Math.max(
                  0,
                  (point.x - dynamicCircleConstants.fieldLeft) /
                    (params.triX - dynamicCircleConstants.fieldLeft)
                )
              )
      );
    void center;
    void maxY;
    return allowed;
  }
  return (
    point.x >= dynamicCircleConstants.fieldLeft - 2 &&
    point.x <= params.xBound + 2 &&
    point.y >= dynamicCircleConstants.fieldTop - 2 &&
    point.y <= dynamicCircleConstants.fieldBottom + 2
  );
}

function boundaryMetric(params: DynamicCircleParams): string {
  if (params.boundary === 'circle')
    return `磁场半径 r_f: ${params.circleR.toFixed(0)} 米`;
  if (params.boundary === 'triangle')
    return `水平跨度 w: ${(params.triX - dynamicCircleConstants.fieldLeft).toFixed(0)} 米`;
  return `磁场宽度 d: ${(params.xBound - dynamicCircleConstants.fieldLeft).toFixed(0)} 米`;
}

function criticalRadiusFor(params: DynamicCircleParams): number | null {
  if (params.boundary === 'circle') return params.circleR;
  if (params.boundary === 'triangle')
    return Math.min(
      params.triH / 2,
      params.triX - dynamicCircleConstants.fieldLeft
    );
  return params.xBound - dynamicCircleConstants.fieldLeft;
}

function buildTrajectory(
  source: Point,
  radius: number,
  angle: number,
  B: number,
  distance = TRAJECTORY_STEP * TRAJECTORY_SAMPLES
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= TRAJECTORY_SAMPLES; i += 1) {
    points.push(
      orbitPoint(source, radius, angle, B, (i / TRAJECTORY_SAMPLES) * distance)
    );
  }
  return points;
}

function buildScalingTrajectory(
  source: Point,
  radius: number,
  B: number
): Point[] {
  const direction = B < 0 ? -1 : 1;
  const deflection = Number.isFinite(radius)
    ? Math.max(2, Math.min(18, radius / 28))
    : 2;
  const points: Point[] = [];
  for (let i = 0; i <= TRAJECTORY_SAMPLES; i += 1) {
    const progress = i / TRAJECTORY_SAMPLES;
    points.push({
      x: source.x - direction * deflection * progress * progress,
      y: source.y - 291 * progress
    });
  }
  return points;
}

function computeState(
  params: DynamicCircleParams,
  t: number
): DynamicCircleState {
  const source = sourceFor(params);
  const angle = angleFor(params);
  const radius = orbitRadius(params.v, params.B);
  const center = circleCenter(source, radius, angle, params.B);
  const trajectory =
    params.tab === 'scaling'
      ? buildScalingTrajectory(source, radius, params.B)
      : buildTrajectory(source, radius, angle, params.B);
  const fanTrajectories =
    params.tab === 'comprehensive'
      ? [-30, 30].map((offset) =>
          buildTrajectory(source, radius, angle + offset, params.B, 330)
        )
      : [];
  const auxiliaryRadii =
    params.tab === 'scaling'
      ? [6, 8, 10, 12, 14, 16].map(
          (value) =>
            value * Math.max(1, Number.isFinite(radius) ? radius / 12 : 1)
        )
      : [];
  const firstOutside = trajectory.findIndex(
    (point) => !insideField(point, params)
  );
  const status: DynamicCircleState['status'] =
    firstOutside > 6 ? '飞出磁场' : '束缚';
  const criticalRadius = criticalRadiusFor(params);
  return {
    params: { ...params },
    t,
    source,
    velocity: vectorFromAngle(55, angle),
    radius,
    center,
    trajectory,
    fanTrajectories,
    auxiliaryRadii,
    boundaryPath: boundaryPath(params),
    fieldBounds: fieldBounds(params),
    criticalRadius,
    status,
    boundaryMetric: boundaryMetric(params)
  };
}

export function createDynamicCircleSim(
  initial: Partial<DynamicCircleParams> = {}
) {
  let params = normalizeParams({
    tab: 'scaling',
    boundary: 'straight',
    B: 0.1,
    v: 11.5,
    theta: -90,
    y0: 330,
    xBound: 480,
    triX: 480,
    triH: 300,
    circleR: 120,
    circleX: 380,
    autoSweep: false,
    showCenter: true,
    ...initial
  });
  let t = 0;

  return {
    getState(): DynamicCircleState {
      return computeState(params, t);
    },
    getSnapshot(): DynamicCircleState {
      return computeState(params, t);
    },
    getParams(): DynamicCircleParams {
      return { ...params };
    },
    setParams(next: Partial<DynamicCircleParams>): DynamicCircleParams {
      params = normalizeParams({ ...params, ...next }, params);
      return { ...params };
    },
    setTab(tab: DynamicCircleTab): DynamicCircleParams {
      const modeDefaults =
        tab === 'scaling' ? { v: 11.5, theta: -90 } : { v: 15, theta: 0 };
      params = normalizeParams({ ...params, ...modeDefaults, tab }, params);
      return { ...params };
    },
    setBoundary(boundary: DynamicCircleBoundary): DynamicCircleParams {
      params = normalizeParams({ ...params, boundary }, params);
      return { ...params };
    },
    step(dt: number): void {
      t += Math.max(0, finite(dt, 0));
      if (!params.autoSweep) return;
      const wave = 0.5 + 0.5 * Math.sin(t * 1.2);
      if (params.tab === 'scaling') params.v = 5 + 20 * wave;
      else if (params.tab === 'rotating') params.theta = -75 + 150 * wave;
      else if (params.tab === 'translating') params.y0 = 160 + 340 * wave;
      else params.v = 6 + 18 * wave;
    },
    reset(): void {
      params = normalizeParams({
        tab: 'scaling',
        boundary: 'straight',
        B: 0.1,
        v: 11.5,
        theta: -90,
        y0: 330,
        xBound: 480,
        triX: 480,
        triH: 300,
        circleR: 120,
        circleX: 380,
        autoSweep: false,
        showCenter: true
      });
      t = 0;
    },
    pickHandle(x: number, y: number, radius = 22): DynamicCircleHandle {
      const px = clamp(finite(x, 0), 0, 1) * dynamicCircleConstants.baseWidth;
      const py = clamp(finite(y, 0), 0, 1) * dynamicCircleConstants.baseHeight;
      const state = computeState(params, t);
      const distance = (point: Point): number =>
        Math.hypot(px - point.x, py - point.y);
      if (
        params.boundary === 'straight' &&
        distance({ x: params.xBound, y: 75 }) <= radius
      )
        return 'boundary';
      if (
        params.boundary === 'triangle' &&
        distance({ x: params.triX, y: 330 }) <= radius
      )
        return 'triangle';
      if (params.boundary === 'circle') {
        if (distance({ x: params.circleX, y: 330 }) <= radius)
          return 'circle-center';
        if (distance({ x: params.circleX + params.circleR, y: 330 }) <= radius)
          return 'circle-radius';
      }
      if (params.tab === 'rotating' && distance({ x: 355, y: 330 }) <= radius)
        return 'velocity';
      void state;
      return null;
    },
    moveHandle(
      handle: Exclude<DynamicCircleHandle, null>,
      x: number,
      y: number
    ): void {
      const px = clamp(finite(x, 0), 0, 1) * dynamicCircleConstants.baseWidth;
      const py = clamp(finite(y, 0), 0, 1) * dynamicCircleConstants.baseHeight;
      if (handle === 'boundary') params.xBound = clamp(px, 320, 600);
      else if (handle === 'triangle') params.triX = clamp(px, 320, 600);
      else if (handle === 'circle-center') {
        params.circleX = clamp(px, 280, 520);
      } else if (handle === 'circle-radius') {
        params.circleR = clamp(Math.abs(px - params.circleX), 50, 200);
      } else if (handle === 'velocity') {
        params.theta = clamp(Math.atan2(330 - py, px - 300) / DEG, -90, 90);
      }
    }
  };
}
