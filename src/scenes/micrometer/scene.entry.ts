/**
 * 螺旋测微仪 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createMicrometerSim,
  type MicrometerParams,
  type MicrometerState
} from './scene.sim';
import { createMicrometerView } from './scene.view';
import { micrometerMeta } from './scene.meta';

export type CreateMicrometerSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
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
  getParams(): MicrometerParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  setRevealAnswer(value: boolean): void;
  subscribe(listener: () => void): () => void;
} {
  const sim = createMicrometerSim({
    reading: micrometerMeta.defaultParams.reading
  });

  const view = createMicrometerView({
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
    if (!revealed) {
      return [{ key: 'status', label: '读数', value: '点击「揭示」后显示' }];
    }
    const s = sim.getState();
    return [
      {
        key: 'reading',
        label: '测量读数',
        value: `${s.reading.toFixed(3)} mm`
      },
      {
        key: 'main',
        label: '固定刻度',
        value: `${s.mainScaleReading.toFixed(1)} mm`
      },
      {
        key: 'drum',
        label: '微分筒读数',
        value: `${s.drumReading.toFixed(1)} 格`
      },
      {
        key: 'half-mm',
        label: '半毫米线',
        value: s.hasHalfMm ? '已露出' : '未露出'
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
    setParams(params: Partial<MicrometerParams>): MicrometerParams {
      const result = sim.setParams(params);
      base.renderAndEmit();
      base.notify();
      return result;
    },
    getParams(): MicrometerParams {
      return { ...sim.getState().params };
    },
    getReadoutItems,
    setRevealAnswer(value: boolean): void {
      revealed = value;
      view.setRevealAnswer(value);
      base.notify();
    }
  };
}
