/**
 * 薄膜干涉 — 场景入口（竖直肥皂膜模型）
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createThinFilmSim,
  type ThinFilmParams,
  type ThinFilmState
} from './scene.sim';
import { createThinFilmView } from './scene.view';

export type CreateThinFilmSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
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
  setCursorY(y: number): void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getReadoutItems(): Array<{ label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createThinFilmSim({
    lambda: 550,
    dTop: 100,
    dBottom: 800,
    n: 1.33,
    whiteLight: false,
    step: 'geometry'
  });

  const view = createThinFilmView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
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

  function getReadoutItems(): Array<{ label: string; value: string }> {
    const s = sim.getState();
    const { lambda, dTop, dBottom, n, whiteLight } = s.params;
    return [
      { label: '波长', value: whiteLight ? '白光' : `${lambda} nm` },
      { label: '顶部厚度', value: `${dTop} nm` },
      { label: '底部厚度', value: `${dBottom} nm` },
      { label: '折射率 n', value: n.toFixed(2) },
      { label: '观察点厚度 d', value: `${s.localThickness.toFixed(0)} nm` },
      { label: '光程差 Δ', value: `${(s.pathDiff / 1e3).toFixed(2)} μm` },
      { label: '级次 m', value: s.order.toFixed(1) },
      {
        label: '干涉结果',
        value: s.isConstructive ? '相长（增强）' : '相消（减弱）'
      },
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
      base.renderAndEmit();
      base.notify();
      return result;
    },
    setCursorY(y: number): void {
      sim.setCursorY(y);
      base.renderAndEmit();
      base.notify();
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
    },
    getReadoutItems
  };
}
