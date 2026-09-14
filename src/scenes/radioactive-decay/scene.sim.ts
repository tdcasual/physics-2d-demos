import { clamp } from '../../core/math';

export type RadioactiveParams = { halfLife: number; autoRun: boolean };
export type RadioactiveState = RadioactiveParams & {
  initialCount: number;
  remaining: number;
  decayed: number;
  theoryRemaining: number;
  theoryDecayed: number;
  halfLives: number;
  time: number;
};
export const radioactiveConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 820,
  panelX: 820,
  panelWidth: 460,
  initialCount: 400,
  gridCols: 20,
  gridRows: 20,
  halfLifeMin: 0.5,
  halfLifeMax: 5,
  defaultHalfLife: 2,
  cardRadius: 12
} as const;
const DEFAULTS: RadioactiveParams = {
  halfLife: radioactiveConstants.defaultHalfLife,
  autoRun: true
};
function finite(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function normalize(
  input: Partial<RadioactiveParams>,
  previous = DEFAULTS
): RadioactiveParams {
  return {
    halfLife: clamp(
      finite(input.halfLife, previous.halfLife),
      radioactiveConstants.halfLifeMin,
      radioactiveConstants.halfLifeMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}
function lifeFor(index: number, halfLife: number): number {
  const u =
    (((index * 73 + 41) % radioactiveConstants.initialCount) + 0.5) /
    radioactiveConstants.initialCount;
  return (-Math.log(u) * halfLife) / Math.LN2;
}
export function calculateRadioactive(
  params: RadioactiveParams,
  time: number
): RadioactiveState {
  let decayed = 0;
  for (let i = 0; i < radioactiveConstants.initialCount; i += 1)
    if (lifeFor(i, params.halfLife) <= time) decayed += 1;
  const remaining = radioactiveConstants.initialCount - decayed;
  const theoryRemaining =
    radioactiveConstants.initialCount * Math.pow(0.5, time / params.halfLife);
  return {
    ...params,
    initialCount: radioactiveConstants.initialCount,
    remaining,
    decayed,
    theoryRemaining,
    theoryDecayed: radioactiveConstants.initialCount - theoryRemaining,
    halfLives: time / params.halfLife,
    time
  };
}
export function createRadioactiveSim(initial: Partial<RadioactiveParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): RadioactiveState {
    return calculateRadioactive(params, time);
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): RadioactiveParams => ({ ...params }),
    setParams(next: Partial<RadioactiveParams>): RadioactiveParams {
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
