import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';
import { finiteNumber } from '../../core/coerce';
import { measureStageLayout, fitStage } from '../stage-fit';
import type { StageLayoutHint } from '../stage-fit';

export type VerticalCircleModel = 'rope' | 'rod';
export type VerticalCircleHandle = 'ball' | null;

export type VerticalCircleParams = {
  model: VerticalCircleModel;
  vBottom: number;
  theta: number;
  autoRun: boolean;
  showVectors: boolean;
  showPath: boolean;
};

export type VerticalCirclePoint = { x: number; y: number };

export type VerticalCircleState = {
  params: VerticalCircleParams;
  time: number;
  angle: number;
  sense: 1 | -1;
  position: VerticalCirclePoint;
  velocity: VerticalCirclePoint;
  speed: number;
  topSpeed: number;
  normalForce: number;
  gravityRadial: number;
  gravityTangential: number;
  constraintForce: number;
  topConstraint: number;
  criticalBottomSpeed: number;
  criticalTopSpeed: number;
  status: string;
};

const G = 10;
const MASS = 1;
const RADIUS_M = 10;
const DEG = Math.PI / 180;
const V_BOTTOM_MIN = 0;
const V_BOTTOM_MAX = 35;
const V_BOTTOM_DEFAULT = 23.5;
const THETA_DEFAULT = -51;
const BASE_W = 720;
const BASE_H = 660;
const CENTER_X = 360;
const CENTER_Y = 372;
const ORBIT_RADIUS = 196;
const FRAME_DT = 1 / 60;
const STEP_MAX_DT = 0.02;
const REST_SPEED = 1e-8;
const FORCE_EPS = 0.01;
const TOP_ANGLE_ABS = 8;

const DEFAULTS: VerticalCircleParams = {
  model: 'rope',
  vBottom: V_BOTTOM_DEFAULT,
  theta: THETA_DEFAULT,
  autoRun: true,
  showVectors: true,
  showPath: true
};

export const verticalCircleConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  centerX: CENTER_X,
  centerY: CENTER_Y,
  orbitRadius: ORBIT_RADIUS,
  g: G,
  mass: MASS,
  radiusM: RADIUS_M,
  vBottomMin: V_BOTTOM_MIN,
  vBottomMax: V_BOTTOM_MAX,
  vBottomDefault: V_BOTTOM_DEFAULT,
  thetaDefault: THETA_DEFAULT,
  gridStep: 40,
  vectorScale: 4.8,
  ballRadius: 18,
  pivotRadius: 22,
  pivotHub: 8,
  maxVectorLength: 118,
  minVectorLength: 26,
  handleRadius: 52,
  gravityLength: 70,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  overlayClearTop: 96,
  minReadableFit: 0.5,
  transportClearY: 96,
  frameDt: FRAME_DT
} as const;

const C = verticalCircleConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }
  return fallback;
}

function parseModel(
  value: unknown,
  fallback: VerticalCircleModel
): VerticalCircleModel {
  if (value === 'rod' || value === 1 || value === '1') return 'rod';
  if (value === 'rope' || value === 0 || value === '0') return 'rope';
  return fallback;
}

export function normalizeAngle(angle: number): number {
  // 先取余（浮点取余是精确的）再单步修正：与逐次 ±360 的结果一致，
  // 但不随 |angle| 增长迭代——URL 可注入 1e308，循环会永不终止。
  let value = finiteNumber(angle, THETA_DEFAULT) % 360;
  if (value > 180) value -= 360;
  if (value < -180) value += 360;
  return value;
}

function normalizeParams(
  input: Partial<VerticalCircleParams>,
  previous: VerticalCircleParams = DEFAULTS
): VerticalCircleParams {
  return {
    model: parseModel(input.model, previous.model),
    vBottom: clamp(
      finiteNumber(input.vBottom, previous.vBottom),
      V_BOTTOM_MIN,
      V_BOTTOM_MAX
    ),
    theta: normalizeAngle(finiteNumber(input.theta, previous.theta)),
    autoRun:
      input.autoRun === undefined
        ? previous.autoRun
        : asBool(input.autoRun, previous.autoRun),
    showVectors:
      input.showVectors === undefined
        ? previous.showVectors
        : asBool(input.showVectors, previous.showVectors),
    showPath:
      input.showPath === undefined
        ? previous.showPath
        : asBool(input.showPath, previous.showPath)
  };
}

/** v_top = √max(0, v_bottom² − 4gR) */
export function verticalCircleTopSpeed(vBottom: number): number {
  return Math.sqrt(
    Math.max(0, finiteNumber(vBottom, 0) ** 2 - 4 * G * RADIUS_M)
  );
}

/** v(θ)² = v_bottom² − 2gR(1 + cosθ)，平方非负夹取 */
export function verticalCircleSpeedAtAngle(
  vBottom: number,
  theta: number
): number {
  const angle = normalizeAngle(theta) * DEG;
  return Math.sqrt(
    Math.max(
      0,
      finiteNumber(vBottom, 0) ** 2 - 2 * G * RADIUS_M * (1 + Math.cos(angle))
    )
  );
}

/** T = m v²/R − m g cosθ（正：指向圆心 / 拉力） */
export function verticalCircleConstraintForce(
  vBottom: number,
  theta: number
): number {
  const angle = normalizeAngle(theta) * DEG;
  const speed = verticalCircleSpeedAtAngle(vBottom, theta);
  return (MASS * speed ** 2) / RADIUS_M - MASS * G * Math.cos(angle);
}

export function verticalCircleCriticalBottomSpeed(
  model: VerticalCircleModel
): number {
  return model === 'rope' ? Math.sqrt(5 * G * RADIUS_M) : 0;
}

export function verticalCircleCriticalTopSpeed(
  model: VerticalCircleModel
): number {
  return model === 'rope' ? Math.sqrt(G * RADIUS_M) : 0;
}

export function verticalCircleGravityRadial(theta: number): number {
  return MASS * G * Math.cos(normalizeAngle(theta) * DEG);
}

export function verticalCircleGravityTangential(theta: number): number {
  return MASS * G * Math.sin(normalizeAngle(theta) * DEG);
}

/** 能量允许的最小 |θ|；能过最高点时为 0。 */
export function verticalCircleTurningAbs(vBottom: number): number {
  const limit = finiteNumber(vBottom, 0) ** 2 / (2 * G * RADIUS_M) - 1;
  if (limit >= 1 - 1e-12) return 0;
  return Math.acos(clamp(limit, -1, 1)) / DEG;
}

export function positionAtAngle(theta: number): VerticalCirclePoint {
  const angle = normalizeAngle(theta) * DEG;
  return {
    x: C.centerX + C.orbitRadius * Math.sin(angle),
    y: C.centerY - C.orbitRadius * Math.cos(angle)
  };
}

function statusFor(
  model: VerticalCircleModel,
  theta: number,
  constraintForce: number,
  topConstraint: number
): string {
  if (model === 'rope') {
    if (constraintForce < -FORCE_EPS) {
      return Math.abs(normalizeAngle(theta)) <= TOP_ANGLE_ABS
        ? '最高点脱轨'
        : '绳子松弛';
    }
    if (topConstraint < -FORCE_EPS) return '最高点脱轨';
    return '绳子拉力有效';
  }
  return constraintForce < -FORCE_EPS ? '杆受压' : '杆受拉';
}

export const hasFloatingReadout = readoutOccludesStage;

export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  return measureStageLayout(canvas, FLOATING_OVERLAY_FALLBACK);
}

/**
 * 720×660 动画舞台。无浮层 / 移动堆叠居中铺满；
 * 桌面浮动读数优先缩进 overlay 左侧，窄分栏改放到实测 overlay 下方。
 */
export function stageTransform(
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint
) {
  return fitStage(cssWidth, cssHeight, layout, {
    baseWidth: C.baseWidth,
    baseHeight: C.baseHeight,
    overlayGapPx: C.overlayGapPx,
    minReadableFit: C.minReadableFit,
    overlayClearTop: C.overlayClearTop,
    overlayFallbackPx: FLOATING_OVERLAY_FALLBACK
  });
}

export function pointerToBaseNorm(
  cssX: number,
  cssY: number,
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint
): { x: number; y: number } {
  const { fit, offsetX, offsetY, boxW, boxH } = stageTransform(
    cssWidth,
    cssHeight,
    layout
  );
  const scale = Math.max(fit, 1e-6);
  return {
    x: (cssX - offsetX) / (scale * boxW),
    y: (cssY - offsetY) / (scale * boxH)
  };
}

function makeState(
  params: VerticalCircleParams,
  time: number,
  sense: 1 | -1
): VerticalCircleState {
  const angle = params.theta;
  const angleRad = angle * DEG;
  const speed = verticalCircleSpeedAtAngle(params.vBottom, angle);
  const topSpeed = verticalCircleTopSpeed(params.vBottom);
  const normalForce = (MASS * speed ** 2) / RADIUS_M;
  const gravityRadial = MASS * G * Math.cos(angleRad);
  const gravityTangential = MASS * G * Math.sin(angleRad);
  const constraintForce = normalForce - gravityRadial;
  const topConstraint = (MASS * topSpeed ** 2) / RADIUS_M - MASS * G;
  const tangentX = Math.cos(angleRad);
  const tangentY = Math.sin(angleRad);
  return {
    params: { ...params },
    time,
    angle,
    sense,
    position: positionAtAngle(angle),
    velocity: {
      x: sense * tangentX * speed,
      y: sense * tangentY * speed
    },
    speed,
    topSpeed,
    normalForce,
    gravityRadial,
    gravityTangential,
    constraintForce,
    topConstraint,
    criticalBottomSpeed: verticalCircleCriticalBottomSpeed(params.model),
    criticalTopSpeed: verticalCircleCriticalTopSpeed(params.model),
    status: statusFor(params.model, angle, constraintForce, topConstraint)
  };
}

export function createVerticalCircleSim(
  initial: Partial<VerticalCircleParams> = {}
) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;
  let sense: 1 | -1 = 1;

  function getState(): VerticalCircleState {
    return makeState(params, time, sense);
  }

  function advance(dt: number, force: boolean): void {
    if (!force && !params.autoRun) return;
    const seconds = finiteNumber(dt, 0);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    time += seconds;
    let remaining = seconds;
    while (remaining > 0) {
      const h = Math.min(remaining, STEP_MAX_DT);
      remaining -= h;
      const speed = verticalCircleSpeedAtAngle(params.vBottom, params.theta);
      if (speed <= REST_SPEED) {
        sense = sense === 1 ? -1 : 1;
        const nudged = normalizeAngle(params.theta + sense * 0.35);
        if (verticalCircleSpeedAtAngle(params.vBottom, nudged) > REST_SPEED) {
          params.theta = nudged;
        }
        continue;
      }
      const omegaDeg = speed / RADIUS_M / DEG;
      const proposed = params.theta + sense * omegaDeg * h;
      const turnAbs = verticalCircleTurningAbs(params.vBottom);
      if (turnAbs > 1e-6) {
        const nextAbs = Math.abs(normalizeAngle(proposed));
        if (nextAbs < turnAbs - 1e-6) {
          const side = params.theta >= 0 ? 1 : -1;
          params.theta = side * turnAbs;
          sense = sense === 1 ? -1 : 1;
          continue;
        }
      }
      params.theta = normalizeAngle(proposed);
    }
  }

  return {
    getState,
    getSnapshot: getState,
    getParams(): VerticalCircleParams {
      return { ...params };
    },
    setParams(next: Partial<VerticalCircleParams>): VerticalCircleParams {
      params = normalizeParams({ ...params, ...next }, params);
      return { ...params };
    },
    pickHandle(x: number, y: number): VerticalCircleHandle {
      const px = finiteNumber(x, 0) * C.baseWidth;
      const py = finiteNumber(y, 0) * C.baseHeight;
      const point = positionAtAngle(params.theta);
      return Math.hypot(px - point.x, py - point.y) <= C.handleRadius
        ? 'ball'
        : null;
    },
    moveHandle(
      handle: Exclude<VerticalCircleHandle, null>,
      x: number,
      y: number
    ): void {
      if (handle !== 'ball') return;
      const px = finiteNumber(x, 0) * C.baseWidth;
      const py = finiteNumber(y, 0) * C.baseHeight;
      const dx = px - C.centerX;
      const dy = py - C.centerY;
      if (dx === 0 && dy === 0) return;
      params.theta = normalizeAngle(Math.atan2(dx, -dy) / DEG);
    },
    step(dt: number): void {
      advance(dt, false);
    },
    stepFrame(dt = FRAME_DT): void {
      advance(dt, true);
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      sense = 1;
    }
  };
}

export type { StageLayoutHint };
