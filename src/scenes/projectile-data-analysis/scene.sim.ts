import { clamp } from '../../core/math';

export type ProjectileDataMode = 'trajectory' | 'strobe';

export type ProjectileDataParams = {
  v0: number;
  gravity: number;
  period: number;
  mode: ProjectileDataMode;
  showVectors: boolean;
};

export type ProjectileDataPoint = {
  index: number;
  time: number;
  x: number;
  y: number;
  deltaY: number;
};

export type ProjectileDataState = {
  params: ProjectileDataParams;
  time: number;
  currentIndex: number;
  points: ProjectileDataPoint[];
  current: ProjectileDataPoint;
  deltaX: number;
  deltaY2: number;
  restoredV0: number;
  vx: number;
  vy: number;
  speed: number;
};

const BASE_W = 820;
const BASE_H = 620;
const ORIGIN_X = 88;
const ORIGIN_Y = 92;
const AXIS_END_X = 790;
const AXIS_END_Y = 590;
const GRID_STEP_X = 112;
const GRID_STEP_Y = 96;
const GRID_COUNT_X = 6;
const GRID_COUNT_Y = 5;
const X_SCALE = 280;
const Y_SCALE = 240;
const SAMPLE_COUNT = 6;
const POINT_RADIUS = 7;
const LABEL_OFFSET_X = 12;
const LABEL_OFFSET_Y = 14;
const TRAJECTORY_SAMPLE_COUNT = 72;
const VECTOR_SCALE = 10;
const ANALYSIS_LEFT = 505;
const ANALYSIS_TOP = 150;
const ANALYSIS_WIDTH = 255;
const ANALYSIS_HEIGHT = 122;
const FORMULA_LEFT = 72;
const FORMULA_TOP = 570;
const FORMULA_MID = 390;
const FORMULA_RIGHT = 748;
const TITLE_Y = 30;
const SUBTITLE_Y = 56;
const INITIAL_INDEX = 3;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeParams(
  input: Partial<ProjectileDataParams>
): ProjectileDataParams {
  return {
    v0: clamp(finite(input.v0, 2), 0.5, 5),
    gravity: clamp(finite(input.gravity, 10), 1.6, 15),
    period: clamp(finite(input.period, 0.15), 0.05, 0.3),
    mode: input.mode === 'trajectory' ? 'trajectory' : 'strobe',
    showVectors: input.showVectors !== false
  };
}

export function projectileDataPoint(
  v0: number,
  gravity: number,
  period: number,
  index: number
): ProjectileDataPoint {
  const safeV0 = Math.max(0, v0);
  const safeGravity = Math.max(0, gravity);
  const safePeriod = Math.max(0, period);
  const safeIndex = Math.max(0, Math.floor(index));
  const time = safeIndex * safePeriod;
  const x = safeV0 * time;
  const y = 0.5 * safeGravity * time * time;
  const previousY =
    safeIndex === 0 ? 0 : 0.5 * safeGravity * (time - safePeriod) ** 2;
  return { index: safeIndex, time, x, y, deltaY: y - previousY };
}

export function projectileDataDeltaY2(gravity: number, period: number): number {
  return Math.max(0, gravity) * Math.max(0, period) ** 2;
}

export const projectileDataConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  originX: ORIGIN_X,
  originY: ORIGIN_Y,
  axisEndX: AXIS_END_X,
  axisEndY: AXIS_END_Y,
  gridStepX: GRID_STEP_X,
  gridStepY: GRID_STEP_Y,
  gridCountX: GRID_COUNT_X,
  gridCountY: GRID_COUNT_Y,
  xScale: X_SCALE,
  yScale: Y_SCALE,
  sampleCount: SAMPLE_COUNT,
  pointRadius: POINT_RADIUS,
  labelOffsetX: LABEL_OFFSET_X,
  labelOffsetY: LABEL_OFFSET_Y,
  trajectorySampleCount: TRAJECTORY_SAMPLE_COUNT,
  vectorScale: VECTOR_SCALE,
  analysisLeft: ANALYSIS_LEFT,
  analysisTop: ANALYSIS_TOP,
  analysisWidth: ANALYSIS_WIDTH,
  analysisHeight: ANALYSIS_HEIGHT,
  formulaLeft: FORMULA_LEFT,
  formulaTop: FORMULA_TOP,
  formulaMid: FORMULA_MID,
  formulaRight: FORMULA_RIGHT,
  titleY: TITLE_Y,
  subtitleY: SUBTITLE_Y,
  initialIndex: INITIAL_INDEX
};

export function createProjectileDataSim(
  initial: Partial<ProjectileDataParams> = {}
) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;

  function makePoints(): ProjectileDataPoint[] {
    return Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) =>
      projectileDataPoint(params.v0, params.gravity, params.period, index)
    );
  }

  return {
    getState(): ProjectileDataState {
      const points = makePoints();
      const currentIndex = Math.min(
        SAMPLE_COUNT,
        Math.floor(time / Math.max(params.period, 0.001))
      );
      const current = points[currentIndex];
      const vx = params.v0;
      const vy = params.gravity * current.time;
      return {
        params: { ...params },
        time,
        currentIndex,
        points,
        current,
        deltaX: params.v0 * params.period,
        deltaY2: projectileDataDeltaY2(params.gravity, params.period),
        restoredV0:
          params.period > 0 ? (params.v0 * params.period) / params.period : 0,
        vx,
        vy,
        speed: Math.hypot(vx, vy)
      };
    },
    getSnapshot(): ProjectileDataState {
      return this.getState();
    },
    getParams(): ProjectileDataParams {
      return { ...params };
    },
    setParams(next: Partial<ProjectileDataParams>): ProjectileDataParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    step(dt: number): void {
      time += Math.max(0, finite(dt, 0));
      const cycle = Math.max(params.period * (SAMPLE_COUNT + 1), 0.1);
      if (time > cycle) time %= cycle;
    },
    reset(): void {
      time = 0;
      params = { ...defaults };
    }
  };
}
