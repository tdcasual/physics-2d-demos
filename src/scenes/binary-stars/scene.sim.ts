import { clamp } from '../../core/math';

export type BinaryStarsParams = {
  m1: number;
  m2: number;
  distance: number;
  autoRun: boolean;
  showVectors: boolean;
};

export type BinaryStarsState = {
  params: BinaryStarsParams;
  t: number;
  theta: number;
  omega: number;
  r1: number;
  r2: number;
  force: number;
  position1: { x: number; y: number };
  position2: { x: number; y: number };
  velocity1: { x: number; y: number };
  velocity2: { x: number; y: number };
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

/** 教学单位制，G=1。 */
const G = 1;
const BASE_W = 640;
const BASE_H = 660;
const CENTER = { x: 320, y: 372 };
const ORBIT_SCALE = 7.2;
const PHASE = 1.1;
/** 物理 ω≈0.015，乘此倍率后默认周期约 5 s，便于课堂观察。 */
const TIME_SCALE = 80;
const M_MIN = 1;
const M_MAX = 8;
const L_MIN = 20;
const L_MAX = 40;
const M1_DEFAULT = 4;
const M2_DEFAULT = 2;
const L_DEFAULT = 30;

const DEFAULTS: BinaryStarsParams = {
  m1: M1_DEFAULT,
  m2: M2_DEFAULT,
  distance: L_DEFAULT,
  autoRun: true,
  showVectors: true
};

export const binaryStarsConstants = {
  G,
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  center: CENTER,
  orbitScale: ORBIT_SCALE,
  phase: PHASE,
  timeScale: TIME_SCALE,
  mMin: M_MIN,
  mMax: M_MAX,
  distanceMin: L_MIN,
  distanceMax: L_MAX,
  m1Default: M1_DEFAULT,
  m2Default: M2_DEFAULT,
  distanceDefault: L_DEFAULT,
  velocityScale: 155,
  forceScale: 4200,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  /** 舞台顶部留给 transport 的 viewBox 垫边，窄分栏可伸进读数。 */
  overlayClearTop: 88,
  minReadableFit: 0.5,
  transportClearY: 88
} as const;

const C = binaryStarsConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
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

function normalizeParams(
  input: Partial<BinaryStarsParams>,
  previous = DEFAULTS
): BinaryStarsParams {
  return {
    m1: clamp(finite(input.m1, previous.m1), M_MIN, M_MAX),
    m2: clamp(finite(input.m2, previous.m2), M_MIN, M_MAX),
    distance: clamp(finite(input.distance, previous.distance), L_MIN, L_MAX),
    autoRun: flag(input.autoRun, previous.autoRun),
    showVectors: flag(input.showVectors, previous.showVectors)
  };
}

export function binaryStarsRadii(
  m1: number,
  m2: number,
  distance: number
): { r1: number; r2: number } {
  const safeM1 = Math.max(0, finite(m1, 0));
  const safeM2 = Math.max(0, finite(m2, 0));
  const safeDistance = Math.max(0, finite(distance, 0));
  const total = safeM1 + safeM2;
  if (total <= 0) return { r1: 0, r2: 0 };
  return {
    r1: (safeDistance * safeM2) / total,
    r2: (safeDistance * safeM1) / total
  };
}

export function binaryStarsOmega(
  m1: number,
  m2: number,
  distance: number
): number {
  const safeDistance = Math.max(0.001, finite(distance, 1));
  return Math.sqrt(
    (G * (Math.max(0, finite(m1, 0)) + Math.max(0, finite(m2, 0)))) /
      safeDistance ** 3
  );
}

export function binaryStarsForce(
  m1: number,
  m2: number,
  distance: number
): number {
  const safeDistance = Math.max(0.001, finite(distance, 1));
  return (
    (G * Math.max(0, finite(m1, 0)) * Math.max(0, finite(m2, 0))) /
    safeDistance ** 2
  );
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
 * 640×660 星空舞台。
 * 无浮层 / 移动堆叠：吃满动画区并居中。
 * 桌面浮动读数：优先缩进 overlay 左侧；窄分栏改为放到实测 overlay 下方。
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

function vectorAt(radius: number, theta: number, omega: number) {
  return {
    position: {
      x: CENTER.x + radius * ORBIT_SCALE * Math.cos(theta),
      y: CENTER.y + radius * ORBIT_SCALE * Math.sin(theta)
    },
    velocity: {
      x: -radius * omega * Math.sin(theta),
      y: radius * omega * Math.cos(theta)
    }
  };
}

function makeState(
  params: BinaryStarsParams,
  t: number,
  theta: number
): BinaryStarsState {
  const { r1, r2 } = binaryStarsRadii(params.m1, params.m2, params.distance);
  const omega = binaryStarsOmega(params.m1, params.m2, params.distance);
  const first = vectorAt(r1, theta, omega);
  const second = vectorAt(r2, theta + Math.PI, omega);
  return {
    params: { ...params },
    t,
    theta,
    omega,
    r1,
    r2,
    force: binaryStarsForce(params.m1, params.m2, params.distance),
    position1: first.position,
    position2: second.position,
    velocity1: first.velocity,
    velocity2: second.velocity
  };
}

export function createBinaryStarsSim(initial: Partial<BinaryStarsParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let t = 0;
  let theta = PHASE;

  return {
    getState(): BinaryStarsState {
      return makeState(params, t, theta);
    },
    getSnapshot(): BinaryStarsState {
      return makeState(params, t, theta);
    },
    getParams(): BinaryStarsParams {
      return { ...params };
    },
    setParams(next: Partial<BinaryStarsParams>): BinaryStarsParams {
      params = normalizeParams({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = Math.max(0, finite(dt, 0));
      const omega = binaryStarsOmega(params.m1, params.m2, params.distance);
      t += delta;
      theta += omega * delta * TIME_SCALE;
    },
    reset(): void {
      params = { ...defaults };
      t = 0;
      theta = PHASE;
    }
  };
}
