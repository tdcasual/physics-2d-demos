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
  circleY: number;
  autoSweep: boolean;
  showCenter: boolean;
};

export type Point = { x: number; y: number };

export type TrajectoryResult = {
  points: Point[];
  center: Point | null;
  exited: boolean;
  exitPoint: Point | null;
};

export type DynamicCircleState = {
  params: DynamicCircleParams;
  t: number;
  source: Point;
  launchAngle: number;
  velocity: Point;
  radius: number;
  center: Point | null;
  trajectory: Point[];
  auxiliaryTrajectories: Point[][];
  fanTrajectories: Point[][];
  boundaryPath: Point[];
  fieldBounds: { left: number; right: number; top: number; bottom: number };
  exitPoint: Point | null;
  particle: Point;
  velocityFrom: Point;
  velocityTo: Point;
  criticalRadius: number | null;
  status: '束缚在内 (安全)' | '飞出磁场';
  boundaryMetric: string;
  criticalMetric: string;
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
  axisLeft: 40,
  axisRight: 610,
  axisTop: 40,
  axisBottom: 620,
  viewLeft: 40,
  viewRight: 610,
  viewTop: 40,
  viewBottom: 620,
  qOverM: 1,
  trajectoryStep: 1.5,
  maxTrajectorySteps: 600,
  fieldEps: 0.005,
  radiusEps: 0.001,
  particleSpeed: 168,
  velocityLength: 65,
  rotatingVelocityLength: 55,
  handleRadius: 22,
  fieldSymbolStep: 35,
  fieldSymbolInset: 15,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  /**
   * 浮动读数可覆盖的场景 y 上限。右边界标签顶在 fieldTop-25=55，
   * 此线以上视为 viewBox 垫边，允许伸进 overlay 以换更大舞台。
   */
  overlayClearTop: 56
} as const;

const C = dynamicCircleConstants;
const DEG = Math.PI / 180;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

const DEFAULTS: DynamicCircleParams = {
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
  circleY: 330,
  autoSweep: false,
  showCenter: true
};

export type StageLayoutHint = {
  floatingReadout: boolean;
  overlayPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
};

type StagePose = {
  fit: number;
  offsetX: number;
  offsetY: number;
};

function containInRect(
  boxW: number,
  boxH: number,
  availW: number,
  availH: number,
  originX: number,
  originY: number,
  alignX: 'left' | 'center'
): StagePose {
  const w = Math.max(1, availW);
  const h = Math.max(1, availH);
  const fit = Math.min(w / boxW, h / boxH);
  const stageW = boxW * fit;
  const stageH = boxH * fit;
  return {
    fit,
    offsetX: originX + (alignX === 'center' ? (w - stageW) / 2 : 0),
    offsetY: originY + (h - stageH) / 2
  };
}

function betterPose(a: StagePose, b: StagePose): StagePose {
  return b.fit > a.fit + 1e-9 ? b : a;
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
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

export function tabDefaults(tab: DynamicCircleTab): {
  v: number;
  theta: number;
  y0: number;
} {
  if (tab === 'scaling') return { v: 11.5, theta: -90, y0: 330 };
  if (tab === 'rotating') return { v: 15, theta: 0, y0: 330 };
  return { v: 15, theta: -90, y0: 330 };
}

function normalizeParams(
  input: Partial<DynamicCircleParams>,
  previous?: DynamicCircleParams
): DynamicCircleParams {
  const prev = previous ?? DEFAULTS;
  return {
    tab: normalizeTab(input.tab ?? prev.tab),
    boundary: normalizeBoundary(input.boundary ?? prev.boundary),
    B: clamp(finite(input.B, prev.B), -0.25, 0.25),
    v: clamp(finite(input.v, prev.v), 4, 25),
    theta: clamp(finite(input.theta, prev.theta), -90, 90),
    y0: clamp(finite(input.y0, prev.y0), 150, 510),
    xBound: clamp(finite(input.xBound, prev.xBound), 320, 600),
    triX: clamp(finite(input.triX, prev.triX), 320, 600),
    triH: clamp(finite(input.triH, prev.triH), 150, 450),
    circleR: clamp(finite(input.circleR, prev.circleR), 50, 200),
    circleX: clamp(finite(input.circleX, prev.circleX), 280, 520),
    circleY: clamp(finite(input.circleY, prev.circleY), 180, 480),
    autoSweep: asBool(input.autoSweep, prev.autoSweep),
    showCenter: asBool(input.showCenter, prev.showCenter)
  };
}

export function orbitRadius(v: number, B: number): number {
  const speed = Math.max(0, finite(v, 0));
  const qB = Math.abs(C.qOverM * finite(B, 0));
  return qB < C.radiusEps ? Number.POSITIVE_INFINITY : speed / qB;
}

export function vectorFromAngle(magnitude: number, angle: number): Point {
  const theta = finite(angle, 0) * DEG;
  return { x: magnitude * Math.cos(theta), y: magnitude * Math.sin(theta) };
}

export function chargeSign(B: number): number {
  return finite(B, 0) > 0 ? 1 : -1;
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

export function sourceFor(params: DynamicCircleParams): Point {
  if (params.tab === 'rotating') {
    return { x: C.rotatingSourceX, y: C.sourceY };
  }
  if (params.tab === 'translating') {
    return { x: C.sourceX, y: params.y0 };
  }
  return { x: C.sourceX, y: C.sourceY };
}

export function launchAngle(params: DynamicCircleParams): number {
  return params.tab === 'scaling' ? -90 : params.theta;
}

export function insideField(
  point: Point,
  params: DynamicCircleParams
): boolean {
  if (params.boundary === 'circle') {
    const dx = point.x - params.circleX;
    const dy = point.y - params.circleY;
    return dx * dx + dy * dy <= params.circleR * params.circleR;
  }
  if (params.boundary === 'triangle') {
    if (point.x < C.fieldLeft || point.x > params.triX) return false;
    const span = params.triX - C.fieldLeft;
    if (span <= 0) return false;
    const half = params.triH / 2;
    const yOff = (half * (params.triX - point.x)) / span;
    return point.y >= C.sourceY - yOff && point.y <= C.sourceY + yOff;
  }
  return (
    point.x >= C.fieldLeft &&
    point.x <= params.xBound &&
    point.y >= C.fieldTop &&
    point.y <= C.fieldBottom
  );
}

function fieldBounds(
  params: DynamicCircleParams
): DynamicCircleState['fieldBounds'] {
  if (params.boundary === 'circle') {
    return {
      left: params.circleX - params.circleR,
      right: params.circleX + params.circleR,
      top: params.circleY - params.circleR,
      bottom: params.circleY + params.circleR
    };
  }
  if (params.boundary === 'triangle') {
    return {
      left: C.fieldLeft,
      right: params.triX,
      top: C.sourceY - params.triH / 2,
      bottom: C.sourceY + params.triH / 2
    };
  }
  return {
    left: C.fieldLeft,
    right: params.xBound,
    top: C.fieldTop,
    bottom: C.fieldBottom
  };
}

function boundaryPath(params: DynamicCircleParams): Point[] {
  if (params.boundary === 'circle') {
    const points: Point[] = [];
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * Math.PI * 2;
      points.push({
        x: params.circleX + params.circleR * Math.cos(a),
        y: params.circleY + params.circleR * Math.sin(a)
      });
    }
    return points;
  }
  if (params.boundary === 'triangle') {
    return [
      { x: C.fieldLeft, y: C.sourceY - params.triH / 2 },
      { x: params.triX, y: C.sourceY },
      { x: C.fieldLeft, y: C.sourceY + params.triH / 2 },
      { x: C.fieldLeft, y: C.sourceY - params.triH / 2 }
    ];
  }
  return [
    { x: C.fieldLeft, y: C.fieldTop },
    { x: params.xBound, y: C.fieldTop },
    { x: params.xBound, y: C.fieldBottom },
    { x: C.fieldLeft, y: C.fieldBottom },
    { x: C.fieldLeft, y: C.fieldTop }
  ];
}

function boundaryMetric(params: DynamicCircleParams): string {
  if (params.boundary === 'circle')
    return `磁场半径 r_f: ${params.circleR.toFixed(0)} 米`;
  if (params.boundary === 'triangle')
    return `水平跨度 w: ${(params.triX - C.fieldLeft).toFixed(0)} 米`;
  return `磁场宽度 d: ${(params.xBound - C.sourceX).toFixed(0)} 米`;
}

/**
 * 直线边界刚擦到远边：R_c = d / (1 + s sin θ)。
 * θ 为速度与 +x 夹角（SVG，y 向下）；s = sign(qB)。
 * 分母 ≤ 0.01 时圆周到不了远边界。
 */
export function criticalRadiusFor(params: DynamicCircleParams): number | null {
  if (params.boundary === 'circle') return params.circleR;
  if (params.boundary === 'triangle') return null;
  const d = params.xBound - C.sourceX;
  const s = chargeSign(params.B);
  const denom = 1 + s * Math.sin(launchAngle(params) * DEG);
  if (denom <= 0.01) return null;
  return d / denom;
}

function criticalMetric(params: DynamicCircleParams): string {
  if (params.boundary === 'triangle') return '几何切触 (动值)';
  if (params.boundary === 'circle') return '对角对称临界';
  const value = criticalRadiusFor(params);
  return value === null ? '无边界相切' : `${value.toFixed(1)} 米`;
}

export function calculateTrajectory(
  origin: Point,
  angleDeg: number,
  radius: number,
  B: number,
  params: DynamicCircleParams
): TrajectoryResult {
  const points: Point[] = [{ x: origin.x, y: origin.y }];
  let x = origin.x;
  let y = origin.y;
  let heading = angleDeg * DEG;
  const qSign = chargeSign(B);
  const curved = Math.abs(B) > C.fieldEps && Number.isFinite(radius);
  const startedInside = insideField(origin, params);
  let mode: 'straight_pre' | 'circular' | 'straight_post' = startedInside
    ? 'circular'
    : 'straight_pre';
  let cx = origin.x;
  let cy = origin.y;
  let startPhi = 0;
  let stepCount = 0;
  let center: Point | null = null;
  let exitPoint: Point | null = null;
  let entered = startedInside;

  const placeCenter = (px: number, py: number, theta: number): void => {
    if (qSign > 0) {
      cx = px + radius * Math.sin(theta);
      cy = py - radius * Math.cos(theta);
    } else {
      cx = px - radius * Math.sin(theta);
      cy = py + radius * Math.cos(theta);
    }
    startPhi = Math.atan2(py - cy, px - cx);
    center = { x: cx, y: cy };
  };

  if (mode === 'circular' && curved) placeCenter(x, y, heading);

  for (let i = 0; i < C.maxTrajectorySteps; i += 1) {
    if (mode === 'straight_pre') {
      x += C.trajectoryStep * Math.cos(heading);
      y += C.trajectoryStep * Math.sin(heading);
      points.push({ x, y });
      if (insideField({ x, y }, params)) {
        entered = true;
        mode = 'circular';
        stepCount = 0;
        if (curved) placeCenter(x, y, heading);
      }
    } else if (mode === 'circular') {
      if (!curved) {
        x += C.trajectoryStep * Math.cos(heading);
        y += C.trajectoryStep * Math.sin(heading);
        points.push({ x, y });
      } else {
        stepCount += 1;
        const rot = qSign > 0 ? -1 : 1;
        const phi = startPhi + rot * (C.trajectoryStep / radius) * stepCount;
        x = cx + radius * Math.cos(phi);
        y = cy + radius * Math.sin(phi);
        points.push({ x, y });
      }
      if (!insideField({ x, y }, params)) {
        exitPoint = { x, y };
        mode = 'straight_post';
        if (curved) {
          const rot = qSign > 0 ? -1 : 1;
          const phi = startPhi + rot * (C.trajectoryStep / radius) * stepCount;
          heading = phi + (rot > 0 ? 1 : -1) * (Math.PI / 2);
        }
      }
    } else {
      x += C.trajectoryStep * Math.cos(heading);
      y += C.trajectoryStep * Math.sin(heading);
      points.push({ x, y });
    }
    if (x < C.viewLeft || x > C.viewRight || y < C.viewTop || y > C.viewBottom)
      break;
  }

  return {
    points,
    center: curved && entered ? center : null,
    exited: exitPoint !== null,
    exitPoint
  };
}

function pathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    );
  }
  return length;
}

function pointAtLength(points: Point[], distance: number): Point {
  if (points.length === 0) return { x: C.sourceX, y: C.sourceY };
  if (points.length === 1 || distance <= 0) return { ...points[0] };
  let remaining = distance;
  for (let i = 1; i < points.length; i += 1) {
    const span = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    );
    if (remaining <= span) {
      const t = span < 1e-9 ? 0 : remaining / span;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
      };
    }
    remaining -= span;
  }
  return { ...points[points.length - 1] };
}

function auxiliaryTrajectories(
  params: DynamicCircleParams,
  source: Point,
  angle: number,
  B: number,
  radius: number
): Point[][] {
  if (params.tab === 'scaling') {
    return [5, 9, 13, 17, 21].map((speed) => {
      const sampleR = orbitRadius(speed, B);
      return calculateTrajectory(source, angle, sampleR, B, params).points;
    });
  }
  if (params.tab === 'rotating') {
    return [-90, -60, -30, 0, 30, 60, 90, 180].map(
      (sample) => calculateTrajectory(source, sample, radius, B, params).points
    );
  }
  if (params.tab === 'translating') {
    return [190, 260, 330, 400, 470].map(
      (y) =>
        calculateTrajectory({ x: C.sourceX, y }, angle, radius, B, params)
          .points
    );
  }
  return [];
}

function fanTrajectories(
  params: DynamicCircleParams,
  source: Point,
  angle: number,
  B: number,
  radius: number
): Point[][] {
  if (params.tab !== 'comprehensive') return [];
  const paths: Point[][] = [];
  for (let sample = angle - 30; sample <= angle + 30; sample += 6) {
    if (sample === angle) continue;
    paths.push(calculateTrajectory(source, sample, radius, B, params).points);
  }
  return paths;
}

function computeState(
  params: DynamicCircleParams,
  t: number
): DynamicCircleState {
  const source = sourceFor(params);
  const angle = launchAngle(params);
  const radius = orbitRadius(params.v, params.B);
  const main = calculateTrajectory(source, angle, radius, params.B, params);
  const length = pathLength(main.points);
  const traveled = length > 1e-6 ? (t * C.particleSpeed) % length : 0;
  const particle = pointAtLength(main.points, traveled);
  const arrowLength =
    params.tab === 'rotating' ? C.rotatingVelocityLength : C.velocityLength;
  const heading = vectorFromAngle(arrowLength, angle);
  return {
    params: { ...params },
    t,
    source,
    launchAngle: angle,
    velocity: vectorFromAngle(arrowLength, angle),
    radius,
    center: main.center,
    trajectory: main.points,
    auxiliaryTrajectories: auxiliaryTrajectories(
      params,
      source,
      angle,
      params.B,
      radius
    ),
    fanTrajectories: fanTrajectories(params, source, angle, params.B, radius),
    boundaryPath: boundaryPath(params),
    fieldBounds: fieldBounds(params),
    exitPoint: main.exitPoint,
    particle,
    velocityFrom: { ...source },
    velocityTo: { x: source.x + heading.x, y: source.y + heading.y },
    criticalRadius: criticalRadiusFor(params),
    status: main.exited ? '飞出磁场' : '束缚在内 (安全)',
    boundaryMetric: boundaryMetric(params),
    criticalMetric: criticalMetric(params)
  };
}

function distPoint(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const span = dx * dx + dy * dy;
  if (span < 1e-9) return distPoint(point, a);
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / span, 0, 1);
  return distPoint(point, { x: a.x + t * dx, y: a.y + t * dy });
}

/**
 * 旋转圆拖角：atan2(Δy, Δx)（SVG，y 向下），再折到 [-90, 90]。
 * 左半平面折到较近端点，与原课件 pointermove 一致。
 */
export function clampLaunchAngle(dx: number, dy: number): number {
  let angle = (Math.atan2(dy, dx) / Math.PI) * 180;
  if (angle > 90 && angle < 180) angle = 90;
  else if (angle >= 180 || angle < -90) angle = -90;
  return clamp(angle, -90, 90);
}

export function hasFloatingReadout(anchor?: Element | null): boolean {
  if (typeof document === 'undefined') return true;
  const node = anchor ?? document.body;
  if (
    node.closest('.mobile-stack-layout, [data-testid="mobile-stack-layout"]')
  ) {
    return false;
  }
  if (node.closest('.split-right-shell, [data-testid="split-right-layout"]')) {
    return true;
  }
  const panel = document.querySelector(
    '.teaching-readout-panel, .srgb-readout-panel'
  );
  if (panel instanceof HTMLElement && anchor?.parentElement) {
    const overlay =
      getComputedStyle(panel).position === 'absolute' ||
      getComputedStyle(panel).position === 'fixed';
    return overlay && panel.parentElement === anchor.parentElement;
  }
  return true;
}

export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  const floatingReadout = hasFloatingReadout(canvas);
  if (!floatingReadout) return { floatingReadout: false, overlayPx: 0 };
  let overlayPx = 0;
  let overlayTopPx = 0;
  let overlayHeightPx = 0;
  if (canvas instanceof HTMLElement) {
    const panel = canvas.parentElement?.querySelector(
      '.teaching-readout-panel, .srgb-readout-panel'
    );
    if (panel instanceof HTMLElement) {
      const cr = canvas.getBoundingClientRect();
      const rr = panel.getBoundingClientRect();
      if (
        rr.left < cr.right &&
        rr.right > cr.left &&
        rr.top < cr.bottom &&
        rr.bottom > cr.top
      ) {
        overlayPx = Math.max(0, cr.right - rr.left);
        const top = Math.max(rr.top, cr.top);
        const bottom = Math.min(rr.bottom, cr.bottom);
        overlayTopPx = Math.max(0, top - cr.top);
        overlayHeightPx = Math.max(0, bottom - top);
      }
    }
  }
  return {
    floatingReadout: true,
    overlayPx: overlayPx || FLOATING_OVERLAY_FALLBACK,
    ...(overlayHeightPx > 0 ? { overlayTopPx, overlayHeightPx } : {})
  };
}

/**
 * 原 SVG viewBox 650×660。
 * 移动端 Tab 读数：按 650×660 吃满动画区并居中。
 * 桌面浮动读数：优先把 650 盒缩进 overlay 左侧；平板 split-right
 * 左侧过窄时改为把舞台放到实测 overlay 下方，并允许 viewBox
 * 顶部垫边伸进 overlay，避免动画被压成中间一小块。
 */
export function stageTransform(
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint
): {
  fit: number;
  offsetX: number;
  offsetY: number;
  boxW: number;
  boxH: number;
  floatingReadout: boolean;
} {
  const width = Math.max(1, cssWidth);
  const height = Math.max(1, cssHeight);
  const boxW = C.baseWidth;
  const boxH = C.baseHeight;

  if (!layout.floatingReadout) {
    const pose = containInRect(boxW, boxH, width, height, 0, 0, 'center');
    return { ...pose, boxW, boxH, floatingReadout: false };
  }

  const overlay = layout.overlayPx ?? FLOATING_OVERLAY_FALLBACK;
  const gap = C.overlayGapPx;
  let chosen = containInRect(
    boxW,
    boxH,
    Math.max(1, width - overlay - gap),
    height,
    0,
    0,
    'left'
  );

  const overlayTop = layout.overlayTopPx;
  const overlayH = layout.overlayHeightPx;
  if (
    typeof overlayTop === 'number' &&
    typeof overlayH === 'number' &&
    overlayH > 0
  ) {
    const overlayBottom = overlayTop + overlayH;
    const clearTop = C.overlayClearTop;
    const denom = boxH - clearTop;
    if (overlayBottom + gap < height - 1 && denom > 1) {
      const fit = Math.min(
        width / boxW,
        height / boxH,
        (height - overlayBottom - gap) / denom
      );
      if (fit > 0) {
        const stageW = boxW * fit;
        const stageH = boxH * fit;
        const minOY = overlayBottom + gap - clearTop * fit;
        const maxOY = height - stageH;
        chosen = betterPose(chosen, {
          fit,
          offsetX: Math.max(0, (width - stageW) / 2),
          offsetY: Math.max(0, Math.min(minOY, maxOY))
        });
      }
    }
  }

  const minReadable = 0.5;
  if (chosen.fit < minReadable) {
    const pose = containInRect(boxW, boxH, width, height, 0, 0, 'center');
    chosen = betterPose(chosen, {
      ...pose,
      offsetY: Math.max(0, height - boxH * pose.fit)
    });
  }

  return { ...chosen, boxW, boxH, floatingReadout: true };
}

export function pointerToBaseNorm(
  cssX: number,
  cssY: number,
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint
): { x: number; y: number } {
  const { fit, offsetX, offsetY } = stageTransform(cssWidth, cssHeight, layout);
  const scale = Math.max(fit, 1e-6);
  return {
    x: (cssX - offsetX) / (scale * C.baseWidth),
    y: (cssY - offsetY) / (scale * C.baseHeight)
  };
}

export function createDynamicCircleSim(
  initial: Partial<DynamicCircleParams> = {}
) {
  let params = normalizeParams({ ...DEFAULTS, ...initial });
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
      params = normalizeParams({ ...params, ...tabDefaults(tab), tab }, params);
      return { ...params };
    },
    setBoundary(boundary: DynamicCircleBoundary): DynamicCircleParams {
      params = normalizeParams({ ...params, boundary }, params);
      return { ...params };
    },
    step(dt: number): void {
      t += Math.max(0, finite(dt, 0));
      if (!params.autoSweep) return;
      const wave = 0.5 + 0.5 * Math.sin(t * 0.9);
      if (params.tab === 'scaling') params.v = 5 + 18 * wave;
      else if (params.tab === 'rotating') params.theta = -90 + 180 * wave;
      else if (params.tab === 'translating') params.y0 = 180 + 300 * wave;
      else params.v = 7 + 15 * wave;
    },
    reset(): void {
      params = normalizeParams({ ...DEFAULTS });
      t = 0;
    },
    pickHandle(
      x: number,
      y: number,
      radius = C.handleRadius
    ): DynamicCircleHandle {
      const px = finite(x, 0) * C.baseWidth;
      const py = finite(y, 0) * C.baseHeight;
      const point = { x: px, y: py };
      if (params.boundary === 'straight') {
        const onLine =
          distToSegment(
            point,
            { x: params.xBound, y: 60 },
            { x: params.xBound, y: 600 }
          ) <= radius;
        const onLabel = distPoint(point, { x: params.xBound, y: 75 }) <= radius;
        if (onLine || onLabel) return 'boundary';
      }
      if (
        params.boundary === 'triangle' &&
        distPoint(point, { x: params.triX, y: C.sourceY }) <= radius
      )
        return 'triangle';
      if (params.boundary === 'circle') {
        if (
          distPoint(point, { x: params.circleX, y: params.circleY }) <= radius
        )
          return 'circle-center';
        if (
          distPoint(point, {
            x: params.circleX + params.circleR,
            y: params.circleY
          }) <= radius
        )
          return 'circle-radius';
      }
      if (params.tab === 'rotating') {
        const source = sourceFor(params);
        const tip = vectorFromAngle(C.rotatingVelocityLength, params.theta);
        if (
          distPoint(point, {
            x: source.x + tip.x,
            y: source.y + tip.y
          }) <= radius
        )
          return 'velocity';
      }
      return null;
    },
    moveHandle(
      handle: Exclude<DynamicCircleHandle, null>,
      x: number,
      y: number
    ): void {
      const px = finite(x, 0) * C.baseWidth;
      const py = finite(y, 0) * C.baseHeight;
      if (handle === 'boundary') params.xBound = clamp(px, 320, 600);
      else if (handle === 'triangle') params.triX = clamp(px, 320, 600);
      else if (handle === 'circle-center') {
        params.circleX = clamp(px, 280, 520);
        params.circleY = clamp(py, 180, 480);
      } else if (handle === 'circle-radius') {
        params.circleR = clamp(Math.abs(px - params.circleX), 50, 200);
      } else if (handle === 'velocity') {
        params.theta = clampLaunchAngle(px - C.rotatingSourceX, py - C.sourceY);
      }
    }
  };
}
