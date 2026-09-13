import { clamp } from '../../core/math';

export type BindingEnergyParams = {
  A: number;
  autoRun: boolean;
  showRegions: boolean;
};
export type BindingEnergyPoint = {
  A: number;
  symbol: string;
  name: string;
  binding: number;
};
export type BindingEnergyState = {
  params: BindingEnergyParams;
  time: number;
  point: BindingEnergyPoint;
  total: number;
  status: string;
  fusionGain: number;
  fissionGain: number;
};
export const bindingEnergyConstants = {
  baseWidth: 900,
  baseHeight: 660,
  fieldWidth: 650,
  chartLeft: 68,
  chartRight: 616,
  chartTop: 70,
  chartBottom: 570,
  panelWidth: 236,
  panelInset: 24,
  gridStepX: 50,
  gridStepY: 2,
  titleY: 34,
  formulaTop: 150,
  formulaHeight: 86,
  valuesTop: 258,
  valuesHeight: 164,
  valuesStartY: 294,
  valuesRowGap: 34,
  pointRadius: 7,
  ironA: 56
} as const;
const DATA: BindingEnergyPoint[] = [
  { A: 1, symbol: 'H-1', name: '氢', binding: 0 },
  { A: 4, symbol: 'He-4', name: '氦', binding: 7.07 },
  { A: 12, symbol: 'C-12', name: '碳', binding: 7.68 },
  { A: 16, symbol: 'O-16', name: '氧', binding: 7.98 },
  { A: 40, symbol: 'Ca-40', name: '钙', binding: 8.55 },
  { A: 56, symbol: 'Fe-56', name: '铁', binding: 8.79 },
  { A: 89, symbol: 'Kr-89', name: '氪', binding: 8.63 },
  { A: 140, symbol: 'Ce-140', name: '铈', binding: 8.42 },
  { A: 238, symbol: 'U-238', name: '铀', binding: 7.57 }
];
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function bindingAt(A: number): number {
  const a = clamp(A, 1, 238);
  let left = DATA[0];
  for (const point of DATA) {
    if (point.A >= a) {
      const ratio = (a - left.A) / Math.max(1, point.A - left.A);
      return left.binding + (point.binding - left.binding) * ratio;
    }
    left = point;
  }
  return DATA[DATA.length - 1].binding;
}
function pointAt(A: number): BindingEnergyPoint {
  const nearest = DATA.reduce(
    (best, point) =>
      Math.abs(point.A - A) < Math.abs(best.A - A) ? point : best,
    DATA[0]
  );
  return { ...nearest, A, binding: bindingAt(A) };
}
export function bindingEnergyAt(A: number): number {
  return bindingAt(A);
}
export function createBindingEnergySim(
  initial: Partial<BindingEnergyParams> = {}
) {
  const defaults = {
    A: clamp(finite(initial.A, 238), 1, 238),
    autoRun: initial.autoRun !== false,
    showRegions: initial.showRegions !== false
  };
  let params = { ...defaults };
  let time = 0;
  function getState(): BindingEnergyState {
    const point = pointAt(params.A);
    const total = point.A * point.binding;
    return {
      params: { ...params },
      time,
      point,
      total,
      status:
        point.binding >= 8.7 ? '最稳定区' : point.A < 60 ? '聚变区' : '裂变区',
      fusionGain: Math.max(0, bindingAt(56) - point.binding),
      fissionGain: Math.max(0, bindingAt(56) - point.binding)
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): BindingEnergyParams => ({ ...params }),
    setParams(next: Partial<BindingEnergyParams>): BindingEnergyParams {
      params = {
        A: clamp(finite(next.A, params.A), 1, 238),
        autoRun: next.autoRun ?? params.autoRun,
        showRegions: next.showRegions ?? params.showRegions
      };
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) {
        time += Math.max(0, finite(dt, 0));
        params.A = 1 + ((params.A - 1 + Math.max(0, finite(dt, 0)) * 3) % 237);
      }
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
