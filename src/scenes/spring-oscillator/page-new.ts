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
import type { Scene } from '../../app/layouts/types';

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
  } | null = null;
  
  /**
   * 渲染控制区域
   */
  renderControl(container: HTMLElement): void {
    (this.shell as any) = this.shell || {};
    this.shell!.controlSlot = container;
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
      stageCanvas: canvas
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
          console.log('[Status]', text);
        }
      });
      this.lifecycle.onDispose(() => this.controls?.dispose());
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
  renderReadout(): void {
    // 读数内容由容器通过 getReadoutItems() 统一刷新，无需场景直接操作 DOM
  }
  
  /**
   * 场景挂载 - 绑定事件（与旧版相同）
   */
  mount(): void {
    if (!this.shell || !this.scene) return;
    
    // 窗口调整（与旧版相同）
    const handleResize = () => {
      this.scene!.resize();
      this.scene!.render();
    };
    window.addEventListener('resize', handleResize);
    this.lifecycle.onDispose(() => window.removeEventListener('resize', handleResize));
    
    // 初始化主题
    const initialTheme = (document.querySelector('.teaching-demo')?.getAttribute('data-theme') as 'light' | 'dark') || 'light';
    this.scene.setTheme(initialTheme);
    setTimeout(() => {
      handleResize();
      this.scene!.render();
    }, 100);
    
    console.log('[SpringOscillator] Mounted');
  }
  
  startAll(): void {
    this.scene?.startAll();
  }
  
  pauseAll(): void {
    this.scene?.pauseAll();
  }
  
  reset(): void {
    this.scene?.reset();
    this.controls?.refresh();
  }
  
  setTimeScale(scale: number): void {
    this.scene?.setTimeScale(scale);
  }
  
  getTransportState(): { isPlaying: boolean; speed: number } {
    return this.scene?.getTransportState() ?? { isPlaying: false, speed: 1 };
  }
  
  getReadoutItems(): Array<{ label: string; value: string | number; layout?: 'half' | 'full' }> {
    return this.scene?.getReadoutItems() ?? [];
  }
  
  subscribe(listener: () => void): () => void {
    return this.scene?.subscribe(listener) ?? (() => {});
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
  
}

/**
 * 启动函数 - 与旧版 boot() 完全相同的结构
 */
function boot(): void {
  const mount = document.getElementById('app');
  if (!mount) {
    throw new Error('Missing #app container');
  }
  
  // 动态导入注册表和布局母版（桌面端 + 移动端）
  Promise.all([
    import('../../app/layouts/registry'),
    import('../../app/layouts/masters/split-right/split-right'),
    import('../../app/layouts/masters/mobile-stack/mobile-stack')
  ]).then(([{ registerLayout }, { SplitRightLayout }, { MobileStackLayout }]) => {
    // 注册桌面端布局
    registerLayout('split-right', SplitRightLayout, {
      name: '左右分栏',
      description: '与 teaching-demo-shell 像素级一致',
      tags: ['左右分栏'],
      supportsMobile: false,
      supportedSlots: ['header', 'control', 'animation', 'graph', 'readout']
    });
    
    // 注册移动端布局
    registerLayout('mobile-stack', MobileStackLayout, {
      name: '移动端堆叠',
      description: '适合手机的垂直堆叠布局，控制面板从底部滑出',
      tags: ['移动端', '底部面板'],
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
    
    // 设置场景
    container.setScene(scene);
  });
}

// 启动
boot();
