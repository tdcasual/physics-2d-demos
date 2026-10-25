/**
 * 机械波 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createMechanicalWaveSim,
  type MechanicalWaveParams,
  type MechanicalWaveState,
  type ConstraintInfo
} from './scene.sim';
import { createMechanicalWaveView } from './scene.view';
import type { ReadoutItem } from '../../platform/readout';

export type CreateMechanicalWaveSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MechanicalWaveState) => void;
};

export function createMechanicalWaveScene(
  options: CreateMechanicalWaveSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): MechanicalWaveState;
  setParam(key: string, value: number | string): MechanicalWaveParams;
  setPointP(x: number): void;
  getReadoutItems(): ReadoutItem[];
  getConstraintInfo(): ConstraintInfo;
  subscribe(listener: () => void): () => void;
} {
  const sim = createMechanicalWaveSim();
  const view = createMechanicalWaveView({
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

  view.setOnPointSelect(
    base.wrapAction((x: number): void => {
      sim.setPointP(x);
    })
  );

  const setParam = base.wrapAction(
    (key: string, value: number | string): MechanicalWaveParams =>
      sim.setParam(key, value)
  );

  const setPointP = base.wrapAction((x: number): void => {
    sim.setPointP(x);
  });

  const dirLabels: Record<string, string> = {
    up: '↑ 向上',
    down: '↓ 向下',
    zero: '○ 零'
  };

  function getReadoutItems(): ReadoutItem[] {
    const s = sim.getState();
    return [
      {
        key: 'wave-speed',
        label: '波速 v = λ/T',
        value: s.params.waveSpeed,
        digits: 2,
        unit: 'm/s'
      },
      { key: 't', label: '当前时刻 t', value: s.time, digits: 2, unit: 's' },
      {
        key: 'p-y',
        label: 'P 点位移',
        value: s.pointPY,
        digits: 2,
        unit: 'cm'
      },
      {
        key: 'p-v-dir',
        label: 'P 点速度方向',
        value: dirLabels[s.velocityDirection]
      },
      {
        key: 'p-a-dir',
        label: 'P 点加速度方向',
        value: dirLabels[s.accelerationDirection]
      }
    ];
  }

  function getConstraintInfo(): ConstraintInfo {
    return sim.getConstraint();
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParam,
    setPointP,
    getReadoutItems,
    getConstraintInfo
  };
}
