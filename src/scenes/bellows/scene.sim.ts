export type BellowsMotion = 'auto' | 'left' | 'right';

export type BellowsParams = {
  motion: BellowsMotion;
  autoRun: boolean;
  showFlow: boolean;
};

export type BellowsPressure = 'high' | 'low';

export type BellowsValves = { A: boolean; B: boolean; C: boolean; D: boolean };

export type BellowsState = {
  params: BellowsParams;
  t: number;
  pistonX: number;
  progress: number;
  direction: 'left' | 'right';
  leftPressure: BellowsPressure;
  rightPressure: BellowsPressure;
  valves: BellowsValves;
};

/** Animation-only design frame (no in-canvas side panel). */
const VIEW_W = 800;
const VIEW_H = 560;
const CHAMBER_LEFT = 86;
const CHAMBER_RIGHT = 560;
const CHAMBER_TOP = 228;
const CHAMBER_BOTTOM = 428;
const PISTON_CENTER = (CHAMBER_LEFT + CHAMBER_RIGHT) / 2;
const PISTON_HALF = 13;
const PISTON_TRAVEL = 152;
const CYCLE = 4;
const FIXED_LEFT_PROGRESS = 0.42;
const FIXED_RIGHT_PROGRESS = -0.42;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === '0' || text === 'false' || text === 'off' || text === 'no') {
      return false;
    }
    if (text === '1' || text === 'true' || text === 'on' || text === 'yes') {
      return true;
    }
  }
  return fallback;
}

function normalizeMotion(value: unknown): BellowsMotion {
  return value === 'left' || value === 'right' ? value : 'auto';
}

function normalizeParams(input: Partial<BellowsParams>): BellowsParams {
  return {
    motion: normalizeMotion(input.motion),
    autoRun: asBool(input.autoRun, true),
    showFlow: asBool(input.showFlow, true)
  };
}

function wrapTime(t: number): number {
  const cycle = ((t % CYCLE) + CYCLE) % CYCLE;
  return cycle;
}

/**
 * Boyle-law qualitative linkage: pressure and check valves follow the
 * compressing side (motion direction), not the piston's position sign.
 * Push left → left high, C exhaust + B intake; pull right → right high, D + A.
 */
export function linkageFromDirection(direction: 'left' | 'right'): {
  leftPressure: BellowsPressure;
  rightPressure: BellowsPressure;
  valves: BellowsValves;
} {
  if (direction === 'left') {
    return {
      leftPressure: 'high',
      rightPressure: 'low',
      valves: { A: false, B: true, C: true, D: false }
    };
  }
  return {
    leftPressure: 'low',
    rightPressure: 'high',
    valves: { A: true, B: false, C: false, D: true }
  };
}

function autoStroke(t: number): {
  progress: number;
  direction: 'left' | 'right';
} {
  const local = wrapTime(t);
  const half = CYCLE / 2;
  if (local < half) {
    return { direction: 'left', progress: 1 - (local / half) * 2 };
  }
  return { direction: 'right', progress: -1 + ((local - half) / half) * 2 };
}

export const bellowsConstants = {
  baseWidth: VIEW_W,
  baseHeight: VIEW_H,
  chamberLeft: CHAMBER_LEFT,
  chamberRight: CHAMBER_RIGHT,
  chamberTop: CHAMBER_TOP,
  chamberBottom: CHAMBER_BOTTOM,
  pistonCenter: PISTON_CENTER,
  pistonHalf: PISTON_HALF,
  pistonTravel: PISTON_TRAVEL,
  pistonMin: PISTON_CENTER - PISTON_TRAVEL,
  pistonMax: PISTON_CENTER + PISTON_TRAVEL,
  cycle: CYCLE,
  outletX: PISTON_CENTER,
  outletTop: 92,
  outletWidth: 54,
  manifoldY: 160,
  pipeLeftX: CHAMBER_LEFT,
  pipeRightX: CHAMBER_RIGHT,
  rodEndX: 585,
  valvePortInset: 22
};

function clampPiston(progress: number): { progress: number; pistonX: number } {
  const limited = Math.max(-1, Math.min(1, progress));
  const pistonX = Math.max(
    bellowsConstants.pistonMin,
    Math.min(
      bellowsConstants.pistonMax,
      PISTON_CENTER + limited * PISTON_TRAVEL
    )
  );
  return { progress: limited, pistonX };
}

function makeState(params: BellowsParams, t: number): BellowsState {
  let direction: 'left' | 'right' = 'left';
  let progress = 0;
  if (params.motion === 'left') {
    direction = 'left';
    progress = FIXED_LEFT_PROGRESS;
  } else if (params.motion === 'right') {
    direction = 'right';
    progress = FIXED_RIGHT_PROGRESS;
  } else {
    const stroke = autoStroke(t);
    direction = stroke.direction;
    progress = stroke.progress;
  }
  const placed = clampPiston(progress);
  const linkage = linkageFromDirection(direction);
  return {
    params: { ...params },
    t: wrapTime(t),
    pistonX: placed.pistonX,
    progress: placed.progress,
    direction,
    ...linkage
  };
}

export function createBellowsSim(initial: Partial<BellowsParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let t = 0;
  return {
    getState(): BellowsState {
      return makeState(params, t);
    },
    getSnapshot(): BellowsState {
      return makeState(params, t);
    },
    getParams(): BellowsParams {
      return { ...params };
    },
    setParams(next: Partial<BellowsParams>): BellowsParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    setMotion(motion: BellowsMotion): BellowsParams {
      params = normalizeParams({ ...params, motion });
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun || params.motion !== 'auto') return;
      const delta = Math.max(0, finite(dt, 0));
      t = wrapTime(t + delta);
    },
    reset(): void {
      params = { ...defaults };
      t = 0;
    }
  };
}
