import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createBlockBoardSim,
  type BlockBoardParams,
  type BlockBoardState
} from './scene.sim';
import { createBlockBoardView } from './scene.view';

export type CreateBlockBoardSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: BlockBoardState) => void;
};

export function createBlockBoardScene(
  options: CreateBlockBoardSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): BlockBoardState;
  getSnapshot(): BlockBoardState;
  getParams(): BlockBoardParams;
  setParams(params: Partial<BlockBoardParams>): BlockBoardParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createBlockBoardSim();
  const view = createBlockBoardView({
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
        key: 'block-velocity',
        label: '木块速度 v₁',
        value: `${state.blockVelocity.toFixed(2)} m/s`
      },
      {
        key: 'board-velocity',
        label: '木板速度 v₂',
        value: `${state.boardVelocity.toFixed(2)} m/s`
      },
      {
        key: 'relative-displacement',
        label: '相对位移 Δx',
        value: `${state.relativeDisplacement.toFixed(2)} m`
      },
      {
        key: 'sync-time',
        label: '共速时刻 t₀',
        value: `${state.syncTime.toFixed(2)} s`
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<BlockBoardParams>) =>
      sim.setParams(next)
    ),
    getReadoutItems
  };
}
