import { clamp } from '../../core/math';

export type MirrorMode = 'trajectory' | 'velocity' | 'force' | 'summary';

export type MagneticMirrorParams = {
  pitchAngle: number;
  mirrorRatio: number;
  mode: MirrorMode;
  autoRun: boolean;
  showVelocity: boolean;
  showField: boolean;
  showForce: boolean;
};

export type MagneticMirrorState = {
  params: MagneticMirrorParams;
  time: number;
  position: number;
  fieldRatio: number;
  speed: number;
  parallelSpeed: number;
  perpendicularSpeed: number;
  pitchDistance: number;
  gyroRadius: number;
  energy: number;
  magneticMoment: number;
  mirrorPoint: number;
  status: string;
};

export const magneticMirrorConstants = {
  baseWidth: 1000,
  baseHeight: 700,
  fieldWidth: 680,
  panelWidth: 320,
  panelInset: 24,
  dividerY: 66,
  gridStep: 50,
  axisY: 322,
  coilLeftX: 106,
  coilRightX: 574,
  centerX: 340,
  halfLength: 234,
  coilWidth: 26,
  coilHeight: 300,
  fieldTop: 150,
  fieldBottom: 492,
  weakRegionWidth: 208,
  fieldCurveInset: 54,
  fieldCurveControlInset: 104,
  orbitRadius: 36,
  trailLength: 44,
  fieldLineCount: 7,
  lineDash: 7,
  particleRadius: 7,
  arrowLength: 78,
  cardWidth: 272,
  formulaCardY: 92,
  formulaCardHeight: 130,
  readoutCardY: 238,
  readoutCardHeight: 168,
  readoutRowHeight: 28,
  calloutY: 432,
  calloutHeight: 142,
  particleSpeed: 14.2,
  gyroPeriod: 0.024,
  animationSpeed: 0.74,
  sampleDt: 0.016
} as const;

const DEFAULT_PARAMS: MagneticMirrorParams = {
  pitchAngle: 35,
  mirrorRatio: 6,
  mode: 'trajectory',
  autoRun: true,
  showVelocity: true,
  showField: true,
  showForce: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<MagneticMirrorParams>,
  previous: MagneticMirrorParams = DEFAULT_PARAMS
): MagneticMirrorParams {
  const modes: MirrorMode[] = ['trajectory', 'velocity', 'force', 'summary'];
  return {
    pitchAngle: clamp(finite(input.pitchAngle, previous.pitchAngle), 5, 85),
    mirrorRatio: clamp(finite(input.mirrorRatio, previous.mirrorRatio), 1, 10),
    mode: modes.includes(input.mode as MirrorMode)
      ? (input.mode as MirrorMode)
      : previous.mode,
    autoRun: input.autoRun ?? previous.autoRun,
    showVelocity: input.showVelocity ?? previous.showVelocity,
    showField: input.showField ?? previous.showField,
    showForce: input.showForce ?? previous.showForce
  };
}

export function magneticFieldRatio(
  position: number,
  mirrorRatio: number
): number {
  const edge = Math.min(1, Math.abs(position));
  return 1 + (mirrorRatio - 1) * edge ** 4;
}

export function isMirrorTrapped(
  pitchAngle: number,
  mirrorRatio: number
): boolean {
  return Math.sin((pitchAngle * Math.PI) / 180) ** 2 * mirrorRatio > 1;
}

export function mirrorPointFor(
  pitchAngle: number,
  mirrorRatio: number
): number {
  const sinSquared = Math.sin((pitchAngle * Math.PI) / 180) ** 2;
  if (sinSquared <= 0 || !isMirrorTrapped(pitchAngle, mirrorRatio)) return 1;
  if (mirrorRatio <= 1) return 1;
  return clamp(((1 / sinSquared - 1) / (mirrorRatio - 1)) ** 0.25, 0, 1);
}

function wrapOpenEnds(position: number): number {
  if (position <= 1 && position >= -1) return position;
  return ((((position + 1) % 2) + 2) % 2) - 1;
}

function stateAt(
  params: MagneticMirrorParams,
  position: number,
  direction: number,
  time: number
): MagneticMirrorState {
  const speed = magneticMirrorConstants.particleSpeed;
  const fieldRatio = magneticFieldRatio(position, params.mirrorRatio);
  const pitchSin = Math.sin((params.pitchAngle * Math.PI) / 180);
  const perpendicularSpeed = Math.min(
    speed,
    speed * pitchSin * Math.sqrt(fieldRatio)
  );
  const parallelMagnitude = Math.sqrt(
    Math.max(0, speed * speed - perpendicularSpeed * perpendicularSpeed)
  );
  const parallelSpeed = direction * parallelMagnitude;
  const cyclotronPeriod =
    magneticMirrorConstants.gyroPeriod / Math.max(fieldRatio, 1e-9);
  const pitchDistance = Math.abs(parallelMagnitude) * cyclotronPeriod * 100;
  const gyroRadius = perpendicularSpeed / Math.max(fieldRatio, 1e-9);
  const energy = 0.5 * speed * speed;
  const magneticMoment =
    (0.5 * perpendicularSpeed * perpendicularSpeed) / fieldRatio;
  const mirrorPoint = mirrorPointFor(params.pitchAngle, params.mirrorRatio);
  const trapped = isMirrorTrapped(params.pitchAngle, params.mirrorRatio);
  let status = '运动中';
  if (!params.autoRun) status = '已暂停';
  else if (trapped && Math.abs(position) >= mirrorPoint - 0.02) {
    status = '磁镜反射';
  } else if (!trapped && Math.abs(position) >= 0.92) {
    status = '穿出端部';
  }
  return {
    params: { ...params },
    time,
    position,
    fieldRatio,
    speed,
    parallelSpeed,
    perpendicularSpeed,
    pitchDistance,
    gyroRadius,
    energy,
    magneticMoment,
    mirrorPoint,
    status
  };
}

export function createMagneticMirrorSim(
  initial: Partial<MagneticMirrorParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  let position = 0;
  let direction = 1;

  function getState(): MagneticMirrorState {
    return stateAt(params, position, direction, time);
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): MagneticMirrorParams => ({ ...params }),
    setParams(next: Partial<MagneticMirrorParams>): MagneticMirrorParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = Math.max(0, finite(dt, 0));
      const current = stateAt(params, position, direction, time);
      const velocityFactor = Math.max(
        0.12,
        Math.abs(current.parallelSpeed) / current.speed
      );
      position +=
        direction *
        velocityFactor *
        delta *
        magneticMirrorConstants.animationSpeed;
      if (isMirrorTrapped(params.pitchAngle, params.mirrorRatio)) {
        const mirrorPoint = mirrorPointFor(
          params.pitchAngle,
          params.mirrorRatio
        );
        if (position >= mirrorPoint) {
          position = mirrorPoint;
          if (direction > 0) direction = -1;
        } else if (position <= -mirrorPoint) {
          position = -mirrorPoint;
          if (direction < 0) direction = 1;
        }
      } else {
        position = wrapOpenEnds(position);
      }
      time += delta;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
      position = 0;
      direction = 1;
    }
  };
}
