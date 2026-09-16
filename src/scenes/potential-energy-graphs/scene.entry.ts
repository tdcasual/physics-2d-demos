import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createPotentialGraphView } from './scene.view';
import {
  createPotentialGraphSim,
  parseScenario,
  type PotentialGraphParams,
  type PotentialGraphState,
  type PotentialScenario
} from './scene.sim';

export type CreatePotentialGraphSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: PotentialGraphState) => void;
};

export function asPotentialScenario(
  value: unknown
): PotentialScenario | undefined {
  const parsed = parseScenario(value, 'segments');
  if (
    value === 'point' ||
    value === 'dipole' ||
    value === 'segments' ||
    value === 1 ||
    value === '1' ||
    value === 2 ||
    value === '2' ||
    value === 0 ||
    value === '0'
  ) {
    return parsed;
  }
  return undefined;
}

function formatSigned(value: number, digits: number): string {
  const mag = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${mag}`;
  if (value < 0) return `−${mag}`;
  return mag;
}

function signed(value: number, digits: number, unit: string): string {
  return `${formatSigned(value, digits)} ${unit}`;
}

function along(value: number): string {
  return value >= 0 ? '+x' : '−x';
}

export function createPotentialGraphScene(
  options: CreatePotentialGraphSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): PotentialGraphState;
  getSnapshot(): PotentialGraphState;
  getParams(): PotentialGraphParams;
  setParams(params: Partial<PotentialGraphParams>): PotentialGraphParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  startAll(): void;
  pauseAll(): void;
  getTransportState(): { isPlaying: boolean; speed: number };
} {
  const sim = createPotentialGraphSim();
  let emit = (): void => {};
  const view = createPotentialGraphView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints,
    onProbePosition: (x) => {
      sim.setParams({ probePosition: x, autoRun: false });
      emit();
    }
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  emit = () => {
    base.renderAndEmit();
    base.notify();
  };
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<PotentialGraphParams>) =>
      sim.setParams(next)
    ),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    startAll: base.wrapAction(() => {
      sim.setParams({ autoRun: true });
    }),
    pauseAll: base.wrapAction(() => {
      sim.setParams({ autoRun: false });
    }),
    getTransportState(): { isPlaying: boolean; speed: number } {
      return { isPlaying: sim.getParams().autoRun, speed: 1 };
    },
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const state = sim.getState();
      const slopeValue = state.kink
        ? '未定义'
        : signed(state.slope ?? 0, 2, 'V/m');
      const fieldValue = state.kink
        ? `E₋ ${formatSigned(state.fieldLeft, 2)} / E₊ ${formatSigned(state.fieldRight, 2)} V/m`
        : `${signed(state.field ?? 0, 2, 'V/m')}（${along(state.field ?? 0)}）`;
      const forceValue = state.kink
        ? `F₋ ${formatSigned(state.forceLeft, 2)} / F₊ ${formatSigned(state.forceRight, 2)} μN`
        : `${signed(state.force ?? 0, 2, 'μN')}（${along(state.force ?? 0)}）`;
      return [
        {
          key: 'position',
          label: 'x',
          value: `${state.probePosition.toFixed(2)} m`
        },
        {
          key: 'potential',
          label: 'φ',
          value: `${state.potential.toFixed(2)} V`
        },
        {
          key: 'slope',
          label: 'dφ/dx',
          value: slopeValue
        },
        {
          key: 'field',
          label: 'E',
          value: fieldValue
        },
        {
          key: 'energy',
          label: 'Uₚ',
          value: `${state.potentialEnergy.toFixed(2)} μJ`
        },
        {
          key: 'force',
          label: 'F',
          value: forceValue
        },
        {
          key: 'area',
          label: '∫E dx',
          value: `${signed(state.signedArea, 2, 'V')} = φ₁−φ₂`
        }
      ];
    }
  };
}
