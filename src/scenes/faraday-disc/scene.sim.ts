import { readoutOccludesStage } from '../../platform/stage-readout';
import { clamp } from '../../core/math';
import { finiteOr } from '../../core/coerce';
import { measureStageLayout, fitStage } from '../stage-fit';
import type { StageLayoutHint } from '../stage-fit';

export type FaradayRotation = 'cw' | 'ccw';
export type FaradayField = 'into' | 'out';
export type FaradayPolarity = 'A−/B+' | 'A+/B−';
export type FaradayPresetId = 'standard' | 'reverse-field' | 'open-circuit';

export type FaradayParams = {
  B: number;
  omega: number;
  radius: number;
  externalResistance: number;
  rotation: FaradayRotation;
  field: FaradayField;
  closed: boolean;
};

export type FaradayParamPatch = {
  B?: unknown;
  omega?: unknown;
  radius?: unknown;
  externalResistance?: unknown;
  rotation?: unknown;
  field?: unknown;
  closed?: unknown;
  preset?: FaradayPresetId | string;
};

export type FaradayState = {
  params: FaradayParams;
  time: number;
  angle: number;
  emf: number;
  current: number;
  power: number;
  torque: number;
  polarity: FaradayPolarity;
  rimPositive: boolean;
  currentSign: -1 | 0 | 1;
  bulbOn: boolean;
  velocityRight: boolean;
  forceOutward: boolean;
};

export const FARADAY_PRESETS: Record<
  FaradayPresetId,
  Pick<FaradayParams, 'rotation' | 'field' | 'closed'>
> = {
  standard: { rotation: 'cw', field: 'into', closed: true },
  'reverse-field': { rotation: 'cw', field: 'out', closed: true },
  'open-circuit': { rotation: 'cw', field: 'into', closed: false }
};

export const faradayConstants = {
  baseWidth: 880,
  baseHeight: 640,
  discCenter: { x: 312, y: 338 },
  discRadius: 196,
  hubRadius: 28,
  pivotRadius: 7,
  spokeInner: 30,
  ringCount: 5,
  spokeCount: 16,
  fieldLeft: 44,
  fieldTop: 52,
  fieldRight: 584,
  fieldBottom: 600,
  fieldRadius: 18,
  titleWidth: 240,
  titleHeight: 34,
  fieldSymbolSize: 9,
  fieldSymbolStepX: 70,
  fieldSymbolStepY: 68,
  fieldCaptionY: 74,
  brushWidth: 16,
  brushHeight: 22,
  circuitX: 736,
  circuitW: 128,
  wireTopY: 88,
  wireBottomY: 598,
  switchY: 158,
  switchH: 78,
  bulbY: 268,
  bulbH: 94,
  meterCy: 458,
  meterR: 52,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  /** 磁场标题以上视为垫边；盘顶 P / 电刷 B 必须留在 overlay 之外。 */
  overlayClearTop: 96,
  minReadableFit: 0.48,
  visualAngleScale: 0.12,
  bMin: 0.2,
  bMax: 2,
  omegaMin: 2,
  omegaMax: 20,
  radiusMin: 0.1,
  radiusMax: 0.4,
  resistanceMin: 0.5,
  resistanceMax: 5
} as const;

const C = faradayConstants;

const DEFAULTS: FaradayParams = {
  B: 1,
  omega: 10,
  radius: 0.2,
  externalResistance: 2,
  rotation: 'cw',
  field: 'into',
  closed: true
};

const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

export function flag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }
  return fallback;
}

function isPresetId(value: unknown): value is FaradayPresetId {
  return (
    value === 'standard' ||
    value === 'reverse-field' ||
    value === 'open-circuit'
  );
}

function normalizeRotation(
  value: unknown,
  fallback: FaradayRotation
): FaradayRotation {
  if (value === 'ccw' || value === 'cw') return value;
  return fallback;
}

function normalizeField(value: unknown, fallback: FaradayField): FaradayField {
  if (value === 'out' || value === 'into') return value;
  return fallback;
}

export const hasFloatingReadout = readoutOccludesStage;

/** view 共用：从布局 DOM 读浮动读数与叠占宽度。 */
export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  return measureStageLayout(canvas, FLOATING_OVERLAY_FALLBACK);
}

/**
 * 880×640 基准几何。
 * 无浮层 / 移动堆叠：吃满动画区并居中。
 * 桌面浮动读数：优先把舞台缩进 overlay 左侧；窄分栏左侧过窄时
 * 改为把舞台放到实测 overlay 下方，并允许 viewBox 顶部垫边伸进 overlay。
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
  const { fit, offsetX, offsetY } = stageTransform(cssWidth, cssHeight, layout);
  const scale = Math.max(fit, 1e-6);
  return {
    x: (cssX - offsetX) / (scale * C.baseWidth),
    y: (cssY - offsetY) / (scale * C.baseHeight)
  };
}

/** E = ½ B ω R²（高中动生电动势，沿半径积分）。 */
export function faradayEmf(B: number, omega: number, radius: number): number {
  return 0.5 * Math.max(0, B) * Math.max(0, omega) * Math.max(0, radius) ** 2;
}

/**
 * 盘顶 P 处 v × B 使正电荷沿半径分离：
 * 顺时针 + B 向里，或逆时针 + B 向外 → 边缘为正。
 */
export function faradayRimPositive(
  rotation: FaradayRotation,
  field: FaradayField
): boolean {
  return (rotation === 'cw') === (field === 'into');
}

export function faradayPolarity(
  rotation: FaradayRotation,
  field: FaradayField
): FaradayPolarity {
  return faradayRimPositive(rotation, field) ? 'A−/B+' : 'A+/B−';
}

export function faradayCurrent(
  emf: number,
  closed: boolean,
  externalResistance: number
): number {
  if (!closed) return 0;
  const r = Math.max(externalResistance, 1e-9);
  return Math.max(0, emf) / r;
}

export function faradayMatchingPreset(
  params: Pick<FaradayParams, 'rotation' | 'field' | 'closed'>
): FaradayPresetId | null {
  const entries = Object.entries(FARADAY_PRESETS) as Array<
    [FaradayPresetId, (typeof FARADAY_PRESETS)[FaradayPresetId]]
  >;
  for (const [id, preset] of entries) {
    if (
      preset.rotation === params.rotation &&
      preset.field === params.field &&
      preset.closed === params.closed
    ) {
      return id;
    }
  }
  return null;
}

function normalizeParams(
  input: FaradayParamPatch,
  previous = DEFAULTS
): FaradayParams {
  const fromPreset = isPresetId(input.preset)
    ? FARADAY_PRESETS[input.preset]
    : null;
  const base: FaradayParams = {
    ...previous,
    ...(fromPreset ?? {})
  };
  return {
    B: clamp(finiteOr(input.B, base.B), C.bMin, C.bMax),
    omega: clamp(finiteOr(input.omega, base.omega), C.omegaMin, C.omegaMax),
    radius: clamp(
      finiteOr(input.radius, base.radius),
      C.radiusMin,
      C.radiusMax
    ),
    externalResistance: clamp(
      finiteOr(input.externalResistance, base.externalResistance),
      C.resistanceMin,
      C.resistanceMax
    ),
    rotation: normalizeRotation(input.rotation, base.rotation),
    field: normalizeField(input.field, base.field),
    closed: flag(input.closed, base.closed)
  };
}

function deriveState(
  params: FaradayParams,
  time: number,
  angle: number
): FaradayState {
  const emf = faradayEmf(params.B, params.omega, params.radius);
  const current = faradayCurrent(emf, params.closed, params.externalResistance);
  const power = current * emf;
  const rimPositive = faradayRimPositive(params.rotation, params.field);
  const currentSign: -1 | 0 | 1 =
    !params.closed || current <= 0 ? 0 : rimPositive ? 1 : -1;
  return {
    params: { ...params },
    time,
    angle,
    emf,
    current,
    power,
    torque: params.omega > 0 ? power / params.omega : 0,
    polarity: faradayPolarity(params.rotation, params.field),
    rimPositive,
    currentSign,
    bulbOn: params.closed && current > 1e-6,
    velocityRight: params.rotation === 'cw',
    forceOutward: rimPositive
  };
}

export function createFaradaySim(initial: FaradayParamPatch = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;
  let angle = 0;

  return {
    getState(): FaradayState {
      return deriveState(params, time, angle);
    },
    getSnapshot(): FaradayState {
      return deriveState(params, time, angle);
    },
    getParams(): FaradayParams {
      return { ...params };
    },
    setParams(next: FaradayParamPatch): FaradayParams {
      params = normalizeParams(next, params);
      return { ...params };
    },
    applyPreset(id: FaradayPresetId | string): FaradayParams {
      return this.setParams({ preset: id });
    },
    step(dt: number): void {
      const delta = Math.max(0, finiteOr(dt, 0));
      time += delta;
      const sign = params.rotation === 'cw' ? 1 : -1;
      angle += params.omega * delta * sign;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      angle = 0;
    }
  };
}

export type { StageLayoutHint };
