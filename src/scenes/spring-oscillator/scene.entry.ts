import { createSpringOscillatorSim, type OscillatorParams } from './scene.sim';
import {
  createSpringOscillatorView,
  type SpringOscillatorViewOptions
} from './scene.view';

import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';

export type CreateSpringOscillatorSceneOptions = {
  graphCanvas?: HTMLCanvasElement;
  stageCanvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
  demoHints?: DemoRenderHints;
};

export function createSpringOscillatorScene(
  options: CreateSpringOscillatorSceneOptions = {}
) {
  const sim = createSpringOscillatorSim();

  // 时间缩放因子（播放速度控制）
  let timeScale = 1;

  // 状态变化监听器
  const listeners = new Set<() => void>();

  function notify(): void {
    listeners.forEach((fn) => fn());
  }

  // 生成读数数据（供容器统一刷新）
  function getReadoutItems(): Array<{ label: string; value: string }> {
    const items: Array<{ label: string; value: string }> = [
      { label: '全局时间', value: `${sim.globalTime.toFixed(2)} s` },
      { label: '振子数量', value: String(sim.oscillators.length) }
    ];

    sim.oscillators.forEach((osc, index) => {
      const omega = sim.getOmega(osc.id);
      const period = sim.getPeriod(osc.id);
      // 实时相位角，归一化到 [0°, 360°)
      let phaseDeg = ((osc.state.phase * 180) / Math.PI) % 360;
      if (phaseDeg < 0) phaseDeg += 360;
      items.push(
        { label: `#${index + 1} ω`, value: `${omega.toFixed(2)} rad/s` },
        { label: `#${index + 1} T`, value: `${period.toFixed(2)} s` },
        { label: `#${index + 1} 相位`, value: `${phaseDeg.toFixed(0)}°` }
      );
    });

    // 如果有两个以上振子正在运行，显示它们之间的相位差
    const running = sim.oscillators.filter((o) => o.isPlaying);
    if (running.length >= 2) {
      const phaseDiff = sim.getPhaseDifference(running[0].id, running[1].id);
      if (phaseDiff !== null) {
        const diffDeg = ((phaseDiff * 180) / Math.PI).toFixed(0);
        let relation = '';
        if (Math.abs(phaseDiff) < 0.1) relation = '(同相)';
        else if (Math.abs(Math.abs(phaseDiff) - Math.PI) < 0.1)
          relation = '(反相)';
        items.push({ label: '相位差 φ₂-φ₁', value: `${diffDeg}° ${relation}` });
      }
    }

    return items;
  }

  // 点击小球切换播放/暂停
  function handleToggleOscillator(id: string): void {
    const osc = sim.oscillators.find((o) => o.id === id);
    if (!osc) return;

    if (osc.isPlaying) {
      sim.pauseOscillator(id);
    } else {
      sim.startOscillator(id);
    }
    notify();
  }

  const viewOptions: SpringOscillatorViewOptions = {
    graphCanvas: options.graphCanvas,
    stageCanvas: options.stageCanvas,
    sim,
    mode: options.mode ?? 'normal',
    theme: options.theme,
    demoHints: options.demoHints,
    onToggleOscillator: handleToggleOscillator
  };

  const view = createSpringOscillatorView(viewOptions);

  return {
    sim,
    view,

    init(): void {
      // 添加两个默认振子，使用不同参数确保 x-t 曲线可区分
      sim.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' });
      sim.addOscillator({ k: 25, m: 1, x0: 5, orientation: 'horizontal' });
    },

    step(dt: number): void {
      sim.step(dt * timeScale);
    },

    render(): void {
      view.render();
    },

    reset(): void {
      this.resetAll();
    },
    resetAll(): void {
      sim.resetAll();
      view.reset();
      notify();
    },

    resize(): void {
      view.resize();
    },

    setMode(mode?: TeachingMode, hints?: DemoRenderHints): void {
      view.setMode(mode, hints);
    },

    setTheme(theme: 'dark' | 'light'): void {
      view.setTheme(theme);
    },

    addOscillator(params?: Partial<OscillatorParams>, startDelay?: number) {
      const osc = sim.addOscillator(params, startDelay);
      notify();
      return osc;
    },

    removeOscillator(id: string): boolean {
      const result = sim.removeOscillator(id);
      if (result) {
        view.removeOscillatorHistory(id);
        notify();
      }
      return result;
    },

    updateOscillator(id: string, params: Partial<OscillatorParams>): boolean {
      const result = sim.updateOscillator(id, params);
      if (result) {
        notify();
      }
      return result;
    },

    startOscillator(id: string): void {
      sim.startOscillator(id);
      notify();
    },

    pauseOscillator(id: string): void {
      sim.pauseOscillator(id);
      notify();
    },

    resetOscillator(id: string): void {
      sim.resetOscillator(id);
      notify();
    },

    startAll(): void {
      sim.oscillators.forEach((o) => sim.startOscillator(o.id));
      notify();
    },

    pauseAll(): void {
      sim.oscillators.forEach((o) => sim.pauseOscillator(o.id));
      notify();
    },

    setTimeScale(scale: number): void {
      timeScale = Math.max(0.05, Math.min(3, scale));
    },

    getTimeScale(): number {
      return timeScale;
    },

    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
    },

    setParams(next: { k?: number; m?: number; A?: number }): {
      k: number;
      m: number;
      A: number;
    } {
      const first = sim.oscillators[0];
      if (first) {
        const patch: Partial<OscillatorParams> = {};
        if (typeof next.k === 'number' && Number.isFinite(next.k)) {
          patch.k = next.k;
        }
        if (typeof next.m === 'number' && Number.isFinite(next.m)) {
          patch.m = next.m;
        }
        if (typeof next.A === 'number' && Number.isFinite(next.A)) {
          patch.x0 = next.A;
        }
        if (Object.keys(patch).length > 0) {
          sim.updateOscillator(first.id, patch);
          notify();
        }
      }
      const osc = sim.oscillators[0];
      return {
        k: osc?.params.k ?? 10,
        m: osc?.params.m ?? 1,
        A: osc?.params.x0 ?? 5
      };
    },

    getParams(): { k: number; m: number; A: number } {
      const first = sim.oscillators[0];
      return {
        k: first?.params.k ?? 10,
        m: first?.params.m ?? 1,
        A: first?.params.x0 ?? 5
      };
    },

    getReadoutItems,

    getTransportState(): { isPlaying: boolean; speed: number } {
      return {
        isPlaying: sim.oscillators.some((o) => o.isPlaying),
        speed: timeScale
      };
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    dispose(): void {
      listeners.clear();
      view.dispose();
    }
  };
}

export type SpringOscillatorScene = ReturnType<
  typeof createSpringOscillatorScene
>;
