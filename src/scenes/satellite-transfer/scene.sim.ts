import { clamp } from '../../core/math';

export type OrbitMode = 'low' | 'transfer' | 'high';
export type SatelliteParams = {
  orbit: OrbitMode;
  progress: number;
  autoRun: boolean;
};
export type SatelliteState = SatelliteParams & {
  time: number;
  angle: number;
  radius: number;
  speed: number;
  acceleration: number;
  orbitalPeriod: number;
  altitude: number;
  status: string;
};
export const satelliteConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  centerX: 392,
  centerY: 370,
  planetRadius: 68,
  lowRadius: 160,
  highRadius: 288,
  orbitMin: 1,
  orbitMax: 5,
  progressMin: 0,
  progressMax: 100,
  gravitationalParameter: 72,
  animationPeriod: 12,
  vectorLength: 72,
  progressLeft: 56,
  progressRight: 742,
  progressY: 674,
  progressLength: 686,
  labelLeft: 128,
  labelRight: 570
} as const;
const DEFAULTS: SatelliteParams = {
  orbit: 'low',
  progress: 72.7,
  autoRun: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<SatelliteParams>,
  prev = DEFAULTS
): SatelliteParams {
  const orbit =
    input.orbit === 'high' ||
    input.orbit === 'transfer' ||
    input.orbit === 'low'
      ? input.orbit
      : prev.orbit;
  return {
    orbit,
    progress: clamp(
      finite(input.progress, prev.progress),
      satelliteConstants.progressMin,
      satelliteConstants.progressMax
    ),
    autoRun: typeof input.autoRun === 'boolean' ? input.autoRun : prev.autoRun
  };
}
function derive(params: SatelliteParams, time: number): SatelliteState {
  const phase = params.progress / satelliteConstants.progressMax;
  const angle = phase * Math.PI * 2;
  const radius =
    params.orbit === 'low'
      ? satelliteConstants.lowRadius
      : params.orbit === 'high'
        ? satelliteConstants.highRadius
        : (satelliteConstants.lowRadius + satelliteConstants.highRadius) / 2 +
          ((satelliteConstants.highRadius - satelliteConstants.lowRadius) / 2) *
            Math.cos(angle);
  const speed =
    Math.sqrt(satelliteConstants.gravitationalParameter / radius) * 10;
  const acceleration =
    (satelliteConstants.gravitationalParameter / radius ** 2) * 10;
  return {
    ...params,
    time,
    angle,
    radius,
    speed,
    acceleration,
    orbitalPeriod:
      2 *
      Math.PI *
      Math.sqrt(radius ** 3 / satelliteConstants.gravitationalParameter),
    altitude: radius - satelliteConstants.lowRadius,
    status:
      params.orbit === 'low'
        ? '轨道 I（近地圆轨道）'
        : params.orbit === 'high'
          ? '轨道 II（高轨圆轨道）'
          : '变轨转移轨道'
  };
}
export function createSatelliteSim(initial: Partial<SatelliteParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): SatelliteState => derive(params, time),
    getSnapshot: (): SatelliteState => derive(params, time),
    getParams: (): SatelliteParams => ({ ...params }),
    setParams(next: Partial<SatelliteParams>): SatelliteParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const safeDt = Math.min(Math.max(finite(dt, 0), 0), 0.05);
      time += safeDt;
      params.progress =
        (params.progress +
          (safeDt / satelliteConstants.animationPeriod) *
            satelliteConstants.progressMax) %
        satelliteConstants.progressMax;
    }
  };
}
