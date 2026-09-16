import { clamp } from '../../core/math';

export type PotentialScenario = 'segments' | 'point' | 'dipole';

export type PotentialGraphParams = {
  scenario: PotentialScenario;
  probeCharge: 1 | -1;
  chargeMagnitude: number;
  probePosition: number;
  showTangent: boolean;
  showArea: boolean;
  autoRun: boolean;
};

export type PotentialGraphState = {
  params: PotentialGraphParams;
  time: number;
  probePosition: number;
  potential: number;
  /** Unique E when φ is differentiable; null at a segment kink. */
  field: number | null;
  /** dφ/dx; null at a segment kink (φ continuous, not differentiable). */
  slope: number | null;
  potentialEnergy: number;
  /** Unique F=qE when E is unique; null at a segment kink. */
  force: number | null;
  fieldLeft: number;
  fieldRight: number;
  forceLeft: number;
  forceRight: number;
  kink: boolean;
  signedArea: number;
  phiRef: number;
};

export type LineCharge = { x: number; q: number };

export type GraphBounds = {
  phiMin: number;
  phiMax: number;
  eMin: number;
  eMax: number;
};

export const potentialGraphConstants = {
  xMin: 0,
  xMax: 10,
  probeMin: 0.3,
  probeMax: 9.7,
  chargeMin: 0.5,
  chargeMax: 2,
  animationPeriod: 9,
  tangentSpan: 0.8,
  coulombK: 8,
  pointChargeX: -1,
  negativeChargeX: 11,
  segmentBreaks: [3, 7] as const,
  kinkEps: 1e-9,
  graphFallbackWidth: 640,
  graphFallbackHeight: 280,
  stageFallbackWidth: 800,
  stageFallbackHeight: 360
} as const;

const C = potentialGraphConstants;

const DEFAULTS: PotentialGraphParams = {
  scenario: 'segments',
  probeCharge: 1,
  chargeMagnitude: 1,
  probePosition: 7.58,
  showTangent: true,
  showArea: true,
  autoRun: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string' && value.toLowerCase() === 'true') return true;
  if (typeof value === 'string' && value.toLowerCase() === 'false')
    return false;
  return fallback;
}

export function parseScenario(
  value: unknown,
  fallback: PotentialScenario = 'segments'
): PotentialScenario {
  if (value === 'point' || value === 'dipole' || value === 'segments') {
    return value;
  }
  if (value === 1 || value === '1') return 'point';
  if (value === 2 || value === '2') return 'dipole';
  if (value === 0 || value === '0') return 'segments';
  return fallback;
}

function wrapProbe(x: number): number {
  const span = C.probeMax - C.probeMin;
  const t = (((x - C.probeMin) % span) + span) % span;
  return C.probeMin + t;
}

function normalize(
  input: Partial<PotentialGraphParams>,
  previous = DEFAULTS
): PotentialGraphParams {
  const chargeRaw = Number(input.probeCharge);
  const probeCharge: 1 | -1 =
    chargeRaw === -1 ? -1 : chargeRaw === 1 ? 1 : previous.probeCharge;
  return {
    scenario: parseScenario(input.scenario, previous.scenario),
    probeCharge,
    chargeMagnitude: clamp(
      finite(input.chargeMagnitude, previous.chargeMagnitude),
      C.chargeMin,
      C.chargeMax
    ),
    probePosition: clamp(
      finite(input.probePosition, previous.probePosition),
      C.probeMin,
      C.probeMax
    ),
    showTangent: asBool(input.showTangent, previous.showTangent),
    showArea: asBool(input.showArea, previous.showArea),
    autoRun: asBool(input.autoRun, previous.autoRun)
  };
}

export function sourceCharges(scenario: PotentialScenario): LineCharge[] {
  if (scenario === 'point') return [{ x: C.pointChargeX, q: 1 }];
  if (scenario === 'dipole') {
    return [
      { x: C.pointChargeX, q: 1 },
      { x: C.negativeChargeX, q: -1 }
    ];
  }
  return [];
}

function coulombAt(
  x: number,
  sources: LineCharge[]
): { potential: number; field: number } {
  let potential = 0;
  let field = 0;
  for (const source of sources) {
    const dx = x - source.x;
    const r = Math.abs(dx);
    if (r < 1e-9) continue;
    potential += (C.coulombK * source.q) / r;
    field += (C.coulombK * source.q * dx) / (r * r * r);
  }
  return { potential, field };
}

function segmentsAt(x: number): { potential: number; field: number } {
  const position = clamp(x, C.xMin, C.xMax);
  if (position < C.segmentBreaks[0]) {
    return { potential: 10 - 3 * position, field: 3 };
  }
  if (position < C.segmentBreaks[1]) {
    return { potential: 1 + 2 * (position - 3), field: -2 };
  }
  return { potential: 9 - 1.5 * (position - 7), field: 1.5 };
}

export function segmentKinkAt(x: number): number | null {
  const position = clamp(x, C.xMin, C.xMax);
  for (const knot of C.segmentBreaks) {
    if (Math.abs(position - knot) <= C.kinkEps) return knot;
  }
  return null;
}

/**
 * One-sided E at x. At x=3 and x=7, φ is continuous but not differentiable,
 * so left and right limits differ and `kink` is true.
 */
export function fieldSides(
  scenario: PotentialScenario,
  x: number
): { left: number; right: number; kink: boolean } {
  if (scenario !== 'segments') {
    const { field } = potentialAt(scenario, x);
    return { left: field, right: field, kink: false };
  }
  const knot = segmentKinkAt(x);
  if (knot === C.segmentBreaks[0]) {
    // φ=10−3x on the left (E=3); φ=1+2(x−3) on the right (E=−2)
    return { left: 3, right: -2, kink: true };
  }
  if (knot === C.segmentBreaks[1]) {
    // φ=1+2(x−3) on the left (E=−2); φ=9−1.5(x−7) on the right (E=1.5)
    return { left: -2, right: 1.5, kink: true };
  }
  const { field } = segmentsAt(x);
  return { left: field, right: field, kink: false };
}

export function potentialAt(
  scenario: PotentialScenario,
  x: number
): { potential: number; field: number } {
  const position = clamp(x, C.xMin, C.xMax);
  if (scenario === 'segments') return segmentsAt(position);
  return coulombAt(position, sourceCharges(scenario));
}

function niceAbsLimit(value: number, pad = 1.15): number {
  const v = Math.max(1, Math.abs(value) * pad);
  const mag = 10 ** Math.floor(Math.log10(v));
  const residual = v / mag;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return nice * mag;
}

export function graphBounds(scenario: PotentialScenario): GraphBounds {
  if (scenario === 'segments') {
    return { phiMin: -1, phiMax: 11, eMin: -4, eMax: 4 };
  }
  let phiMin = 0;
  let phiMax = 0;
  let eMax = 0;
  for (let i = 0; i <= 80; i += 1) {
    const x = C.xMin + ((C.xMax - C.xMin) * i) / 80;
    const { potential, field } = potentialAt(scenario, x);
    phiMin = Math.min(phiMin, potential);
    phiMax = Math.max(phiMax, potential);
    eMax = Math.max(eMax, Math.abs(field));
  }
  const phiPad = niceAbsLimit(Math.max(-phiMin, phiMax));
  const ePad = niceAbsLimit(eMax);
  if (scenario === 'point') {
    return { phiMin: -0.5, phiMax: phiPad, eMin: -0.5, eMax: ePad };
  }
  return { phiMin: -phiPad, phiMax: phiPad, eMin: -0.5, eMax: ePad };
}

export function axisTicks(min: number, max: number, maxCount = 6): number[] {
  const span = max - min;
  if (!(span > 0)) return [min, max];
  const rough = span / Math.max(2, maxCount - 1);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / mag;
  const step = residual >= 5 ? 5 * mag : residual >= 2 ? 2 * mag : mag;
  const start = Math.ceil((min - 1e-9) / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + 1e-9; value += step) {
    ticks.push(Number(value.toFixed(8)));
  }
  if (min <= 0 && max >= 0 && !ticks.some((tick) => Math.abs(tick) < 1e-9)) {
    ticks.push(0);
    ticks.sort((a, b) => a - b);
  }
  return ticks;
}

function derive(
  params: PotentialGraphParams,
  time: number
): PotentialGraphState {
  const values = potentialAt(params.scenario, params.probePosition);
  const sides = fieldSides(params.scenario, params.probePosition);
  const phiRef = potentialAt(params.scenario, C.xMin).potential;
  const q = params.probeCharge * params.chargeMagnitude;
  const uniqueField = sides.kink ? null : sides.left;
  return {
    params: { ...params },
    time,
    probePosition: params.probePosition,
    potential: values.potential,
    field: uniqueField,
    slope: uniqueField === null ? null : -uniqueField,
    potentialEnergy: q * values.potential,
    force: uniqueField === null ? null : q * uniqueField,
    fieldLeft: sides.left,
    fieldRight: sides.right,
    forceLeft: q * sides.left,
    forceRight: q * sides.right,
    kink: sides.kink,
    signedArea: phiRef - values.potential,
    phiRef
  };
}

export function createPotentialGraphSim(
  initial: Partial<PotentialGraphParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  const scanSpeed = (C.probeMax - C.probeMin) / C.animationPeriod;
  return {
    getState: (): PotentialGraphState => derive(params, time),
    getSnapshot: (): PotentialGraphState => derive(params, time),
    getParams: (): PotentialGraphParams => ({ ...params }),
    setParams(next: Partial<PotentialGraphParams>): PotentialGraphParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      const delta = finite(dt, 0);
      if (!params.autoRun || delta === 0) return;
      time += Math.abs(delta);
      params = {
        ...params,
        probePosition: wrapProbe(params.probePosition + scanSpeed * delta)
      };
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}

export function restoredUrlParams(params: PotentialGraphParams): {
  scenario: PotentialScenario;
  probeCharge: 1 | -1;
  chargeMagnitude: number;
  probePosition: number;
  showTangent: 0 | 1;
  showArea: 0 | 1;
  autoRun: 0 | 1;
} {
  return {
    scenario: params.scenario,
    probeCharge: params.probeCharge,
    chargeMagnitude: params.chargeMagnitude,
    probePosition: params.probePosition,
    showTangent: params.showTangent ? 1 : 0,
    showArea: params.showArea ? 1 : 0,
    autoRun: params.autoRun ? 1 : 0
  };
}
