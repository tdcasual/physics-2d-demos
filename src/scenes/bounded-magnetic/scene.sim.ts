import { clamp } from '../../core/math';

export type BoundedFieldShape = 'half-plane' | 'circle' | 'triangle';
export type BoundedFieldModel = 'standard' | 'rotate' | 'scale';
export type BoundedMagneticParams = {
  shape: BoundedFieldShape;
  model: BoundedFieldModel;
  entryAngle: number;
  orbitRadius: number;
  fieldSize: number;
  autoRun: boolean;
  showVectors: boolean;
};
export type Point = { x: number; y: number };
export type BoundedMagneticState = BoundedMagneticParams & {
  time: number;
  phase: number;
  entry: Point;
  center: Point;
  position: Point;
  velocityAngle: number;
  forceAngle: number;
  deflectionAngle: number;
  trajectory: Point[];
  status: string;
};

export const boundedMagneticConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  fieldLeft: 36,
  fieldRight: 804,
  fieldTop: 72,
  fieldBottom: 704,
  fieldCenterX: 426,
  fieldCenterY: 376,
  fieldRadius: 226,
  gridStep: 54,
  particleRadius: 14,
  vectorLength: 76,
  infoX: 34,
  infoY: 30,
  infoWidth: 284,
  infoHeight: 124,
  cardX: 34,
  cardY: 592,
  cardWidth: 744,
  cardHeight: 100,
  pathStep: 0.055,
  pathMax: 96,
  animationPeriod: 8,
  entryAngleMin: -45,
  entryAngleMax: 45,
  orbitRadiusMin: 60,
  orbitRadiusMax: 180,
  fieldSizeMin: 140,
  fieldSizeMax: 240,
  defaultEntryAngle: 30,
  defaultOrbitRadius: 100,
  defaultFieldSize: 200
} as const;

const DEFAULTS: BoundedMagneticParams = {
  shape: 'circle',
  model: 'scale',
  entryAngle: 30,
  orbitRadius: 100,
  fieldSize: 200,
  autoRun: true,
  showVectors: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<BoundedMagneticParams>,
  previous = DEFAULTS
): BoundedMagneticParams {
  return {
    shape:
      input.shape === 'half-plane' ||
      input.shape === 'triangle' ||
      input.shape === 'circle'
        ? input.shape
        : previous.shape,
    model:
      input.model === 'standard' ||
      input.model === 'rotate' ||
      input.model === 'scale'
        ? input.model
        : previous.model,
    entryAngle: clamp(
      finite(input.entryAngle, previous.entryAngle),
      boundedMagneticConstants.entryAngleMin,
      boundedMagneticConstants.entryAngleMax
    ),
    orbitRadius: clamp(
      finite(input.orbitRadius, previous.orbitRadius),
      boundedMagneticConstants.orbitRadiusMin,
      boundedMagneticConstants.orbitRadiusMax
    ),
    fieldSize: clamp(
      finite(input.fieldSize, previous.fieldSize),
      boundedMagneticConstants.fieldSizeMin,
      boundedMagneticConstants.fieldSizeMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showVectors: input.showVectors ?? previous.showVectors
  };
}
function insideTriangle(point: Point, center: Point, size: number): boolean {
  const top = { x: center.x, y: center.y - size };
  const left = { x: center.x - size * 0.88, y: center.y + size * 0.5 };
  const right = { x: center.x + size * 0.88, y: center.y + size * 0.5 };
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const s1 = cross(top, left, point);
  const s2 = cross(left, right, point);
  const s3 = cross(right, top, point);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}
function buildGeometry(params: BoundedMagneticParams): {
  entry: Point;
  center: Point;
  trajectory: Point[];
} {
  const angle = (params.entryAngle * Math.PI) / 180;
  const fieldCenter = {
    x: boundedMagneticConstants.fieldCenterX,
    y: boundedMagneticConstants.fieldCenterY
  };
  const boundaryX =
    params.shape === 'half-plane'
      ? fieldCenter.x
      : fieldCenter.x - params.fieldSize * 0.86;
  const entry = {
    x: boundaryX,
    y: fieldCenter.y - Math.tan(angle) * params.fieldSize * 0.55
  };
  const radius =
    params.orbitRadius *
    (params.model === 'rotate' ? 1.15 : params.model === 'scale' ? 0.82 : 1);
  const center = { x: entry.x, y: entry.y + radius };
  const points: Point[] = [];
  for (let index = 0; index < boundedMagneticConstants.pathMax; index += 1) {
    const theta = -Math.PI / 2 + index * boundedMagneticConstants.pathStep;
    const point = {
      x: center.x + radius * Math.cos(theta),
      y: center.y + radius * Math.sin(theta)
    };
    const inside =
      params.shape === 'half-plane'
        ? point.x >= fieldCenter.x - 2
        : params.shape === 'circle'
          ? Math.hypot(point.x - fieldCenter.x, point.y - fieldCenter.y) <=
            params.fieldSize + 2
          : insideTriangle(point, fieldCenter, params.fieldSize);
    if (inside || index === 0) points.push(point);
    else break;
  }
  return { entry, center, trajectory: points };
}
export function cyclotronRadius(
  mass: number,
  velocity: number,
  charge: number,
  magneticField: number
): number {
  return Math.abs((mass * velocity) / (charge * magneticField));
}
export function createBoundedMagneticSim(
  initial: Partial<BoundedMagneticParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState(): BoundedMagneticState {
      const geometry = buildGeometry(params);
      const phase =
        (time % boundedMagneticConstants.animationPeriod) /
        boundedMagneticConstants.animationPeriod;
      const index = Math.min(
        geometry.trajectory.length - 1,
        Math.floor(phase * geometry.trajectory.length)
      );
      const position = geometry.trajectory[index] ?? geometry.entry;
      const next =
        geometry.trajectory[
          Math.min(index + 1, geometry.trajectory.length - 1)
        ] ?? position;
      const velocityAngle = Math.atan2(
        next.y - position.y,
        next.x - position.x
      );
      const forceAngle = velocityAngle + Math.PI / 2;
      const deflectionAngle = Math.min(
        180,
        (index * boundedMagneticConstants.pathStep * 180) / Math.PI
      );
      const status =
        params.shape === 'circle'
          ? '圆形磁场内偏转'
          : params.shape === 'triangle'
            ? '三角形磁场内偏转'
            : '半无界磁场内偏转';
      return {
        ...params,
        time,
        phase,
        ...geometry,
        position,
        velocityAngle,
        forceAngle,
        deflectionAngle,
        status
      };
    },
    getSnapshot() {
      return this.getState();
    },
    getParams(): BoundedMagneticParams {
      return { ...params };
    },
    setParams(next: Partial<BoundedMagneticParams>): BoundedMagneticParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    emit(): void {
      time = 0;
    },
    step(dt: number): void {
      if (params.autoRun)
        time =
          (time + clamp(finite(dt, 0), 0, 0.05)) %
          boundedMagneticConstants.animationPeriod;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
