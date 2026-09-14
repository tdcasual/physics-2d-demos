import { clamp } from '../../core/math';

export type MicroMaterial = 'wood' | 'marble' | 'steel';
export type DeformationMode = 'physical' | 'concept';

export type MicroDeformationParams = {
  material: MicroMaterial;
  loadKg: number;
  mirrorGap: number;
  screenDistance: number;
  deformationMode: DeformationMode;
  showOpticalPath: boolean;
  autoRun: boolean;
};

export type MicroDeformationState = MicroDeformationParams & {
  forceN: number;
  stiffness: number;
  deflectionM: number;
  deflectionMicron: number;
  mirrorAngleMicrorad: number;
  magnification: number;
  screenShiftMm: number;
  visibleDeflectionPx: number;
  screenSpotOffsetPx: number;
  pulse: number;
  time: number;
};

export const microDeformationConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 860,
  panelX: 860,
  panelWidth: 420,
  forceMin: 0,
  forceMax: 50,
  gapMin: 0.05,
  gapMax: 0.2,
  distanceMin: 2,
  distanceMax: 6,
  deflectionPxPerMicron: 0.14,
  physicalPxPerMicron: 0.002,
  cardRadius: 12
} as const;

export const MATERIAL_STIFFNESS: Record<MicroMaterial, number> = {
  wood: 5e6,
  marble: 2e7,
  steel: 1e8
};

const DEFAULTS: MicroDeformationParams = {
  material: 'wood',
  loadKg: 0,
  mirrorGap: 0.1,
  screenDistance: 4.5,
  deformationMode: 'physical',
  showOpticalPath: true,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<MicroDeformationParams>,
  previous = DEFAULTS
): MicroDeformationParams {
  const material: MicroMaterial =
    input.material === 'marble' ||
    input.material === 'steel' ||
    input.material === 'wood'
      ? input.material
      : previous.material;
  const deformationMode: DeformationMode =
    input.deformationMode === 'concept' || input.deformationMode === 'physical'
      ? input.deformationMode
      : previous.deformationMode;
  return {
    material,
    loadKg: clamp(
      finite(input.loadKg, previous.loadKg),
      microDeformationConstants.forceMin,
      microDeformationConstants.forceMax
    ),
    mirrorGap: clamp(
      finite(input.mirrorGap, previous.mirrorGap),
      microDeformationConstants.gapMin,
      microDeformationConstants.gapMax
    ),
    screenDistance: clamp(
      finite(input.screenDistance, previous.screenDistance),
      microDeformationConstants.distanceMin,
      microDeformationConstants.distanceMax
    ),
    deformationMode,
    showOpticalPath: input.showOpticalPath ?? previous.showOpticalPath,
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function calculateMicroDeformation(
  params: Pick<
    MicroDeformationParams,
    'material' | 'loadKg' | 'mirrorGap' | 'screenDistance' | 'deformationMode'
  >
) {
  const forceN = params.loadKg * 9.8;
  const stiffness = MATERIAL_STIFFNESS[params.material];
  const deflectionM = forceN / stiffness;
  const deflectionMicron = deflectionM * 1e6;
  const mirrorAngleMicrorad = ((1.5 * deflectionM) / params.mirrorGap) * 1e6;
  const magnification = (4 * 1.5 * params.screenDistance) / params.mirrorGap;
  const screenShiftMm = (magnification * deflectionMicron) / 1000;
  const visibleDeflectionPx = clamp(
    deflectionMicron *
      (params.deformationMode === 'concept'
        ? microDeformationConstants.deflectionPxPerMicron
        : microDeformationConstants.physicalPxPerMicron),
    0,
    42
  );
  const screenSpotOffsetPx = clamp(screenShiftMm * 0.65, -62, 62);
  return {
    forceN,
    stiffness,
    deflectionM,
    deflectionMicron,
    mirrorAngleMicrorad,
    magnification,
    screenShiftMm,
    visibleDeflectionPx,
    screenSpotOffsetPx
  };
}

export function createMicroDeformationSim(
  initial: Partial<MicroDeformationParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): MicroDeformationState {
    return {
      ...params,
      ...calculateMicroDeformation(params),
      pulse: params.autoRun ? 0.5 + 0.5 * Math.sin(time * 2.2) : 0.6,
      time
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): MicroDeformationParams => ({ ...params }),
    setParams(next: Partial<MicroDeformationParams>): MicroDeformationParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
