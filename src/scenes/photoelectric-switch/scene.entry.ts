import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createPhotoelectricSim,
  type PhotoelectricMaterial,
  type PhotoelectricParams,
  type PhotoelectricState
} from './scene.sim';
import { createPhotoelectricView } from './scene.view';

export type CreatePhotoelectricSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: PhotoelectricState) => void;
};

export function createPhotoelectricScene(
  options: CreatePhotoelectricSceneOptions = {}
) {
  const sim = createPhotoelectricSim();
  const view = createPhotoelectricView({
    canvas: options.canvas,
    theme: options.theme,
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
    getState: (): PhotoelectricState => sim.getState(),
    getSnapshot: (): PhotoelectricState => sim.getSnapshot(),
    getParams: (): PhotoelectricParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<PhotoelectricParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    setTheme(theme: TeachingTheme): void {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    resize(): void {
      view.resize();
    },
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'photonEnergy',
          label: '光子能量 hν',
          value: `${state.photonEnergy.toFixed(2)} eV`
        },
        {
          key: 'maxKineticEnergy',
          label: '最大动能 Eₖ',
          value: `${state.maxKineticEnergy.toFixed(2)} eV`
        },
        {
          key: 'photoCurrent',
          label: '光电流 I',
          value: `${state.photoCurrent.toFixed(2)} mA`
        },
        {
          key: 'relayState',
          label: '路灯',
          value: state.lampOn ? '闭合 · 亮起' : '断开 · 熄灭'
        }
      ];
    }
  } as SceneLifecycle & {
    getState(): PhotoelectricState;
    getSnapshot(): PhotoelectricState;
    getParams(): PhotoelectricParams;
    setParams(next: Partial<PhotoelectricParams>): PhotoelectricParams;
    reset(): void;
    setTheme(theme: TeachingTheme): void;
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
    resize(): void;
    getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  };
}

export function asPhotoelectricMaterial(
  value: unknown
): PhotoelectricMaterial | null {
  if (value === 0 || value === '0') return 'cesium';
  if (value === 1 || value === '1') return 'sodium';
  if (value === 2 || value === '2') return 'zinc';
  return value === 'cesium' || value === 'sodium' || value === 'zinc'
    ? value
    : null;
}

export function photoelectricMaterialIndex(
  material: PhotoelectricMaterial
): number {
  return material === 'cesium' ? 0 : material === 'sodium' ? 1 : 2;
}
