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
  getParams(): ThinFilmParams;
  setCursorY(y: number): void;
  pickCursor(cssX: number, cssY: number): number | null;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createThinFilmSim({
    lambda: 550,
    dTop: 100,
    dBottom: 800,
    n: 1.33,
    whiteLight: false,
    step: 'geometry',
    profile: 'linear'
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

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const s = sim.getState();
    const { lambda, dTop, dBottom, n, whiteLight, profile } = s.params;
    return [
      {
        key: 'profile',
        label: '厚度分布',
        value: profile === 'quad' ? '非均匀（下密）' : '均匀（等间距）'
      },
      {
        key: 'lambda',
        label: '波长',
        value: whiteLight ? '白光' : `${lambda} nm`
      },
      { key: 'd-top', label: '顶部厚度', value: `${dTop} nm` },
      { key: 'd-bottom', label: '底部厚度', value: `${dBottom} nm` },
      { key: 'n', label: '折射率 n', value: n.toFixed(2) },
      {
        key: 'd-local',
        label: '观察点厚度 d',
        value: `${s.localThickness.toFixed(0)} nm`
      },
      {
        key: 'path-diff',
        label: '光程差 Δ',
        value: `${(s.pathDiff / 1e3).toFixed(2)} μm`
      },
      { key: 'order', label: '级次 m', value: s.order.toFixed(1) },
      {
        key: 'result',
        label: '干涉结果',
        value: s.isConstructive ? '相长（增强）' : '相消（减弱）'
      },
      {
        key: 'R',
        label: '反射率 R',
        value: `${(s.reflectivity * 100).toFixed(1)}%`
      }
    ];
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParams: base.wrapAction(
      (params: Partial<ThinFilmParams>): ThinFilmParams => sim.setParams(params)
    ),
    getParams(): ThinFilmParams {
      return { ...sim.getState().params };
    },
    setCursorY: base.wrapAction((y: number): void => {
      sim.setCursorY(y);
    }),
    pickCursor(cssX: number, cssY: number): number | null {
      return view.pickCursor(cssX, cssY);
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
    },
    getReadoutItems
  };
}
