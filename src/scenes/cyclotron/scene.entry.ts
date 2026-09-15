import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createCyclotronSim,
  PARTICLES,
  type CyclotronParams,
  type CyclotronParticle,
  type CyclotronState
} from './scene.sim';
import { createCyclotronView } from './scene.view';

export type CreateCyclotronSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: CyclotronState) => void;
};

export function createCyclotronScene(
  options: CreateCyclotronSceneOptions = {}
) {
  const sim = createCyclotronSim();
  const view = createCyclotronView({
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
        key: 'particle',
        label: '粒子',
        value: PARTICLES[state.params.particle].label
      },
      { key: 'crossings', label: 'n', value: `${state.crossings}` },
      { key: 'energy', label: 'Eₖ', value: `${state.energy.toFixed(0)} MeV` },
      {
        key: 'maxEnergy',
        label: 'Eₖₘ',
        value: `${state.maxEnergy.toFixed(0)} MeV`
      },
      { key: 'radius', label: 'R', value: `${state.radius.toFixed(0)} px` },
      { key: 'period', label: 'T/T₀', value: state.periodRatio.toFixed(2) },
      { key: 'status', label: '状态', value: state.status }
    ];
  }

  return {
    ...base,
    getState: (): CyclotronState => sim.getState(),
    getSnapshot: (): CyclotronState => sim.getSnapshot(),
    getParams: (): CyclotronParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<CyclotronParams>): CyclotronParams => sim.setParams(next)
    ),
    setParticle: base.wrapAction(
      (particle: CyclotronParticle): CyclotronParams =>
        sim.setParticle(particle)
    ),
    getReadoutItems
  };
}
