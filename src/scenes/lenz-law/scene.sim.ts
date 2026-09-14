import { clamp } from '../../core/math';

export type LenzMotion = 'approach' | 'recede';
export type LenzPole = 'N' | 'S';
export type LenzState = LenzParams & {
  time: number;
  distance: number;
  phase: number;
  flux: number;
  fluxRate: number;
  fluxFraction: number;
  emf: number;
  current: number;
  inducedField: 'opposes' | 'supports';
  leftPole: LenzPole;
  rightPole: LenzPole;
  forceDirection: 'away' | 'toward';
  force: number;
  status: 'approaching' | 'receding';
};
export type LenzParams = {
  motion: LenzMotion;
  speed: number;
  magnetStrength: number;
  autoRun: boolean;
  showVectors: boolean;
};

export const lenzLawConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  panelX: 830,
  panelWidth: 370,
  coilX: 520,
  coilY: 388,
  coilWidth: 150,
  coilHeight: 344,
  magnetY: 332,
  magnetWidth: 136,
  magnetHeight: 80,
  distanceMin: 0.14,
  distanceMax: 0.68,
  defaultDistanceApproach: 0.62,
  defaultDistanceRecede: 0.16,
  coupling: 0.00015,
  coilResistance: 1.8,
  emfScale: 120,
  fieldScale: 0.42,
  speedMin: 0.15,
  speedMax: 1.2,
  defaultSpeed: 0.55,
  strengthMin: 0.5,
  strengthMax: 1.5,
  defaultStrength: 1,
  playbackDistanceScale: 0.35,
  distancePixels: 360,
  gridStep: 62,
  gridTop: 74,
  fluxBarOffset: 66,
  fluxBarHeight: 8,
  fieldAxisY: 388,
  panelTitleY: 42,
  panelRuleY: 72,
  panelMotionY: 94,
  panelMotionHeight: 78,
  panelAnalysisY: 190,
  panelAnalysisHeight: 254,
  panelSummaryY: 468,
  panelSummaryHeight: 104,
  panelHintY: 594,
  panelHintHeight: 112,
  panelInset: 28
} as const;

const DEFAULTS: LenzParams = {
  motion: 'approach',
  speed: lenzLawConstants.defaultSpeed,
  magnetStrength: lenzLawConstants.defaultStrength,
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
  input: Partial<LenzParams>,
  previous = DEFAULTS
): LenzParams {
  return {
    motion:
      input.motion === 'approach' || input.motion === 'recede'
        ? input.motion
        : previous.motion,
    speed: clamp(
      finite(input.speed, previous.speed),
      lenzLawConstants.speedMin,
      lenzLawConstants.speedMax
    ),
    magnetStrength: clamp(
      finite(input.magnetStrength, previous.magnetStrength),
      lenzLawConstants.strengthMin,
      lenzLawConstants.strengthMax
    ),
    autoRun: asFlag(input.autoRun, previous.autoRun),
    showVectors: asFlag(input.showVectors, previous.showVectors)
  };
}

function derive(params: LenzParams, distance: number, time: number): LenzState {
  const d = clamp(
    distance,
    lenzLawConstants.distanceMin,
    lenzLawConstants.distanceMax
  );
  const sign = params.motion === 'approach' ? -1 : 1;
  const flux = (params.magnetStrength * lenzLawConstants.coupling) / (d * d);
  const fluxRate =
    (2 *
      params.magnetStrength *
      lenzLawConstants.coupling *
      params.speed *
      sign *
      -1) /
    (d * d * d);
  const emf = Math.abs(fluxRate) * lenzLawConstants.emfScale;
  const current = emf / lenzLawConstants.coilResistance;
  const fluxMax =
    (params.magnetStrength * lenzLawConstants.coupling) /
    lenzLawConstants.distanceMin ** 2;
  const fluxMin =
    (params.magnetStrength * lenzLawConstants.coupling) /
    lenzLawConstants.distanceMax ** 2;
  const fluxFraction = clamp((flux - fluxMin) / (fluxMax - fluxMin), 0, 1);
  const phase = clamp(
    (d - lenzLawConstants.distanceMin) /
      (lenzLawConstants.distanceMax - lenzLawConstants.distanceMin),
    0,
    1
  );
  const approaching = params.motion === 'approach';
  return {
    ...params,
    time,
    distance: d,
    phase: approaching ? phase : 1 - phase,
    flux,
    fluxRate,
    fluxFraction,
    emf,
    current,
    inducedField: approaching ? 'opposes' : 'supports',
    leftPole: approaching ? 'N' : 'S',
    rightPole: approaching ? 'S' : 'N',
    forceDirection: approaching ? 'away' : 'toward',
    force: current * lenzLawConstants.fieldScale,
    status: approaching ? 'approaching' : 'receding'
  };
}

export function lenzLawAt(
  params: LenzParams,
  distance: number,
  time = 0
): LenzState {
  return derive(normalize(params), distance, Math.max(0, finite(time, 0)));
}

export function createLenzLawSim(initial: Partial<LenzParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let distance =
    params.motion === 'approach'
      ? lenzLawConstants.defaultDistanceApproach
      : lenzLawConstants.defaultDistanceRecede;
  return {
    getState: (): LenzState => derive(params, distance, time),
    getSnapshot: (): LenzState => derive(params, distance, time),
    getParams: (): LenzParams => ({ ...params }),
    setParams(next: Partial<LenzParams>): LenzParams {
      const changedMotion = next.motion && next.motion !== params.motion;
      params = normalize({ ...params, ...next }, params);
      if (changedMotion) {
        distance =
          params.motion === 'approach'
            ? lenzLawConstants.defaultDistanceApproach
            : lenzLawConstants.defaultDistanceRecede;
        time = 0;
      }
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const duration = clamp(finite(dt, 0), 0, 0.1);
      time += duration;
      distance +=
        (params.motion === 'approach' ? -1 : 1) *
        params.speed *
        duration *
        lenzLawConstants.playbackDistanceScale;
      if (
        distance <= lenzLawConstants.distanceMin ||
        distance >= lenzLawConstants.distanceMax
      ) {
        distance =
          params.motion === 'approach'
            ? lenzLawConstants.defaultDistanceApproach
            : lenzLawConstants.defaultDistanceRecede;
        time = 0;
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      distance = lenzLawConstants.defaultDistanceApproach;
    }
  };
}
