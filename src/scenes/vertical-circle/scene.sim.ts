import { clamp } from '../../core/math';

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
  position: VerticalCirclePoint;
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

export const verticalCircleConstants = {
  baseWidth: 900,
  baseHeight: 660,
  fieldWidth: 650,
  centerX: 320,
  centerY: 330,
  orbitRadius: 250,
  panelWidth: 236,
  panelInset: 24,
  titleY: 60,
  modelY: 92,
  modelLineY: 120,
  formulaTop: 190,
  formulaHeight: 76,
  formulaLineOneY: 215,
  formulaLineTwoY: 243,
  statusTop: 284,
  statusHeight: 76,
  statusTitleY: 307,
  statusBodyY: 333,
  valuesTop: 368,
  valuesHeight: 194,
  valuesStartY: 398,
  valuesRowGap: 34,
  constantsY: 620,
  canvasTitleY: 28,
  topLabelY: 48,
  bottomLabelY: 622,
  leftLabelX: 34,
  rightLabelX: 606,
  statusPillY: 610,
  statusPillLeft: 110,
  statusPillWidth: 420,
  statusPillHeight: 40,
  statusPillRadius: 20,
  gridStep: 50,
  vectorScale: 3.2,
  ballRadius: 17,
  maxVectorLength: 112,
  handleRadius: 34
} as const;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeAngle(angle: number): number {
  let value = finite(angle, -51);
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function normalizeParams(
  input: Partial<VerticalCircleParams>,
  previous?: VerticalCircleParams
): VerticalCircleParams {
  return {
    model: input.model === 'rod' ? 'rod' : (previous?.model ?? 'rope'),
    vBottom: clamp(finite(input.vBottom, previous?.vBottom ?? 23.5), 0, 35),
    theta: normalizeAngle(finite(input.theta, previous?.theta ?? -51)),
    autoRun: input.autoRun ?? previous?.autoRun ?? true,
    showVectors: input.showVectors ?? previous?.showVectors ?? true,
    showPath: input.showPath ?? previous?.showPath ?? true
  };
}

export function verticalCircleTopSpeed(vBottom: number): number {
  return Math.sqrt(Math.max(0, finite(vBottom, 0) ** 2 - 4 * G * RADIUS_M));
}

export function verticalCircleSpeedAtAngle(
  vBottom: number,
  theta: number
): number {
  const angle = normalizeAngle(theta) * DEG;
  return Math.sqrt(
    Math.max(
      0,
      finite(vBottom, 0) ** 2 - 2 * G * RADIUS_M * (1 + Math.cos(angle))
    )
  );
}

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

function positionAtAngle(theta: number): VerticalCirclePoint {
  const angle = normalizeAngle(theta) * DEG;
  return {
    x:
      verticalCircleConstants.centerX +
      verticalCircleConstants.orbitRadius * Math.sin(angle),
    y:
      verticalCircleConstants.centerY -
      verticalCircleConstants.orbitRadius * Math.cos(angle)
  };
}

function statusFor(
  model: VerticalCircleModel,
  constraintForce: number,
  topConstraint: number
): string {
  if (model === 'rope') {
    if (topConstraint < -0.01) return '最高点脱轨';
    if (constraintForce < -0.01) return '绳子松弛';
    return '绳子拉力有效';
  }
  return constraintForce < -0.01 ? '杆受压' : '杆受拉';
}

export function createVerticalCircleSim(
  initial: Partial<VerticalCircleParams> = {}
) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): VerticalCircleState {
    const angle = params.theta;
    const angleRad = angle * DEG;
    const speed = verticalCircleSpeedAtAngle(params.vBottom, angle);
    const topSpeed = verticalCircleTopSpeed(params.vBottom);
    const normalForce = (MASS * speed ** 2) / RADIUS_M;
    const gravityRadial = MASS * G * Math.cos(angleRad);
    const gravityTangential = MASS * G * Math.sin(angleRad);
    const constraintForce = normalForce - gravityRadial;
    const topConstraint = (MASS * topSpeed ** 2) / RADIUS_M - MASS * G;
    return {
      params: { ...params },
      time,
      angle,
      position: positionAtAngle(angle),
      speed,
      topSpeed,
      normalForce,
      gravityRadial,
      gravityTangential,
      constraintForce,
      topConstraint,
      criticalBottomSpeed: verticalCircleCriticalBottomSpeed(params.model),
      criticalTopSpeed: params.model === 'rope' ? Math.sqrt(G * RADIUS_M) : 0,
      status: statusFor(params.model, constraintForce, topConstraint)
    };
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
      const px = x * verticalCircleConstants.baseWidth;
      const py = y * verticalCircleConstants.baseHeight;
      const point = positionAtAngle(params.theta);
      return Math.hypot(px - point.x, py - point.y) <=
        verticalCircleConstants.handleRadius
        ? 'ball'
        : null;
    },
    moveHandle(
      handle: Exclude<VerticalCircleHandle, null>,
      x: number,
      y: number
    ): void {
      if (handle !== 'ball') return;
      const px = x * verticalCircleConstants.baseWidth;
      const py = y * verticalCircleConstants.baseHeight;
      const dx = px - verticalCircleConstants.centerX;
      const dy = py - verticalCircleConstants.centerY;
      params.theta = normalizeAngle(Math.atan2(dx, -dy) / DEG);
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const seconds = Math.max(0, finite(dt, 0));
      const angularSpeed =
        verticalCircleSpeedAtAngle(params.vBottom, params.theta) /
        RADIUS_M /
        DEG;
      params.theta = normalizeAngle(params.theta + angularSpeed * seconds);
      time += seconds;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
