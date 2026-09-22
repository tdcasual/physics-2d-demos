import { readoutOccludesStage } from '../../platform/stage-readout';
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

export type StageLayoutHint = {
  floatingReadout: boolean;
  overlayPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
};

type StagePose = {
  fit: number;
  offsetX: number;
  offsetY: number;
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
const CHART_LEFT = 470;
const CHART_TOP = 48;
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
const STATUS_Y = 388;
const STATUS_LEFT_OFFSET = 118;
const STATUS_WIDTH = 236;
const STATUS_HEIGHT = 52;
const D_ARROW_Y = 340;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function containInRect(
  boxW: number,
  boxH: number,
  availW: number,
  availH: number,
  alignX: 'left' | 'center'
): StagePose {
  const width = Math.max(1, availW);
  const height = Math.max(1, availH);
  const fit = Math.min(width / boxW, height / boxH);
  return {
    fit,
    offsetX: alignX === 'center' ? (width - boxW * fit) / 2 : 0,
    offsetY: (height - boxH * fit) / 2
  };
}

function betterPose(a: StagePose, b: StagePose): StagePose {
  return b.fit > a.fit + 1e-9 ? b : a;
}

export function hasFloatingReadout(anchor?: Element | null): boolean {
  return readoutOccludesStage(anchor);
}

export function stageLayoutFrom(canvas?: Element | null): StageLayoutHint {
  const floatingReadout = hasFloatingReadout(canvas);
  if (!floatingReadout) return { floatingReadout: false, overlayPx: 0 };
  let overlayPx = 0;
  let overlayTopPx = 0;
  let overlayHeightPx = 0;
  if (canvas instanceof HTMLElement) {
    const panel = canvas.parentElement?.querySelector(
      '.teaching-readout-panel, .srgb-readout-panel'
    );
    if (panel instanceof HTMLElement) {
      const canvasRect = canvas.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      if (
        panelRect.left < canvasRect.right &&
        panelRect.right > canvasRect.left &&
        panelRect.top < canvasRect.bottom &&
        panelRect.bottom > canvasRect.top
      ) {
        overlayPx = Math.max(0, canvasRect.right - panelRect.left);
        overlayTopPx = Math.max(panelRect.top, canvasRect.top) - canvasRect.top;
        overlayHeightPx =
          Math.min(panelRect.bottom, canvasRect.bottom) -
          Math.max(panelRect.top, canvasRect.top);
      }
    }
  }
  return {
    floatingReadout: true,
    overlayPx: overlayPx || FLOATING_OVERLAY_FALLBACK,
    ...(overlayHeightPx > 0 ? { overlayTopPx, overlayHeightPx } : {})
  };
}

export function stageTransform(
  cssWidth: number,
  cssHeight: number,
  layout: StageLayoutHint
): {
  fit: number;
  offsetX: number;
  offsetY: number;
  boxW: number;
  boxH: number;
  floatingReadout: boolean;
} {
  const width = Math.max(1, cssWidth);
  const height = Math.max(1, cssHeight);
  const boxW = C.baseWidth;
  const boxH = C.baseHeight;
  if (!layout.floatingReadout) {
    return {
      ...containInRect(boxW, boxH, width, height, 'center'),
      boxW,
      boxH,
      floatingReadout: false
    };
  }
  const overlay = layout.overlayPx ?? FLOATING_OVERLAY_FALLBACK;
  const gap = C.overlayGapPx;
  let chosen = containInRect(
    boxW,
    boxH,
    Math.max(1, width - overlay - gap),
    height,
    'left'
  );
  const overlayTop = layout.overlayTopPx;
  const overlayHeight = layout.overlayHeightPx;
  const wideColumn = width >= boxW && chosen.fit >= C.minReadableFit;
  if (
    !wideColumn &&
    typeof overlayTop === 'number' &&
    typeof overlayHeight === 'number' &&
    overlayHeight > 0
  ) {
    const overlayBottom = overlayTop + overlayHeight;
    if (overlayBottom + gap < height - 1) {
      const fit = Math.min(
        width / boxW,
        height / boxH,
        (height - overlayBottom - gap) / boxH
      );
      if (fit > 0) {
        const stageW = boxW * fit;
        const stageH = boxH * fit;
        chosen = betterPose(chosen, {
          fit,
          offsetX: Math.max(0, (width - stageW) / 2),
          offsetY: Math.max(0, Math.min(overlayBottom + gap, height - stageH))
        });
      }
    }
  }
  if (chosen.fit < C.minReadableFit) {
    const pose = containInRect(boxW, boxH, width, height, 'center');
    chosen = betterPose(chosen, {
      ...pose,
      offsetY: Math.max(0, height - boxH * pose.fit)
    });
  }
  return { ...chosen, boxW, boxH, floatingReadout: true };
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
  dArrowY: D_ARROW_Y,
  overlayFallbackPx: 228,
  overlayGapPx: 16,
  overlayClearTop: 0,
  minReadableFit: 0.48
};

const C = bulletBlockConstants;
const FLOATING_OVERLAY_FALLBACK = C.overlayFallbackPx;

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
      let remaining = Math.max(0, finite(dt, 0));
      if (remaining === 0) return;
      time += remaining;
      const m = params.bulletMass;
      const M = params.blockMass;
      const f = params.resistance;
      const contactLength = BULLET_LENGTH / WORLD_SCALE;
      const common = bulletBlockCommonSpeed(params.speed, m, M);
      const maxDepth = bulletBlockMaxDepth(params.speed, m, M, f);
      const relativeDecel = f * (1 / m + 1 / M);

      while (remaining > 1e-9) {
        if (phase === 'approach') {
          const gap = Math.max(0, blockX - bulletX - contactLength);
          const impactTime = bulletSpeed > 0 ? gap / bulletSpeed : Infinity;
          if (impactTime > remaining || !Number.isFinite(impactTime)) {
            bulletX += bulletSpeed * remaining;
            remaining = 0;
            continue;
          }
          bulletX += bulletSpeed * impactTime;
          remaining -= impactTime;
          phase = 'embed';
          bulletX = blockX - contactLength;
          continue;
        }

        if (phase === 'embed') {
          const relative = Math.max(0, bulletSpeed - blockSpeed);
          const stopTime = relative / relativeDecel;
          const interval = Math.min(remaining, stopTime);
          if (interval <= 1e-9) {
            phase = 'coast';
            bulletSpeed = common;
            blockSpeed = common;
            penetration = Math.max(penetration, maxDepth);
            bulletX =
              blockX - contactLength + Math.min(BLOCK_WIDTH, penetration);
            continue;
          }

          const nextRelative = Math.max(0, relative - relativeDecel * interval);
          const nextBlockSpeed = common - (m / (m + M)) * nextRelative;
          penetration += ((relative + nextRelative) / 2) * interval;
          blockX += ((blockSpeed + nextBlockSpeed) / 2) * interval;
          bulletSpeed = common + (M / (m + M)) * nextRelative;
          blockSpeed = nextBlockSpeed;
          bulletX = blockX - contactLength + Math.min(BLOCK_WIDTH, penetration);
          remaining -= interval;

          if (stopTime <= interval + 1e-9) {
            phase = 'coast';
            penetration = Math.max(penetration, maxDepth);
            bulletSpeed = common;
            blockSpeed = common;
            bulletX =
              blockX - contactLength + Math.min(BLOCK_WIDTH, penetration);
          }
          continue;
        }

        blockX += blockSpeed * remaining;
        bulletX = blockX - contactLength + Math.min(BLOCK_WIDTH, penetration);
        remaining = 0;
      }
    },
    reset(): void {
      params = { ...defaults };
      resetState();
    }
  };
}
