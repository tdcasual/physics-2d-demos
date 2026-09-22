import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';

export type ThreeForcesTab = 'gravity' | 'friction' | 'spring';
export type ThreeForcesHandle = 'block' | null;

export type ThreeForcesParams = {
  tab: ThreeForcesTab;
  mass: number;
  inclineAngle: number;
  mu: number;
  springK: number;
  springX: number;
  autoRun: boolean;
  showComponents: boolean;
};

export type ThreeForcesVector = { x: number; y: number };

export type ThreeForcesState = {
  params: ThreeForcesParams;
  time: number;
  gravity: number;
  normal: number;
  downslope: number;
  perpendicular: number;
  frictionRequired: number;
  frictionMax: number;
  friction: number;
  netForce: number;
  acceleration: number;
  sliding: boolean;
  critical: boolean;
  springForce: number;
  springDisplacement: number;
  springVelocity: number;
  status: string;
  blockS: number;
  blockVelocity: number;
  gravityVector: ThreeForcesVector;
  normalVector: ThreeForcesVector;
  frictionVector: ThreeForcesVector;
  g1Vector: ThreeForcesVector;
  g2Vector: ThreeForcesVector;
};

export type StageLayoutHint = {
  floatingReadout: boolean;
  overlayPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
};

export type InclineLayout = {
  theta: number;
  rightAngle: ThreeForcesVector;
  baseEnd: ThreeForcesVector;
  topEnd: ThreeForcesVector;
  downslope: ThreeForcesVector;
  upslope: ThreeForcesVector;
  outwardNormal: ThreeForcesVector;
  inwardNormal: ThreeForcesVector;
  foot: ThreeForcesVector;
  blockCenter: ThreeForcesVector;
  blockRotation: number;
  pxPerMeter: number;
  sMax: number;
};

export type SpringLayout = {
  wallX: number;
  groundY: number;
  equilibriumX: number;
  blockCenter: ThreeForcesVector;
  springEndX: number;
  naturalLength: number;
};

type StagePose = {
  fit: number;
  offsetX: number;
  offsetY: number;
};

const G = 10;
const DEG = Math.PI / 180;
const MASS_MIN = 1;
const MASS_MAX = 6;
const MASS_DEFAULT = 3;
const ANGLE_MIN = 0;
const ANGLE_MAX = 60;
const ANGLE_DEFAULT = 30;
const MU_MIN = 0;
const MU_MAX = 1;
const MU_DEFAULT = 0.4;
const SPRING_K_MIN = 10;
const SPRING_K_MAX = 80;
const SPRING_K_DEFAULT = 40;
const SPRING_X_MIN = -0.4;
const SPRING_X_MAX = 0.5;
const SPRING_X_DEFAULT = 0.2;
const REST_EPS = 1e-8;
const FORCE_EPS = 1e-8;
const FRAME_DT = 1 / 60;
const STEP_MAX_DT = 0.05;
const INCLINE_LENGTH_M = 5;
const START_MARGIN_M = 0.9;
const END_MARGIN_M = 0.55;
const S_MAX = INCLINE_LENGTH_M - START_MARGIN_M - END_MARGIN_M;
const BASE_W = 720;
const BASE_H = 660;
const PLANE_BASE_Y = 500;
const PLANE_RIGHT_X = 600;
const HYPOTENUSE = 460;
const PX_PER_M = HYPOTENUSE / INCLINE_LENGTH_M;
const BLOCK_W = 72;
const BLOCK_H = 44;
const SPRING_WALL_X = 88;
const SPRING_GROUND_Y = 400;
const SPRING_EQUILIBRIUM_X = 360;
const SPRING_PX_PER_M = 200;

const DEFAULTS: ThreeForcesParams = {
  tab: 'gravity',
  mass: MASS_DEFAULT,
  inclineAngle: ANGLE_DEFAULT,
  mu: MU_DEFAULT,
  springK: SPRING_K_DEFAULT,
  springX: SPRING_X_DEFAULT,
  autoRun: true,
  showComponents: true
};

export const threeForcesConstants = {
  g: G,
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  massMin: MASS_MIN,
  massMax: MASS_MAX,
  massDefault: MASS_DEFAULT,
  angleMin: ANGLE_MIN,
  angleMax: ANGLE_MAX,
  angleDefault: ANGLE_DEFAULT,
  muMin: MU_MIN,
  muMax: MU_MAX,
  muDefault: MU_DEFAULT,
  springKMin: SPRING_K_MIN,
  springKMax: SPRING_K_MAX,
  springKDefault: SPRING_K_DEFAULT,
  springXMin: SPRING_X_MIN,
  springXMax: SPRING_X_MAX,
  springXDefault: SPRING_X_DEFAULT,
  inclineLengthM: INCLINE_LENGTH_M,
  startMarginM: START_MARGIN_M,
  endMarginM: END_MARGIN_M,
  sMax: S_MAX,
  planeBaseY: PLANE_BASE_Y,
  planeRightX: PLANE_RIGHT_X,
  hypotenuse: HYPOTENUSE,
  pxPerMeter: PX_PER_M,
  blockWidth: BLOCK_W,
  blockHeight: BLOCK_H,
  stopperWidth: 18,
  stopperHeight: 36,
  gridStep: 40,
  vectorScale: 3.6,
  maxVectorLength: 118,
  minVectorLength: 28,
  arrowHead: 12,
  angleArcRadius: 42,
  handleRadius: 52,
  coilCount: 12,
  coilAmp: 14,
  springWallX: SPRING_WALL_X,
  springGroundY: SPRING_GROUND_Y,
  springEquilibriumX: SPRING_EQUILIBRIUM_X,
  springPxPerM: SPRING_PX_PER_M,
  springWallWidth: 18,
  springWallHeight: 120,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  overlayClearTop: 0,
  minReadableFit: 0.5,
  transportClearY: 96,
  frameDt: FRAME_DT,
  restEpsilon: REST_EPS
} as const;

const C = threeForcesConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

export function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === '0' || text === 'false' || text === 'off' || text === 'no') {
      return false;
    }
    if (text === '1' || text === 'true' || text === 'on' || text === 'yes') {
      return true;
    }
  }
  return fallback;
}

export function parseThreeForcesTab(
  value: unknown,
  fallback: ThreeForcesTab = 'gravity'
): ThreeForcesTab {
  if (value === 'friction' || value === 1 || value === '1') return 'friction';
  if (value === 'spring' || value === 2 || value === '2') return 'spring';
  if (value === 'gravity' || value === 0 || value === '0') return 'gravity';
  return fallback;
}

function normalizeParams(
  input: Partial<ThreeForcesParams>,
  previous: ThreeForcesParams = DEFAULTS
): ThreeForcesParams {
  return {
    tab: parseThreeForcesTab(input.tab, previous.tab),
    mass: clamp(finite(input.mass, previous.mass), MASS_MIN, MASS_MAX),
    inclineAngle: clamp(
      finite(input.inclineAngle, previous.inclineAngle),
      ANGLE_MIN,
      ANGLE_MAX
    ),
    mu: clamp(finite(input.mu, previous.mu), MU_MIN, MU_MAX),
    springK: clamp(
      finite(input.springK, previous.springK),
      SPRING_K_MIN,
      SPRING_K_MAX
    ),
    springX: clamp(
      finite(input.springX, previous.springX),
      SPRING_X_MIN,
      SPRING_X_MAX
    ),
    autoRun:
      input.autoRun === undefined
        ? previous.autoRun
        : asBool(input.autoRun, previous.autoRun),
    showComponents:
      input.showComponents === undefined
        ? previous.showComponents
        : asBool(input.showComponents, previous.showComponents)
  };
}

/** G = mg，课件取 g = 10 N/kg。 */
export function threeForcesGravity(mass: number): number {
  return finite(mass, MASS_DEFAULT) * G;
}

/** G₁ = mg sinθ，沿斜面向下。 */
export function threeForcesDownslope(mass: number, angleDeg: number): number {
  return threeForcesGravity(mass) * Math.sin(finite(angleDeg, 0) * DEG);
}

/** G₂ = mg cosθ，垂直斜面压紧。 */
export function threeForcesPerpendicular(
  mass: number,
  angleDeg: number
): number {
  return threeForcesGravity(mass) * Math.cos(finite(angleDeg, 0) * DEG);
}

/** N = G₂。 */
export function threeForcesNormal(mass: number, angleDeg: number): number {
  return threeForcesPerpendicular(mass, angleDeg);
}

/** f_s,max = μN = μ mg cosθ。 */
export function threeForcesFrictionMax(
  mass: number,
  angleDeg: number,
  mu: number
): number {
  return clamp(finite(mu, 0), 0, MU_MAX) * threeForcesNormal(mass, angleDeg);
}

export type ThreeForcesContact = {
  friction: number;
  netForce: number;
  acceleration: number;
  sliding: boolean;
  critical: boolean;
};

/**
 * 静摩擦：G₁ ≤ μN 时 f = G₁（等号为临界静止）。
 * 滑动：G₁ > μN 时 f = μN，方向沿斜面向上，a = (G₁ − f)/m。
 * 已有沿斜面向下的速度时保持滑动，直到速度回到 0 且 G₁ ≤ μN。
 */
export function threeForcesContact(
  mass: number,
  angleDeg: number,
  mu: number,
  velocityDownslope: number
): ThreeForcesContact {
  const m = Math.max(finite(mass, MASS_DEFAULT), 1e-9);
  const g1 = threeForcesDownslope(m, angleDeg);
  const fMax = threeForcesFrictionMax(m, angleDeg, mu);
  const moving = finite(velocityDownslope, 0) > REST_EPS;
  const critical = Math.abs(g1 - fMax) <= FORCE_EPS;
  const held = !moving && g1 <= fMax + FORCE_EPS;
  if (held) {
    return {
      friction: g1,
      netForce: 0,
      acceleration: 0,
      sliding: false,
      critical
    };
  }
  const friction = fMax;
  const netForce = g1 - friction;
  return {
    friction,
    netForce,
    acceleration: netForce / m,
    sliding: true,
    critical: false
  };
}

/** 胡克定律 F弹 = −kx，方向始终反抗形变。 */
export function threeForcesSpringForce(k: number, x: number): number {
  const force = -finite(k, SPRING_K_DEFAULT) * finite(x, 0);
  return force === 0 ? 0 : force;
}

/** 水平弹簧解析步进：x' = x cos(ωΔt) + (v/ω) sin(ωΔt)。 */
export function threeForcesSpringStep(
  x: number,
  v: number,
  k: number,
  mass: number,
  dt: number
): { x: number; v: number } {
  const safeX = finite(x, 0);
  const safeV = finite(v, 0);
  const h = finite(dt, 0);
  if (!Number.isFinite(h) || h === 0) return { x: safeX, v: safeV };
  const m = Math.max(finite(mass, MASS_DEFAULT), 1e-9);
  const stiffness = Math.max(finite(k, 0), 0);
  const omega = Math.sqrt(stiffness / m);
  if (omega < 1e-9) {
    return { x: safeX + safeV * h, v: safeV };
  }
  const c = Math.cos(omega * h);
  const s = Math.sin(omega * h);
  return {
    x: safeX * c + (safeV / omega) * s,
    v: -safeX * omega * s + safeV * c
  };
}

export function threeForcesSpringPeriod(k: number, mass: number): number {
  const m = Math.max(finite(mass, MASS_DEFAULT), 1e-9);
  const stiffness = Math.max(finite(k, 0), 1e-9);
  return (2 * Math.PI) / Math.sqrt(stiffness / m);
}

export function inclineAxes(angleDeg: number): {
  theta: number;
  downslope: ThreeForcesVector;
  upslope: ThreeForcesVector;
  outwardNormal: ThreeForcesVector;
  inwardNormal: ThreeForcesVector;
} {
  const theta = finite(angleDeg, 0) * DEG;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    theta,
    downslope: { x: -cos, y: sin },
    upslope: { x: cos, y: -sin },
    outwardNormal: { x: -sin, y: -cos },
    inwardNormal: { x: sin, y: cos }
  };
}

export function threeForcesVectors(
  mass: number,
  angleDeg: number,
  friction: number
): {
  gravityVector: ThreeForcesVector;
  normalVector: ThreeForcesVector;
  frictionVector: ThreeForcesVector;
  g1Vector: ThreeForcesVector;
  g2Vector: ThreeForcesVector;
} {
  const g = threeForcesGravity(mass);
  const g1 = threeForcesDownslope(mass, angleDeg);
  const g2 = threeForcesPerpendicular(mass, angleDeg);
  const n = threeForcesNormal(mass, angleDeg);
  const f = Math.max(0, finite(friction, 0));
  const axes = inclineAxes(angleDeg);
  return {
    gravityVector: { x: 0, y: g },
    normalVector: {
      x: axes.outwardNormal.x * n,
      y: axes.outwardNormal.y * n
    },
    frictionVector: {
      x: axes.upslope.x * f,
      y: axes.upslope.y * f
    },
    g1Vector: {
      x: axes.downslope.x * g1,
      y: axes.downslope.y * g1
    },
    g2Vector: {
      x: axes.inwardNormal.x * g2,
      y: axes.inwardNormal.y * g2
    }
  };
}

export function inclineLayout(angleDeg: number, blockS: number): InclineLayout {
  const axes = inclineAxes(angleDeg);
  const rightAngle = { x: PLANE_RIGHT_X, y: PLANE_BASE_Y };
  const topEnd = {
    x: PLANE_RIGHT_X,
    y: PLANE_BASE_Y - HYPOTENUSE * Math.sin(axes.theta)
  };
  const baseEnd = {
    x: PLANE_RIGHT_X - HYPOTENUSE * Math.cos(axes.theta),
    y: PLANE_BASE_Y
  };
  const s = clamp(finite(blockS, 0), 0, S_MAX);
  const along = (START_MARGIN_M + s) * PX_PER_M;
  const foot = {
    x: topEnd.x + axes.downslope.x * along,
    y: topEnd.y + axes.downslope.y * along
  };
  const lift = BLOCK_H / 2;
  return {
    theta: axes.theta,
    rightAngle,
    baseEnd,
    topEnd,
    downslope: axes.downslope,
    upslope: axes.upslope,
    outwardNormal: axes.outwardNormal,
    inwardNormal: axes.inwardNormal,
    foot,
    blockCenter: {
      x: foot.x + axes.outwardNormal.x * lift,
      y: foot.y + axes.outwardNormal.y * lift
    },
    blockRotation: -axes.theta,
    pxPerMeter: PX_PER_M,
    sMax: S_MAX
  };
}

export function springLayout(displacement: number): SpringLayout {
  const x = finite(displacement, 0);
  const blockX = SPRING_EQUILIBRIUM_X + x * SPRING_PX_PER_M;
  const y = SPRING_GROUND_Y - BLOCK_H / 2;
  return {
    wallX: SPRING_WALL_X,
    groundY: SPRING_GROUND_Y,
    equilibriumX: SPRING_EQUILIBRIUM_X,
    blockCenter: { x: blockX, y },
    springEndX: blockX - BLOCK_W / 2,
    naturalLength: SPRING_EQUILIBRIUM_X - SPRING_WALL_X - BLOCK_W / 2
  };
}

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

export function hasFloatingReadout(anchor?: Element | null): boolean {
  return readoutOccludesStage(anchor);
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
 * 720×660 动画舞台。无浮层 / 移动堆叠居中铺满；
 * 桌面浮动读数优先缩进 overlay 左侧，窄分栏改放到实测 overlay 下方。
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
  const wideColumn = width + 1e-6 >= boxW && chosen.fit >= C.minReadableFit;
  if (
    !wideColumn &&
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

  if (chosen.fit < C.minReadableFit) {
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

function hitBoundTime(
  s: number,
  v: number,
  a: number,
  bound: number
): number | null {
  const ds = bound - s;
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(v) < 1e-12) return null;
    const t = ds / v;
    return t > 1e-12 ? t : null;
  }
  const disc = v * v + 2 * a * ds;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const t1 = (-v - root) / a;
  const t2 = (-v + root) / a;
  const candidates = [t1, t2].filter((t) => t > 1e-12);
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

function advanceIncline(
  s: number,
  v: number,
  mass: number,
  angleDeg: number,
  mu: number,
  dt: number
): { s: number; v: number } {
  let pos = clamp(finite(s, 0), 0, S_MAX);
  let vel = Math.max(0, finite(v, 0));
  let remaining = Math.max(0, finite(dt, 0));
  while (remaining > 1e-12) {
    const contact = threeForcesContact(mass, angleDeg, mu, vel);
    const a = contact.acceleration;
    if (!contact.sliding && vel <= REST_EPS) {
      return { s: pos, v: 0 };
    }
    const h = Math.min(remaining, STEP_MAX_DT);
    const hitMax = hitBoundTime(pos, vel, a, S_MAX);
    const hitMin = hitBoundTime(pos, vel, a, 0);
    let step = h;
    let stopAt: 0 | typeof S_MAX | null = null;
    if (hitMax !== null && hitMax <= step) {
      step = hitMax;
      stopAt = S_MAX;
    }
    if (hitMin !== null && hitMin <= step) {
      step = hitMin;
      stopAt = 0;
    }
    pos = pos + vel * step + 0.5 * a * step * step;
    vel = vel + a * step;
    if (stopAt !== null) {
      pos = stopAt;
      vel = 0;
      remaining = 0;
      break;
    }
    if (vel < 0) {
      vel = 0;
      const held = threeForcesContact(mass, angleDeg, mu, 0);
      if (!held.sliding) break;
    }
    remaining -= step;
  }
  return { s: clamp(pos, 0, S_MAX), v: Math.max(0, vel) };
}

function statusFor(
  tab: ThreeForcesTab,
  contact: ThreeForcesContact,
  blockS: number,
  springX: number
): string {
  if (tab === 'spring') {
    if (springX > 1e-4) return '拉伸';
    if (springX < -1e-4) return '压缩';
    return '原长';
  }
  if (contact.critical && !contact.sliding) return '临界静止';
  if (!contact.sliding) return '静止';
  if (blockS >= S_MAX - 1e-6) return '抵达挡块';
  return '沿斜面下滑';
}

function makeState(
  params: ThreeForcesParams,
  time: number,
  blockS: number,
  blockVelocity: number,
  springDisplacement: number,
  springVelocity: number
): ThreeForcesState {
  const contact = threeForcesContact(
    params.mass,
    params.inclineAngle,
    params.mu,
    blockVelocity
  );
  const vectors = threeForcesVectors(
    params.mass,
    params.inclineAngle,
    contact.friction
  );
  const springForce = threeForcesSpringForce(
    params.springK,
    springDisplacement
  );
  return {
    params: { ...params },
    time,
    gravity: threeForcesGravity(params.mass),
    normal: threeForcesNormal(params.mass, params.inclineAngle),
    downslope: threeForcesDownslope(params.mass, params.inclineAngle),
    perpendicular: threeForcesPerpendicular(params.mass, params.inclineAngle),
    frictionRequired: threeForcesDownslope(params.mass, params.inclineAngle),
    frictionMax: threeForcesFrictionMax(
      params.mass,
      params.inclineAngle,
      params.mu
    ),
    friction: contact.friction,
    netForce: contact.netForce,
    acceleration: contact.acceleration,
    sliding: contact.sliding,
    critical: contact.critical,
    springForce,
    springDisplacement,
    springVelocity,
    status: statusFor(params.tab, contact, blockS, springDisplacement),
    blockS,
    blockVelocity,
    ...vectors
  };
}

export function createThreeForcesSim(initial: Partial<ThreeForcesParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;
  let blockS = 0;
  let blockVelocity = 0;
  let springDisplacement = params.springX;
  let springVelocity = 0;

  function getState(): ThreeForcesState {
    return makeState(
      params,
      time,
      blockS,
      blockVelocity,
      springDisplacement,
      springVelocity
    );
  }

  function advance(dt: number, force: boolean): void {
    if (!force && !params.autoRun) return;
    const seconds = finite(dt, 0);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    time += seconds;
    if (params.tab === 'spring') {
      const next = threeForcesSpringStep(
        springDisplacement,
        springVelocity,
        params.springK,
        params.mass,
        seconds
      );
      springDisplacement = clamp(next.x, SPRING_X_MIN, SPRING_X_MAX);
      springVelocity = Number.isFinite(next.v) ? next.v : 0;
      if (
        springDisplacement === SPRING_X_MIN ||
        springDisplacement === SPRING_X_MAX
      ) {
        springVelocity = 0;
      }
      return;
    }
    const next = advanceIncline(
      blockS,
      blockVelocity,
      params.mass,
      params.inclineAngle,
      params.mu,
      seconds
    );
    blockS = next.s;
    blockVelocity = next.v;
  }

  return {
    getState,
    getSnapshot: getState,
    getParams(): ThreeForcesParams {
      return { ...params };
    },
    setParams(next: Partial<ThreeForcesParams>): ThreeForcesParams {
      const previousX = params.springX;
      params = normalizeParams({ ...params, ...next }, params);
      if (next.springX !== undefined && params.springX !== previousX) {
        springDisplacement = params.springX;
        springVelocity = 0;
      }
      blockS = clamp(blockS, 0, S_MAX);
      if (!Number.isFinite(blockVelocity)) blockVelocity = 0;
      if (!Number.isFinite(springDisplacement)) {
        springDisplacement = params.springX;
      }
      if (!Number.isFinite(springVelocity)) springVelocity = 0;
      return { ...params };
    },
    pickHandle(x: number, y: number): ThreeForcesHandle {
      const px = finite(x, 0) * C.baseWidth;
      const py = finite(y, 0) * C.baseHeight;
      const point =
        params.tab === 'spring'
          ? springLayout(springDisplacement).blockCenter
          : inclineLayout(params.inclineAngle, blockS).blockCenter;
      return Math.hypot(px - point.x, py - point.y) <= C.handleRadius
        ? 'block'
        : null;
    },
    moveHandle(
      handle: Exclude<ThreeForcesHandle, null>,
      x: number,
      y: number
    ): void {
      if (handle !== 'block') return;
      const px = finite(x, 0) * C.baseWidth;
      const py = finite(y, 0) * C.baseHeight;
      if (params.tab === 'spring') {
        const layout = springLayout(0);
        const disp = (px - layout.equilibriumX) / SPRING_PX_PER_M;
        springDisplacement = clamp(disp, SPRING_X_MIN, SPRING_X_MAX);
        springVelocity = 0;
        params = { ...params, springX: springDisplacement };
        return;
      }
      const layout = inclineLayout(params.inclineAngle, 0);
      const dx = px - layout.topEnd.x;
      const dy = py - layout.topEnd.y;
      const alongPx = dx * layout.downslope.x + dy * layout.downslope.y;
      const s = alongPx / PX_PER_M - START_MARGIN_M;
      blockS = clamp(s, 0, S_MAX);
      blockVelocity = 0;
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
      blockS = 0;
      blockVelocity = 0;
      springDisplacement = params.springX;
      springVelocity = 0;
    }
  };
}
