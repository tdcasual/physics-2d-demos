import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createGalileoInclineSim,
  type GalileoInclineParams,
  type GalileoInclineState
} from './scene.sim';
import { createGalileoInclineView } from './scene.view';

export type CreateGalileoInclineSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: GalileoInclineState) => void;
};

export function createGalileoInclineScene(
  options: CreateGalileoInclineSceneOptions = {}
) {
  const sim = createGalileoInclineSim();
  const view = createGalileoInclineView({
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
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<GalileoInclineParams>) =>
      sim.setParams(next)
    ),
    release: base.wrapAction(() => sim.release()),
    reset: base.wrapAction(() => sim.reset()),
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    resize() {
      view.resize();
    },
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'potentialEnergy',
          label: '重力势能 Eₚ',
          value: `${state.potentialEnergy.toFixed(2)} J`
        },
        {
          key: 'kineticEnergy',
          label: '动能 Eₖ',
          value: `${state.kineticEnergy.toFixed(2)} J`
        },
        {
          key: 'height',
          label: '当前位置 h',
          value: `${state.height.toFixed(2)} m`
        },
        {
          key: 'velocity',
          label: '速度 v',
          value: `${state.velocity.toFixed(2)} m/s`
        }
      ];
    }
  } as SceneLifecycle & {
    getState(): GalileoInclineState;
    getSnapshot(): GalileoInclineState;
    getParams(): GalileoInclineParams;
    setParams(next: Partial<GalileoInclineParams>): GalileoInclineParams;
    release(): void;
    reset(): void;
    setTheme(theme: TeachingTheme): void;
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
    resize(): void;
    getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  };
}
