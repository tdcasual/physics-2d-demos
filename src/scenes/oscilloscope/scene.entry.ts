import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createOscilloscopeSim,
  type OscilloscopeParams,
  type OscilloscopeState
} from './scene.sim';
import { createOscilloscopeView } from './scene.view';

export type CreateOscilloscopeSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: OscilloscopeState) => void;
};

export function createOscilloscopeScene(
  options: CreateOscilloscopeSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): OscilloscopeState;
  getSnapshot(): OscilloscopeState;
  getParams(): OscilloscopeParams;
  setParams(params: Partial<OscilloscopeParams>): OscilloscopeParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createOscilloscopeSim();
  const view = createOscilloscopeView({
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
  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    return [
      {
        key: 'cycles-per-scan',
        label: '每次扫描波数',
        value: state.cyclesPerScan.toFixed(2)
      },
      {
        key: 'stable',
        label: '波形状态',
        value: state.stable ? '稳定' : '移动'
      },
      { key: 'screen-y', label: '屏幕偏转', value: state.screenY.toFixed(2) }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<OscilloscopeParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}
