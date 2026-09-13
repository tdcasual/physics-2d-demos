import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createMolecularSim,
  molecularConstants,
  type MolecularParams,
  type MolecularState
} from './scene.sim';
import { createMolecularView } from './scene.view';

export type CreateMolecularSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MolecularState) => void;
};

export function createMolecularScene(
  options: CreateMolecularSceneOptions = {}
): SceneLifecycle & {
  getState(): MolecularState;
  getSnapshot(): MolecularState;
  getParams(): MolecularParams;
  setParams(next: Partial<MolecularParams>): MolecularParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createMolecularSim();
  const view = createMolecularView({
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
  const canvas = options.canvas;
  const onPointerDown = (event: PointerEvent) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x =
      ((event.clientX - rect.left) * molecularConstants.baseWidth) / rect.width;
    if (x < molecularConstants.graphLeft || x > molecularConstants.graphRight)
      return;
    const ratio =
      molecularConstants.xMin +
      ((x - molecularConstants.graphLeft) /
        (molecularConstants.graphRight - molecularConstants.graphLeft)) *
        (molecularConstants.xMax - molecularConstants.xMin);
    sim.setParams({ distanceRatio: ratio });
    base.renderAndEmit();
  };
  canvas?.addEventListener('pointerdown', onPointerDown);
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<MolecularParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    resize() {
      view.resize();
    },
    getReadoutItems() {
      const s = sim.getState();
      return [
        {
          key: 'distance',
          label: '分子间距 r',
          value: s.distanceRatio.toFixed(2) + ' r₀'
        },
        {
          key: 'netForce',
          label: '合力 F（相对）',
          value: (s.netForce >= 0 ? '+' : '') + s.netForce.toFixed(2)
        },
        {
          key: 'potentialEnergy',
          label: '分子势能 Eₚ',
          value: s.potentialEnergy.toFixed(2) + ' ε'
        },
        { key: 'status', label: '当前状态', value: s.status }
      ];
    },
    dispose() {
      canvas?.removeEventListener('pointerdown', onPointerDown);
      base.dispose();
    }
  };
}
