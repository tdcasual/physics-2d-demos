import { clamp } from '../../core/math';

export type PrecisionToolMode =
  | 'caliper10'
  | 'caliper20'
  | 'caliper50'
  | 'micrometer';

export type PrecisionToolParams = {
  mode: PrecisionToolMode;
  adjustment: number;
  autoRun: boolean;
  showGuides: boolean;
  showReading: boolean;
};

export type PrecisionToolState = {
  params: PrecisionToolParams;
  time: number;
  actualSize: number;
  totalReading: number;
  mainScaleReading: number;
  fineReading: number;
  precision: number;
  divisions: number;
  vernierLength: number;
  alignmentIndex: number;
  drumRotation: number;
  status: string;
  phase: number;
};

export const PRECISION_MODES: PrecisionToolMode[] = [
  'caliper10',
  'caliper20',
  'caliper50',
  'micrometer'
];

export const precisionToolConstants = {
  adjustmentMin: 0,
  adjustmentMax: 1,
  caliperMinMm: 2,
  caliperMaxMm: 11,
  micrometerMinMm: 1,
  micrometerMaxMm: 9,
  micrometerPitchMm: 0.5,
  micrometerDivisions: 50,
  micrometerPrecisionMm: 0.01,
  animationPeriod: 8,
  scaleSpanMm: 12
} as const;

const DEFAULTS: PrecisionToolParams = {
  mode: 'caliper50',
  adjustment: 0.32,
  autoRun: true,
  showGuides: true,
  showReading: true
};

export function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
    if (v === '0' || v === 'false' || v === 'off' || v === 'no' || v === '')
      return false;
  }
  return fallback;
}

export function asPrecisionMode(value: unknown): PrecisionToolMode | undefined {
  if (
    value === 'caliper10' ||
    value === 'caliper20' ||
    value === 'caliper50' ||
    value === 'micrometer'
  )
    return value;
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^-?\d+$/.test(value.trim())
        ? Number(value.trim())
        : NaN;
  if (
    Number.isInteger(numeric) &&
    numeric >= 0 &&
    numeric < PRECISION_MODES.length
  )
    return PRECISION_MODES[numeric];
  return undefined;
}

function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalize(
  input: Partial<PrecisionToolParams> & Record<string, unknown>,
  previous = DEFAULTS
): PrecisionToolParams {
  return {
    mode: asPrecisionMode(input.mode) ?? previous.mode,
    adjustment: clamp(
      finite(input.adjustment, previous.adjustment),
      precisionToolConstants.adjustmentMin,
      precisionToolConstants.adjustmentMax
    ),
    autoRun: asBool(input.autoRun, previous.autoRun),
    showGuides: asBool(input.showGuides, previous.showGuides),
    showReading: asBool(input.showReading, previous.showReading)
  };
}

export function caliperSpec(mode: PrecisionToolMode): {
  divisions: number;
  precision: number;
  vernierLength: number;
} {
  if (mode === 'caliper10')
    return { divisions: 10, precision: 0.1, vernierLength: 9 };
  if (mode === 'caliper20')
    return { divisions: 20, precision: 0.05, vernierLength: 19 };
  return { divisions: 50, precision: 0.02, vernierLength: 49 };
}

function mapRange(adjustment: number, min: number, max: number): number {
  return min + adjustment * (max - min);
}

function derive(params: PrecisionToolParams, time: number): PrecisionToolState {
  const C = precisionToolConstants;
  if (params.mode === 'micrometer') {
    const raw = mapRange(
      params.adjustment,
      C.micrometerMinMm,
      C.micrometerMaxMm
    );
    const quantized =
      Math.round(raw / C.micrometerPrecisionMm) * C.micrometerPrecisionMm;
    let mainUnits = Math.floor(quantized / C.micrometerPitchMm + 1e-9);
    let remainder = quantized - mainUnits * C.micrometerPitchMm;
    let fineReading = Math.round(remainder / C.micrometerPrecisionMm);
    if (fineReading >= C.micrometerDivisions) {
      mainUnits += 1;
      fineReading = 0;
      remainder = 0;
    }
    const mainScaleReading = mainUnits * C.micrometerPitchMm;
    const totalReading =
      mainScaleReading + fineReading * C.micrometerPrecisionMm;
    return {
      params: { ...params },
      time,
      actualSize: quantized,
      totalReading,
      mainScaleReading,
      fineReading,
      precision: C.micrometerPrecisionMm,
      divisions: C.micrometerDivisions,
      vernierLength: 0,
      alignmentIndex: fineReading,
      drumRotation: totalReading / C.micrometerPitchMm,
      status: '螺距 0.5 mm ÷ 50 格 = 0.01 mm',
      phase: time / C.animationPeriod
    };
  }
  const { divisions, precision, vernierLength } = caliperSpec(params.mode);
  const raw = mapRange(params.adjustment, C.caliperMinMm, C.caliperMaxMm);
  const quantized = Math.round(raw / precision) * precision;
  let mainScaleReading = Math.floor(quantized + 1e-9);
  let alignmentIndex = Math.round((quantized - mainScaleReading) / precision);
  if (alignmentIndex >= divisions) {
    mainScaleReading += 1;
    alignmentIndex = 0;
  }
  alignmentIndex = clamp(alignmentIndex, 0, divisions - 1);
  const totalReading = mainScaleReading + alignmentIndex * precision;
  return {
    params: { ...params },
    time,
    actualSize: quantized,
    totalReading,
    mainScaleReading,
    fineReading: alignmentIndex,
    precision,
    divisions,
    vernierLength,
    alignmentIndex,
    drumRotation: 0,
    status: `游标 ${divisions} 格：每格 ${precision.toFixed(2)} mm`,
    phase: time / C.animationPeriod
  };
}

export function createPrecisionToolSim(
  initial: Partial<PrecisionToolParams> = {}
) {
  const baseline = normalize(initial);
  let params = { ...baseline };
  let time = 0;
  return {
    getState: (): PrecisionToolState => derive(params, time),
    getSnapshot: (): PrecisionToolState => derive(params, time),
    getParams: (): PrecisionToolParams => ({ ...params }),
    setParams(next: Partial<PrecisionToolParams>): PrecisionToolParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = Math.max(0, finite(dt, 0));
      time += delta;
      const period = precisionToolConstants.animationPeriod;
      const phase = (time / period) % 1;
      params.adjustment = 0.5 + 0.48 * Math.sin(2 * Math.PI * phase);
    },
    reset(): void {
      params = { ...baseline };
      time = 0;
    }
  };
}
