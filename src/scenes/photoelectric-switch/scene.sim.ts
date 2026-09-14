import { clamp } from '../../core/math';

export type PhotoelectricMaterial = 'cesium' | 'sodium' | 'zinc';
export type RelayState = 'closed' | 'open';
export type PhotoelectricParams = {
  material: PhotoelectricMaterial;
  frequency: number;
  intensity: number;
  autoRun: boolean;
  showVectors: boolean;
};
export type PhotoelectricState = PhotoelectricParams & {
  time: number;
  workFunction: number;
  thresholdFrequency: number;
  photonEnergy: number;
  maxKineticEnergy: number;
  photoCurrent: number;
  magneticForce: number;
  springForce: number;
  relayState: RelayState;
  lampOn: boolean;
  effectActive: boolean;
  electronFraction: number;
  fieldFraction: number;
};

export const photoelectricConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 776,
  panelWidth: 424,
  frequencyScale: 1e14,
  planckEvS: 4.135667696e-15,
  frequencyMin: 3.8,
  frequencyMax: 9,
  defaultFrequency: 7.6,
  intensityMin: 1,
  intensityMax: 100,
  defaultIntensity: 1,
  springForce: 0.6,
  currentScale: 0.08,
  forceScale: 0.1,
  sourceX: 74,
  sourceY: 132,
  sourceWidth: 58,
  sourceHeight: 42,
  sourceLensX: 132,
  sourceLensY: 153,
  sourceLensRadius: 25,
  beamStartX: 158,
  beamEndX: 394,
  tubeX: 480,
  tubeY: 218,
  tubeRadius: 108,
  cathodeX: 428,
  anodeX: 532,
  tubePowerY: 370,
  supplyX: 480,
  supplyY: 392,
  supplyWidth: 88,
  supplyHeight: 54,
  amplifierX: 480,
  amplifierY: 510,
  amplifierWidth: 142,
  amplifierHeight: 70,
  relayCoreX: 416,
  relayCoreY: 626,
  relayCoreWidth: 162,
  relayCoreHeight: 36,
  armatureX: 592,
  armatureY: 624,
  armatureLowerOffset: 54,
  springEndOffset: 84,
  lampX: 688,
  lampY: 626,
  lampWireOffset: 58,
  panelInset: 26,
  panelTitleY: 40,
  panelRuleY: 74,
  panelMaterialY: 104,
  panelMaterialHeight: 74,
  panelFrequencyY: 198,
  panelFrequencyHeight: 112,
  panelIntensityY: 330,
  panelIntensityHeight: 94,
  panelReadoutY: 440,
  panelReadoutHeight: 138,
  panelRelayY: 598,
  panelRelayHeight: 104,
  panelControlWidth: 372,
  gridStep: 58,
  gridTop: 66
} as const;

export const photoelectricMaterials: Record<
  PhotoelectricMaterial,
  { label: string; workFunction: number }
> = {
  cesium: { label: '铯', workFunction: 1.9 },
  sodium: { label: '钠', workFunction: 2.28 },
  zinc: { label: '锌', workFunction: 3.31 }
};

const DEFAULTS: PhotoelectricParams = {
  material: 'cesium',
  frequency: photoelectricConstants.defaultFrequency,
  intensity: photoelectricConstants.defaultIntensity,
  autoRun: true,
  showVectors: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asFlag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
}

function normalize(
  input: Partial<PhotoelectricParams>,
  previous = DEFAULTS
): PhotoelectricParams {
  return {
    material:
      input.material && input.material in photoelectricMaterials
        ? input.material
        : previous.material,
    frequency: clamp(
      finite(input.frequency, previous.frequency),
      photoelectricConstants.frequencyMin,
      photoelectricConstants.frequencyMax
    ),
    intensity: clamp(
      finite(input.intensity, previous.intensity),
      photoelectricConstants.intensityMin,
      photoelectricConstants.intensityMax
    ),
    autoRun: asFlag(input.autoRun, previous.autoRun),
    showVectors: asFlag(input.showVectors, previous.showVectors)
  } as PhotoelectricParams;
}

function derive(params: PhotoelectricParams, time: number): PhotoelectricState {
  const material = photoelectricMaterials[params.material];
  const photonEnergy =
    photoelectricConstants.planckEvS *
    params.frequency *
    photoelectricConstants.frequencyScale;
  const thresholdFrequency =
    material.workFunction /
    photoelectricConstants.planckEvS /
    photoelectricConstants.frequencyScale;
  const maxKineticEnergy = Math.max(0, photonEnergy - material.workFunction);
  const effectActive = maxKineticEnergy > 0;
  const photoCurrent = effectActive
    ? params.intensity *
      (0.1 + photoelectricConstants.currentScale * maxKineticEnergy)
    : 0;
  const magneticForce = photoCurrent * photoelectricConstants.forceScale;
  const relayState: RelayState =
    magneticForce >= photoelectricConstants.springForce ? 'open' : 'closed';
  return {
    ...params,
    time,
    workFunction: material.workFunction,
    thresholdFrequency,
    photonEnergy,
    maxKineticEnergy,
    photoCurrent,
    magneticForce,
    springForce: photoelectricConstants.springForce,
    relayState,
    lampOn: relayState === 'closed',
    effectActive,
    electronFraction: effectActive ? clamp(params.intensity / 100, 0.08, 1) : 0,
    fieldFraction: effectActive ? clamp(maxKineticEnergy / 2.2, 0, 1) : 0
  };
}

export function photoelectricAt(
  params: PhotoelectricParams,
  time = 0
): PhotoelectricState {
  return derive(normalize(params), Math.max(0, finite(time, 0)));
}

export function createPhotoelectricSim(
  initial: Partial<PhotoelectricParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): PhotoelectricState => derive(params, time),
    getSnapshot: (): PhotoelectricState => derive(params, time),
    getParams: (): PhotoelectricParams => ({ ...params }),
    setParams(next: Partial<PhotoelectricParams>): PhotoelectricParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += clamp(finite(dt, 0), 0, 0.1);
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
