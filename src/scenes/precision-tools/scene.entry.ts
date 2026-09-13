import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createPrecisionToolView } from './scene.view';
import {
  createPrecisionToolSim,
  type PrecisionToolMode,
  type PrecisionToolParams,
  type PrecisionToolState
} from './scene.sim';

export type CreatePrecisionToolSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: PrecisionToolState) => void;
};

export function asPrecisionMode(value: unknown): PrecisionToolMode | undefined {
  if (
    value === 'caliper10' ||
    value === 'caliper20' ||
    value === 'caliper50' ||
    value === 'micrometer'
  )
    return value;
  if (typeof value === 'number')
    return (['caliper10', 'caliper20', 'caliper50', 'micrometer'][value] ??
      undefined) as PrecisionToolMode | undefined;
  return undefined;
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
  const sim = createPrecisionToolSim();
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
        key: 'mode',
        label: '仪器',
        value: state.params.mode === 'micrometer' ? '螺旋测微器' : '游标卡尺'
      },
      {
        key: 'main',
        label: '主尺读数',
        value: `${state.mainScaleReading.toFixed(2)} mm`
      },
      { key: 'fine', label: '精细读数', value: `${state.fineReading} 格` },
      {
        key: 'total',
        label: '最终读数',
        value: `${state.totalReading.toFixed(2)} mm`
      }
    ];
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
