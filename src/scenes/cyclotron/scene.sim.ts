import { clamp } from '../../core/math';

export type CyclotronParticle = 'proton' | 'deuteron' | 'alpha';

export type CyclotronParams = {
  particle: CyclotronParticle;
  B: number;
  U: number;
  autoRun: boolean;
  showField: boolean;
};

export type CyclotronOrbit = {
  index: number;
  centerX: number;
  radius: number;
  side: 'top' | 'bottom';
  startX: number;
  endX: number;
};

export type CyclotronState = {
  params: CyclotronParams;
  t: number;
  theta: number;
  crossings: number;
  orbitIndex: number;
  energy: number;
  maxEnergy: number;
  radius: number;
  periodRatio: number;
  omega: number;
  nMax: number;
  startX: number;
  orbits: CyclotronOrbit[];
  position: { x: number; y: number };
  velocityAngle: number;
  topPositive: boolean;
  fieldUp: boolean;
  extracted: boolean;
  exitSide: 'left' | 'right' | null;
  status: '加速中' | '可引出';
};

type ParticleData = { mass: number; charge: number; label: string };

export const PARTICLES: Record<CyclotronParticle, ParticleData> = {
  proton: { mass: 1, charge: 1, label: '质子' },
  deuteron: { mass: 2, charge: 1, label: '氘核' },
  alpha: { mass: 4, charge: 2, label: 'α粒子' }
};

export const cyclotronConstants = {
  baseWidth: 640,
  baseHeight: 660,
  centerX: 320,
  centerY: 330,
  deeRadius: 230,
  gapHalf: 10,
  visualRadius: 215,
  fitSpanPx: 430,
  energyScale: 40,
  /** 0.04 rad/frame × 60 fps in the source demo. */
  baseOmega: 2.4,
  bMin: 1,
  bMax: 3,
  bDefault: 3,
  uMin: 10,
  uMax: 50,
  uStep: 10,
  uDefault: 30,
  extractDistance: 180,
  fieldArrowMin: -150,
  fieldArrowMax: 150,
  fieldArrowStep: 60,
  fieldArrowHalf: 8,
  sourceOffsetX: -270,
  sourceRadius: 16,
  sourceWire: 50,
  sourceWireReach: 40,
  polarityTopY: -140,
  polarityBottomY: 165,
  polaritySize: 48,
  particleRadius: 6,
  sourceDotRadius: 3,
  bPattern: 40,
  bMark: 4,
  deeStroke: 2.5,
  trailWidth: 3,
  channelHalf: 12,
  channelMask: 15,
  hintY: 632,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  /**
   * 浮动读数可覆盖的场景 y 上限。D 顶在
   * centerY - deeRadius - gapHalf = 90，此线以上视为 viewBox 垫边，
   * 窄分栏允许伸进 overlay 以换更大舞台。
   */
  overlayClearTop: 80,
  minReadableFit: 0.5
} as const;

const C = cyclotronConstants;
const DEFAULTS: CyclotronParams = {
  particle: 'proton',
  B: C.bDefault,
  U: C.uDefault,
  autoRun: true,
  showField: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }
  return fallback;
}

function normalizeParticle(value: unknown): CyclotronParticle {
  return value === 'deuteron' || value === 'alpha' ? value : 'proton';
}

function normalizeParams(
  input: Partial<CyclotronParams>,
  previous = DEFAULTS
): CyclotronParams {
  return {
    particle: normalizeParticle(input.particle ?? previous.particle),
    B: clamp(finite(input.B, previous.B), C.bMin, C.bMax),
    U: clamp(finite(input.U, previous.U), C.uMin, C.uMax),
    autoRun: flag(input.autoRun, previous.autoRun),
    showField: flag(input.showField, previous.showField)
  };
}

function physicsKeyChanged(
  before: CyclotronParams,
  after: CyclotronParams
): boolean {
  return (
    before.particle !== after.particle ||
    before.B !== after.B ||
    before.U !== after.U
  );
}

export function cyclotronMaxEnergy(
  particle: CyclotronParticle,
  B: number
): number {
  const data = PARTICLES[normalizeParticle(particle)];
  const field = clamp(finite(B, C.bDefault), C.bMin, C.bMax);
  return Math.round(
    (C.energyScale * data.charge * data.charge * field * field) / data.mass
  );
}

export function cyclotronPeriodRatio(
  particle: CyclotronParticle,
  B: number
): number {
  const data = PARTICLES[normalizeParticle(particle)];
  return (
    data.mass / (data.charge * clamp(finite(B, C.bDefault), C.bMin, C.bMax))
  );
}

export function cyclotronOmega(particle: CyclotronParticle, B: number): number {
  const data = PARTICLES[normalizeParticle(particle)];
  return (
    (C.baseOmega * data.charge * clamp(finite(B, C.bDefault), C.bMin, C.bMax)) /
    data.mass
  );
}

export function cyclotronCrossingLimit(
  particle: CyclotronParticle,
  B: number,
  U: number
): number {
  const data = PARTICLES[normalizeParticle(particle)];
  const maxEnergy = cyclotronMaxEnergy(particle, B);
  const voltage = clamp(finite(U, C.uDefault), C.uMin, C.uMax);
  const gain = data.charge * voltage;
  return Math.max(1, Math.floor(maxEnergy / Math.max(gain, 1e-9)));
}

export function cyclotronRadius(
  energy: number,
  maxEnergy: number,
  radius = C.visualRadius
): number {
  if (maxEnergy <= 0) return 0;
  return Math.min(
    Math.max(0, radius),
    Math.sqrt(Math.max(0, energy) / maxEnergy) * radius
  );
}

export type CyclotronPath = {
  nMax: number;
  visualRadius: number;
  startX: number;
  centers: number[];
  radii: number[];
};

/**
 * Alternating left/right semicircles of radius R√(i/N).
 * The pattern is then shifted so the largest orbit sits in the D.
 */
export function buildCyclotronPath(
  particle: CyclotronParticle,
  B: number,
  U: number
): CyclotronPath {
  const nMax = cyclotronCrossingLimit(particle, B, U);
  let x = 0;
  let minX = 0;
  let maxX = 0;
  for (let i = 0; i <= nMax; i += 1) {
    const r = Math.sqrt(i / nMax);
    if (i % 2 === 0) x += 2 * r;
    else x -= 2 * r;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  const span = Math.max(1e-9, maxX - minX);
  const visualRadius = C.fitSpanPx / span;
  const startX = -((maxX + minX) / 2) * visualRadius;
  const centers: number[] = [0];
  const radii: number[] = [0];
  let cursor = startX;
  for (let i = 1; i <= nMax; i += 1) {
    const radius = visualRadius * Math.sqrt(i / nMax);
    radii.push(radius);
    if (i % 2 === 1) {
      const center = cursor - radius;
      centers.push(center);
      cursor = center - radius;
    } else {
      const center = cursor + radius;
      centers.push(center);
      cursor = center + radius;
    }
  }
  return { nMax, visualRadius, startX, centers, radii };
}

function orbitsFromPath(path: CyclotronPath): CyclotronOrbit[] {
  const orbits: CyclotronOrbit[] = [];
  for (let i = 1; i <= path.nMax; i += 1) {
    const radius = path.radii[i];
    const centerX = C.centerX + path.centers[i];
    const odd = i % 2 === 1;
    orbits.push({
      index: i,
      centerX,
      radius,
      side: odd ? 'top' : 'bottom',
      startX: odd ? centerX + radius : centerX - radius,
      endX: odd ? centerX - radius : centerX + radius
    });
  }
  return orbits;
}

export function deriveCyclotronState(
  params: CyclotronParams,
  t: number
): CyclotronState {
  const data = PARTICLES[params.particle];
  const maxEnergy = cyclotronMaxEnergy(params.particle, params.B);
  const periodRatio = cyclotronPeriodRatio(params.particle, params.B);
  const omega = cyclotronOmega(params.particle, params.B);
  const path = buildCyclotronPath(params.particle, params.B, params.U);
  const orbits = orbitsFromPath(path);
  const time = Math.max(0, finite(t, 0));
  const theta = -omega * time;
  const absTheta = Math.abs(theta);
  const turnLimit = path.nMax * Math.PI;
  const extracted = absTheta >= turnLimit - 1e-10;
  const crossings = extracted
    ? path.nMax
    : Math.min(path.nMax, Math.floor(absTheta / Math.PI));
  const orbitIndex = extracted
    ? path.nMax
    : Math.min(path.nMax, Math.max(1, crossings + 1));
  const energy = Math.min(maxEnergy, crossings * data.charge * params.U);
  const radius = extracted ? path.visualRadius : path.radii[orbitIndex];
  const fieldUp = crossings % 2 === 0;
  let x: number;
  let y: number;
  let velocityAngle: number;
  let exitSide: 'left' | 'right' | null = null;
  let status: CyclotronState['status'] = '加速中';

  if (!extracted) {
    const orbit = orbits[orbitIndex - 1];
    x = orbit.centerX + orbit.radius * Math.cos(theta);
    y = C.centerY + orbit.radius * Math.sin(theta);
    velocityAngle = Math.atan2(-Math.cos(theta), Math.sin(theta));
  } else {
    const last = orbits[path.nMax - 1];
    const even = path.nMax % 2 === 0;
    exitSide = even ? 'right' : 'left';
    const extra = absTheta - turnLimit;
    const dist = Math.min(C.extractDistance, extra * path.visualRadius);
    x = last.endX;
    y = C.centerY + (even ? -dist : dist);
    velocityAngle = even ? -Math.PI / 2 : Math.PI / 2;
    status = '可引出';
  }

  return {
    params: { ...params },
    t: time,
    theta,
    crossings,
    orbitIndex,
    energy,
    maxEnergy,
    radius,
    periodRatio,
    omega,
    nMax: path.nMax,
    startX: C.centerX + path.startX,
    orbits,
    position: { x, y },
    velocityAngle,
    topPositive: !fieldUp,
    fieldUp,
    extracted,
    exitSide,
    status
  };
}

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

const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

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

/** view 共用：从布局 DOM 读浮动读数与叠占宽度。 */
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
 * 640×660 基准几何。
 * 无浮层 / 移动堆叠：吃满动画区并居中。
 * 桌面浮动读数：优先把舞台缩进 overlay 左侧；窄分栏左侧过窄时
 * 改为把舞台放到实测 overlay 下方，并允许 viewBox 顶部垫边伸进
 * overlay，避免动画被压成中间一小块。
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
  // 动画区已能放下 640 盒且左侧 gutter 可读：保持宽分栏左置，
  // 不因为下方 pose 略大一截就把舞台沉到读数下面。
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
  const { fit, offsetX, offsetY } = stageTransform(cssWidth, cssHeight, layout);
  const scale = Math.max(fit, 1e-6);
  return {
    x: (cssX - offsetX) / (scale * C.baseWidth),
    y: (cssY - offsetY) / (scale * C.baseHeight)
  };
}

export function createCyclotronSim(initial: Partial<CyclotronParams> = {}) {
  const initialParams = normalizeParams(initial);
  let params = { ...initialParams };
  let t = 0;

  return {
    getState(): CyclotronState {
      return deriveCyclotronState(params, t);
    },
    getSnapshot(): CyclotronState {
      return deriveCyclotronState(params, t);
    },
    getParams(): CyclotronParams {
      return { ...params };
    },
    setParams(next: Partial<CyclotronParams>): CyclotronParams {
      const previous = params;
      params = normalizeParams({ ...params, ...next }, params);
      if (physicsKeyChanged(previous, params)) t = 0;
      return { ...params };
    },
    setParticle(particle: CyclotronParticle): CyclotronParams {
      return this.setParams({ particle });
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      t = Math.max(0, t + finite(dt, 0));
    },
    reset(): void {
      params = { ...initialParams };
      t = 0;
    }
  };
}
