/**
 * 双缝干涉公式推导 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createInterferenceFormulaSim,
  type InterferenceFormulaParams,
  type InterferenceFormulaState
} from './scene.sim';
import { createInterferenceFormulaView } from './scene.view';

export type CreateInterferenceFormulaSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: InterferenceFormulaState) => void;
};

export function createInterferenceFormulaScene(
  options: CreateInterferenceFormulaSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): InterferenceFormulaState;
  setParams(
    params: Partial<InterferenceFormulaParams>
  ): InterferenceFormulaParams;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createInterferenceFormulaSim({
    lambda: 650,
    L: 1.0,
    d: 0.5,
    step: 'geometry'
  });

  const view = createInterferenceFormulaView({
    canvas: options.canvas,
    theme: options.theme ?? 'dark',
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
    const s = sim.getState();
    const { lambda, L, d } = s.params;
    const x = s.deltaX;
    const thetaRad = Math.atan(x / L);
    const sinTheta = Math.sin(thetaRad);
    const tanTheta = x / L;
    const relErr = Math.abs((sinTheta - tanTheta) / sinTheta);

    return [
      { key: 'lambda', label: '波长 λ', value: `${lambda} nm` },
      { key: 'L', label: '缝屏距 L', value: `${L.toFixed(1)} m` },
      { key: 'd', label: '缝间距 d', value: `${d.toFixed(1)} mm` },
      {
        key: 'delta-x',
        label: '条纹间距 Δx',
        value: `${(x * 1e3).toFixed(2)} mm`
      },
      {
        key: 'theta',
        label: 'θ',
        value: `${((thetaRad * 180) / Math.PI).toFixed(4)}°`
      },
      { key: 'sin-theta', label: 'sinθ', value: sinTheta.toExponential(4) },
      {
        key: 'tan-theta',
        label: 'tanθ = x/L',
        value: tanTheta.toExponential(4)
      },
      { key: 'rel-err', label: '相对误差', value: relErr.toExponential(2) }
    ];
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParams(
      params: Partial<InterferenceFormulaParams>
    ): InterferenceFormulaParams {
      const result = sim.setParams(params);
      base.renderAndEmit();
      base.notify();
      return result;
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
    },
    getReadoutItems
  };
}
