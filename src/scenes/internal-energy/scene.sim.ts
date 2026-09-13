import { clamp } from '../../core/math';

export type InternalEnergyExperiment = 'compress' | 'expand' | 'heat' | 'law';
export type InternalEnergyParams = {
  experiment: InternalEnergyExperiment;
  compression: number;
  heatInput: number;
  autoRun: boolean;
};
export type InternalEnergyParticle = { x: number; y: number; speed: number };
export type InternalEnergyState = {
  params: InternalEnergyParams;
  progress: number;
  temperature: number;
  pressure: number;
  volume: number;
  work: number;
  heat: number;
  deltaU: number;
  particleEnergy: number;
  particles: InternalEnergyParticle[];
};

export const internalEnergyConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  tubeX: 74,
  tubeY: 170,
  tubeWidth: 230,
  tubeHeight: 360,
  pistonTop: 206,
  pistonHeight: 46,
  tubeHandleOffset: 72,
  pistonArrowTop: 80,
  molecularX: 350,
  molecularY: 90,
  molecularWidth: 354,
  molecularHeight: 228,
  stateX: 350,
  stateY: 344,
  stateWidth: 354,
  stateHeight: 286,
  thermometerBottom: 216,
  thermometerMid: 108,
  panelRuleY: 72,
  formulaCardY: 84,
  formulaCardHeight: 124,
  readoutCardY: 222,
  readoutCardHeight: 224,
  actionCardY: 462,
  actionCardHeight: 98,
  compareCardY: 578,
  compareCardHeight: 144,
  defaultCompression: 0.45,
  defaultHeatInput: 40,
  compressionMin: 0,
  compressionMax: 1,
  heatInputMin: 0,
  heatInputMax: 100,
  animationPeriod: 4
} as const;

const DEFAULTS: InternalEnergyParams = {
  experiment: 'compress',
  compression: internalEnergyConstants.defaultCompression,
  heatInput: internalEnergyConstants.defaultHeatInput,
  autoRun: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<InternalEnergyParams>,
  previous = DEFAULTS
): InternalEnergyParams {
  return {
    experiment:
      input.experiment === 'expand' ||
      input.experiment === 'heat' ||
      input.experiment === 'law'
        ? input.experiment
        : 'compress',
    compression: clamp(
      finite(input.compression, previous.compression),
      internalEnergyConstants.compressionMin,
      internalEnergyConstants.compressionMax
    ),
    heatInput: clamp(
      finite(input.heatInput, previous.heatInput),
      internalEnergyConstants.heatInputMin,
      internalEnergyConstants.heatInputMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

function makeParticles(
  energy: number,
  progress: number
): InternalEnergyParticle[] {
  return Array.from({ length: 30 }, (_, index) => {
    const seed = index * 1.618;
    const speed = 0.6 + energy * 0.018 + ((index % 5) / 5) * 0.35;
    return {
      x: 18 + (Math.sin(seed * 2.1 + progress * speed) + 1) * 0.5 * 318,
      y: 22 + (Math.cos(seed * 1.7 + progress * speed * 1.3) + 1) * 0.5 * 184,
      speed
    };
  });
}

export function createInternalEnergySim(
  initial: Partial<InternalEnergyParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): InternalEnergyState {
    const progress = params.autoRun
      ? Math.min(
          1,
          (time % internalEnergyConstants.animationPeriod) /
            internalEnergyConstants.animationPeriod
        )
      : 0.55;
    const signedWork =
      params.experiment === 'expand'
        ? -18 * progress
        : params.experiment === 'heat'
          ? 0
          : 24 * progress;
    const heat = params.experiment === 'heat' ? params.heatInput * progress : 0;
    const work = params.experiment === 'law' ? 15 * progress : signedWork;
    const deltaU = params.experiment === 'law' ? work + heat : work + heat;
    const temperature = 20 + deltaU * 2.1;
    const volume =
      params.experiment === 'expand' ? 80 + 36 * progress : 80 - 30 * progress;
    const pressure = Math.max(
      36,
      ((temperature + 273.15) * 8.314) / Math.max(1, volume)
    );
    const particleEnergy = Math.max(0, 22 + deltaU * 1.8);
    return {
      params: { ...params },
      progress,
      temperature,
      pressure,
      volume,
      work,
      heat,
      deltaU,
      particleEnergy,
      particles: makeParticles(particleEnergy, time)
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): InternalEnergyParams => ({ ...params }),
    setParams(next: Partial<InternalEnergyParams>) {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number) {
      if (params.autoRun)
        time =
          (time + Math.max(0, finite(dt, 0))) %
          internalEnergyConstants.animationPeriod;
    },
    reset() {
      params = { ...defaults };
      time = 0;
    },
    triggerExperiment(experiment: InternalEnergyExperiment) {
      params = normalize({ ...params, experiment, autoRun: true }, params);
      time = 0;
    }
  };
}
