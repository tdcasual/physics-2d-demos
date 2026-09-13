import { clamp } from '../../core/math';

export type FaradayRotation = 'cw' | 'ccw';
export type FaradayField = 'into' | 'out';

export type FaradayParams = {
  B: number;
  omega: number;
  radius: number;
  externalResistance: number;
  rotation: FaradayRotation;
  field: FaradayField;
  closed: boolean;
};

export type FaradayState = {
  params: FaradayParams;
  time: number;
  angle: number;
  emf: number;
  current: number;
  power: number;
  torque: number;
  polarity: 'A−/B+' | 'A+/B−';
};

const BASE_W = 820;
const BASE_H = 620;
const DISC_CENTER = { x: 310, y: 335 };
const DISC_RADIUS = 205;
const RING_COUNT = 4;
const FIELD_LEFT = 55;
const FIELD_TOP = 90;
const FIELD_RIGHT = 570;
const FIELD_BOTTOM = 565;
const CIRCUIT_X = 700;
const INTERNAL_R = 0.01;

const SUBTITLE_Y = 57;
const FIELD_SYMBOL_START_X = 38;
const FIELD_SYMBOL_END_X = 20;
const FIELD_SYMBOL_START_Y = 68;
const FIELD_SYMBOL_END_Y = 24;
const FIELD_SYMBOL_STEP_X = 76;
const FIELD_SYMBOL_STEP_Y = 72;
const ARROW_FORWARD_X = 60;
const ARROW_UP_Y = 70;
const ARROW_BACK_X = 58;
const VELOCITY_LABEL_X = 80;
const VELOCITY_LABEL_Y = 28;
const FORCE_LABEL_X = 62;
const ANGULAR_LABEL_Y = 64;
const WIRE_TOP = 110;
const WIRE_BOTTOM = 525;
const WIRE_SWITCH_BOTTOM = 220;
const WIRE_BULB_TOP = 440;
const SWITCH_LEFT = 54;
const SWITCH_TOP = 180;
const SWITCH_WIDTH = 108;
const SWITCH_HEIGHT = 70;
const SWITCH_TITLE_Y = 202;
const SWITCH_STATUS_Y = 228;
const BULB_LEFT = 58;
const BULB_TOP = 350;
const BULB_WIDTH = 116;
const BULB_HEIGHT = 80;
const BULB_TITLE_Y = 378;
const BULB_STATUS_Y = 405;
const METER_Y = 495;
const METER_TITLE_Y = 493;
const METER_LABEL_Y = 550;
const READOUT_Y = 600;
const READOUT_EMF_X = 80;
const READOUT_CURRENT_X = 420;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeParams(input: Partial<FaradayParams>): FaradayParams {
  return {
    B: clamp(finite(input.B, 1), 0.2, 2),
    omega: clamp(finite(input.omega, 10), 2, 20),
    radius: clamp(finite(input.radius, 0.2), 0.1, 0.4),
    externalResistance: clamp(finite(input.externalResistance, 2), 0.5, 5),
    rotation: input.rotation === 'ccw' ? 'ccw' : 'cw',
    field: input.field === 'out' ? 'out' : 'into',
    closed: input.closed !== false
  };
}

export function faradayEmf(B: number, omega: number, radius: number): number {
  return 0.5 * Math.max(0, B) * Math.max(0, omega) * Math.max(0, radius) ** 2;
}

export function createFaradaySim(initial: Partial<FaradayParams> = {}) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;

  return {
    getState(): FaradayState {
      const emf = faradayEmf(params.B, params.omega, params.radius);
      const current = params.closed
        ? emf / (params.externalResistance + INTERNAL_R)
        : 0;
      const power = current * current * params.externalResistance;
      return {
        params: { ...params },
        time,
        angle: time * params.omega * (params.rotation === 'cw' ? 1 : -1),
        emf,
        current,
        power,
        torque: params.omega > 0 ? power / params.omega : 0,
        polarity: params.field === 'into' ? 'A−/B+' : 'A+/B−'
      };
    },
    getSnapshot(): FaradayState {
      return this.getState();
    },
    getParams(): FaradayParams {
      return { ...params };
    },
    setParams(next: Partial<FaradayParams>): FaradayParams {
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

export const faradayConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  discCenter: DISC_CENTER,
  discRadius: DISC_RADIUS,
  ringCount: RING_COUNT,
  fieldLeft: FIELD_LEFT,
  fieldTop: FIELD_TOP,
  fieldRight: FIELD_RIGHT,
  fieldBottom: FIELD_BOTTOM,
  circuitX: CIRCUIT_X,
  subtitleY: SUBTITLE_Y,
  fieldSymbolStartX: FIELD_SYMBOL_START_X,
  fieldSymbolEndX: FIELD_SYMBOL_END_X,
  fieldSymbolStartY: FIELD_SYMBOL_START_Y,
  fieldSymbolEndY: FIELD_SYMBOL_END_Y,
  fieldSymbolStepX: FIELD_SYMBOL_STEP_X,
  fieldSymbolStepY: FIELD_SYMBOL_STEP_Y,
  arrowForwardX: ARROW_FORWARD_X,
  arrowUpY: ARROW_UP_Y,
  arrowBackX: ARROW_BACK_X,
  velocityLabelX: VELOCITY_LABEL_X,
  velocityLabelY: VELOCITY_LABEL_Y,
  forceLabelX: FORCE_LABEL_X,
  angularLabelY: ANGULAR_LABEL_Y,
  wireTop: WIRE_TOP,
  wireBottom: WIRE_BOTTOM,
  wireSwitchBottom: WIRE_SWITCH_BOTTOM,
  wireBulbTop: WIRE_BULB_TOP,
  switchLeft: SWITCH_LEFT,
  switchTop: SWITCH_TOP,
  switchWidth: SWITCH_WIDTH,
  switchHeight: SWITCH_HEIGHT,
  switchTitleY: SWITCH_TITLE_Y,
  switchStatusY: SWITCH_STATUS_Y,
  bulbLeft: BULB_LEFT,
  bulbTop: BULB_TOP,
  bulbWidth: BULB_WIDTH,
  bulbHeight: BULB_HEIGHT,
  bulbTitleY: BULB_TITLE_Y,
  bulbStatusY: BULB_STATUS_Y,
  meterY: METER_Y,
  meterTitleY: METER_TITLE_Y,
  meterLabelY: METER_LABEL_Y,
  readoutY: READOUT_Y,
  readoutEmfX: READOUT_EMF_X,
  readoutCurrentX: READOUT_CURRENT_X
};
