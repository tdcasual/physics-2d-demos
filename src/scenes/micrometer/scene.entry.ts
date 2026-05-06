/**
 * 螺旋测微仪 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createMicrometerSim, type MicrometerParams, type MicrometerState } from './scene.sim';
import { createMicrometerView } from './scene.view';

export type CreateMicrometerSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  onReadout?: (state: MicrometerState) => void;
};

export function createMicrometerScene(
  options: CreateMicrometerSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): MicrometerState;
  setParams(params: Partial<MicrometerParams>): MicrometerParams;
  getReadoutItems(): Array<{ label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createMicrometerSim({
    reading: 4.593
  });

  const view = createMicrometerView({
    canvas: options.canvas,
    theme: options.theme ?? 'dark'
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
      { label: '测量读数', value: `${s.reading.toFixed(3)} mm` },
      { label: '固定刻度', value: `${s.mainScaleReading.toFixed(1)} mm` },
      { label: '微分筒读数', value: `${s.drumReading.toFixed(1)} 格` },
      { label: '半毫米线', value: s.hasHalfMm ? '已露出' : '未露出' }
    ];
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParams(params: Partial<MicrometerParams>): MicrometerParams {
      const result = sim.setParams(params);
      base.renderAndEmit();
      base.notify();
      return result;
    },
    getReadoutItems
  };
}
