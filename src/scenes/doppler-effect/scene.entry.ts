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
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
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
  view.setOnDrag(
    base.wrapAction((entity: 'source' | 'observer', x: number): void => {
      if (entity === 'source') sim.setSourceX(x);
      else sim.setObserverX(x);
    })
  );
  view.setOnPointClick(
    base.wrapAction((x: number): void => {
      sim.setObserverX(x);
    })
  );

  const setParams = base.wrapAction(
    (params: Partial<DopplerParams>): DopplerParams => sim.setParams(params)
  );

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const s = sim.getState();
    return [
      {
        key: 'f-emit',
        label: '发射频率',
        value: `${s.params.emitFrequency.toFixed(1)} Hz`
      },
      {
        key: 'f-receive',
        label: '接收频率',
        value: `${s.receivedFrequency.toFixed(2)} Hz`
      },
      {
        key: 'delta-pct',
        label: '频率变化',
        value: `${s.frequencyChangePct >= 0 ? '+' : ''}${s.frequencyChangePct.toFixed(0)}%`
      },
      {
        key: 'lambda-0',
        label: '标准波长 λ₀',
        value: `${s.wavelengthStandard.toFixed(2)} m`
      },
      {
        key: 'lambda-front',
        label: '前方波长',
        value: `${s.wavelengthFront.toFixed(2)} m`
      },
      {
        key: 'lambda-back',
        label: '后方波长',
        value: `${s.wavelengthBack.toFixed(2)} m`
      },
      { key: 'mach', label: '马赫数', value: `${s.machNumber.toFixed(2)}` }
    ];
  }

  const enableAudio = base.wrapAction((): void => {
    sim.enableAudio();
  });

  const disableAudio = base.wrapAction((): void => {
    sim.disableAudio();
  });

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
