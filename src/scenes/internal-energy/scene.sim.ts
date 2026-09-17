import { clamp } from '../../core/math';

export type InternalEnergyMode = 'compress' | 'expand' | 'heat';

export type InternalEnergyParams = {
  mode: InternalEnergyMode;
  ratio: number;
  dewPoint: number;
  wet: boolean;
  tHot: number;
  tCold: number;
  cHot: number;
  cCold: number;
};

export type InternalEnergyMolecule = {
  x: number;
  y: number;
  kind: 'gas' | 'hot' | 'cold';
};

export type InternalEnergyState = {
  params: InternalEnergyParams;
  time: number;
  progress: number;
  temperature: number;
  pressure: number;
  volume: number;
  work: number;
  heat: number;
  deltaU: number;
  tHotNow: number;
  tColdNow: number;
  tEq: number;
  heatHot: number;
  heatCold: number;
  heatSum: number;
  ignited: boolean;
  fog: boolean;
  finished: boolean;
  playing: boolean;
  molecules: InternalEnergyMolecule[];
};

export const internalEnergyConstants = {
  R: 8.314,
  gamma: 1.4,
  v0mL: 80,
  t0C: 20,
  p0kPa: 100,
  schematicIgnitionC: 180,
  gasDuration: 3,
  conductance: 40,
  defaultRatio: 3,
  defaultDewPoint: 5,
  defaultTHot: 80,
  defaultTCold: 20,
  defaultCHot: 200,
  defaultCCold: 200,
  ratioMin: 1.2,
  ratioMax: 4,
  dewPointMin: -20,
  dewPointMax: 20,
  tHotMin: 0,
  tHotMax: 200,
  tColdMin: 0,
  tColdMax: 200,
  cMin: 50,
  cMax: 500,
  gasMolecules: 18,
  blockMolecules: 12,
  stageFallbackWidth: 800,
  stageFallbackHeight: 420,
  graphFallbackWidth: 640,
  graphFallbackHeight: 240
} as const;

const C = internalEnergyConstants;

/** Molar heat capacity at constant volume for diatomic air, Cv = R/(γ−1). */
export const molarCv = C.R / (C.gamma - 1);

export const v0m3 = C.v0mL * 1e-6;
export const t0K = C.t0C + 273.15;
export const p0Pa = C.p0kPa * 1000;

/** Closed-system air amount from p₀V₀ = nRT₀. */
export const moleCount = (p0Pa * v0m3) / (C.R * t0K);

const DEFAULTS: InternalEnergyParams = {
  mode: 'compress',
  ratio: C.defaultRatio,
  dewPoint: C.defaultDewPoint,
  wet: true,
  tHot: C.defaultTHot,
  tCold: C.defaultTCold,
  cHot: C.defaultCHot,
  cCold: C.defaultCCold
};

function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    if (value === Number.POSITIVE_INFINITY) return Number.POSITIVE_INFINITY;
    if (value === Number.NEGATIVE_INFINITY) return Number.NEGATIVE_INFINITY;
    return fallback;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  return fallback;
}

export function asMode(value: unknown): InternalEnergyMode {
  if (value === 'expand' || value === 1 || value === '1') return 'expand';
  if (value === 'heat' || value === 2 || value === '2') return 'heat';
  return 'compress';
}

export function modeIndex(mode: InternalEnergyMode): number {
  if (mode === 'expand') return 1;
  if (mode === 'heat') return 2;
  return 0;
}

export function shouldShowRatio(mode: InternalEnergyMode): boolean {
  return mode !== 'heat';
}

export function shouldShowExpand(mode: InternalEnergyMode): boolean {
  return mode === 'expand';
}

export function shouldShowHeat(mode: InternalEnergyMode): boolean {
  return mode === 'heat';
}

export const overlayControlKeySet = [
  'mode',
  'ratio',
  'dewPoint',
  'wet',
  'tHot',
  'tCold',
  'cHot',
  'cCold'
] as const;

export function overlayControlKeys(
  mode: InternalEnergyMode
): readonly string[] {
  const keys: string[] = ['mode'];
  if (shouldShowRatio(mode)) keys.push('ratio');
  if (shouldShowExpand(mode)) keys.push('dewPoint', 'wet');
  if (shouldShowHeat(mode)) keys.push('tHot', 'tCold', 'cHot', 'cCold');
  return keys;
}

function normalize(
  input: Partial<InternalEnergyParams>,
  previous = DEFAULTS
): InternalEnergyParams {
  return {
    mode: input.mode === undefined ? previous.mode : asMode(input.mode),
    ratio: clamp(finite(input.ratio, previous.ratio), C.ratioMin, C.ratioMax),
    dewPoint: clamp(
      finite(input.dewPoint, previous.dewPoint),
      C.dewPointMin,
      C.dewPointMax
    ),
    wet:
      input.wet === undefined ? previous.wet : asBool(input.wet, previous.wet),
    tHot: clamp(finite(input.tHot, previous.tHot), C.tHotMin, C.tHotMax),
    tCold: clamp(finite(input.tCold, previous.tCold), C.tColdMin, C.tColdMax),
    cHot: clamp(finite(input.cHot, previous.cHot), C.cMin, C.cMax),
    cCold: clamp(finite(input.cCold, previous.cCold), C.cMin, C.cMax)
  };
}

export function finalVolumeM3(params: InternalEnergyParams): number {
  if (params.mode === 'expand') return v0m3 * params.ratio;
  if (params.mode === 'compress') return v0m3 / params.ratio;
  return v0m3;
}

export function volumeAtProgress(
  params: InternalEnergyParams,
  progress: number
): number {
  const u = clamp(progress, 0, 1);
  return v0m3 + (finalVolumeM3(params) - v0m3) * u;
}

/** Quasi-static adiabatic teaching model: T V^{γ−1} = const. */
export function adiabaticTemperatureK(volumeM3: number): number {
  const ratio = v0m3 / Math.max(volumeM3, 1e-12);
  return t0K * Math.pow(ratio, C.gamma - 1);
}

export function equilibriumTemperatureC(params: InternalEnergyParams): number {
  const den = params.cHot + params.cCold;
  if (den <= 1e-9) return 0.5 * (params.tHot + params.tCold);
  return (params.cHot * params.tHot + params.cCold * params.tCold) / den;
}

export function heatTau(params: InternalEnergyParams): number {
  const den = C.conductance * (params.cHot + params.cCold);
  if (den <= 1e-9) return 8;
  return (params.cHot * params.cCold) / den;
}

export function processEndTime(params: InternalEnergyParams): number {
  if (params.mode === 'heat') {
    return clamp(8 * heatTau(params), 4, 20);
  }
  return C.gasDuration;
}

function bounce01(seed: number, time: number, speed: number): number {
  const trip = seed + time * speed;
  const cycle = ((trip % 2) + 2) % 2;
  return cycle < 1 ? cycle : 2 - cycle;
}

function gasMolecules(
  time: number,
  temperatureK: number
): InternalEnergyMolecule[] {
  const energy = Math.max(0.15, temperatureK / t0K);
  const speed = 0.35 + 0.85 * Math.sqrt(energy);
  return Array.from({ length: C.gasMolecules }, (_, index) => ({
    x: bounce01(index * 0.17 + 0.08, time, speed * (0.7 + (index % 5) * 0.08)),
    y: bounce01(index * 0.29 + 0.13, time, speed * (0.55 + (index % 4) * 0.09)),
    kind: 'gas' as const
  }));
}

function blockMolecules(
  time: number,
  temperatureC: number,
  kind: 'hot' | 'cold'
): InternalEnergyMolecule[] {
  const energy = Math.max(0.12, (temperatureC + 273.15) / t0K);
  const speed = 0.28 + 0.7 * Math.sqrt(energy);
  const offset = kind === 'hot' ? 0 : 1.7;
  return Array.from({ length: C.blockMolecules }, (_, index) => ({
    x: bounce01(
      offset + index * 0.19 + 0.1,
      time,
      speed * (0.65 + (index % 4) * 0.08)
    ),
    y: bounce01(
      offset + index * 0.31 + 0.2,
      time,
      speed * (0.5 + (index % 3) * 0.1)
    ),
    kind
  }));
}

export function sampleAt(
  params: InternalEnergyParams,
  time: number
): Omit<InternalEnergyState, 'params' | 'playing' | 'molecules'> & {
  molecules: InternalEnergyMolecule[];
} {
  const tEnd = processEndTime(params);
  const t = Math.max(0, time);
  const finished = t >= tEnd - 1e-9;
  const tProc = finished ? tEnd : t;
  const progress = clamp(tProc / Math.max(tEnd, 1e-9), 0, 1);
  const tEq = equilibriumTemperatureC(params);

  if (params.mode === 'heat') {
    const tau = Math.max(heatTau(params), 1e-6);
    const remain = Math.exp(-tProc / tau);
    const tHotNow = tEq + (params.tHot - tEq) * remain;
    const tColdNow = tEq + (params.tCold - tEq) * remain;
    const heatHot = params.cHot * (tHotNow - params.tHot);
    const heatCold = params.cCold * (tColdNow - params.tCold);
    const heatSum = heatHot + heatCold;
    return {
      time: tProc,
      progress,
      temperature: tHotNow,
      pressure: 0,
      volume: C.v0mL,
      work: 0,
      heat: 0,
      deltaU: 0,
      tHotNow,
      tColdNow,
      tEq,
      heatHot,
      heatCold,
      heatSum,
      ignited: false,
      fog: false,
      finished,
      molecules: [
        ...blockMolecules(t, tHotNow, 'hot'),
        ...blockMolecules(t, tColdNow, 'cold')
      ]
    };
  }

  const volume = volumeAtProgress(params, progress);
  const temperatureK = adiabaticTemperatureK(volume);
  const temperature = temperatureK - 273.15;
  const pressure = (moleCount * C.R * temperatureK) / Math.max(volume, 1e-12);
  const deltaU = moleCount * molarCv * (temperatureK - t0K);
  const work = deltaU;
  const heat = 0;
  const ignited =
    params.mode === 'compress' && temperature >= C.schematicIgnitionC - 1e-6;
  const fog =
    params.mode === 'expand' &&
    params.wet &&
    temperature < params.dewPoint - 1e-6;
  return {
    time: tProc,
    progress,
    temperature,
    pressure: pressure / 1000,
    volume: volume * 1e6,
    work,
    heat,
    deltaU,
    tHotNow: params.tHot,
    tColdNow: params.tCold,
    tEq,
    heatHot: 0,
    heatCold: 0,
    heatSum: 0,
    ignited,
    fog,
    finished,
    molecules: gasMolecules(t, temperatureK)
  };
}

export function restoredUrlParams(
  params: InternalEnergyParams,
  isPlaying = false
): Record<string, string | number> {
  return {
    mode: modeIndex(params.mode),
    ratio: params.ratio,
    dewPoint: params.dewPoint,
    wet: params.wet ? 1 : 0,
    tHot: params.tHot,
    tCold: params.tCold,
    cHot: params.cHot,
    cCold: params.cCold,
    autoRun: isPlaying ? 1 : 0
  };
}

export function createInternalEnergySim(
  initial: Partial<InternalEnergyParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  let playing = false;

  function snapshot(): InternalEnergyState {
    const sample = sampleAt(params, time);
    return {
      params: { ...params },
      ...sample,
      playing: playing && !sample.finished
    };
  }

  return {
    getState: snapshot,
    getSnapshot: snapshot,
    getParams: (): InternalEnergyParams => ({ ...params }),
    setParams(next: Partial<InternalEnergyParams>) {
      const prev = { ...params };
      params = normalize({ ...params, ...next }, params);
      const motionChanged =
        prev.mode !== params.mode ||
        prev.ratio !== params.ratio ||
        prev.dewPoint !== params.dewPoint ||
        prev.wet !== params.wet ||
        prev.tHot !== params.tHot ||
        prev.tCold !== params.tCold ||
        prev.cHot !== params.cHot ||
        prev.cCold !== params.cCold;
      if (motionChanged) time = 0;
      else {
        const tEnd = processEndTime(params);
        if (time > tEnd) time = tEnd;
      }
      return { ...params };
    },
    step(dt: number) {
      if (!playing) return;
      const sample = sampleAt(params, time);
      if (sample.finished) {
        playing = false;
        time = sample.time;
        return;
      }
      time = Math.min(
        processEndTime(params),
        time + Math.max(0, finite(dt, 0))
      );
      if (time >= processEndTime(params) - 1e-9) playing = false;
    },
    start() {
      if (sampleAt(params, time).finished) time = 0;
      playing = true;
    },
    pause() {
      playing = false;
    },
    rewind() {
      time = 0;
      playing = false;
    },
    reset() {
      params = { ...defaults };
      time = 0;
      playing = false;
    }
  };
}
