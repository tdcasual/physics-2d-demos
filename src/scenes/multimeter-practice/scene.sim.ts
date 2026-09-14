import { clamp } from '../../core/math';

export type MeterMode = 'resistance' | 'voltage' | 'diode';
export type TargetId =
  | 'short'
  | 'resistor15'
  | 'resistor150'
  | 'resistor1500'
  | 'diodeForward'
  | 'diodeReverse'
  | 'battery15'
  | 'battery9';
export type MeterRange =
  | 'ohm1'
  | 'ohm10'
  | 'ohm100'
  | 'ohm1k'
  | 'volt2_5'
  | 'volt10';

export type MultimeterParams = {
  mode: MeterMode;
  target: TargetId;
  range: MeterRange;
  connected: boolean;
  zeroAdjust: number;
  autoRun: boolean;
};

export type MultimeterState = MultimeterParams & {
  time: number;
  targetLabel: string;
  rangeLabel: string;
  pointerFraction: number;
  pointerAngle: number;
  scaleReading: number | null;
  measuredValue: number | null;
  measuredText: string;
  targetResistance: number | null;
  sourceVoltage: number | null;
  bestRange: boolean;
  status: string;
  targetKind: 'resistor' | 'diode' | 'battery' | 'short';
  polarityCorrect: boolean;
};

export const multimeterConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  resistanceRange: { ohm1: 1, ohm10: 10, ohm100: 100, ohm1k: 1000 },
  voltageRange: { volt2_5: 2.5, volt10: 10 },
  zeroMin: -0.08,
  zeroMax: 0.08
} as const;

const DEFAULTS: MultimeterParams = {
  mode: 'resistance',
  target: 'short',
  range: 'ohm1',
  connected: false,
  zeroAdjust: 0,
  autoRun: true
};

const TARGETS: Record<
  TargetId,
  {
    label: string;
    kind: MultimeterState['targetKind'];
    resistance: number | null;
    voltage: number | null;
    polarityCorrect: boolean;
  }
> = {
  short: {
    label: '短接两表笔（调零）',
    kind: 'short',
    resistance: 0,
    voltage: 0,
    polarityCorrect: true
  },
  resistor15: {
    label: '15 Ω 定值电阻',
    kind: 'resistor',
    resistance: 15,
    voltage: null,
    polarityCorrect: true
  },
  resistor150: {
    label: '150 Ω 定值电阻',
    kind: 'resistor',
    resistance: 150,
    voltage: null,
    polarityCorrect: true
  },
  resistor1500: {
    label: '1.5 kΩ 定值电阻',
    kind: 'resistor',
    resistance: 1500,
    voltage: null,
    polarityCorrect: true
  },
  diodeForward: {
    label: '二极管（正向导通）',
    kind: 'diode',
    resistance: 0.7,
    voltage: 0.7,
    polarityCorrect: true
  },
  diodeReverse: {
    label: '二极管（反向截止）',
    kind: 'diode',
    resistance: null,
    voltage: 0,
    polarityCorrect: false
  },
  battery15: {
    label: '1.5 V 干电池',
    kind: 'battery',
    resistance: null,
    voltage: 1.5,
    polarityCorrect: true
  },
  battery9: {
    label: '9.0 V 蓄电池',
    kind: 'battery',
    resistance: null,
    voltage: 9,
    polarityCorrect: true
  }
};

const RANGE_LABELS: Record<MeterRange, string> = {
  ohm1: 'Ω×1',
  ohm10: '×10',
  ohm100: '×100',
  ohm1k: '×1k',
  volt2_5: 'V−2.5',
  volt10: '10'
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<MultimeterParams>,
  previous = DEFAULTS
): MultimeterParams {
  const target =
    input.target && TARGETS[input.target] ? input.target : previous.target;
  const inferredMode =
    target === 'battery15' || target === 'battery9'
      ? 'voltage'
      : target === 'diodeForward' || target === 'diodeReverse'
        ? 'diode'
        : 'resistance';
  const mode =
    input.mode === 'resistance' ||
    input.mode === 'voltage' ||
    input.mode === 'diode'
      ? input.mode
      : inferredMode;
  const range =
    input.range && RANGE_LABELS[input.range] ? input.range : previous.range;
  return {
    mode,
    target,
    range,
    connected:
      typeof input.connected === 'boolean'
        ? input.connected
        : previous.connected,
    zeroAdjust: clamp(
      finite(input.zeroAdjust, previous.zeroAdjust),
      multimeterConstants.zeroMin,
      multimeterConstants.zeroMax
    ),
    autoRun:
      typeof input.autoRun === 'boolean' ? input.autoRun : previous.autoRun
  };
}

function derive(params: MultimeterParams, time: number): MultimeterState {
  const target = TARGETS[params.target];
  const rangeValue = params.range.startsWith('ohm')
    ? multimeterConstants.resistanceRange[
        params.range as keyof typeof multimeterConstants.resistanceRange
      ]
    : multimeterConstants.voltageRange[
        params.range as keyof typeof multimeterConstants.voltageRange
      ];
  let pointerFraction = 0.04;
  let scaleReading: number | null = null;
  let measuredValue: number | null = null;
  let measuredText = '--';
  let bestRange = false;
  let status = '表笔未接触测量点';
  if (params.connected) {
    if (params.mode === 'resistance' && target.kind !== 'battery') {
      const resistance = target.resistance;
      if (resistance === null) {
        pointerFraction = 0.04;
        measuredText = '∞ Ω';
      } else {
        const display = resistance / rangeValue;
        scaleReading = display;
        measuredValue = resistance;
        measuredText = `${display < 100 ? display.toFixed(1) : display.toFixed(0)} × ${rangeValue === 1 ? '1' : rangeValue >= 1000 ? '1k' : rangeValue}`;
        const midResistance = rangeValue * 15;
        pointerFraction =
          resistance === 0
            ? 0.96
            : clamp(1 - resistance / (resistance + midResistance), 0.04, 0.96);
        bestRange = pointerFraction > 0.32 && pointerFraction < 0.7;
      }
      status =
        target.kind === 'diode'
          ? target.polarityCorrect
            ? '二极管正向导通'
            : '二极管反向截止'
          : '欧姆挡：读数 × 倍率';
    } else if (params.mode === 'voltage' && target.kind === 'battery') {
      const voltage = target.voltage ?? 0;
      scaleReading = voltage;
      measuredValue = voltage;
      pointerFraction = clamp(voltage / rangeValue, 0.04, 0.96);
      measuredText = `${voltage.toFixed(1)} V`;
      bestRange = voltage <= rangeValue;
      status = '直流电压挡：并联测量';
    } else if (params.mode === 'diode') {
      scaleReading = target.polarityCorrect ? 0.7 : 0;
      measuredValue = target.polarityCorrect ? 0.7 : null;
      pointerFraction = target.polarityCorrect ? 0.72 : 0.04;
      measuredText = target.polarityCorrect ? '≈0.70 V' : '∞（截止）';
      status = target.polarityCorrect ? '正向导通' : '反向截止';
    }
    pointerFraction = clamp(
      pointerFraction +
        params.zeroAdjust +
        (params.autoRun ? Math.sin(time * 4) * 0.004 : 0),
      0.02,
      0.98
    );
  }
  const pointerAngle = Math.PI + pointerFraction * Math.PI;
  return {
    ...params,
    time,
    targetLabel: target.label,
    rangeLabel: RANGE_LABELS[params.range],
    pointerFraction,
    pointerAngle,
    scaleReading,
    measuredValue,
    measuredText,
    targetResistance: target.resistance,
    sourceVoltage: target.voltage,
    bestRange,
    status,
    targetKind: target.kind,
    polarityCorrect: target.polarityCorrect
  };
}

export function createMultimeterSim(initial: Partial<MultimeterParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState(): MultimeterState {
      return derive(params, time);
    },
    getSnapshot(): MultimeterState {
      return derive(params, time);
    },
    getParams(): MultimeterParams {
      return { ...params };
    },
    setParams(next: Partial<MultimeterParams>): MultimeterParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    autoConnect(): void {
      params = { ...params, connected: true };
    },
    disconnect(): void {
      params = { ...params, connected: false };
    },
    calibrateZero(): void {
      params = { ...params, zeroAdjust: 0 };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += clamp(finite(dt, 0), 0, 0.05);
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}

export { TARGETS, RANGE_LABELS };
