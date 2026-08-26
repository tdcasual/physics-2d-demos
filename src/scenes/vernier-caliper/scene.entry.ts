/**
 * 游标卡尺 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createVernierCaliperSim,
  type CaliperParams,
  type CaliperState
} from './scene.sim';
import { createVernierCaliperView } from './scene.view';

export type CreateCaliperSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: CaliperState) => void;
};

export function createVernierCaliperScene(
  options: CreateCaliperSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): CaliperState;
  setParams(params: Partial<CaliperParams>): CaliperParams;
  getReadoutItems(): Array<{ label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createVernierCaliperSim({
    precision: 0.02,
    objectType: 0
  });

  const view = createVernierCaliperView({
    canvas: options.canvas,
    theme: options.theme ?? 'dark',
    mode: options.mode,
    demoHints: options.demoHints
  });

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });

  function getReadoutItems(): Array<{ label: string; value: string }> {
    const s = sim.getState();
    return [
      { label: '测量对象', value: s.objectName },
      { label: '真实尺寸', value: `${s.objectSize.toFixed(2)} mm` },
      { label: '精度', value: `${s.params.precision} mm` },
      { label: '主尺读数', value: `${s.mainScaleReading} mm` },
      { label: '游标对齐', value: `${s.vernierAlignment} 格` },
      { label: '测量读数', value: `${s.totalReading.toFixed(2)} mm` }
    ];
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParams(params: Partial<CaliperParams>): CaliperParams {
      const result = sim.setParams(params);
      base.renderAndEmit();
      base.notify();
      return result;
    },
    getReadoutItems
  };
}
