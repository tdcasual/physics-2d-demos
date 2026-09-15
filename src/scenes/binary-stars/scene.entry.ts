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

function formatRatio(r1: number, r2: number): string {
  const min = Math.min(r1, r2);
  if (min <= 1e-9) return '—';
  const a = r1 / min;
  const b = r2 / min;
  const round = (value: number): string =>
    Math.abs(value - Math.round(value)) < 0.05
      ? `${Math.round(value)}`
      : value.toFixed(1);
  return `${round(a)} : ${round(b)}`;
}

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
    layout?: 'half' | 'full';
  }> {
    const state = sim.getState();
    const product = state.params.m1 * state.r1;
    return [
      {
        key: 'r1',
        label: 'r₁',
        value: `${state.r1.toFixed(1)} R`,
        layout: 'half'
      },
      {
        key: 'r2',
        label: 'r₂',
        value: `${state.r2.toFixed(1)} R`,
        layout: 'half'
      },
      {
        key: 'ratio',
        label: 'r₁ : r₂',
        value: formatRatio(state.r1, state.r2)
      },
      {
        key: 'product',
        label: 'm₁r₁ = m₂r₂',
        value: product.toFixed(1)
      },
      {
        key: 'force',
        label: 'F',
        value: `${state.force.toFixed(4)} F₀`
      },
      {
        key: 'omega',
        label: 'ω',
        value: `${state.omega.toFixed(3)} rad·s⁻¹`
      }
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
