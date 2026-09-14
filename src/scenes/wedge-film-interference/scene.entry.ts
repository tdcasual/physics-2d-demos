import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createWedgeFilmInterferenceSim,
  type WedgeParams,
  type WedgeProfile,
  type WedgeState
} from './scene.sim';
import { createWedgeFilmInterferenceView } from './scene.view';

export type CreateWedgeSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: WedgeState) => void;
};
export function createWedgeFilmInterferenceScene(
  options: CreateWedgeSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): WedgeState;
  getSnapshot(): WedgeState;
  getParams(): WedgeParams;
  setParams(next: Partial<WedgeParams>): WedgeParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createWedgeFilmInterferenceSim();
  const view = createWedgeFilmInterferenceView({
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
    setParams: base.wrapAction((next: Partial<WedgeParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const s = sim.getState();
      return [
        { key: 'lambda', label: '波长', value: `${s.lambda} nm` },
        {
          key: 'd-local',
          label: '局部厚度',
          value: `${s.localThickness.toFixed(0)} nm`
        },
        { key: 'order', label: '干涉级次', value: s.order.toFixed(2) }
      ];
    }
  };
}
export function asWedgeProfile(value: unknown): WedgeProfile | undefined {
  return value === 'linear' || value === 0 || value === '0'
    ? 'linear'
    : value === 'quad' || value === 1 || value === '1'
      ? 'quad'
      : undefined;
}
