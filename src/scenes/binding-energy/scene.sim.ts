import { clamp } from '../../core/math';

export type BindingEnergyParams = {
  A: number;
  autoRun: boolean;
  showRegions: boolean;
};

export type BindingEnergyPoint = {
  A: number;
  symbol: string;
  name: string;
  binding: number;
};

export type BindingEnergyLabelAnchor = {
  symbol: string;
  align: 'left' | 'right' | 'center';
  dx: number;
  dy: number;
};

export type BindingEnergyState = {
  params: BindingEnergyParams;
  time: number;
  cursorA: number;
  direction: 1 | -1;
  point: BindingEnergyPoint;
  total: number;
  status: string;
  fusionGain: number;
  fissionGain: number;
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

/**
 * Representative nuclide E/A (MeV). Teaching values for 选择性必修三:
 * H-1 has no binding energy; ⁴He is the light-nucleus spike; Fe-56 is the
 * taught peak (~8.79 MeV); ²³⁵U / ²³⁸U are listed separately so their
 * labels can be split. Total binding energy is E = A × (E/A).
 */
export const BINDING_ENERGY_DATA: readonly BindingEnergyPoint[] = [
  { A: 1, symbol: 'H-1', name: '氢', binding: 0 },
  { A: 2, symbol: 'H-2', name: '氘', binding: 1.11 },
  { A: 3, symbol: 'He-3', name: '氦', binding: 2.57 },
  { A: 4, symbol: 'He-4', name: '氦', binding: 7.07 },
  { A: 7, symbol: 'Li-7', name: '锂', binding: 5.61 },
  { A: 12, symbol: 'C-12', name: '碳', binding: 7.68 },
  { A: 16, symbol: 'O-16', name: '氧', binding: 7.98 },
  { A: 40, symbol: 'Ca-40', name: '钙', binding: 8.55 },
  { A: 56, symbol: 'Fe-56', name: '铁', binding: 8.79 },
  { A: 89, symbol: 'Kr-89', name: '氪', binding: 8.63 },
  { A: 140, symbol: 'Ce-140', name: '铈', binding: 8.42 },
  { A: 235, symbol: 'U-235', name: '铀', binding: 7.59 },
  { A: 238, symbol: 'U-238', name: '铀', binding: 7.57 }
];

export const BINDING_ENERGY_PRESETS: Record<string, number> = {
  he4: 4,
  c12: 12,
  fe56: 56,
  u235: 235,
  u238: 238
};

export const BINDING_ENERGY_LABELED = [
  'He-4',
  'C-12',
  'Fe-56',
  'Kr-89',
  'U-235',
  'U-238'
] as const;

const A_MIN = 1;
const A_MAX = 238;
const A_DEFAULT = 238;
const IRON_A = 56;
const IRON_BINDING = 8.79;
const PEAK_BAND = 6;
const AUTO_SPEED = 10;
const FRAME_DT = 1 / 60;
/** Matches `scene-adapter` arrow-key `step(±0.016)`. */
const KEYBOARD_DT = 0.016;
const BASE_W = 880;
const BASE_H = 640;
const CHART_LEFT = 76;
const CHART_RIGHT = 836;
const CHART_TOP = 136;
const CHART_BOTTOM = 536;
/** Design-space pad so scaled labels stay inside the 880×640 frame. */
const LABEL_INSET = 20;
const AXIS_MAX_A = 250;
const AXIS_MAX_E = 9.5;

const DEFAULTS: BindingEnergyParams = {
  A: A_DEFAULT,
  autoRun: true,
  showRegions: true
};

export const bindingEnergyConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  chartLeft: CHART_LEFT,
  chartRight: CHART_RIGHT,
  chartTop: CHART_TOP,
  chartBottom: CHART_BOTTOM,
  axisMaxA: AXIS_MAX_A,
  axisMaxE: AXIS_MAX_E,
  gridStepX: 50,
  gridStepY: 2,
  ironA: IRON_A,
  ironBinding: IRON_BINDING,
  aMin: A_MIN,
  aMax: A_MAX,
  aDefault: A_DEFAULT,
  peakBand: PEAK_BAND,
  autoRunSpeed: AUTO_SPEED,
  frameDt: FRAME_DT,
  keyboardDt: KEYBOARD_DT,
  pointRadius: 6,
  ironRadius: 12,
  selectedRadius: 9,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  overlayClearTop: 0,
  minReadableFit: 0.5,
  transportClearY: 96,
  labelInset: LABEL_INSET,
  /** Worst-case design-space nuclide font at 768/900 split slots. */
  labelFontBound: 32
} as const;

const C = bindingEnergyConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

function finite(value: unknown, fallback: number): number {
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

export function parseBindingEnergyPreset(
  value: unknown,
  fallback = 'u238'
): string {
  const key = String(value ?? '').trim();
  return key in BINDING_ENERGY_PRESETS ? key : fallback;
}

export function presetIdForA(A: number): string | null {
  const mass = Math.round(finite(A, A_DEFAULT));
  const found = Object.entries(BINDING_ENERGY_PRESETS).find(
    ([, value]) => value === mass
  );
  return found ? found[0] : null;
}

function normalizeParams(
  input: Partial<BindingEnergyParams>,
  previous = DEFAULTS
): BindingEnergyParams {
  return {
    A: Math.round(clamp(finite(input.A, previous.A), A_MIN, A_MAX)),
    autoRun:
      input.autoRun === undefined
        ? previous.autoRun
        : asBool(input.autoRun, previous.autoRun),
    showRegions:
      input.showRegions === undefined
        ? previous.showRegions
        : asBool(input.showRegions, previous.showRegions)
  };
}

function directionFromA(A: number): 1 | -1 {
  return finite(A, A_DEFAULT) >= IRON_A ? -1 : 1;
}

function clampedA(A: unknown, fallback = A_MIN): number {
  if (A === Number.POSITIVE_INFINITY) return A_MAX;
  if (A === Number.NEGATIVE_INFINITY) return A_MIN;
  return clamp(finite(A, fallback), A_MIN, A_MAX);
}

function massNumber(A: unknown, fallback = A_MIN): number {
  return Math.round(clampedA(A, fallback));
}

/** Linear interpolation along the documented nuclide table. Always finite. */
export function bindingEnergyAt(A: number): number {
  const a = clampedA(A);
  let left = BINDING_ENERGY_DATA[0]!;
  for (const point of BINDING_ENERGY_DATA) {
    if (point.A >= a) {
      const span = point.A - left.A;
      if (span <= 0) return point.binding;
      const ratio = (a - left.A) / span;
      const energy = left.binding + (point.binding - left.binding) * ratio;
      return Number.isFinite(energy) ? energy : left.binding;
    }
    left = point;
  }
  const last = BINDING_ENERGY_DATA[BINDING_ENERGY_DATA.length - 1]!;
  return last.binding;
}

export function nearestNuclide(A: number): BindingEnergyPoint {
  const a = clampedA(A);
  return BINDING_ENERGY_DATA.reduce(
    (best, point) =>
      Math.abs(point.A - a) < Math.abs(best.A - a) ? point : best,
    BINDING_ENERGY_DATA[0]!
  );
}

export function pointAt(A: number): BindingEnergyPoint {
  const mass = massNumber(A);
  const nearest = nearestNuclide(mass);
  const binding = bindingEnergyAt(mass);
  if (Math.abs(nearest.A - mass) <= 1) {
    return { ...nearest, A: mass, binding };
  }
  return {
    A: mass,
    symbol: `A=${mass}`,
    name: '核素',
    binding
  };
}

export function totalBindingEnergy(A: number): number {
  const mass = massNumber(A);
  return mass * bindingEnergyAt(mass);
}

/**
 * Per-nucleon gain toward Fe-56. Fusion is only defined for A < 56;
 * fission only for A > 56. Both are clamped to ≥ 0.
 */
export function fusionGainAt(A: number): number {
  const mass = massNumber(A);
  if (mass >= IRON_A) return 0;
  return Math.max(0, IRON_BINDING - bindingEnergyAt(mass));
}

export function fissionGainAt(A: number): number {
  const mass = massNumber(A);
  if (mass <= IRON_A) return 0;
  return Math.max(0, IRON_BINDING - bindingEnergyAt(mass));
}

export function statusAt(A: number): string {
  const mass = massNumber(A);
  if (Math.abs(mass - IRON_A) <= PEAK_BAND) return '稳定巅峰';
  if (mass < IRON_A) return '轻核·可聚变';
  return '重核·可裂变';
}

export const BINDING_ENERGY_Y_TITLE = ['比结合能', 'E/A (MeV)'] as const;
export const BINDING_ENERGY_X_TITLE = '质量数 A';

/**
 * Anchors grow away from the frame edges: U-235/U-238 are right-aligned
 * so “U-238” cannot run off the chart; Fe-56 sits below-right of the
 * peak so it does not collide with the two-line y-axis title.
 */
export function nuclideLabelAnchor(symbol: string): BindingEnergyLabelAnchor {
  switch (symbol) {
    case 'He-4':
      return { symbol, align: 'center', dx: 0, dy: 22 };
    case 'C-12':
      return { symbol, align: 'left', dx: 14, dy: -20 };
    case 'Fe-56':
      return { symbol, align: 'left', dx: 16, dy: 26 };
    case 'Kr-89':
      return { symbol, align: 'left', dx: 14, dy: -28 };
    case 'U-235':
      return { symbol, align: 'right', dx: -12, dy: -26 };
    case 'U-238':
      return { symbol, align: 'right', dx: -8, dy: 26 };
    default:
      return { symbol, align: 'center', dx: 0, dy: -16 };
  }
}

export function chartX(A: number): number {
  const a = clamp(finite(A, 0), 0, C.axisMaxA);
  return C.chartLeft + (C.chartRight - C.chartLeft) * (a / C.axisMaxA);
}

export function chartY(energy: number): number {
  const e = clamp(finite(energy, 0), 0, C.axisMaxE);
  return C.chartBottom - (C.chartBottom - C.chartTop) * (e / C.axisMaxE);
}

export type BindingEnergyLabelBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** Conservative bold sans-serif width in design pixels. */
export function estimateLabelWidth(text: string, fontSize: number): number {
  const size = Math.max(1, finite(fontSize, 12));
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    width += code > 0x2e80 ? size * 1.1 : size * 0.74;
  }
  return width;
}

export function labelBox(
  text: string,
  x: number,
  y: number,
  align: BindingEnergyLabelAnchor['align'],
  fontSize: number
): BindingEnergyLabelBox {
  const width = estimateLabelWidth(text, fontSize);
  const half = Math.max(1, finite(fontSize, 12)) * 0.55;
  let left = finite(x, 0);
  if (align === 'right') left -= width;
  else if (align === 'center') left -= width / 2;
  return {
    left,
    right: left + width,
    top: finite(y, 0) - half,
    bottom: finite(y, 0) + half
  };
}

export function clampLabelX(
  x: number,
  width: number,
  align: BindingEnergyLabelAnchor['align'],
  inset = C.labelInset
): number {
  const minL = inset;
  const maxR = C.baseWidth - inset;
  const w = Math.max(0, finite(width, 0));
  if (align === 'right') return clamp(finite(x, 0), minL + w, maxR);
  if (align === 'center') {
    return clamp(finite(x, 0), minL + w / 2, maxR - w / 2);
  }
  return clamp(finite(x, 0), minL, maxR - w);
}

export function boxesOverlap(
  a: BindingEnergyLabelBox,
  b: BindingEnergyLabelBox,
  gap = 0
): boolean {
  return (
    a.left < b.right + gap &&
    a.right + gap > b.left &&
    a.top < b.bottom + gap &&
    a.bottom + gap > b.top
  );
}

export function boxInsideFrame(
  box: BindingEnergyLabelBox,
  inset = C.labelInset
): boolean {
  return (
    box.left >= inset - 1e-6 &&
    box.top >= inset - 1e-6 &&
    box.right <= C.baseWidth - inset + 1e-6 &&
    box.bottom <= C.baseHeight - inset + 1e-6
  );
}

export function nuclideLabelPose(symbol: string): {
  symbol: string;
  x: number;
  y: number;
  align: BindingEnergyLabelAnchor['align'];
} {
  const point = BINDING_ENERGY_DATA.find((item) => item.symbol === symbol);
  const anchor = nuclideLabelAnchor(symbol);
  if (!point) {
    return { symbol, x: 0, y: 0, align: anchor.align };
  }
  return {
    symbol,
    x: chartX(point.A) + anchor.dx,
    y: chartY(point.binding) + anchor.dy,
    align: anchor.align
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
 * 880×640 chart-as-animation stage. Mobile stack fills the slot;
 * desktop floating readout stays left of the overlay.
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

function makeState(
  params: BindingEnergyParams,
  time: number,
  cursorA: number,
  direction: 1 | -1
): BindingEnergyState {
  const point = pointAt(params.A);
  return {
    params: { ...params },
    time,
    cursorA,
    direction,
    point,
    total: totalBindingEnergy(params.A),
    status: statusAt(params.A),
    fusionGain: fusionGainAt(params.A),
    fissionGain: fissionGainAt(params.A)
  };
}

export function createBindingEnergySim(
  initial: Partial<BindingEnergyParams> = {}
) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;
  let cursorA = params.A;
  let direction: 1 | -1 = directionFromA(params.A);

  function snapTo(mass: number): void {
    const next = Math.round(clamp(finite(mass, params.A), A_MIN, A_MAX));
    params = { ...params, A: next };
    cursorA = next;
  }

  function advanceCursor(deltaA: number): void {
    const delta = finite(deltaA, 0);
    if (!Number.isFinite(delta) || delta === 0) return;
    let next = cursorA + delta;
    if (next >= A_MAX) {
      next = A_MAX;
      direction = -1;
    } else if (next <= A_MIN) {
      next = A_MIN;
      direction = 1;
    }
    cursorA = next;
    params = { ...params, A: Math.round(cursorA) };
  }

  function nudgeA(delta: number): void {
    const step = Math.trunc(finite(delta, 0));
    if (step === 0) return;
    snapTo(params.A + step);
  }

  function applyStep(dt: number, force: boolean): void {
    const delta = finite(dt, 0);
    if (!Number.isFinite(delta) || delta === 0) return;
    if (!force && Math.abs(Math.abs(delta) - KEYBOARD_DT) < 1e-12) {
      time += Math.abs(delta);
      nudgeA(Math.sign(delta));
      return;
    }
    if (!force && !params.autoRun) return;
    time += Math.abs(delta);
    advanceCursor(Math.abs(delta) * AUTO_SPEED * direction);
  }

  return {
    getState(): BindingEnergyState {
      return makeState(params, time, cursorA, direction);
    },
    getSnapshot(): BindingEnergyState {
      return makeState(params, time, cursorA, direction);
    },
    getParams(): BindingEnergyParams {
      return { ...params };
    },
    setParams(next: Partial<BindingEnergyParams>): BindingEnergyParams {
      const previousA = params.A;
      params = normalizeParams({ ...params, ...next }, params);
      if (next.A !== undefined && params.A !== previousA) {
        cursorA = params.A;
        direction = directionFromA(params.A);
      }
      return { ...params };
    },
    nudgeA,
    step(dt: number): void {
      applyStep(dt, false);
    },
    /** Forced frame; ignores autoRun so pause still allows a single tick. */
    stepFrame(dt: number = FRAME_DT): void {
      applyStep(finite(dt, FRAME_DT), true);
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      cursorA = params.A;
      direction = directionFromA(params.A);
    }
  };
}
