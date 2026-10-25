import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createSpringBallView } from './scene.view';
import {
  asBool,
  asMode,
  asPreset,
  createSpringBallSim,
  type SpringBallParams,
  type SpringBallState
} from './scene.sim';
import type { ReadoutItem } from '../../platform/readout';

export type CreateSpringBallSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: SpringBallState) => void;
  initialParams?: Partial<SpringBallParams>;
};

export function createSpringBallScene(
  options: CreateSpringBallSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): SpringBallState;
  getSnapshot(): SpringBallState;
  getParams(): SpringBallParams;
  setParams(params: Partial<SpringBallParams>): SpringBallParams;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getReadoutItems(): ReadoutItem[];
  subscribe(listener: () => void): () => void;
} {
  const sim = createSpringBallSim(options.initialParams);
  const view = createSpringBallView({
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
    onReadout: options.onReadout,
    resetView: () => view.reset()
  });
  function getReadoutItems(): ReadoutItem[] {
    const state = sim.getState();
    const stageLabel = {
      'free-fall': '自由落体',
      contact: '接触压缩',
      bottom: '最低点'
    }[state.stage];
    return [
      { key: 'stage', label: '阶段', value: stageLabel },
      {
        key: 'position',
        label: '位移 x',
        value: state.x,
        digits: 2,
        unit: 'm'
      },
      {
        key: 'velocity',
        label: '速度 v',
        value: state.velocity,
        digits: 2,
        unit: 'm/s'
      },
      {
        key: 'acceleration',
        label: '加速度 a',
        value: state.acceleration,
        digits: 2,
        unit: 'm/s²'
      },
      {
        key: 'spring-force',
        label: '弹簧力 Fₛ',
        value: state.springForce,
        digits: 2,
        unit: 'N'
      },
      {
        key: 'net-force',
        label: '合力 F合',
        value: state.netForce,
        digits: 2,
        unit: 'N'
      },
      { key: 'direction', label: '约定', value: '向下为正' },
      {
        key: 'bottom',
        label: '最低点 x底',
        value: state.bottomX,
        digits: 2,
        unit: 'm'
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<SpringBallParams>) =>
      sim.setParams(next)
    ),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    getReadoutItems
  };
}

export { asBool, asMode, asPreset };
