import { clamp } from '../../core/math';

export type BlockBoardParams = {
  blockMass: number;
  boardMass: number;
  initialVelocity: number;
  friction: number;
  autoRun: boolean;
  showArea: boolean;
  showForces: boolean;
};

export type BlockBoardState = {
  params: BlockBoardParams;
  time: number;
  blockPosition: number;
  boardPosition: number;
  blockVelocity: number;
  boardVelocity: number;
  blockAcceleration: number;
  boardAcceleration: number;
  commonVelocity: number;
  syncTime: number;
  relativeDisplacement: number;
  sliding: boolean;
};

export const blockBoardConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 850,
  panelWidth: 350,
  panelInset: 22,
  trackStartX: 58,
  trackEndX: 816,
  trackY: 222,
  boardStartX: 238,
  boardWidth: 330,
  boardHeight: 38,
  blockWidth: 58,
  blockHeight: 48,
  trackScale: 35,
  graphLeft: 408,
  graphRight: 804,
  graphTop: 494,
  graphBottom: 680,
  graphAxisY: 648,
  graphMaxTime: 3.2,
  graphMaxVelocity: 8,
  panelTop: 430,
  panelHeight: 280,
  readoutWidth: 340,
  formulaWidth: 410,
  formulaHeight: 280,
  syncTopOffset: 98,
  readoutRuleY: 58,
  panelRuleY: 70,
  formulaCardY: 344,
  formulaCardHeight: 112,
  syncDash: 8,
  sampleDt: 0.016,
  gravity: 10
} as const;

const DEFAULT_PARAMS: BlockBoardParams = {
  blockMass: 2,
  boardMass: 2,
  initialVelocity: 6,
  friction: 0.2,
  autoRun: true,
  showArea: true,
  showForces: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<BlockBoardParams>,
  previous = DEFAULT_PARAMS
): BlockBoardParams {
  return {
    blockMass: clamp(finite(input.blockMass, previous.blockMass), 0.5, 8),
    boardMass: clamp(finite(input.boardMass, previous.boardMass), 0.5, 10),
    initialVelocity: clamp(
      finite(input.initialVelocity, previous.initialVelocity),
      0,
      12
    ),
    friction: clamp(finite(input.friction, previous.friction), 0.05, 0.8),
    autoRun: input.autoRun ?? previous.autoRun,
    showArea: input.showArea ?? previous.showArea,
    showForces: input.showForces ?? previous.showForces
  };
}

export function syncTimeFor(params: BlockBoardParams): number {
  const relativeAcceleration =
    params.friction *
    blockBoardConstants.gravity *
    (1 + params.blockMass / params.boardMass);
  if (relativeAcceleration <= 0) return blockBoardConstants.graphMaxTime;
  return Math.min(
    blockBoardConstants.graphMaxTime,
    params.initialVelocity / relativeAcceleration
  );
}

export function stateAt(
  params: BlockBoardParams,
  time: number
): BlockBoardState {
  const t = clamp(
    Math.max(0, finite(time, 0)),
    0,
    blockBoardConstants.graphMaxTime
  );
  const blockAcceleration = -params.friction * blockBoardConstants.gravity;
  const boardAcceleration =
    (params.friction * params.blockMass * blockBoardConstants.gravity) /
    params.boardMass;
  const syncTime = syncTimeFor(params);
  const syncBlockVelocity =
    params.initialVelocity + blockAcceleration * syncTime;
  const syncBoardVelocity = boardAcceleration * syncTime;
  const commonVelocity = (syncBlockVelocity + syncBoardVelocity) / 2;
  const syncBlockPosition =
    params.initialVelocity * syncTime + 0.5 * blockAcceleration * syncTime ** 2;
  const syncBoardPosition = 0.5 * boardAcceleration * syncTime ** 2;
  let blockPosition: number;
  let boardPosition: number;
  let blockVelocity: number;
  let boardVelocity: number;
  if (t <= syncTime) {
    blockPosition =
      params.initialVelocity * t + 0.5 * blockAcceleration * t ** 2;
    boardPosition = 0.5 * boardAcceleration * t ** 2;
    blockVelocity = params.initialVelocity + blockAcceleration * t;
    boardVelocity = boardAcceleration * t;
  } else {
    blockPosition = syncBlockPosition + commonVelocity * (t - syncTime);
    boardPosition = syncBoardPosition + commonVelocity * (t - syncTime);
    blockVelocity = commonVelocity;
    boardVelocity = commonVelocity;
  }
  return {
    params: { ...params },
    time: t,
    blockPosition,
    boardPosition,
    blockVelocity,
    boardVelocity,
    blockAcceleration,
    boardAcceleration,
    commonVelocity,
    syncTime,
    relativeDisplacement: Math.abs(blockPosition - boardPosition),
    sliding: t < syncTime - 0.001
  };
}

export function createBlockBoardSim(initial: Partial<BlockBoardParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): BlockBoardState {
    return stateAt(params, time);
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): BlockBoardParams => ({ ...params }),
    setParams(next: Partial<BlockBoardParams>): BlockBoardParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time =
        (time + Math.max(0, finite(dt, 0))) % blockBoardConstants.graphMaxTime;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
