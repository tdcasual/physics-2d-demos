import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';
import { finiteNumber } from '../../core/coerce';
import { measureStageLayout, fitStage } from '../stage-fit';
import type { StageLayoutHint } from '../stage-fit';

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
    m1: clamp(finiteNumber(input.m1, previous.m1), M_MIN, M_MAX),
    m2: clamp(finiteNumber(input.m2, previous.m2), M_MIN, M_MAX),
    distance: clamp(
      finiteNumber(input.distance, previous.distance),
      L_MIN,
      L_MAX
    ),
    autoRun: flag(input.autoRun, previous.autoRun),
    showVectors: flag(input.showVectors, previous.showVectors)
  };
}

export function binaryStarsRadii(
  m1: number,
  m2: number,
  distance: number
): { r1: number; r2: number } {
  const safeM1 = Math.max(0, finiteNumber(m1, 0));
  const safeM2 = Math.max(0, finiteNumber(m2, 0));
  const safeDistance = Math.max(0, finiteNumber(distance, 0));
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
  const safeDistance = Math.max(0.001, finiteNumber(distance, 1));
  return Math.sqrt(
    (G *
      (Math.max(0, finiteNumber(m1, 0)) + Math.max(0, finiteNumber(m2, 0)))) /
      safeDistance ** 3
  );
}

export function binaryStarsForce(
  m1: number,
  m2: number,
  distance: number
): number {
  const safeDistance = Math.max(0.001, finiteNumber(distance, 1));
  return (
    (G * Math.max(0, finiteNumber(m1, 0)) * Math.max(0, finiteNumber(m2, 0))) /
    safeDistance ** 2
  );
}

export const hasFloatingReadout = readoutOccludesStage;

export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  return measureStageLayout(canvas, FLOATING_OVERLAY_FALLBACK);
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
      const delta = Math.max(0, finiteNumber(dt, 0));
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

export type { StageLayoutHint };
