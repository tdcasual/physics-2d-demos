import { clamp } from '../../core/math';

export type WedgeProfile = 'linear' | 'quad';
export type WedgeParams = {
  lambda: number;
  dTop: number;
  dBottom: number;
  n: number;
  profile: WedgeProfile;
  cursorY: number;
  autoRun: boolean;
};
export type WedgeState = WedgeParams & {
  localThickness: number;
  pathDiff: number;
  order: number;
  reflectivity: number;
  constructive: boolean;
  time: number;
};
export const wedgeConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 860,
  panelX: 860,
  panelWidth: 420,
  cardRadius: 12
} as const;
const DEFAULTS: WedgeParams = {
  lambda: 550,
  dTop: 0,
  dBottom: 800,
  n: 1.5,
  profile: 'linear',
  cursorY: 0.5,
  autoRun: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<WedgeParams>,
  previous = DEFAULTS
): WedgeParams {
  const profile =
    input.profile === 'quad' || input.profile === 'linear'
      ? input.profile
      : previous.profile;
  return {
    lambda: clamp(finite(input.lambda, previous.lambda), 400, 700),
    dTop: clamp(finite(input.dTop, previous.dTop), 0, 1000),
    dBottom: clamp(finite(input.dBottom, previous.dBottom), 100, 2000),
    n: clamp(finite(input.n, previous.n), 1, 2.5),
    profile,
    cursorY: clamp(finite(input.cursorY, previous.cursorY), 0, 1),
    autoRun: input.autoRun ?? previous.autoRun
  };
}
export function thicknessAt(
  dTop: number,
  dBottom: number,
  y: number,
  profile: WedgeProfile
): number {
  const t = clamp(y, 0, 1);
  return dTop + (dBottom - dTop) * (profile === 'quad' ? t * t : t);
}
export function calculateWedge(
  params: Pick<
    WedgeParams,
    'lambda' | 'dTop' | 'dBottom' | 'n' | 'profile' | 'cursorY'
  >
) {
  const localThickness = thicknessAt(
    params.dTop,
    params.dBottom,
    params.cursorY,
    params.profile
  );
  const pathDiff = 2 * params.n * localThickness + params.lambda / 2;
  const order = pathDiff / params.lambda;
  const reflectivity = Math.cos(Math.PI * order) ** 2;
  return {
    localThickness,
    pathDiff,
    order,
    reflectivity,
    constructive: reflectivity > 0.5
  };
}
export function createWedgeFilmInterferenceSim(
  initial: Partial<WedgeParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): WedgeState {
    return { ...params, ...calculateWedge(params), time };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): WedgeParams => ({ ...params }),
    setParams(next: Partial<WedgeParams>): WedgeParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) {
        time += Math.max(0, finite(dt, 0));
        params = { ...params, cursorY: 0.5 + 0.35 * Math.sin(time * 0.7) };
      }
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
