import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  calculateMicroDeformation,
  createMicroDeformationSim,
  type DeformationMode,
  type MicroDeformationParams,
  type MicroDeformationState,
  type MicroMaterial
} from './scene.sim';
import { createMicroDeformationView } from './scene.view';

export type CreateMicroDeformationSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MicroDeformationState) => void;
};

export function asMicroMaterial(value: unknown): MicroMaterial | undefined {
  if (value === 'wood' || value === 0 || value === '0') return 'wood';
  if (value === 'marble' || value === 1 || value === '1') return 'marble';
  if (value === 'steel' || value === 2 || value === '2') return 'steel';
  return undefined;
}

export function asDeformationMode(value: unknown): DeformationMode | undefined {
  if (value === 'physical' || value === 0 || value === '0') return 'physical';
  if (value === 'concept' || value === 1 || value === '1') return 'concept';
  return undefined;
}

export function createMicroDeformationScene(
  options: CreateMicroDeformationSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): MicroDeformationState;
  getSnapshot(): MicroDeformationState;
  getParams(): MicroDeformationParams;
  setParams(next: Partial<MicroDeformationParams>): MicroDeformationParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createMicroDeformationSim();
  const view = createMicroDeformationView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  return {
    ...base,
    resize(): void {
      view.resize();
      base.renderAndEmit();
    },
    setTheme(theme: TeachingTheme): void {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<MicroDeformationParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const state = sim.getState();
      return [
        {
          key: 'force',
          label: '压力 F',
          value: `${state.forceN.toFixed(0)} N`
        },
        {
          key: 'deflection',
          label: '下凹 Δy',
          value: `${state.deflectionMicron.toFixed(2)} μm`
        },
        {
          key: 'screenShift',
          label: '光斑偏移 ΔY',
          value: `${state.screenShiftMm.toFixed(2)} mm`
        },
        {
          key: 'magnification',
          label: '放大倍数 M',
          value: `${state.magnification.toFixed(0)} 倍`
        }
      ];
    }
  };
}

export { calculateMicroDeformation };
