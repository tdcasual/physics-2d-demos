import { clamp } from '../../core/math';

export type BrownianParams = {
  temperature: number;
  particleRadius: number;
  showMolecules: boolean;
  showTrail: boolean;
  showForce: boolean;
  autoRun: boolean;
  slowMode: boolean;
};
export type BrownianPoint = { x: number; y: number };
export type BrownianState = BrownianParams & {
  time: number;
  particleX: number;
  particleY: number;
  molecularSpeed: number;
  instantCollisions: number;
  forceX: number;
  forceY: number;
  netForce: number;
  trail: BrownianPoint[];
  status: string;
};

export const brownianConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  chamberCenterX: 470,
  chamberCenterY: 382,
  chamberRadius: 348,
  particleStartX: 666,
  particleStartY: 470,
  particleMinRadius: 8,
  particleMaxRadius: 30,
  temperatureMin: 0,
  temperatureMax: 100,
  temperatureDefault: 15,
  radiusDefault: 15,
  trailLength: 160,
  moleculeCount: 210,
  gridStep: 32,
  settleTime: 0.8,
  moleculeSeedMultiplier: 2654435761,
  moleculeHashMultiplier: 1664525,
  moleculeHashIncrement: 1013904223,
  moleculeUintScale: 4294967296
} as const;

const DEFAULTS: BrownianParams = {
  temperature: brownianConstants.temperatureDefault,
  particleRadius: brownianConstants.radiusDefault,
  showMolecules: true,
  showTrail: true,
  showForce: true,
  autoRun: true,
  slowMode: false
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
  input: Partial<BrownianParams>,
  previous = DEFAULTS
): BrownianParams {
  return {
    temperature: clamp(
      finite(input.temperature, previous.temperature),
      brownianConstants.temperatureMin,
      brownianConstants.temperatureMax
    ),
    particleRadius: clamp(
      finite(input.particleRadius, previous.particleRadius),
      brownianConstants.particleMinRadius,
      brownianConstants.particleMaxRadius
    ),
    showMolecules: flag(input.showMolecules, previous.showMolecules),
    showTrail: flag(input.showTrail, previous.showTrail),
    showForce: flag(input.showForce, previous.showForce),
    autoRun: flag(input.autoRun, previous.autoRun),
    slowMode: flag(input.slowMode, previous.slowMode)
  };
}
function generateTrail(
  time: number,
  temperature: number,
  radius: number
): BrownianPoint[] {
  const c = brownianConstants;
  const points: BrownianPoint[] = [];
  let x = c.particleStartX;
  let y = c.particleStartY;
  const steps = Math.min(c.trailLength, Math.max(1, Math.floor(time * 80)));
  for (let index = 0; index <= steps; index += 1) {
    const phase = index * 1.73 + time * (1.1 + temperature / 35);
    const amplitude = 5 + temperature * 0.075 + radius * 0.08;
    x += 3.2 + Math.sin(phase * 1.17) * amplitude * 0.22;
    y +=
      Math.cos(phase * 0.83) * amplitude * 0.55 +
      Math.sin(phase * 1.91) * amplitude * 0.35;
    const distance = Math.hypot(x - c.chamberCenterX, y - c.chamberCenterY);
    if (distance > c.chamberRadius - radius - 8) {
      const scale = (c.chamberRadius - radius - 8) / distance;
      x = c.chamberCenterX + (x - c.chamberCenterX) * scale;
      y = c.chamberCenterY + (y - c.chamberCenterY) * scale;
    }
    points.push({ x, y });
  }
  return points;
}
function derive(params: BrownianParams, time: number): BrownianState {
  const c = brownianConstants;
  const temperatureRatio = params.temperature / Math.max(1, c.temperatureMax);
  const speed = 0.55 + temperatureRatio * 2.45;
  const trail = generateTrail(time, params.temperature, params.particleRadius);
  const point = trail[trail.length - 1] ?? {
    x: c.particleStartX,
    y: c.particleStartY
  };
  const phase = time * (1.4 + temperatureRatio * 2.6);
  const forceX = Math.sin(phase * 2.17) * (0.1 + temperatureRatio * 0.9);
  const forceY = Math.cos(phase * 1.71) * (0.08 + temperatureRatio * 0.8);
  const netForce = Math.hypot(forceX, forceY);
  const instantCollisions = Math.round(
    temperatureRatio * 7 +
      Math.abs(Math.sin(phase * 2.6)) * temperatureRatio * 4
  );
  return {
    ...params,
    time: Math.max(0, time),
    particleX: point.x,
    particleY: point.y,
    molecularSpeed: speed,
    instantCollisions,
    forceX,
    forceY,
    netForce,
    trail: params.showTrail ? trail : [],
    status: netForce < 0.12 ? '瞬时近似平衡' : '碰撞不平衡，粒子偏移'
  };
}
export function brownianAt(params: BrownianParams, time = 0): BrownianState {
  return derive(normalize(params), Math.max(0, finite(time, 0)));
}
export function createBrownianSim(initial: Partial<BrownianParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): BrownianState => derive(params, time),
    getSnapshot: (): BrownianState => derive(params, time),
    getParams: (): BrownianParams => ({ ...params }),
    setParams(next: Partial<BrownianParams>): BrownianParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += clamp(finite(dt, 0), 0, 0.1) * (params.slowMode ? 0.35 : 1);
    }
  };
}
