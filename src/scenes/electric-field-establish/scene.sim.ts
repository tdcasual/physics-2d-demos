import { clamp } from '../../core/math';

export type ElectricFieldParams = {
  voltage: number;
  closed: boolean;
  showSurfaceCharge: boolean;
  showDrift: boolean;
  autoRun: boolean;
};
export type ElectricFieldState = ElectricFieldParams & {
  time: number;
  fieldStrength: number;
  driftVelocity: number;
  current: number;
  chargeSettled: number;
  status: string;
};
export const electricFieldConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  gridStep: 54,
  wireLeft: 150,
  wireTop: 170,
  wireRight: 744,
  wireBottom: 548,
  batteryX: 430,
  batteryY: 170,
  resistorX: 360,
  resistorY: 548,
  batteryRightOffset: 54,
  resistorWidth: 120,
  voltageMin: 0,
  voltageMax: 6,
  mobility: 0.8,
  resistance: 4,
  length: 3,
  driftPeriod: 4,
  electronCount: 18,
  chargeCount: 9
} as const;
const DEFAULTS: ElectricFieldParams = {
  voltage: 3,
  closed: true,
  showSurfaceCharge: true,
  showDrift: true,
  autoRun: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<ElectricFieldParams>,
  previous = DEFAULTS
): ElectricFieldParams {
  return {
    voltage: clamp(
      finite(input.voltage, previous.voltage),
      electricFieldConstants.voltageMin,
      electricFieldConstants.voltageMax
    ),
    closed: typeof input.closed === 'boolean' ? input.closed : previous.closed,
    showSurfaceCharge:
      typeof input.showSurfaceCharge === 'boolean'
        ? input.showSurfaceCharge
        : previous.showSurfaceCharge,
    showDrift:
      typeof input.showDrift === 'boolean'
        ? input.showDrift
        : previous.showDrift,
    autoRun:
      typeof input.autoRun === 'boolean' ? input.autoRun : previous.autoRun
  };
}
function derive(params: ElectricFieldParams, time: number): ElectricFieldState {
  const fieldStrength = params.closed
    ? params.voltage / electricFieldConstants.length
    : 0;
  const driftVelocity = params.closed
    ? electricFieldConstants.mobility * fieldStrength
    : 0;
  const current = params.closed
    ? params.voltage / electricFieldConstants.resistance
    : 0;
  const chargeSettled = params.closed
    ? Math.min(1, time / 1.8)
    : Math.max(0, 1 - time / 1.2);
  return {
    ...params,
    time,
    fieldStrength,
    driftVelocity,
    current,
    chargeSettled,
    status: params.closed ? '稳态：恒定电流' : '开路：电场尚未建立'
  };
}
export function createElectricFieldSim(
  initial: Partial<ElectricFieldParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): ElectricFieldState => derive(params, time),
    getSnapshot: (): ElectricFieldState => derive(params, time),
    getParams: (): ElectricFieldParams => ({ ...params }),
    setParams(next: Partial<ElectricFieldParams>): ElectricFieldParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time =
        (time + clamp(finite(dt, 0), 0, 0.05)) %
        electricFieldConstants.driftPeriod;
    }
  };
}
