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
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  setRevealAnswer(value: boolean): void;
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

  let revealed =
    (options.mode ?? 'normal') !== 'presentation' ||
    Boolean(options.demoHints?.revealAnswer);

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const s = sim.getState();
    if (!revealed) {
      return [
        { key: 'object', label: '测量对象', value: s.objectName },
        { key: 'precision', label: '精度', value: `${s.params.precision} mm` },
        { key: 'status', label: '读数', value: '点击「揭示」后显示' }
      ];
    }
    return [
      { key: 'object', label: '测量对象', value: s.objectName },
      {
        key: 'size',
        label: '真实尺寸',
        value: `${s.objectSize.toFixed(2)} mm`
      },
      { key: 'precision', label: '精度', value: `${s.params.precision} mm` },
      { key: 'main', label: '主尺读数', value: `${s.mainScaleReading} mm` },
      { key: 'vernier', label: '游标对齐', value: `${s.vernierAlignment} 格` },
      {
        key: 'reading',
        label: '测量读数',
        value: `${s.totalReading.toFixed(2)} mm`
      }
    ];
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      revealed = mode !== 'presentation' || Boolean(hints?.revealAnswer);
      base.setMode(mode, hints);
    },
    setParams(params: Partial<CaliperParams>): CaliperParams {
      const result = sim.setParams(params);
      base.renderAndEmit();
      base.notify();
      return result;
    },
    getReadoutItems,
    setRevealAnswer(value: boolean): void {
      revealed = value;
      view.setRevealAnswer(value);
      base.notify();
    }
  };
}
