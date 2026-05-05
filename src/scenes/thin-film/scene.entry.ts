/**
 * 薄膜干涉 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createThinFilmSim, type ThinFilmParams, type ThinFilmState } from './scene.sim';
import { createThinFilmView } from './scene.view';

export type CreateThinFilmSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  onReadout?: (state: ThinFilmState) => void;
};

export function createThinFilmScene(
  options: CreateThinFilmSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): ThinFilmState;
  setParams(params: Partial<ThinFilmParams>): ThinFilmParams;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getReadoutItems(): Array<{ label: string; value: string }>;
} {
  const sim = createThinFilmSim({
    lambda: 650,
    d: 500,
    n: 1.5,
    incidence: 30,
    step: 'geometry'
  });

  const view = createThinFilmView({
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
    const { lambda, d, n, incidence } = s.params;
    return [
      { label: '波长 λ', value: `${lambda} nm` },
      { label: '薄膜厚度 d', value: `${d} nm` },
      { label: '折射率 n', value: n.toFixed(2) },
      { label: '入射角 i', value: `${incidence}°` },
      { label: '折射角 r', value: `${s.refraction.toFixed(1)}°` },
      { label: '光程差 Δ', value: `${(s.pathDiff / 1e3).toFixed(2)} μm` },
      { label: '级次 m', value: s.order.toFixed(1) },
      { label: '干涉结果', value: s.isConstructive ? '相长（增强）' : '相消（减弱）' },
      { label: '反射率 R', value: `${(s.reflectivity * 100).toFixed(1)}%` }
    ];
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParams(params: Partial<ThinFilmParams>): ThinFilmParams {
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
