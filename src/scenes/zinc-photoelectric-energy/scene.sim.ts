import { clamp } from '../../core/math';

export type ChargeState = 'rubbed' | 'grounded';
export type ZincPhotoelectricParams = {
  wavelength: number;
  intensity: number;
  chargeState: ChargeState;
  autoRun: boolean;
};
export type ZincPhotoelectricState = ZincPhotoelectricParams & {
  photonEnergy: number;
  workFunction: number;
  maxKineticEnergy: number;
  thresholdWavelength: number;
  effectOn: boolean;
  emitted: boolean;
  plateCharge: number;
  electroscopeAngle: number;
  electronCount: number;
  time: number;
};
export const zincPhotoelectricConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 860,
  panelX: 860,
  panelWidth: 420,
  wavelengthMin: 150,
  wavelengthMax: 650,
  intensityMin: 0,
  intensityMax: 100,
  workFunction: 4.3,
  thresholdWavelength: 288,
  cardRadius: 12
} as const;
const DEFAULTS: ZincPhotoelectricParams = {
  wavelength: 247,
  intensity: 80,
  chargeState: 'rubbed',
  autoRun: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<ZincPhotoelectricParams>,
  previous = DEFAULTS
): ZincPhotoelectricParams {
  const chargeState: ChargeState =
    input.chargeState === 'grounded' || input.chargeState === 'rubbed'
      ? input.chargeState
      : previous.chargeState;
  return {
    wavelength: clamp(
      finite(input.wavelength, previous.wavelength),
      zincPhotoelectricConstants.wavelengthMin,
      zincPhotoelectricConstants.wavelengthMax
    ),
    intensity: clamp(
      finite(input.intensity, previous.intensity),
      zincPhotoelectricConstants.intensityMin,
      zincPhotoelectricConstants.intensityMax
    ),
    chargeState,
    autoRun: input.autoRun ?? previous.autoRun
  };
}
export function calculateZincPhotoelectric(
  params: Pick<
    ZincPhotoelectricParams,
    'wavelength' | 'intensity' | 'chargeState'
  > &
    Partial<Pick<ZincPhotoelectricParams, 'autoRun'>>,
  time = 0
): ZincPhotoelectricState {
  const photonEnergy = 1240 / params.wavelength;
  const workFunction = zincPhotoelectricConstants.workFunction;
  const maxKineticEnergy = Math.max(0, photonEnergy - workFunction);
  const effectOn = maxKineticEnergy > 0;
  const emitted = effectOn && params.chargeState === 'rubbed';
  const plateCharge =
    params.chargeState === 'rubbed'
      ? Math.max(0, 1 - (emitted ? Math.min(1, time / 8) : 0))
      : 0;
  return {
    ...params,
    autoRun: params.autoRun ?? false,
    photonEnergy,
    workFunction,
    maxKineticEnergy,
    thresholdWavelength: zincPhotoelectricConstants.thresholdWavelength,
    effectOn,
    emitted,
    plateCharge,
    electroscopeAngle: plateCharge * 0.42,
    electronCount: emitted ? Math.round(8 + params.intensity * 0.32) : 0,
    time
  };
}
export function createZincPhotoelectricSim(
  initial: Partial<ZincPhotoelectricParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): ZincPhotoelectricState {
    return calculateZincPhotoelectric(params, time);
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): ZincPhotoelectricParams => ({ ...params }),
    setParams(next: Partial<ZincPhotoelectricParams>): ZincPhotoelectricParams {
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
