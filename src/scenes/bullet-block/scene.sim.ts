import { clamp } from '../../core/math';

export type BulletBlockParams = {
  speed: number;
  bulletMass: number;
  blockMass: number;
  resistance: number;
};

export type BulletBlockPhase = 'approach' | 'embed' | 'coast';

export type BulletBlockState = {
  params: BulletBlockParams;
  time: number;
  phase: BulletBlockPhase;
  bulletX: number;
  blockX: number;
  bulletSpeed: number;
  blockSpeed: number;
  relativeSpeed: number;
  penetration: number;
  commonSpeed: number;
  initialMomentum: number;
  totalMomentum: number;
  bulletEnergy: number;
  blockEnergy: number;
  heat: number;
  maxDepth: number;
};

const BASE_W = 820;
const BASE_H = 600;
const TRACK_LEFT = 70;
const TRACK_RIGHT = 780;
const TRACK_Y = 292;
const BLOCK_INITIAL_X = 14;
const BLOCK_WIDTH = 7;
const BLOCK_HEIGHT = 84;
const BLOCK_TOP = 208;
const BULLET_LENGTH = 40;
const BULLET_HEIGHT = 18;
const BULLET_Y = TRACK_Y - 9;
const WORLD_SCALE = 20;
const RULER_START = 0;
const RULER_STEP = 4;
const RULER_COUNT = 9;
const TITLE_Y = 30;
const SUBTITLE_Y = 56;
const CHART_LEFT = 545;
const CHART_TOP = 78;
const CHART_WIDTH = 220;
const CHART_HEIGHT = 150;
const ENERGY_LEFT = 70;
const ENERGY_TOP = 480;
const ENERGY_WIDTH = 710;
const ENERGY_HEIGHT = 88;
const BAR_LEFT = 210;
const BAR_WIDTH = 300;
const BAR_STEP_Y = 22;
const STATUS_X = 640;
const STATUS_Y = 320;
const STATUS_LEFT_OFFSET = 118;
const STATUS_WIDTH = 236;
const STATUS_HEIGHT = 52;
const D_ARROW_Y = 190;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeParams(input: Partial<BulletBlockParams>): BulletBlockParams {
  return {
    speed: clamp(finite(input.speed, 25), 5, 45),
    bulletMass: clamp(finite(input.bulletMass, 1), 0.2, 3),
    blockMass: clamp(finite(input.blockMass, 5), 1, 12),
    resistance: clamp(finite(input.resistance, 50), 5, 120)
  };
}

export function bulletBlockCommonSpeed(
  speed: number,
  bulletMass: number,
  blockMass: number
): number {
  const m = Math.max(0.001, bulletMass);
  const M = Math.max(0.001, blockMass);
  return (m * Math.max(0, speed)) / (m + M);
}

export function bulletBlockMaxDepth(
  speed: number,
  bulletMass: number,
  blockMass: number,
  resistance: number
): number {
  const m = Math.max(0.001, bulletMass);
  const M = Math.max(0.001, blockMass);
  const f = Math.max(0.001, resistance);
  return (Math.max(0, speed) ** 2 * m * M) / (2 * f * (m + M));
}

export const bulletBlockConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  trackLeft: TRACK_LEFT,
  trackRight: TRACK_RIGHT,
  trackY: TRACK_Y,
  blockInitialX: BLOCK_INITIAL_X,
  blockWidth: BLOCK_WIDTH,
  blockHeight: BLOCK_HEIGHT,
  blockTop: BLOCK_TOP,
  bulletLength: BULLET_LENGTH,
  bulletHeight: BULLET_HEIGHT,
  bulletY: BULLET_Y,
  worldScale: WORLD_SCALE,
  rulerStart: RULER_START,
  rulerStep: RULER_STEP,
  rulerCount: RULER_COUNT,
  titleY: TITLE_Y,
  subtitleY: SUBTITLE_Y,
  chartLeft: CHART_LEFT,
  chartTop: CHART_TOP,
  chartWidth: CHART_WIDTH,
  chartHeight: CHART_HEIGHT,
  energyLeft: ENERGY_LEFT,
  energyTop: ENERGY_TOP,
  energyWidth: ENERGY_WIDTH,
  energyHeight: ENERGY_HEIGHT,
  barLeft: BAR_LEFT,
  barWidth: BAR_WIDTH,
  barStepY: BAR_STEP_Y,
  statusX: STATUS_X,
  statusY: STATUS_Y,
  statusLeftOffset: STATUS_LEFT_OFFSET,
  statusWidth: STATUS_WIDTH,
  statusHeight: STATUS_HEIGHT,
  dArrowY: D_ARROW_Y
};

export function createBulletBlockSim(initial: Partial<BulletBlockParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;
  let phase: BulletBlockPhase = 'approach';
  let bulletX = 0;
  let blockX = BLOCK_INITIAL_X;
  let bulletSpeed = params.speed;
  let blockSpeed = 0;
  let penetration = 0;

  function resetState(): void {
    time = 0;
    phase = 'approach';
    bulletX = 0;
    blockX = BLOCK_INITIAL_X;
    bulletSpeed = params.speed;
    blockSpeed = 0;
    penetration = 0;
  }

  function getState(): BulletBlockState {
    const commonSpeed = bulletBlockCommonSpeed(
      params.speed,
      params.bulletMass,
      params.blockMass
    );
    const initialMomentum = params.bulletMass * params.speed;
    const totalMomentum =
      params.bulletMass * bulletSpeed + params.blockMass * blockSpeed;
    const bulletEnergy = 0.5 * params.bulletMass * bulletSpeed ** 2;
    const blockEnergy = 0.5 * params.blockMass * blockSpeed ** 2;
    const initialEnergy = 0.5 * params.bulletMass * params.speed ** 2;
    return {
      params: { ...params },
      time,
      phase,
      bulletX,
      blockX,
      bulletSpeed,
      blockSpeed,
      relativeSpeed: Math.max(0, bulletSpeed - blockSpeed),
      penetration,
      commonSpeed,
      initialMomentum,
      totalMomentum,
      bulletEnergy,
      blockEnergy,
      heat: Math.max(0, initialEnergy - bulletEnergy - blockEnergy),
      maxDepth: bulletBlockMaxDepth(
        params.speed,
        params.bulletMass,
        params.blockMass,
        params.resistance
      )
    };
  }

  resetState();

  return {
    getState,
    getSnapshot: getState,
    getParams(): BulletBlockParams {
      return { ...params };
    },
    setParams(next: Partial<BulletBlockParams>): BulletBlockParams {
      params = normalizeParams({ ...params, ...next });
      resetState();
      return { ...params };
    },
    step(dt: number): void {
      const safeDt = Math.max(0, finite(dt, 0));
      if (safeDt === 0) return;
      time += safeDt;
      if (phase === 'approach') {
        bulletX += bulletSpeed * safeDt;
        if (bulletX + BULLET_LENGTH / WORLD_SCALE >= blockX) {
          phase = 'embed';
          bulletX = blockX - BULLET_LENGTH / WORLD_SCALE;
        }
      } else if (phase === 'embed') {
        const force = Math.min(
          params.resistance,
          (params.bulletMass * bulletSpeed) / Math.max(safeDt, 0.001)
        );
        bulletSpeed = Math.max(
          0,
          bulletSpeed - (force / params.bulletMass) * safeDt
        );
        blockSpeed += (force / params.blockMass) * safeDt;
        const relative = Math.max(0, bulletSpeed - blockSpeed);
        penetration += relative * safeDt;
        blockX += blockSpeed * safeDt;
        bulletX = blockX - BLOCK_WIDTH + Math.min(BLOCK_WIDTH, penetration);
        if (
          relative <= 0.01 ||
          penetration >=
            bulletBlockMaxDepth(
              params.speed,
              params.bulletMass,
              params.blockMass,
              params.resistance
            )
        ) {
          phase = 'coast';
          const common = bulletBlockCommonSpeed(
            params.speed,
            params.bulletMass,
            params.blockMass
          );
          bulletSpeed = common;
          blockSpeed = common;
          penetration = Math.min(
            BLOCK_WIDTH,
            Math.max(
              penetration,
              bulletBlockMaxDepth(
                params.speed,
                params.bulletMass,
                params.blockMass,
                params.resistance
              )
            )
          );
        }
      } else {
        blockX += blockSpeed * safeDt;
        bulletX = blockX - BLOCK_WIDTH + penetration;
      }
    },
    reset(): void {
      params = { ...defaults };
      resetState();
    }
  };
}
