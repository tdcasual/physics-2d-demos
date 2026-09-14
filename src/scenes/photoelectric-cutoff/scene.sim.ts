import { clamp } from '../../core/math';

export type PhotoCathode = 'cesium' | 'sodium' | 'calcium';

export type PhotoelectricParams = {
  wavelength: number;
  intensity: number;
  cathode: PhotoCathode;
  voltage: number;
  autoRun: boolean;
};

export type PhotoelectricState = PhotoelectricParams & {
  photonEnergy: number;
  workFunction: number;
  maxKineticEnergy: number;
  stoppingVoltage: number;
  current: number;
  saturationCurrent: number;
  effectOn: boolean;
  progress: number;
  time: number;
};

export const photoelectricConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 860,
  panelX: 860,
  panelWidth: 420,
  wavelengthMin: 350,
  wavelengthMax: 700,
  intensityMin: 10,
  intensityMax: 100,
  voltageMin: -5,
  voltageMax: 5,
  cardRadius: 12
} as const;

export const CATHODE_WORK_FUNCTION: Record<PhotoCathode, number> = {
  cesium: 2.14,
  sodium: 2.28,
  calcium: 2.87
};

const DEFAULTS: PhotoelectricParams = {
  wavelength: 500,
  intensity: 50,
  cathode: 'sodium',
  voltage: 0,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<PhotoelectricParams>,
  previous = DEFAULTS
): PhotoelectricParams {
  const cathode: PhotoCathode =
    input.cathode === 'cesium' ||
    input.cathode === 'calcium' ||
    input.cathode === 'sodium'
      ? input.cathode
      : previous.cathode;
  return {
    wavelength: clamp(
      finite(input.wavelength, previous.wavelength),
      photoelectricConstants.wavelengthMin,
      photoelectricConstants.wavelengthMax
    ),
    intensity: clamp(
      finite(input.intensity, previous.intensity),
      photoelectricConstants.intensityMin,
      photoelectricConstants.intensityMax
    ),
    cathode,
    voltage: clamp(
      finite(input.voltage, previous.voltage),
      photoelectricConstants.voltageMin,
      photoelectricConstants.voltageMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function calculatePhotoelectric(
  params: Pick<
    PhotoelectricParams,
    'wavelength' | 'intensity' | 'cathode' | 'voltage'
  >
) {
  const photonEnergy = 1240 / params.wavelength;
  const workFunction = CATHODE_WORK_FUNCTION[params.cathode];
  const maxKineticEnergy = Math.max(0, photonEnergy - workFunction);
  const stoppingVoltage = maxKineticEnergy;
  const saturationCurrent = params.intensity * 0.8;
  const effectOn = maxKineticEnergy > 0;
  const current =
    !effectOn || params.voltage <= -stoppingVoltage
      ? 0
      : saturationCurrent *
        (1 - Math.exp(-(params.voltage + stoppingVoltage) / 0.35));
  return {
    photonEnergy,
    workFunction,
    maxKineticEnergy,
    stoppingVoltage,
    current: clamp(current, 0, saturationCurrent),
    saturationCurrent,
    effectOn
  };
}

export function createPhotoelectricSim(
  initial: Partial<PhotoelectricParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): PhotoelectricState {
    return {
      ...params,
      ...calculatePhotoelectric(params),
      progress: params.autoRun ? 0.5 + 0.5 * Math.sin(time * 2.5) : 0.65,
      time
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): PhotoelectricParams => ({ ...params }),
    setParams(next: Partial<PhotoelectricParams>): PhotoelectricParams {
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
