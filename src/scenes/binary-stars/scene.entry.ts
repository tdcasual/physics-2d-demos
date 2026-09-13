import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createBinaryStarsSim,
  type BinaryStarsParams,
  type BinaryStarsState
} from './scene.sim';
import { createBinaryStarsView } from './scene.view';

export type CreateBinaryStarsSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: BinaryStarsState) => void;
};

export function createBinaryStarsScene(
  options: CreateBinaryStarsSceneOptions = {}
) {
  const sim = createBinaryStarsSim();
  const view = createBinaryStarsView({
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
      { key: 'm1', label: 'm₁', value: `${state.params.m1.toFixed(1)} M` },
      { key: 'm2', label: 'm₂', value: `${state.params.m2.toFixed(1)} M` },
      { key: 'r1', label: 'r₁', value: `${state.r1.toFixed(1)} R` },
      { key: 'r2', label: 'r₂', value: `${state.r2.toFixed(1)} R` },
      { key: 'omega', label: 'ω', value: `${state.omega.toFixed(3)} rad·s⁻¹` }
    ];
  }

  return {
    ...base,
    getState: (): BinaryStarsState => sim.getState(),
    getSnapshot: (): BinaryStarsState => sim.getSnapshot(),
    getParams: (): BinaryStarsParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<BinaryStarsParams>): BinaryStarsParams =>
        sim.setParams(next)
    ),
    getReadoutItems
  };
}
