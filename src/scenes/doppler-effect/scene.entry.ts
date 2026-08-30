/**
 * 多普勒效应 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createDopplerSim,
  type DopplerParams,
  type DopplerState
} from './scene.sim';
import { createDopplerView } from './scene.view';

export type CreateDopplerSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: DopplerState) => void;
};

export function createDopplerScene(
  options: CreateDopplerSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): DopplerState;
  setParams(params: Partial<DopplerParams>): DopplerParams;
  enableAudio(): void;
  disableAudio(): void;
  setVolume(v: number): void;
  getReadoutItems(): Array<{ label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createDopplerSim();
  const view = createDopplerView({
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

  // 连接 view 拖拽回调
  view.setOnDrag((entity, x) => {
    if (entity === 'source') sim.setSourceX(x);
    else sim.setObserverX(x);
    base.renderAndEmit();
    base.notify();
  });
  view.setOnPointClick((x) => {
    sim.setObserverX(x);
    base.renderAndEmit();
    base.notify();
  });

  function setParams(params: Partial<DopplerParams>): DopplerParams {
    const result = sim.setParams(params);
    base.renderAndEmit();
    base.notify();
    return result;
  }

  function getReadoutItems(): Array<{ label: string; value: string }> {
    const s = sim.getState();
    return [
      { label: '发射频率', value: `${s.params.emitFrequency.toFixed(1)} Hz` },
      { label: '接收频率', value: `${s.receivedFrequency.toFixed(2)} Hz` },
      {
        label: '频率变化',
        value: `${s.frequencyChangePct >= 0 ? '+' : ''}${s.frequencyChangePct.toFixed(0)}%`
      },
      { label: '标准波长 λ₀', value: `${s.wavelengthStandard.toFixed(2)} m` },
      { label: '前方波长', value: `${s.wavelengthFront.toFixed(2)} m` },
      { label: '后方波长', value: `${s.wavelengthBack.toFixed(2)} m` },
      { label: '马赫数', value: `${s.machNumber.toFixed(2)}` }
    ];
  }

  function enableAudio(): void {
    sim.enableAudio();
    base.renderAndEmit();
    base.notify();
  }

  function disableAudio(): void {
    sim.disableAudio();
    base.renderAndEmit();
    base.notify();
  }

  function setVolume(v: number): void {
    sim.setVolume(v);
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParams,
    enableAudio,
    disableAudio,
    setVolume,
    getReadoutItems
  };
}
