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
  alignmentIndex: number;
  drumRotation: number;
  status: string;
  phase: number;
};

export const precisionToolConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  fieldLeft: 42,
  fieldRight: 730,
  fieldTop: 104,
  fieldBottom: 708,
  scaleY: 280,
  scaleHeight: 34,
  scaleSpanMm: 12,
  zoomY: 510,
  zoomHeight: 174,
  zoomX: 42,
  zoomWidth: 688,
  cardX: 786,
  cardWidth: 382,
  headerRuleY: 72,
  readoutY: 100,
  readoutHeight: 150,
  formulaY: 272,
  formulaHeight: 132,
  detailY: 430,
  detailHeight: 124,
  adjustmentMin: 0,
  adjustmentMax: 1,
  caliperMinMm: 2,
  caliperMaxMm: 11,
  micrometerMinMm: 1,
  micrometerMaxMm: 9,
  micrometerPitchMm: 0.5,
  micrometerDivisions: 50,
  caliperBodyInset: 34,
  caliperBodyTopOffset: 72,
  caliperBodyHeight: 68,
  caliperJawInset: 28,
  caliperJawTopOffset: 96,
  caliperJawHeight: 120,
  caliperTipTopOffset: 120,
  caliperTipReach: 140,
  caliperUpperTipInset: 60,
  caliperCursorLineTopOffset: 90,
  zoomCenterLineOffset: 92,
  zoomPrimaryTickHeight: 74,
  micrometerZoomMajorHeight: 52,
  animationPeriod: 8
} as const;

const DEFAULTS: PrecisionToolParams = {
  mode: 'caliper50',
  adjustment: 0.32,
  autoRun: true,
  showGuides: true,
  showReading: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<PrecisionToolParams>,
  previous = DEFAULTS
): PrecisionToolParams {
  return {
    mode:
      input.mode === 'caliper10' ||
      input.mode === 'caliper20' ||
      input.mode === 'caliper50' ||
      input.mode === 'micrometer'
        ? input.mode
        : previous.mode,
    adjustment: clamp(
      finite(input.adjustment, previous.adjustment),
      precisionToolConstants.adjustmentMin,
      precisionToolConstants.adjustmentMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showGuides: input.showGuides ?? previous.showGuides,
    showReading: input.showReading ?? previous.showReading
  };
}

function caliperPrecision(mode: PrecisionToolMode): {
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

function derive(params: PrecisionToolParams, time: number): PrecisionToolState {
  if (params.mode === 'micrometer') {
    const raw =
      precisionToolConstants.micrometerMinMm +
      params.adjustment *
        (precisionToolConstants.micrometerMaxMm -
          precisionToolConstants.micrometerMinMm);
    const actualSize = Math.round(raw * 100) / 100;
    const mainScaleReading =
      Math.floor(actualSize / precisionToolConstants.micrometerPitchMm) *
      precisionToolConstants.micrometerPitchMm;
    const fineReading = Math.round(
      (actualSize - mainScaleReading) *
        precisionToolConstants.micrometerDivisions
    );
    const totalReading =
      mainScaleReading +
      fineReading / precisionToolConstants.micrometerDivisions;
    return {
      params: { ...params },
      time,
      actualSize,
      totalReading,
      mainScaleReading,
      fineReading,
      precision: 0.01,
      divisions: precisionToolConstants.micrometerDivisions,
      alignmentIndex: fineReading,
      drumRotation: totalReading / precisionToolConstants.micrometerPitchMm,
      status: '螺距 0.5 mm ÷ 50 格 = 0.01 mm',
      phase: time / precisionToolConstants.animationPeriod
    };
  }
  const { divisions, precision } = caliperPrecision(params.mode);
  const raw =
    precisionToolConstants.caliperMinMm +
    params.adjustment *
      (precisionToolConstants.caliperMaxMm -
        precisionToolConstants.caliperMinMm);
  const actualSize = Math.round(raw * 100) / 100;
  const mainScaleReading = Math.floor(actualSize);
  const alignmentIndex = Math.max(
    0,
    Math.min(
      divisions - 1,
      Math.round((actualSize - mainScaleReading) / precision)
    )
  );
  const totalReading = mainScaleReading + alignmentIndex * precision;
  return {
    params: { ...params },
    time,
    actualSize,
    totalReading,
    mainScaleReading,
    fineReading: alignmentIndex,
    precision,
    divisions,
    alignmentIndex,
    drumRotation: 0,
    status: `游标 ${divisions} 格：每格 ${precision.toFixed(2)} mm`,
    phase: time / precisionToolConstants.animationPeriod
  };
}

export function createPrecisionToolSim(
  initial: Partial<PrecisionToolParams> = {}
) {
  let params = normalize(initial);
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
      time += Math.max(0, finite(dt, 0));
      if (
        params.mode !== 'micrometer' &&
        time > precisionToolConstants.animationPeriod
      ) {
        time = time % precisionToolConstants.animationPeriod;
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
