import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  bulletBlockCommonSpeed,
  createBulletBlockSim,
  type BulletBlockParams,
  type BulletBlockState
} from './scene.sim';
import { createBulletBlockView } from './scene.view';

export type CreateBulletBlockSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: BulletBlockState) => void;
};

export function createBulletBlockScene(
  options: CreateBulletBlockSceneOptions = {}
) {
  const sim = createBulletBlockSim();
  const view = createBulletBlockView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
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
        key: 'momentum',
        label: '动量',
        value: `${state.totalMomentum.toFixed(1)} ≈ ${state.initialMomentum.toFixed(1)} kg·m/s`
      },
      {
        key: 'common-speed',
        label: '理论共速',
        value: `${bulletBlockCommonSpeed(state.params.speed, state.params.bulletMass, state.params.blockMass).toFixed(2)} m/s`
      },
      {
        key: 'max-depth',
        label: '最大深度',
        value: `${state.maxDepth.toFixed(2)} m`
      },
      { key: 'heat', label: '内能 Q', value: `${state.heat.toFixed(1)} J` }
    ];
  }

  return {
    ...base,
    getState: (): BulletBlockState => sim.getState(),
    getSnapshot: (): BulletBlockState => sim.getSnapshot(),
    getParams: (): BulletBlockParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<BulletBlockParams>): BulletBlockParams =>
        sim.setParams(next)
    ),
    getReadoutItems
  };
}
