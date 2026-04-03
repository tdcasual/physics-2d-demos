/**
 * 弹簧振子场景 - 使用布局母版系统 (V3 - 像素级兼容)
 * 
 * 与 page-legacy.ts 完全相同的 API 和调用方式
 * 
 * @review-date 2026-04-02
 * @version 3.0.0-pixel-perfect
 */

// 样式导入 - 与旧版相同的样式
import '../../styles/teaching-shell.css';

// 布局系统导入
import { createSceneContainer } from '../../app/layouts/index';
import { SplitRightLayout } from '../../app/layouts/masters/split-right/split-right';
import type { Scene, ReadoutItem } from '../../app/layouts/types';

// 场景导入 - 与旧版相同
import { createPageLifecycle } from '../../app/page-lifecycle';
import { createSpringOscillatorControlsV4 } from './controls-v4';
import { createSpringOscillatorScene } from './scene.entry';

/**
 * 弹簧振子场景类 - 实现 Scene 接口
 * 保持与旧版完全相同的内部实现
 */
class SpringOscillatorScene implements Scene {
  readonly id = 'spring-oscillator';
  readonly preferredLayout = 'split-right';
  
  // 与旧版相同的实例变量
  private scene: ReturnType<typeof createSpringOscillatorScene> | null = null;
  private controls: ReturnType<typeof createSpringOscillatorControlsV4> | null = null;
  private lifecycle = createPageLifecycle();
  
  // 布局提供的元素引用
  private shell: {
    controlSlot: HTMLElement;
    graphSlot: HTMLElement | null;
    animationSlot: HTMLElement;
    readoutSlot: HTMLElement;
    setReadout: (items: ReadoutItem[]) => void;
    getTheme: () => 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    getMode: () => 'normal' | 'presentation';
    setMode: (mode: 'normal' | 'presentation') => void;
    themeButton: HTMLButtonElement | null;
    modeButton: HTMLButtonElement | null;
  } | null = null;
  
  /**
   * 渲染控制区域
   */
  renderControl(container: HTMLElement): void {
    (this.shell as any) = this.shell || {};
    this.shell!.controlSlot = container;
    
    // 初始化 shell 方法（防止早期调用出错）
    if (!this.shell!.setReadout) {
      this.shell!.setReadout = () => {};
    }
    if (!this.shell!.getTheme) {
      this.shell!.getTheme = () => 'light';
    }
    if (!this.shell!.setTheme) {
      this.shell!.setTheme = () => {};
    }
    if (!this.shell!.getMode) {
      this.shell!.getMode = () => 'normal';
    }
    if (!this.shell!.setMode) {
      this.shell!.setMode = () => {};
    }
  }
  
  /**
   * 渲染动画区域 - 在这里创建场景（因为 Canvas 现在可用）
   */
  renderAnimation(container: HTMLElement): void {
    (this.shell as any) = this.shell || {};
    this.shell!.animationSlot = container;
    
    // 设置相对定位（与旧版相同）
    container.style.position = 'relative';
    
    // 获取布局创建的 Canvas
    const canvas = container.querySelector('.stage-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    // 创建场景（传入 Canvas）
    this.scene = createSpringOscillatorScene({
      stageCanvas: canvas,
      onReadout: (items) => {
        this.shell!.setReadout(items as ReadoutItem[]);
      }
    });
    
    // 如果有待处理的图表 Canvas，附加到场景
    const pendingGraphCanvas = (this as any).pendingGraphCanvas;
    if (pendingGraphCanvas) {
      (this.scene as any).attachGraphCanvas(pendingGraphCanvas);
    }
    
    // 创建控制面板（现在 scene 已创建）
    if (this.shell!.controlSlot) {
      this.controls = createSpringOscillatorControlsV4({
        mount: this.shell!.controlSlot,
        scene: this.scene,
        onStatus: (text) => {
          // 不再覆盖数据读数，让物理数据保持显示
          console.log('[Status]', text);
        }
      });
      this.lifecycle.onDispose(() => this.controls?.dispose());
    }
    
    // 设置浮动控制条回调（由布局提供）
    const layout = this.getCurrentLayout?.() as SplitRightLayout | null;
    if (layout) {
      layout.setFloatingControls({
        isPlaying: () => this.scene!.sim.oscillators.some(o => o.isPlaying),
        onPlayPause: () => {
          const anyPlaying = this.scene!.sim.oscillators.some(o => o.isPlaying);
          if (anyPlaying) {
            this.scene!.pauseAll();
          } else {
            this.scene!.startAll();
          }
          this.controls?.refresh();
          layout.refreshFloatingControls();
          // 不再覆盖数据读数，让物理数据保持显示
        },
        onReset: () => {
          this.scene!.reset();
          this.scene!.render();
          this.controls?.refresh();
          // 不再覆盖数据读数，reset 会触发 updateReadout
        },
        onSpeedChange: (speed) => {
          this.scene!.setTimeScale(speed);
          this.shell!.setReadout([{ label: '播放速度', value: `${speed.toFixed(2)}×` }]);
        },
        getSpeed: () => this.scene!.getTimeScale()
      });
    }
    
    // 初始化场景
    this.scene.init();
    
    // 立即调整 Canvas 尺寸并渲染
    this.scene.resize();
    this.scene.render();
    
    // 启动动画循环（与旧版相同）
    this.startAnimationLoop();
    
    // 注意：mount() 由 container.ts 的 mountScene 在所有渲染完成后调用
  }
  
  /**
   * 渲染图表区域
   */
  renderGraph(container: HTMLElement): void {
    (this.shell as any) = this.shell || {};
    this.shell!.graphSlot = container;
    
    // 创建图表 Canvas（与 Legacy 版本一致）
    const graphCanvas = document.createElement('canvas');
    graphCanvas.style.cssText = 'width: 100%; height: 100%; display: block;';
    container.appendChild(graphCanvas);
    
    // 如果场景已创建，使用 attachGraphCanvas 附加
    if (this.scene) {
      (this.scene as any).attachGraphCanvas(graphCanvas);
      setTimeout(() => {
        this.scene!.resize();
        this.scene!.render();
      }, 100);
    } else {
      // 保存引用供后续使用
      (this as any).pendingGraphCanvas = graphCanvas;
    }
  }
  
  /**
   * 渲染数据读数区域
   */
  renderReadout(container: HTMLElement): void {
    (this.shell as any) = this.shell || {};
    this.shell!.readoutSlot = container;
    
    // 创建 setReadout 方法（与旧版 shell.setReadout 相同的行为）
    this.shell!.setReadout = (items: ReadoutItem[]) => {
      container.innerHTML = items.map(item => `
        <li class="readout-item ${item.layout === 'half' ? 'readout-item--half' : ''}">
          <span class="readout-label">${item.label}</span>
          <strong class="readout-value">${item.value}</strong>
        </li>
      `).join('');
    };
    
    // 初始化其他 shell 方法（在 mount 之前提供默认值）
    if (!this.shell!.getTheme) {
      this.shell!.getTheme = () => 'light';
    }
    if (!this.shell!.setTheme) {
      this.shell!.setTheme = (theme: 'light' | 'dark') => {};
    }
    if (!this.shell!.getMode) {
      this.shell!.getMode = () => 'normal';
    }
    if (!this.shell!.setMode) {
      this.shell!.setMode = (mode: 'normal' | 'presentation') => {};
    }
  }
  
  /**
   * 场景挂载 - 绑定事件（与旧版相同）
   */
  mount(): void {
    if (!this.shell || !this.scene) return;
    
    // 获取按钮引用
    const layout = this.getCurrentLayout?.() as SplitRightLayout | null;
    this.shell.themeButton = layout?.getThemeButton() || null;
    this.shell.modeButton = layout?.getModeButton() || null;
    
    // 重写 shell 方法以使用实际按钮
    const currentTheme = this.shell.getTheme();
    const currentMode = this.shell.getMode();
    
    this.shell.getTheme = () => {
      return (document.querySelector('.teaching-demo')?.getAttribute('data-theme') as 'light' | 'dark') || 'light';
    };
    
    this.shell.setTheme = (theme: 'light' | 'dark') => {
      layout?.setTheme(theme);
      this.scene!.setTheme(theme);
    };
    
    this.shell.getMode = () => {
      return (document.querySelector('.teaching-demo')?.getAttribute('data-mode') as 'normal' | 'presentation') || 'normal';
    };
    
    this.shell.setMode = (mode: 'normal' | 'presentation') => {
      layout?.setMode(mode);
    };
    
    // 主题切换
    if (this.shell.themeButton) {
      const onThemeToggle = () => {
        const nextTheme = this.shell!.getTheme() === 'dark' ? 'light' : 'dark';
        this.shell!.setTheme(nextTheme);
        // 不再更新数据读数面板，避免干扰物理数据显示
      };
      this.shell.themeButton.addEventListener('click', onThemeToggle);
      this.lifecycle.onDispose(() => this.shell!.themeButton?.removeEventListener('click', onThemeToggle));
    }
    
    // 模式切换
    if (this.shell.modeButton) {
      const onModeToggle = () => {
        const nextMode = this.shell!.getMode() === 'normal' ? 'presentation' : 'normal';
        this.shell!.setMode(nextMode);
        // 不再更新数据读数面板，避免干扰物理数据显示
      };
      this.shell.modeButton.addEventListener('click', onModeToggle);
      this.lifecycle.onDispose(() => this.shell!.modeButton?.removeEventListener('click', onModeToggle));
    }
    
    // 窗口调整（与旧版相同）
    const handleResize = () => {
      this.scene!.resize();
      this.scene!.render();
    };
    window.addEventListener('resize', handleResize);
    this.lifecycle.onDispose(() => window.removeEventListener('resize', handleResize));
    
    // 初始化（与旧版相同）
    this.scene.setTheme(this.shell.getTheme());
    setTimeout(() => {
      handleResize();
      this.scene!.render();
    }, 100);
    
    console.log('[SpringOscillator] Mounted');
  }
  
  /**
   * 场景卸载（与旧版相同）
   */
  unmount(): void {
    console.log('[SpringOscillator] Unmounting...');
    this.lifecycle.dispose();
    this.scene?.dispose();
  }
  
  /**
   * 启动动画循环（与旧版完全相同）
   */
  private startAnimationLoop(): void {
    let lastTime = performance.now();
    let animationId: number | null = null;
    
    const animate = () => {
      const now = performance.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;
      
      if (this.scene?.sim.oscillators.some(o => o.isPlaying)) {
        this.scene.step(deltaTime);
      }
      this.scene?.render();
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    this.lifecycle.onDispose(() => {
      if (animationId) cancelAnimationFrame(animationId);
    });
  }
  
  // 用于获取当前布局的辅助方法
  private getCurrentLayout?: () => SplitRightLayout;
  setGetCurrentLayout(fn: () => SplitRightLayout): void {
    this.getCurrentLayout = fn;
  }
}

/**
 * 启动函数 - 与旧版 boot() 完全相同的结构
 */
function boot(): void {
  const mount = document.getElementById('app');
  if (!mount) {
    throw new Error('Missing #app container');
  }
  
  // 注册 SplitRightLayout
  import('../../app/layouts/registry').then(({ registerLayout }) => {
    registerLayout('split-right', SplitRightLayout, {
      name: '左右分栏',
      description: '与 teaching-demo-shell 像素级一致',
      tags: ['左右分栏'],
      supportsMobile: true,
      supportedSlots: ['header', 'control', 'animation', 'graph', 'readout']
    });
    
    // 创建场景容器（与旧版相同的配置）
    const container = createSceneContainer({
      mount,
      defaultLayout: 'split-right',
      defaultTheme: 'light',
      layoutConfig: {
        // 弹簧振子场景配置
        defaultLeftRatio: 0.38,
        leftMinWidth: 380,
        leftMaxWidth: 960,
        hasGraph: true,
        graphHeight: 0.4,
        controlColumns: 1,
        readoutCollapsed: true,
        hideHeader: true,  // 与旧版一致
        readoutLabel: '数据读数'
      }
    });
    
    // 创建场景实例
    const scene = new SpringOscillatorScene();
    scene.setGetCurrentLayout(() => container.currentLayout as SplitRightLayout);
    
    // 设置场景
    container.setScene(scene);
  });
}

// 启动
boot();
