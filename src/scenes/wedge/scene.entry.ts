/**
 * 劈尖干涉 — 场景入口
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createWedgeSim, type WedgeParams, type WedgeState } from './scene.sim';
import { createWedgeView } from './scene.view';

export type CreateWedgeSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: WedgeState) => void;
};

export function createWedgeScene(
  options: CreateWedgeSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): WedgeState;
  setParams(params: Partial<WedgeParams>): WedgeParams;
  setCursorX(x: number): void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createWedgeSim({
    lambda: 650,
    theta: 0.05,
    L: 5.0,
    step: 'geometry'
  });

  const view = createWedgeView({
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
    const { lambda, theta, L } = s.params;
    return [
      { key: 'lambda', label: '波长 λ', value: `${lambda} nm` },
      { key: 'theta', label: '劈尖角 θ', value: `${theta.toFixed(3)}°` },
      { key: 'L', label: '板长 L', value: `${L.toFixed(1)} cm` },
      {
        key: 'x',
        label: '光标位置 x',
        value: `${(s.cursorX * L * 10).toFixed(2)} mm`
      },
      {
        key: 'd',
        label: '厚度 d',
        value: `${(s.thickness / 1e3).toFixed(2)} μm`
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
        value: s.isBright ? '明纹' : '暗纹'
      },
      {
        key: 'fringe-l',
        label: '条纹间距 l',
        value: `${s.fringeSpacing.toFixed(3)} mm`
      }
    ];
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParams: base.wrapAction(
      (params: Partial<WedgeParams>): WedgeParams => sim.setParams(params)
    ),
    setCursorX: base.wrapAction((x: number): void => {
      sim.setCursorX(x);
    }),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
    },
    getReadoutItems
  };
}
