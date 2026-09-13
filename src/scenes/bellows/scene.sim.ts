export type BellowsMotion = 'auto' | 'left' | 'right';

export type BellowsParams = {
  motion: BellowsMotion;
  autoRun: boolean;
  showFlow: boolean;
};

export type BellowsState = {
  params: BellowsParams;
  t: number;
  pistonX: number;
  progress: number;
  direction: 'left' | 'right';
  leftPressure: 'high' | 'low';
  rightPressure: 'high' | 'low';
  valves: { A: boolean; B: boolean; C: boolean; D: boolean };
};

const BASE_W = 900;
const BASE_H = 640;
const FIELD_W = 590;
const CHAMBER_LEFT = 72;
const CHAMBER_RIGHT = 540;
const CHAMBER_TOP = 280;
const CHAMBER_BOTTOM = 500;
const PISTON_CENTER = 340;
const STROKE = 145;
const PIPE_TOP = 175;
const PIPE_BOTTOM = 575;
const CYCLE = 4;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeMotion(value: unknown): BellowsMotion {
  return value === 'left' || value === 'right' ? value : 'auto';
}

function normalizeParams(input: Partial<BellowsParams>): BellowsParams {
  return {
    motion: normalizeMotion(input.motion),
    autoRun: input.autoRun !== false,
    showFlow: input.showFlow !== false
  };
}

export const bellowsConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  chamberLeft: CHAMBER_LEFT,
  chamberRight: CHAMBER_RIGHT,
  chamberTop: CHAMBER_TOP,
  chamberBottom: CHAMBER_BOTTOM,
  pistonCenter: PISTON_CENTER,
  stroke: STROKE,
  pipeTop: PIPE_TOP,
  pipeBottom: PIPE_BOTTOM,
  cycle: CYCLE,
  panelDividerY: 62,
  actionBoxX: 174,
  actionBoxY: 84,
  actionBoxWidth: 100,
  actionBoxHeight: 38,
  actionTextX: 224,
  stateTextX: 165,
  monitorY: 237,
  cardLeftX: 25,
  cardRightX: 174,
  cardTopY: 275,
  cardBottomY: 365,
  cardWidth: 124,
  cardHeight: 72,
  cardTextOffsetX: 62,
  mechanismTop: 462,
  mechanismWidth: 249,
  mechanismHeight: 102,
  pipeLeftX: 225,
  valvePipeX: 255,
  pipeRightX: 420,
  outletY: 88
};

function makeState(params: BellowsParams, t: number): BellowsState {
  let progress = 0;
  let direction: 'left' | 'right' = 'left';
  if (params.motion === 'left') {
    progress = -0.55;
  } else if (params.motion === 'right') {
    progress = 0.55;
    direction = 'right';
  } else {
    const local = (t + 0.45) % CYCLE;
    if (local < CYCLE / 2) {
      direction = 'left';
      progress = 0.62 - local * 0.62;
    } else {
      direction = 'right';
      progress = -0.62 + (local - CYCLE / 2) * 0.62;
    }
  }
  const leftCompressed = progress < 0;
  return {
    params: { ...params },
    t,
    pistonX: PISTON_CENTER + progress * STROKE,
    progress,
    direction,
    leftPressure: leftCompressed ? 'high' : 'low',
    rightPressure: leftCompressed ? 'low' : 'high',
    valves: leftCompressed
      ? { A: false, B: true, C: true, D: false }
      : { A: true, B: false, C: false, D: true }
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
      t = (t + Math.max(0, finite(dt, 0))) % CYCLE;
    },
    reset(): void {
      params = { ...defaults };
      t = 0;
    }
  };
}
