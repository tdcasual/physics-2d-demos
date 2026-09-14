import { clamp } from '../../core/math';

export type ShieldingRegion = '外部自由空间' | '导体内部' | '空腔内部';
export type ElectrostaticShieldingParams = {
  externalField: boolean;
  cavityCharge: boolean;
  cavityChargeValue: number;
  grounded: boolean;
  showGaussian: boolean;
  showProbe: boolean;
  autoRun: boolean;
  slowMode: boolean;
  probeX: number;
  probeY: number;
};
export type ElectrostaticShieldingState = ElectrostaticShieldingParams & {
  time: number;
  fieldSettled: number;
  externalFieldStrength: number;
  innerInducedCharge: number;
  outerNetCharge: number;
  measuredField: number;
  region: ShieldingRegion;
  status: string;
};

export const electrostaticShieldingConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  shellCenterX: 500,
  shellCenterY: 388,
  shellOuterRadius: 182,
  shellInnerRadius: 124,
  probeDefaultX: 760,
  probeDefaultY: 174,
  probeMinX: 36,
  probeMaxX: 1148,
  probeMinY: 64,
  probeMaxY: 670,
  externalFieldDefault: 3.52,
  cavityChargeMin: 0,
  cavityChargeMax: 5,
  cavityChargeDefault: 3,
  gridStep: 32,
  fieldLineStep: 96,
  fieldLineCount: 7,
  fieldStartX: 48,
  fieldControlLeftX: 256,
  fieldControlNearX: 302,
  fieldCenterX: 500,
  fieldControlFarX: 708,
  fieldControlRightX: 860,
  fieldEndX: 1148,
  settleTime: 1.6,
  probeRadius: 18,
  groundY: 648
} as const;

const DEFAULTS: ElectrostaticShieldingParams = {
  externalField: true,
  cavityCharge: true,
  cavityChargeValue: electrostaticShieldingConstants.cavityChargeDefault,
  grounded: true,
  showGaussian: true,
  showProbe: true,
  autoRun: true,
  slowMode: false,
  probeX: electrostaticShieldingConstants.probeDefaultX,
  probeY: electrostaticShieldingConstants.probeDefaultY
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function flag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
}
function normalize(
  input: Partial<ElectrostaticShieldingParams>,
  previous = DEFAULTS
): ElectrostaticShieldingParams {
  return {
    externalField: flag(input.externalField, previous.externalField),
    cavityCharge: flag(input.cavityCharge, previous.cavityCharge),
    cavityChargeValue: clamp(
      finite(input.cavityChargeValue, previous.cavityChargeValue),
      electrostaticShieldingConstants.cavityChargeMin,
      electrostaticShieldingConstants.cavityChargeMax
    ),
    grounded: flag(input.grounded, previous.grounded),
    showGaussian: flag(input.showGaussian, previous.showGaussian),
    showProbe: flag(input.showProbe, previous.showProbe),
    autoRun: flag(input.autoRun, previous.autoRun),
    slowMode: flag(input.slowMode, previous.slowMode),
    probeX: clamp(
      finite(input.probeX, previous.probeX),
      electrostaticShieldingConstants.probeMinX,
      electrostaticShieldingConstants.probeMaxX
    ),
    probeY: clamp(
      finite(input.probeY, previous.probeY),
      electrostaticShieldingConstants.probeMinY,
      electrostaticShieldingConstants.probeMaxY
    )
  };
}

function regionFor(x: number, y: number): ShieldingRegion {
  const c = electrostaticShieldingConstants;
  const distance = Math.hypot(x - c.shellCenterX, y - c.shellCenterY);
  if (distance < c.shellInnerRadius) return '空腔内部';
  if (distance <= c.shellOuterRadius) return '导体内部';
  return '外部自由空间';
}

function derive(
  params: ElectrostaticShieldingParams,
  time: number
): ElectrostaticShieldingState {
  const c = electrostaticShieldingConstants;
  const region = regionFor(params.probeX, params.probeY);
  const charge = params.cavityCharge ? params.cavityChargeValue : 0;
  const externalFieldStrength = params.externalField
    ? c.externalFieldDefault
    : 0;
  const innerInducedCharge = -charge;
  const outerNetCharge = params.grounded ? 0 : charge;
  const leakedField = !params.grounded && charge > 0 ? charge * 0.72 : 0;
  const measuredField =
    region === '外部自由空间' ? externalFieldStrength + leakedField : 0;
  const fieldSettled = Math.min(1, Math.max(0, time) / c.settleTime);
  const status =
    region === '空腔内部'
      ? '空腔：E = 0'
      : region === '导体内部'
        ? '导体内部：E = 0'
        : params.externalField || leakedField > 0
          ? '外部自由空间'
          : '无外场';
  return {
    ...params,
    time: Math.max(0, time),
    fieldSettled,
    externalFieldStrength,
    innerInducedCharge,
    outerNetCharge,
    measuredField,
    region,
    status
  };
}

export function electrostaticShieldingAt(
  params: ElectrostaticShieldingParams,
  time = 0
): ElectrostaticShieldingState {
  return derive(normalize(params), Math.max(0, finite(time, 0)));
}

export function createElectrostaticShieldingSim(
  initial: Partial<ElectrostaticShieldingParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): ElectrostaticShieldingState => derive(params, time),
    getSnapshot: (): ElectrostaticShieldingState => derive(params, time),
    getParams: (): ElectrostaticShieldingParams => ({ ...params }),
    setParams(
      next: Partial<ElectrostaticShieldingParams>
    ): ElectrostaticShieldingParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    setProbe(x: number, y: number): ElectrostaticShieldingParams {
      params = normalize({ ...params, probeX: x, probeY: y }, params);
      return { ...params };
    },
    pickProbe(x: number, y: number): boolean {
      return (
        params.showProbe &&
        Math.hypot(x - params.probeX, y - params.probeY) <= 34
      );
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = clamp(finite(dt, 0), 0, 0.1) * (params.slowMode ? 0.35 : 1);
      time = (time + delta) % 4;
    }
  };
}
