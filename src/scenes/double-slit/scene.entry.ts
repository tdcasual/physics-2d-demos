/**
 * 双缝干涉 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createDoubleSlitSim, type DoubleSlitParams, type DoubleSlitState } from './scene.sim';
import { createDoubleSlitView, wavelengthToColor } from './scene.view';

export type CreateDoubleSlitSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  onReadout?: (state: DoubleSlitState) => void;
};

export function createDoubleSlitScene(
  options: CreateDoubleSlitSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): DoubleSlitState;
  setParams(params: Partial<DoubleSlitParams>): DoubleSlitParams;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getReadoutItems(): Array<{ label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createDoubleSlitSim({
    lambda: 650,
    L: 1.0,
    d: 0.5,
    step: 'geometry'
  });

  const view = createDoubleSlitView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
    theme: options.theme ?? 'dark'
  });

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });

  function getReadoutItems(): Array<{ label: string; value: string }> {
    const s = sim.getState();
    const { lambda, L, d } = s.params;
    const x = s.deltaX;
    const thetaRad = Math.atan(x / L);
    const sinTheta = Math.sin(thetaRad);
    const tanTheta = x / L;
    const relErr = Math.abs((sinTheta - tanTheta) / sinTheta);

    return [
      { label: '波长 λ', value: `${lambda} nm` },
      { label: '缝屏距 L', value: `${L.toFixed(1)} m` },
      { label: '缝间距 d', value: `${d.toFixed(1)} mm` },
      { label: '条纹间距 Δx', value: `${(x * 1e3).toFixed(2)} mm` },
      { label: 'θ', value: `${(thetaRad * 180 / Math.PI).toFixed(4)}°` },
      { label: 'sinθ', value: sinTheta.toExponential(4) },
      { label: 'tanθ = x/L', value: tanTheta.toExponential(4) },
      { label: '相对误差', value: relErr.toExponential(2) }
    ];
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParams(params: Partial<DoubleSlitParams>): DoubleSlitParams {
      const result = sim.setParams(params);
      base.notify();
      return result;
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
    },
    getReadoutItems
  };
}
