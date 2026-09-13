import { clamp } from '../../core/math';

export type UvtParams = {
  v0: number;
  acceleration: number;
  autoRun: boolean;
  showArea: boolean;
};
export type UvtState = {
  params: UvtParams;
  time: number;
  velocity: number;
  displacement: number;
  stopped: boolean;
};

const BASE_W = 900;
const BASE_H = 640;
const FIELD_W = 650;
const GRAPH_LEFT = 78;
const GRAPH_RIGHT = 616;
const GRAPH_TOP = 222;
const GRAPH_BOTTOM = 570;
const GRAPH_MAX_T = 10;
const GRAPH_MAX_V = 40;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalizeParams(input: Partial<UvtParams>): UvtParams {
  return {
    v0: clamp(finite(input.v0, 10), -10, 20),
    acceleration: clamp(finite(input.acceleration, -3), -4, 4),
    autoRun: input.autoRun !== false,
    showArea: input.showArea !== false
  };
}
export const uvtConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  graphMaxT: GRAPH_MAX_T,
  graphMaxV: GRAPH_MAX_V,
  trackY: 126,
  trackEndX: 610,
  carBodyWidth: 68,
  formulaTop: 184,
  panelWidth: 236,
  formulaHeight: 74,
  readoutTop: 286,
  readoutHeight: 150
};

export function uvtVelocity(
  v0: number,
  acceleration: number,
  time: number
): number {
  return finite(v0, 0) + finite(acceleration, 0) * Math.max(0, finite(time, 0));
}
export function uvtDisplacement(
  v0: number,
  acceleration: number,
  time: number
): number {
  const t = Math.max(0, finite(time, 0));
  return finite(v0, 0) * t + 0.5 * finite(acceleration, 0) * t * t;
}

export function createUvtSim(initial: Partial<UvtParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;
  return {
    getState(): UvtState {
      const velocity = uvtVelocity(params.v0, params.acceleration, time);
      return {
        params: { ...params },
        time,
        velocity,
        displacement: uvtDisplacement(params.v0, params.acceleration, time),
        stopped: Math.abs(velocity) < 0.01
      };
    },
    getSnapshot(): UvtState {
      return this.getState();
    },
    getParams(): UvtParams {
      return { ...params };
    },
    setParams(next: Partial<UvtParams>): UvtParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun)
        time = (time + Math.max(0, finite(dt, 0))) % GRAPH_MAX_T;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
