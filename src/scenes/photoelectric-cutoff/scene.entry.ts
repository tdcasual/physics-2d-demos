import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createPhotoelectricView } from './scene.view';
import {
  calculatePhotoelectric,
  createPhotoelectricSim,
  type PhotoCathode,
  type PhotoelectricParams,
  type PhotoelectricState
} from './scene.sim';

export type CreatePhotoelectricSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: PhotoelectricState) => void;
};
export function asPhotoCathode(value: unknown): PhotoCathode | undefined {
  if (value === 'cesium' || value === 0 || value === '0') return 'cesium';
  if (value === 'sodium' || value === 1 || value === '1') return 'sodium';
  if (value === 'calcium' || value === 2 || value === '2') return 'calcium';
  return undefined;
}
export function createPhotoelectricScene(
  options: CreatePhotoelectricSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): PhotoelectricState;
  getSnapshot(): PhotoelectricState;
  getParams(): PhotoelectricParams;
  setParams(next: Partial<PhotoelectricParams>): PhotoelectricParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createPhotoelectricSim();
  const view = createPhotoelectricView({
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
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<PhotoelectricParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const s = sim.getState();
      return [
        {
          key: 'current',
          label: '光电流',
          value: `${s.current.toFixed(1)} μA`
        },
        {
          key: 'stoppingVoltage',
          label: '遏止电压',
          value: `${s.stoppingVoltage.toFixed(2)} V`
        },
        {
          key: 'maxKineticEnergy',
          label: '初动能',
          value: `${s.maxKineticEnergy.toFixed(2)} eV`
        }
      ];
    }
  };
}
export { calculatePhotoelectric };
