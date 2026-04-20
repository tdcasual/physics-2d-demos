import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../types';
import {
  createChaseMeetSim,
  type ChaseMeetParams,
  type ChaseMeetSnapshot,
  type ChaseMeetState,
  type ResolvedChaseMeetParams
} from './scene.sim';
import { createChaseMeetView } from './scene.view';

const DEFAULT_PARAMS: ChaseMeetParams = {
  totalTime: 10,
  dt: 0.02,
  x0A: 0,
  x0B: 10,
  vExprA: '2',
  vExprB: '0.5'
};

export type CreateChaseMeetSceneOptions = {
  canvas?: HTMLCanvasElement;
  stageSlot?: HTMLElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
  onReadout?: (snapshot: ChaseMeetSnapshot) => void;
};

export function createChaseMeetScene(
  options: CreateChaseMeetSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode): void;
  setTheme(theme: TeachingTheme): void;
  getState(): ChaseMeetState;
  getParams(): ResolvedChaseMeetParams;
  setParams(next: Partial<ChaseMeetParams>): ResolvedChaseMeetParams;
  getSnapshot(): ChaseMeetSnapshot;
} {
  const sim = createChaseMeetSim(DEFAULT_PARAMS);
  const view = createChaseMeetView({
    canvas: options.canvas,
    stageSlot: options.stageSlot,
    mode: options.mode ?? 'normal',
    theme: options.theme ?? 'dark'
  });

  function renderAndEmit(): void {
    const snapshot = sim.getSnapshot();
    view.render(snapshot);
    options.onReadout?.(snapshot);
  }

  return {
    init(): void {
      sim.reset();
      view.reset();
      renderAndEmit();
    },
    reset(): void {
      sim.reset();
      view.reset();
      renderAndEmit();
    },
    step(dt: number): void {
      sim.step(dt);
    },
    render(): void {
      renderAndEmit();
    },
    resize(): void {
      view.resize();
    },
    setMode(mode: TeachingMode): void {
      view.setMode(mode);
    },
    setTheme(theme: TeachingTheme): void {
      view.setTheme(theme);
    },
    getState(): ChaseMeetState {
      return sim.getState();
    },
    getParams(): ResolvedChaseMeetParams {
      return sim.getParams();
    },
    setParams(next: Partial<ChaseMeetParams>): ResolvedChaseMeetParams {
      return sim.setParams(next);
    },
    getSnapshot(): ChaseMeetSnapshot {
      return sim.getSnapshot();
    },
    dispose(): void {
      view.dispose();
    }
  };
}
