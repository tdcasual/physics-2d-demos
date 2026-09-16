import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createBlockBoardSim,
  type BlockBoardParams,
  type BlockBoardState
} from './scene.sim';
import { createBlockBoardView } from './scene.view';

export type CreateBlockBoardSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: BlockBoardState) => void;
  initialParams?: Partial<BlockBoardParams>;
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
  stepFrame(dt?: number): void;
  startAll(): void;
  pauseAll(): void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getTransportState(): { isPlaying: boolean; speed: number };
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createBlockBoardSim(options.initialParams);
  const view = createBlockBoardView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
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
        key: 'common-velocity',
        label: '共速 v_c',
        value: `${state.commonVelocity.toFixed(2)} m/s`
      },
      {
        key: 'relative-displacement',
        label: '相对位移 Δx',
        value: `${state.relativeDisplacement.toFixed(2)} m`
      },
      {
        key: 'sync-time',
        label: '共速时刻 t_c',
        value: `${state.syncTime.toFixed(2)} s`
      },
      { key: 'time', label: '时刻 t', value: `${state.time.toFixed(2)} s` },
      {
        key: 'status',
        label: '状态',
        value: state.sliding ? '滑动' : '共速'
      }
    ];
  }

  return {
    ...base,
    init(): void {
      // Construction already applied initialParams; sim.reset() is transport-only.
      base.renderAndEmit();
    },
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<BlockBoardParams>) =>
      sim.setParams(next)
    ),
    stepFrame: base.wrapAction((dt?: number) => sim.stepFrame(dt)),
    startAll: base.wrapAction(() => {
      sim.setParams({ autoRun: true });
    }),
    pauseAll: base.wrapAction(() => {
      sim.setParams({ autoRun: false });
    }),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      return { isPlaying: sim.getParams().autoRun, speed: 1 };
    },
    getReadoutItems
  };
}
