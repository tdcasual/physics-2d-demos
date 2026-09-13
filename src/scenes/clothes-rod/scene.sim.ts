import { clamp } from '../../core/math';
export type RodModel = 'smooth' | 'fixed';
export type RodParams = {
  model: RodModel;
  distance: number;
  length: number;
  height: number;
  weight: number;
};
export type RodState = {
  params: RodParams;
  thetaLeft: number;
  thetaRight: number;
  tensionLeft: number;
  tensionRight: number;
  maxTension: number;
};
export const clothesRodConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  poleLeftX: 92,
  poleRightX: 618,
  groundY: 646,
  topY: 112,
  knotY: 520,
  knotDrop: 120,
  ropeLabelOffset: 144,
  weightLabelOffset: 188,
  panelRuleY: 72,
  modelCardY: 84,
  modelCardHeight: 112,
  presetCardY: 208,
  presetCardHeight: 132,
  paramCardY: 352,
  paramCardHeight: 196,
  readoutCardY: 564,
  readoutCardHeight: 154,
  defaultDistance: 6,
  defaultLength: 10,
  defaultHeight: 0.8,
  defaultWeight: 40,
  distanceMin: 2,
  distanceMax: 10,
  lengthMin: 6,
  lengthMax: 14,
  heightMin: -2,
  heightMax: 2,
  weightMin: 10,
  weightMax: 80
} as const;
const DEFAULTS: RodParams = {
  model: 'smooth',
  distance: 6,
  length: 10,
  height: 0.8,
  weight: 40
};
function finite(v: unknown, f: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : f;
}
function normalize(input: Partial<RodParams>, prev = DEFAULTS): RodParams {
  return {
    model: input.model === 'fixed' ? 'fixed' : 'smooth',
    distance: clamp(
      finite(input.distance, prev.distance),
      clothesRodConstants.distanceMin,
      clothesRodConstants.distanceMax
    ),
    length: clamp(
      finite(input.length, prev.length),
      clothesRodConstants.lengthMin,
      clothesRodConstants.lengthMax
    ),
    height: clamp(
      finite(input.height, prev.height),
      clothesRodConstants.heightMin,
      clothesRodConstants.heightMax
    ),
    weight: clamp(
      finite(input.weight, prev.weight),
      clothesRodConstants.weightMin,
      clothesRodConstants.weightMax
    )
  };
}
export function createClothesRodSim(initial: Partial<RodParams> = {}) {
  let params = normalize(initial);
  function getState(): RodState {
    const half = params.distance / 2;
    const drop = Math.max(1, params.length * 0.5 + params.height);
    const thetaLeft = Math.atan2(half, drop);
    const thetaRight = Math.atan2(
      half,
      Math.max(1, drop - params.height * 0.5)
    );
    const smoothT = params.weight / (2 * Math.cos(thetaLeft));
    const fixedT = params.weight / (2 * Math.cos(thetaRight));
    const tensionLeft = params.model === 'smooth' ? smoothT : fixedT * 0.9;
    const tensionRight = params.model === 'smooth' ? smoothT : fixedT * 1.1;
    return {
      params: { ...params },
      thetaLeft,
      thetaRight,
      tensionLeft,
      tensionRight,
      maxTension: Math.max(tensionLeft, tensionRight)
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): RodParams => ({ ...params }),
    setParams(next: Partial<RodParams>) {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(_dt: number) {},
    reset() {
      params = { ...DEFAULTS };
    }
  };
}
