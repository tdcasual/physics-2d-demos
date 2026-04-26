/**
 * 波的干涉 — 场景入口
 *
 * 集成 sim（物理状态）与 view（画布渲染），
 * 对外暴露标准场景生命周期接口。
 * 支持多观察点多图表（通过 renderGraph 在独立容器中渲染）。
 */

import type { SceneLifecycle } from '../types';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { gansheMeta } from './scene.meta';
import {
  createWaveInterferenceSim,
  type WaveParams,
  type WaveState,
  type ObserverData
} from './scene.sim';
import {
  createWaveInterferenceView,
  createXtGraphRenderer,
  getObserverColor,
  type XtGraphRenderer
} from './scene.view';

const defaultParams: WaveParams = {
  freq1: gansheMeta.defaultParams.freq1,
  freq2: gansheMeta.defaultParams.freq2,
  amp1: gansheMeta.defaultParams.amp1,
  amp2: gansheMeta.defaultParams.amp2,
  phaseDiff: gansheMeta.defaultParams.phaseDiff,
  observerX: gansheMeta.defaultParams.observerX,
  observers: [],
  mode: 'head-on',
  showWave1: true,
  showWave2: true,
  showInterference: true,
  isPulseMode: false,
  playbackSpeed: 1
};

export type CreateGansheSceneOptions = {
  canvas: HTMLCanvasElement;
  theme?: 'light' | 'dark';
  mode?: 'normal' | 'presentation';
  demoHints?: DemoRenderHints;
  onReadout?: (state: WaveState) => void;
};

function formatReadout(state: WaveState): Array<{
  label: string;
  value: string | number;
  layout?: 'half' | 'full';
}> {
  const p = state.interference;
  const items = [
    { label: '时间 t', value: `${state.time.toFixed(2)} s` },
    { label: '观察点 x', value: `${state.params.observerX.toFixed(2)} m` },
    { label: '相对相位差', value: `${p.dphaseDeg.toFixed(0)}°` },
    { label: '瞬时位移', value: `${p.ySum.toFixed(2)} cm` },
    { label: '理论振幅', value: `${p.A_theory.toFixed(1)} cm` },
    {
      label: '干涉强度',
      value: `${Math.min(p.intensityPct, 400).toFixed(0)}%`
    },
    {
      label: '参数 f₁/f₂',
      value: `${state.params.freq1.toFixed(1)} / ${state.params.freq2.toFixed(1)} Hz`
    },
    {
      label: '参数 A₁/A₂',
      value: `${state.params.amp1.toFixed(1)} / ${state.params.amp2.toFixed(1)} cm`
    }
  ];

  // Add additional observers summary
  if (state.allObservers.length > 0) {
    state.allObservers.forEach((obs, i) => {
      items.push({
        label: `观察点${i + 2} x=${obs.x.toFixed(1)}`,
        value: `A=${obs.interference.A_theory.toFixed(1)}`,
        layout: 'half'
      });
    });
  }

  return items;
}

export function createGansheScene(
  options: CreateGansheSceneOptions = {} as CreateGansheSceneOptions
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: 'light' | 'dark'): void;
  setMode(mode: 'normal' | 'presentation'): void;
  getState(): WaveState;
  getParams(): WaveParams;
  setParams(next: Partial<WaveParams>): WaveParams;
  getReadoutItems(): Array<{ label: string; value: string | number; layout?: 'half' | 'full' }>;
  setTimeScale(scale: number): void;
  getTimeScale(): number;
  subscribe(listener: () => void): () => void;
  renderGraph(container: HTMLElement): void;
  addObserver(x: number): void;
  removeObserver(index: number): void;
  getObserverCount(): number;
} {
  const sim = createWaveInterferenceSim(defaultParams);
  const view = createWaveInterferenceView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });

  const listeners: (() => void)[] = [];

  // Multi-graph management
  let graphContainer: HTMLElement | null = null;
  const graphCells: { canvas: HTMLCanvasElement; renderer: XtGraphRenderer; wrapper: HTMLElement; header: HTMLElement }[] = [];
  let currentTheme: 'light' | 'dark' = options.theme ?? 'light';

  function notify(): void {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
  }

  function syncGraphColumns(): void {
    if (!graphContainer) return;
    const count = 1 + sim.getParams().observers.length;
    const cols = Math.min(count, 3);
    graphContainer.setAttribute('data-columns', String(cols));
  }

  function createGraphCell(observer: ObserverData, index: number): { canvas: HTMLCanvasElement; renderer: XtGraphRenderer; wrapper: HTMLElement; header: HTMLElement } {
    const wrapper = document.createElement('div');
    wrapper.className = 'graph-cell';

    const header = document.createElement('div');
    header.className = 'graph-cell-header';
    const color = getObserverColor(index);
    header.innerHTML = `<span style="color:${color}">●</span> <span class="graph-cell-title">观察点${index + 1}</span> <span class="graph-cell-coord">x=${observer.x.toFixed(2)}m</span>`;
    wrapper.appendChild(header);

    const body = document.createElement('div');
    body.className = 'graph-cell-body';
    wrapper.appendChild(body);

    const canvas = document.createElement('canvas');
    body.appendChild(canvas);

    const renderer = createXtGraphRenderer(canvas, {
      theme: currentTheme,
      title: `观察点 ${index + 1}`,
      color
    });

    return { canvas, renderer, wrapper, header };
  }

  function rebuildGraphs(): void {
    if (!graphContainer) return;

    // Dispose old renderers
    graphCells.forEach((cell) => {
      cell.renderer.dispose();
    });
    graphCells.length = 0;
    graphContainer.innerHTML = '';

    const state = sim.getState();

    // Primary observer graph
    const primaryData: ObserverData = {
      x: state.params.observerX,
      history: state.history,
      ghostTrail: state.ghostTrail,
      interference: state.interference
    };
    const primaryCell = createGraphCell(primaryData, 0);
    graphContainer.appendChild(primaryCell.wrapper);
    graphCells.push(primaryCell);

    // Additional observer graphs
    state.allObservers.forEach((obs, i) => {
      const cell = createGraphCell(obs, i + 1);
      graphContainer.appendChild(cell.wrapper);
      graphCells.push(cell);
    });

    syncGraphColumns();
    renderGraphs();
  }

  function renderGraphs(): void {
    const state = sim.getState();

    // Primary
    if (graphCells[0]) {
      const primaryData: ObserverData = {
        x: state.params.observerX,
        history: state.history,
        ghostTrail: state.ghostTrail,
        interference: state.interference
      };
      // Update header coordinate
      const coordSpan = graphCells[0].header.querySelector('.graph-cell-coord');
      if (coordSpan) {
        coordSpan.textContent = `x=${state.params.observerX.toFixed(2)}m`;
      }
      graphCells[0].renderer.render(primaryData, state.time, state.params);
    }

    // Additional
    for (let i = 0; i < state.allObservers.length && i + 1 < graphCells.length; i++) {
      const obs = state.allObservers[i];
      const coordSpan = graphCells[i + 1].header.querySelector('.graph-cell-coord');
      if (coordSpan) {
        coordSpan.textContent = `x=${obs.x.toFixed(2)}m`;
      }
      graphCells[i + 1].renderer.render(obs, state.time, state.params);
    }
  }

  // Observer drag callback: update sim param, clear history, and re-render
  view.setOnObserverMove((index, x) => {
    if (index === -1) {
      sim.setObserverX(x);
    } else {
      sim.setObserverPosition(index, x);
    }
    sim.clearHistory();
    const state = sim.getState();
    view.render(state);
    options.onReadout?.(state);
    notify();
  });

  return {
    init(): void {
      sim.reset();
      view.reset();
      const state = sim.getState();
      options.onReadout?.(state);
      rebuildGraphs();
    },
    reset(): void {
      sim.reset();
      view.reset();
      const state = sim.getState();
      options.onReadout?.(state);
      notify();
      rebuildGraphs();
    },
    step(dt: number): void {
      sim.step(dt);
    },
    render(): void {
      const state = sim.getState();
      view.render(state);
      options.onReadout?.(state);
      renderGraphs();
      notify();
    },
    resize(): void {
      view.resize();
      graphCells.forEach((cell) => cell.renderer.resize());
    },
    setTheme(theme: 'light' | 'dark'): void {
      currentTheme = theme;
      view.setTheme(theme);
      graphCells.forEach((cell) => cell.renderer.setTheme(theme));
    },
    setMode(mode: 'normal' | 'presentation'): void {
      view.setMode(mode);
    },
    getState(): WaveState {
      return sim.getState();
    },
    getParams(): WaveParams {
      return sim.getParams();
    },
    setParams(next: Partial<WaveParams>): WaveParams {
      const params = sim.setParams(next);
      notify();
      return params;
    },
    getReadoutItems(): Array<{
      label: string;
      value: string | number;
      layout?: 'half' | 'full';
    }> {
      return formatReadout(sim.getState());
    },
    setTimeScale(scale: number): void {
      sim.setParams({ playbackSpeed: scale });
    },
    getTimeScale(): number {
      return sim.getParams().playbackSpeed;
    },
    subscribe(listener: () => void): () => void {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx > -1) listeners.splice(idx, 1);
      };
    },

    // Graph rendering for split-right-graph-bottom layout
    renderGraph(container: HTMLElement): void {
      graphContainer = container;
      rebuildGraphs();
    },

    // Multi-observer management
    addObserver(x: number): void {
      sim.addObserver(x);
      rebuildGraphs();
      notify();
    },
    removeObserver(index: number): void {
      sim.removeObserver(index);
      rebuildGraphs();
      notify();
    },
    getObserverCount(): number {
      return 1 + sim.getParams().observers.length;
    },

    dispose(): void {
      listeners.length = 0;
      view.dispose();
      graphCells.forEach((cell) => cell.renderer.dispose());
      graphCells.length = 0;
    }
  };
}

export type GansheScene = ReturnType<typeof createGansheScene>;
