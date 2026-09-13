import { clamp } from '../../core/math';

export type OscilloscopeParams = {
  signalAmplitude: number;
  signalFrequency: number;
  scanEnabled: boolean;
  scanAmplitude: number;
  scanFrequency: number;
  autoRun: boolean;
};

export type OscilloscopeState = {
  params: OscilloscopeParams;
  time: number;
  phase: number;
  electronX: number;
  electronY: number;
  screenX: number;
  screenY: number;
  cyclesPerScan: number;
  stable: boolean;
};

export const oscilloscopeConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 850,
  panelWidth: 350,
  panelInset: 22,
  tubeLeft: 44,
  tubeRight: 804,
  tubeCenterY: 176,
  tubeHeight: 158,
  screenX: 764,
  screenRadius: 92,
  scopeCenterX: 232,
  scopeCenterY: 590,
  scopeRadius: 116,
  plateX: 246,
  plateYTop: 58,
  plateWidth: 66,
  xPlateX: 356,
  xPlateY: 50,
  xPlateHeight: 100,
  waveLeft: 492,
  waveRight: 808,
  signalWaveY: 442,
  scanWaveY: 588,
  waveHeight: 56,
  scanPeriod: 1,
  visualTimeScale: 0.35,
  gridStep: 24,
  stableCardY: 360,
  stableCardHeight: 82,
  formulaCardY: 480,
  formulaCardHeight: 128,
  sampleDt: 0.016
} as const;

const DEFAULT_PARAMS: OscilloscopeParams = {
  signalAmplitude: 35,
  signalFrequency: 210,
  scanEnabled: true,
  scanAmplitude: 40,
  scanFrequency: 70,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<OscilloscopeParams>,
  previous = DEFAULT_PARAMS
): OscilloscopeParams {
  return {
    signalAmplitude: clamp(
      finite(input.signalAmplitude, previous.signalAmplitude),
      5,
      80
    ),
    signalFrequency: clamp(
      finite(input.signalFrequency, previous.signalFrequency),
      20,
      400
    ),
    scanEnabled: input.scanEnabled ?? previous.scanEnabled,
    scanAmplitude: clamp(
      finite(input.scanAmplitude, previous.scanAmplitude),
      5,
      80
    ),
    scanFrequency: clamp(
      finite(input.scanFrequency, previous.scanFrequency),
      10,
      200
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

function phaseAt(params: OscilloscopeParams, time: number): number {
  return (
    2 *
    Math.PI *
    params.signalFrequency *
    time *
    oscilloscopeConstants.visualTimeScale
  );
}

function scanPhaseAt(params: OscilloscopeParams, time: number): number {
  return (
    2 *
    Math.PI *
    params.scanFrequency *
    time *
    oscilloscopeConstants.visualTimeScale
  );
}

export function stableRatio(
  signalFrequency: number,
  scanFrequency: number
): number {
  return scanFrequency > 0 ? signalFrequency / scanFrequency : 0;
}

export function createOscilloscopeSim(
  initial: Partial<OscilloscopeParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): OscilloscopeState {
    const signalPhase = phaseAt(params, time);
    const scanPhase = scanPhaseAt(params, time);
    const ratio = stableRatio(params.signalFrequency, params.scanFrequency);
    const cyclesPerScan = Math.max(0, ratio);
    const sweep = params.scanEnabled
      ? (((scanPhase / (2 * Math.PI)) % 1) + 1) % 1
      : 0.5;
    return {
      params: { ...params },
      time,
      phase: signalPhase,
      electronX: params.scanEnabled ? sweep : 0.5,
      electronY: (Math.sin(signalPhase) * params.signalAmplitude) / 80,
      screenX: ((sweep - 0.5) * params.scanAmplitude) / 80,
      screenY: (Math.sin(signalPhase) * params.signalAmplitude) / 80,
      cyclesPerScan,
      stable: Math.abs(cyclesPerScan - Math.round(cyclesPerScan)) < 0.035
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): OscilloscopeParams => ({ ...params }),
    setParams(next: Partial<OscilloscopeParams>): OscilloscopeParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
