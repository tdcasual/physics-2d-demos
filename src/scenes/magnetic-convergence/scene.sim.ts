import { clamp } from '../../core/math';

export type MagneticMode = 'converge' | 'diverge';

export type MagneticConvergenceParams = {
  mode: MagneticMode;
  radiusRatio: number;
  particleCount: number;
  autoRun: boolean;
  showField: boolean;
};

export type Point = { x: number; y: number };

export type MagneticParticlePath = {
  points: Point[];
  entry: Point;
  exit: Point;
};

export type MagneticConvergenceState = {
  params: MagneticConvergenceParams;
  time: number;
  phase: number;
  trailsVisible: boolean;
  focusPoint: Point;
  paths: MagneticParticlePath[];
  radiusPx: number;
  status: string;
  focusErrorPx: number;
};

export const magneticConvergenceConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 840,
  panelX: 860,
  panelWidth: 340,
  panelInset: 24,
  fieldCenterX: 405,
  fieldCenterY: 390,
  fieldRadius: 270,
  fieldTop: 78,
  fieldBottom: 702,
  gridStep: 54,
  beamSpan: 0.76,
  particleRadius: 7,
  pathStep: 0.032,
  maxPathSteps: 260,
  emitSpeed: 0.48,
  titleY: 38,
  panelRuleY: 70,
  modeCardY: 92,
  modeCardHeight: 74,
  ratioCardY: 184,
  ratioCardHeight: 132,
  statusCardY: 340,
  statusCardHeight: 116,
  formulaCardY: 486,
  formulaCardHeight: 144,
  footerY: 680,
  cardRadius: 12,
  radiusRatioMin: 0.6,
  radiusRatioMax: 1.4,
  defaultRadiusRatio: 1,
  particleCountMin: 5,
  particleCountMax: 11,
  defaultParticleCount: 7,
  defaultMode: 'converge' as MagneticMode
} as const;

const DEFAULTS: MagneticConvergenceParams = {
  mode: magneticConvergenceConstants.defaultMode,
  radiusRatio: magneticConvergenceConstants.defaultRadiusRatio,
  particleCount: magneticConvergenceConstants.defaultParticleCount,
  autoRun: true,
  showField: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeMode(value: unknown, fallback: MagneticMode): MagneticMode {
  return value === 'diverge' || value === 'converge' ? value : fallback;
}

function normalize(
  input: Partial<MagneticConvergenceParams>,
  previous = DEFAULTS
): MagneticConvergenceParams {
  return {
    mode: normalizeMode(input.mode, previous.mode),
    radiusRatio: clamp(
      finite(input.radiusRatio, previous.radiusRatio),
      magneticConvergenceConstants.radiusRatioMin,
      magneticConvergenceConstants.radiusRatioMax
    ),
    particleCount: Math.round(
      clamp(
        finite(input.particleCount, previous.particleCount),
        magneticConvergenceConstants.particleCountMin,
        magneticConvergenceConstants.particleCountMax
      )
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showField: input.showField ?? previous.showField
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function traceConvergingPath(
  entry: Point,
  radiusPx: number
): MagneticParticlePath {
  const center = { x: entry.x, y: entry.y - radiusPx };
  let theta = Math.PI / 2;
  const points: Point[] = [{ ...entry }];
  for (
    let index = 0;
    index < magneticConvergenceConstants.maxPathSteps;
    index += 1
  ) {
    theta -= magneticConvergenceConstants.pathStep;
    const point = {
      x: center.x + radiusPx * Math.cos(theta),
      y: center.y + radiusPx * Math.sin(theta)
    };
    points.push(point);
    if (
      points.length > 6 &&
      distance(point, {
        x: magneticConvergenceConstants.fieldCenterX,
        y: magneticConvergenceConstants.fieldCenterY
      }) >
        magneticConvergenceConstants.fieldRadius + 1
    ) {
      break;
    }
  }
  return { points, entry: { ...entry }, exit: { ...points.at(-1)! } };
}

function buildPaths(params: MagneticConvergenceParams): MagneticParticlePath[] {
  const radiusPx =
    params.radiusRatio * magneticConvergenceConstants.fieldRadius;
  const centerX = magneticConvergenceConstants.fieldCenterX;
  const centerY = magneticConvergenceConstants.fieldCenterY;
  const fieldRadius = magneticConvergenceConstants.fieldRadius;
  const count = params.particleCount;
  const paths: MagneticParticlePath[] = [];
  for (let index = 0; index < count; index += 1) {
    const fraction = count === 1 ? 0.5 : index / (count - 1);
    const offset =
      (fraction * 2 - 1) * magneticConvergenceConstants.beamSpan * fieldRadius;
    const entry = {
      x: centerX - Math.sqrt(fieldRadius * fieldRadius - offset * offset),
      y: centerY + offset
    };
    const converging = traceConvergingPath(entry, radiusPx);
    if (params.mode === 'converge') {
      paths.push(converging);
    } else {
      const focusPoint = {
        x: centerX,
        y: centerY - fieldRadius
      };
      const reversed = converging.points.slice().reverse();
      paths.push({
        points: [focusPoint, ...reversed],
        entry: { ...focusPoint },
        exit: { ...converging.entry }
      });
    }
  }
  return paths;
}

function statusFor(params: MagneticConvergenceParams): string {
  const ideal = Math.abs(params.radiusRatio - 1) < 0.025;
  if (params.mode === 'converge') return ideal ? '理想会聚' : '会聚像差';
  return ideal ? '平行射出' : '发散偏差';
}

export function createMagneticConvergenceSim(
  initial: Partial<MagneticConvergenceParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  let phase = 0.72;
  let trailsVisible = true;

  function getState(): MagneticConvergenceState {
    const radiusPx =
      params.radiusRatio * magneticConvergenceConstants.fieldRadius;
    const focusPoint = {
      x: magneticConvergenceConstants.fieldCenterX,
      y:
        magneticConvergenceConstants.fieldCenterY -
        magneticConvergenceConstants.fieldRadius
    };
    const paths = buildPaths(params);
    const convergenceErrorPx =
      paths.reduce((sum, path) => sum + distance(path.exit, focusPoint), 0) /
      Math.max(1, paths.length);
    const focusErrorPx =
      params.mode === 'converge'
        ? convergenceErrorPx
        : Math.abs(params.radiusRatio - 1) *
          magneticConvergenceConstants.fieldRadius;
    return {
      params: { ...params },
      time,
      phase,
      trailsVisible,
      focusPoint,
      paths,
      radiusPx,
      status: statusFor(params),
      focusErrorPx
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): MagneticConvergenceParams => ({ ...params }),
    setParams(
      next: Partial<MagneticConvergenceParams>
    ): MagneticConvergenceParams {
      params = normalize({ ...params, ...next }, params);
      trailsVisible = true;
      return { ...params };
    },
    emit(): void {
      phase = 0;
      trailsVisible = true;
    },
    clear(): void {
      phase = 0;
      trailsVisible = false;
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = Math.max(0, finite(dt, 0));
      time += delta;
      phase = (phase + delta * magneticConvergenceConstants.emitSpeed) % 1;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      phase = 0.72;
      trailsVisible = true;
    }
  };
}
