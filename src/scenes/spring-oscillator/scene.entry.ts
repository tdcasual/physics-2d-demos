import { createSpringOscillatorSim, type OscillatorParams } from './scene.sim';
import { createSpringOscillatorView, type SpringOscillatorViewOptions } from './scene.view';

export type CreateSpringOscillatorSceneOptions = {
  graphCanvas?: HTMLCanvasElement;
  stageCanvas?: HTMLCanvasElement;
  onReadout?: (items: Array<{ label: string; value: string }>) => void;
};

export function createSpringOscillatorScene(options: CreateSpringOscillatorSceneOptions = {}) {
  const sim = createSpringOscillatorSim();
  
  // 定时渲染（用于没有 transport 的情况）
  let renderInterval: ReturnType<typeof setInterval> | null = null;
  let viewRef: ReturnType<typeof createSpringOscillatorView> | null = null;
  
  // 时间缩放因子（播放速度控制）
  let timeScale = 1;
  
  function startRenderLoop(): void {
    if (renderInterval || !viewRef) return;
    renderInterval = setInterval(() => {
      const dt = 1 / 60;
      sim.step(dt);
      viewRef?.render();
      updateReadout();
      
      // 如果没有振子在运行，停止循环
      if (!sim.oscillators.some(o => o.isPlaying)) {
        if (renderInterval) {
          clearInterval(renderInterval);
          renderInterval = null;
        }
      }
    }, 1000 / 60);
  }
  
  // 更新读取数据
  function updateReadout(): void {
    if (!options.onReadout) return;
    
    const items: Array<{ label: string; value: string }> = [
      { label: '全局时间', value: `${sim.globalTime.toFixed(2)} s` },
      { label: '振子数量', value: String(sim.oscillators.length) }
    ];

    sim.oscillators.forEach((osc, index) => {
      const omega = sim.getOmega(osc.id);
      const period = sim.getPeriod(osc.id);
      items.push(
        { label: `#${index + 1} ω`, value: `${omega.toFixed(2)} rad/s` },
        { label: `#${index + 1} T`, value: `${period.toFixed(2)} s` }
      );
    });

    // 如果有两个以上振子，显示相位差
    if (sim.oscillators.length >= 2) {
      const osc1 = sim.oscillators[0];
      const osc2 = sim.oscillators[1];
      const phaseDiff = sim.getPhaseDifference(osc1.id, osc2.id);
      if (phaseDiff !== null) {
        const diffDeg = (phaseDiff * 180 / Math.PI).toFixed(0);
        let relation = '';
        if (Math.abs(phaseDiff) < 0.1) relation = '(同相)';
        else if (Math.abs(Math.abs(phaseDiff) - Math.PI) < 0.1) relation = '(反相)';
        items.push({ label: '相位差 φ₂-φ₁', value: `${diffDeg}° ${relation}` });
      }
    }

    options.onReadout(items);
  }
  
  // 点击小球切换播放/暂停
  function handleToggleOscillator(id: string): void {
    const osc = sim.oscillators.find(o => o.id === id);
    if (!osc) return;
    
    if (osc.isPlaying) {
      sim.pauseOscillator(id);
    } else {
      sim.startOscillator(id);
      // 启动渲染循环
      startRenderLoop();
    }
    // 触发回调以更新 UI
    updateReadout();
  }
  
  const viewOptions: SpringOscillatorViewOptions = {
    graphCanvas: options.graphCanvas,
    stageCanvas: options.stageCanvas,
    sim,
    onToggleOscillator: handleToggleOscillator
  };
  
  const view = createSpringOscillatorView(viewOptions);
  viewRef = view;

  return {
    sim,
    view,

    init(): void {
      // 添加两个默认振子用于演示相位
      sim.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' });
      sim.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' });
      
      // 更新读取数据
      updateReadout();
    },

    step(dt: number): void {
      sim.step(dt * timeScale);
      updateReadout();
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
      updateReadout();
    },

    resize(): void {
      view.resize();
    },

    setMode(): void {
      view.setMode();
    },

    setTheme(theme: 'dark' | 'light'): void {
      view.setTheme(theme);
    },

    addOscillator(params?: Partial<OscillatorParams>, startDelay?: number) {
      const osc = sim.addOscillator(params, startDelay);
      updateReadout();
      return osc;
    },

    removeOscillator(id: string): boolean {
      const result = sim.removeOscillator(id);
      if (result) {
        view.removeOscillatorHistory(id);
        updateReadout();
      }
      return result;
    },

    updateOscillator(id: string, params: Partial<OscillatorParams>): boolean {
      const result = sim.updateOscillator(id, params);
      if (result) {
        updateReadout();
      }
      return result;
    },

    startOscillator(id: string): void {
      sim.startOscillator(id);
      updateReadout();
    },

    pauseOscillator(id: string): void {
      sim.pauseOscillator(id);
      updateReadout();
    },

    resetOscillator(id: string): void {
      sim.resetOscillator(id);
      updateReadout();
    },

    startAll(): void {
      sim.oscillators.forEach(o => sim.startOscillator(o.id));
      updateReadout();
    },

    pauseAll(): void {
      sim.oscillators.forEach(o => sim.pauseOscillator(o.id));
      updateReadout();
    },

    setTimeScale(scale: number): void {
      timeScale = Math.max(0.05, Math.min(3, scale));
    },

    getTimeScale(): number {
      return timeScale;
    },

    dispose(): void {
      if (renderInterval) {
        clearInterval(renderInterval);
        renderInterval = null;
      }
      view.dispose();
    }
  };
}

export type SpringOscillatorScene = ReturnType<typeof createSpringOscillatorScene>;
