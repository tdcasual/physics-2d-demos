/**
 * 机械波 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createMechanicalWaveSim, type MechanicalWaveParams, type MechanicalWaveState, type ConstraintInfo } from './scene.sim';
import { createMechanicalWaveView } from './scene.view';

export type CreateMechanicalWaveSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
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
  getReadoutItems(): Array<{ label: string; value: string }>;
  getConstraintInfo(): ConstraintInfo;
  subscribe(listener: () => void): () => void;
} {
  const sim = createMechanicalWaveSim();
  const view = createMechanicalWaveView({ canvas: options.canvas, theme: options.theme ?? 'dark' });

  view.setOnPointSelect((x) => {
    sim.setPointP(x);
    base.renderAndEmit();
    base.notify();
  });

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout,
  });

  function setParam(key: string, value: number | string): MechanicalWaveParams {
    const result = sim.setParam(key, value);
    base.renderAndEmit();
    base.notify();
    return result;
  }

  function setPointP(x: number): void {
    sim.setPointP(x);
    base.renderAndEmit();
    base.notify();
  }

  const dirLabels: Record<string, string> = { up: '↑ 向上', down: '↓ 向下', zero: '○ 零' };

  function getReadoutItems(): Array<{ label: string; value: string }> {
    const s = sim.getState();
    return [
      { label: '波速 v = λ/T', value: `${s.params.waveSpeed.toFixed(2)} m/s` },
      { label: '当前时刻 t', value: `${s.time.toFixed(2)} s` },
      { label: 'P 点位移', value: `${s.pointPY.toFixed(2)} cm` },
      { label: 'P 点速度方向', value: dirLabels[s.velocityDirection] },
      { label: 'P 点加速度方向', value: dirLabels[s.accelerationDirection] },
    ];
  }

  function getConstraintInfo(): ConstraintInfo {
    return sim.getConstraint();
  }

  return {
    ...base,
    getState() { return sim.getState(); },
    setParam,
    setPointP,
    getReadoutItems,
    getConstraintInfo,
  };
}
