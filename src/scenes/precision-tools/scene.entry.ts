import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createPrecisionToolView } from './scene.view';
import {
  asPrecisionMode,
  createPrecisionToolSim,
  type PrecisionToolMode,
  type PrecisionToolParams,
  type PrecisionToolState
} from './scene.sim';

export { asPrecisionMode };

export type CreatePrecisionToolSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: PrecisionToolState) => void;
  initialParams?: Partial<PrecisionToolParams>;
};

function modeLabel(mode: PrecisionToolMode): string {
  if (mode === 'caliper10') return '游标卡尺 10 分度';
  if (mode === 'caliper20') return '游标卡尺 20 分度';
  if (mode === 'caliper50') return '游标卡尺 50 分度';
  return '螺旋测微器';
}

export function createPrecisionToolScene(
  options: CreatePrecisionToolSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): PrecisionToolState;
  getSnapshot(): PrecisionToolState;
  getParams(): PrecisionToolParams;
  setParams(params: Partial<PrecisionToolParams>): PrecisionToolParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createPrecisionToolSim(options.initialParams);
  const view = createPrecisionToolView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout,
    resetView: () => view.reset()
  });
  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    const items = [
      { key: 'mode', label: '模式', value: modeLabel(state.params.mode) },
      {
        key: 'main',
        label: '主尺',
        value: `${state.mainScaleReading.toFixed(2)} mm`
      },
      {
        key: 'fine',
        label: state.params.mode === 'micrometer' ? '微分筒格' : '对齐格',
        value: `${state.fineReading}`
      },
      {
        key: 'total',
        label: '最终读数',
        value: `${state.totalReading.toFixed(2)} mm`
      }
    ];
    if (state.params.showReading) {
      items.push({
        key: 'parse',
        label: '解析',
        value:
          state.params.mode === 'micrometer'
            ? `${state.mainScaleReading.toFixed(2)} + ${state.fineReading}×0.01`
            : `${state.mainScaleReading} + ${state.alignmentIndex}×${state.precision}`
      });
    }
    return items;
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<PrecisionToolParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}
