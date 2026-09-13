import { clamp } from '../../core/math';

export type ParallelogramStage = 'components' | 'construct' | 'compare';

export type ParallelogramParams = {
  f1: number;
  f2: number;
  angle: number;
  stage: ParallelogramStage;
};

export type Vector = { x: number; y: number };

export type ParallelogramState = {
  params: ParallelogramParams;
  time: number;
  f1: Vector;
  f2: Vector;
  resultant: Vector;
  theoreticalMagnitude: number;
  measuredMagnitude: number;
  magnitudeError: number;
  angleError: number;
  samePoint: boolean;
};

const DEG = Math.PI / 180;
const BASE_W = 820;
const BASE_H = 620;
const ORIGIN = { x: 300, y: 310 };
const VECTOR_SCALE = 60;
const AXIS_TOP = 70;
const AXIS_BOTTOM = 560;
const FIELD_LEFT = 62;
const FIELD_TOP = 50;
const FIELD_RIGHT = 520;
const FIELD_BOTTOM = 570;
const POINT_RADIUS = 11;
const ARC_RADIUS = 52;
const LABEL_OFFSET = 18;
const PROTRACTOR_LEFT = 82;
const PROTRACTOR_TOP = 450;
const PROTRACTOR_WIDTH = 210;
const PROTRACTOR_HEIGHT = 70;
const PANEL_LEFT = 545;
const PANEL_TOP = 74;
const PANEL_WIDTH = 242;
const PANEL_HEIGHT = 205;
const RESULT_LEFT = 545;
const RESULT_TOP = 310;
const RESULT_WIDTH = 242;
const RESULT_HEIGHT = 140;
const FORMULA_LEFT = 70;
const FORMULA_TOP = 575;
const TITLE_Y = 30;
const SUBTITLE_Y = 56;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeParams(
  input: Partial<ParallelogramParams>
): ParallelogramParams {
  return {
    f1: clamp(finite(input.f1, 1.82), 0.5, 4),
    f2: clamp(finite(input.f2, 1.82), 0.5, 4),
    angle: clamp(finite(input.angle, 90), 20, 160),
    stage:
      input.stage === 'construct' || input.stage === 'compare'
        ? input.stage
        : 'components'
  };
}

export function resultantMagnitude(
  f1: number,
  f2: number,
  angle: number
): number {
  return Math.sqrt(
    Math.max(0, f1 * f1 + f2 * f2 + 2 * f1 * f2 * Math.cos(angle * DEG))
  );
}

export function resultantVector(f1: number, f2: number, angle: number): Vector {
  const half = (angle * DEG) / 2;
  return {
    x: -f1 * Math.cos(half) + f2 * Math.cos(half),
    y: (f1 + f2) * Math.sin(half)
  };
}

export const parallelogramConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  origin: ORIGIN,
  vectorScale: VECTOR_SCALE,
  axisTop: AXIS_TOP,
  axisBottom: AXIS_BOTTOM,
  fieldLeft: FIELD_LEFT,
  fieldTop: FIELD_TOP,
  fieldRight: FIELD_RIGHT,
  fieldBottom: FIELD_BOTTOM,
  pointRadius: POINT_RADIUS,
  arcRadius: ARC_RADIUS,
  labelOffset: LABEL_OFFSET,
  protractorLeft: PROTRACTOR_LEFT,
  protractorTop: PROTRACTOR_TOP,
  protractorWidth: PROTRACTOR_WIDTH,
  protractorHeight: PROTRACTOR_HEIGHT,
  panelLeft: PANEL_LEFT,
  panelTop: PANEL_TOP,
  panelWidth: PANEL_WIDTH,
  panelHeight: PANEL_HEIGHT,
  resultLeft: RESULT_LEFT,
  resultTop: RESULT_TOP,
  resultWidth: RESULT_WIDTH,
  resultHeight: RESULT_HEIGHT,
  formulaLeft: FORMULA_LEFT,
  formulaTop: FORMULA_TOP,
  titleY: TITLE_Y,
  subtitleY: SUBTITLE_Y
};

export function createParallelogramSim(
  initial: Partial<ParallelogramParams> = {}
) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): ParallelogramState {
    const half = (params.angle * DEG) / 2;
    const f1: Vector = {
      x: -params.f1 * Math.cos(half),
      y: params.f1 * Math.sin(half)
    };
    const f2: Vector = {
      x: params.f2 * Math.cos(half),
      y: params.f2 * Math.sin(half)
    };
    const resultant = resultantVector(params.f1, params.f2, params.angle);
    const theoreticalMagnitude = resultantMagnitude(
      params.f1,
      params.f2,
      params.angle
    );
    const measuredMagnitude = theoreticalMagnitude * 1.002;
    return {
      params: { ...params },
      time,
      f1,
      f2,
      resultant,
      theoreticalMagnitude,
      measuredMagnitude,
      magnitudeError: theoreticalMagnitude > 0 ? 0.2 : 0,
      angleError: 0.5,
      samePoint: params.stage === 'compare'
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams(): ParallelogramParams {
      return { ...params };
    },
    setParams(next: Partial<ParallelogramParams>): ParallelogramParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    step(dt: number): void {
      time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
