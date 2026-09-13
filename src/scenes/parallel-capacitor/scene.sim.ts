import { clamp } from '../../core/math';
export type CapacitorProbe = 'area' | 'distance' | 'dielectric';
export type CapacitorParams = {
  probe: CapacitorProbe;
  distance: number;
  area: number;
  dielectric: number;
};
export type CapacitorState = {
  params: CapacitorParams;
  capacitanceRatio: number;
  voltageRatio: number;
  needleAngle: number;
  fieldRatio: number;
};
export const parallelCapacitorConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  plateLeftX: 122,
  plateRightX: 324,
  plateTop: 256,
  plateBottom: 548,
  plateGapBase: 60,
  meterX: 520,
  meterY: 384,
  meterRadius: 112,
  panelRuleY: 72,
  conditionCardY: 84,
  conditionCardHeight: 78,
  presetCardY: 174,
  presetCardHeight: 158,
  readoutCardY: 348,
  readoutCardHeight: 184,
  noteCardY: 548,
  noteCardHeight: 154,
  defaultDistance: 3,
  defaultArea: 0.5,
  defaultDielectric: 1.7,
  distanceMin: 1,
  distanceMax: 6,
  areaMin: 0.2,
  areaMax: 1,
  dielectricMin: 1,
  dielectricMax: 3
} as const;
const DEFAULTS: CapacitorParams = {
  probe: 'area',
  distance: 3,
  area: 0.5,
  dielectric: 1.7
};
function finite(v: unknown, f: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : f;
}
function normalize(
  input: Partial<CapacitorParams>,
  prev = DEFAULTS
): CapacitorParams {
  return {
    probe:
      input.probe === 'distance' || input.probe === 'dielectric'
        ? input.probe
        : 'area',
    distance: clamp(
      finite(input.distance, prev.distance),
      parallelCapacitorConstants.distanceMin,
      parallelCapacitorConstants.distanceMax
    ),
    area: clamp(
      finite(input.area, prev.area),
      parallelCapacitorConstants.areaMin,
      parallelCapacitorConstants.areaMax
    ),
    dielectric: clamp(
      finite(input.dielectric, prev.dielectric),
      parallelCapacitorConstants.dielectricMin,
      parallelCapacitorConstants.dielectricMax
    )
  };
}
export function createParallelCapacitorSim(
  initial: Partial<CapacitorParams> = {}
) {
  let params = normalize(initial);
  function getState(): CapacitorState {
    const capacitanceRatio =
      (params.area / 0.5) * (3 / params.distance) * (params.dielectric / 1.7);
    const voltageRatio = 1 / capacitanceRatio;
    return {
      params: { ...params },
      capacitanceRatio,
      voltageRatio,
      needleAngle: Math.min(78, voltageRatio * 30),
      fieldRatio: voltageRatio
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): CapacitorParams => ({ ...params }),
    setParams(next: Partial<CapacitorParams>) {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(_dt: number) {},
    reset() {
      params = { ...DEFAULTS };
    }
  };
}
