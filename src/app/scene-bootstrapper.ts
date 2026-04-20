/**
 * 场景引导器 - 统一封装 SceneContainer 的创建与配置
 *
 * 将场景 page.ts 从 ~200 行缩减到 ~30 行。
 */

import '../styles/teaching-shell.css';

import { createSceneContainer } from './layouts/container';

import type {
  Scene,
  Theme,
  LayoutSlots,
  ReadoutItem,
  TransportState
} from './layouts/types';
import { registerAllLayouts } from './layouts/auto-register';
import type { SceneMeta } from '../platform/scene-contract';
import { createSceneShell } from './scene-shell';
import { createPageLifecycle } from './page-lifecycle';

export type SceneInstance = {
  init(): void;
  resize(): void;
  render(): void;
  dispose(): void;
  setTheme(theme: Theme): void;
  setMode(mode: 'normal' | 'presentation'): void;
  step(dt: number): void;
  reset?(): void;
  startAll?(): void;
  pauseAll?(): void;
  setTimeScale?(scale: number): void;
  getState?(): unknown;
  getReadoutItems?(): ReadoutItem[];
  getTransportState?(): TransportState;
  subscribe?(listener: () => void): () => void;
  // 允许场景暴露额外方法供控制面板使用
  [key: string]: unknown;
};

export type ScenePageOptions<TScene extends SceneInstance = SceneInstance> = {
  /** 场景元数据 */
  meta: SceneMeta;
  /** 首选布局 ID */
  preferredLayout?: string;
  /** 布局配置 */
  layoutConfig?: Record<string, unknown>;
  /** 创建场景实例 */
  createScene: (opts: {
    canvas: HTMLCanvasElement;
    theme: Theme;
    mode: 'normal' | 'presentation';
  }) => TScene;
  /** 创建控制面板（可选） */
  createControls?: (opts: {
    mount: HTMLElement;
    scene: TScene;
    onStatus?: (text: string) => void;
  }) => unknown;
  /** 格式化读数数据（可选，若场景提供 getReadoutItems 则不需要） */
  formatReadout?: (state: unknown) => ReadoutItem[];
  /** 步进间隔（秒），默认 1/60 */
  stepSeconds?: number;
  /** 最大子步数，默认 5 */
  maxSubSteps?: number;
};

/**
 * 场景适配器
 *
 * 将场景实例适配为标准 Scene 接口，供 SceneContainer 使用。
 * 核心职责：
 * - 延迟控制面板创建（如果 renderControl 在 renderAnimation 之前被调用）
 * - 桥接场景生命周期到容器（init / resize / theme / mode）
 * - 聚合场景状态并通知布局刷新
 * - 管理运输控制循环（play/pause/step/reset/speed）
 */
export class SceneAdapter<
  TScene extends SceneInstance = SceneInstance
> implements Scene {
  readonly id: string;
  readonly preferredLayout: string;

  private scene: TScene | null = null;
  private controls: unknown = null;
  private lifecycle = createPageLifecycle();
  private transport: ReturnType<typeof createSceneShell> | null = null;
  private slots: LayoutSlots | null = null;
  private currentState: unknown = null;
  private _readoutItems: ReadoutItem[] = [];
  private listeners: (() => void)[] = [];
  private _deferredControlContainer: HTMLElement | null = null;

  constructor(
    private options: ScenePageOptions<TScene>,
    private layoutUpdateStatus?: (text: string) => void
  ) {
    this.id = options.meta.id;
    this.preferredLayout = options.preferredLayout ?? 'split-right';
  }

  private _createControls(container: HTMLElement): void {
    if (!this.scene || !this.options.createControls) return;
    this.controls =
      this.options.createControls({
        mount: container,
        scene: this.scene,
        onStatus: (text) => this.layoutUpdateStatus?.(text)
      }) || null;
    if (this.controls) {
      this.lifecycle.onDispose(() => {
        const c = this.controls as { dispose?(): void } | null;
        c?.dispose?.();
      });
    }
  }

  renderControl(container: HTMLElement): void {
    if (!this.options.createControls) return;
    // If scene not ready yet (renderAnimation not called), defer control creation
    if (!this.scene) {
      this._deferredControlContainer = container;
      return;
    }
    this._createControls(container);
  }

  renderAnimation(container: HTMLElement): void {
    // 获取布局创建的 Canvas
    const canvas = container.querySelector(
      '.stage-canvas, .mobile-stage-canvas'
    ) as HTMLCanvasElement | null;
    if (!canvas) {
      console.error('[SceneAdapter] Canvas not found in animation slot');
      return;
    }

    // 从容器或文档获取当前主题/模式
    const root = document.querySelector('.layout-master, .teaching-demo');
    const theme =
      (root?.getAttribute('data-theme') as Theme) ||
      (document.documentElement.getAttribute('data-theme') as Theme) ||
      'light';
    const mode =
      (root?.getAttribute('data-mode') as 'normal' | 'presentation') ||
      'normal';

    this.scene = this.options.createScene({ canvas, theme, mode });

    // 初始化
    this.scene.init();

    // 创建运输控制（播放/暂停/重置/单步）
    this.transport = createSceneShell({
      stepSeconds: this.options.stepSeconds ?? 1 / 60,
      maxSubSteps: this.options.maxSubSteps ?? 5,
      onStep: (dt) => this.scene?.step(dt),
      onRender: () => this.scene?.render()
    });
    this.lifecycle.onDispose(() => this.transport?.dispose());

    // 绑定 resize
    const handleResize = () => {
      this.scene?.resize();
      this.scene?.render();
    };
    window.addEventListener('resize', handleResize);
    this.lifecycle.onDispose(() =>
      window.removeEventListener('resize', handleResize)
    );

    // 如果 renderControl 在 scene 创建之前被调用，延迟创建 controls
    if (this._deferredControlContainer) {
      this._createControls(this._deferredControlContainer);
      this._deferredControlContainer = null;
    }

    // 立即渲染
    this.scene.resize();
    this.scene.render();

    // 订阅场景状态变化
    if (this.scene.subscribe) {
      const unsubscribe = this.scene.subscribe(() => {
        this.refreshReadout();
        this.notifyListeners();
      });
      this.lifecycle.onDispose(() => unsubscribe());
    }
  }

  renderGraph(container: HTMLElement): void {
    // 如果场景支持 attachGraphCanvas，自动创建并附加图表 canvas
    const scene = this.scene as {
      attachGraphCanvas?(canvas: HTMLCanvasElement): void;
    } | null;
    if (scene && typeof scene.attachGraphCanvas === 'function') {
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.innerHTML = '';
      container.appendChild(canvas);
      scene.attachGraphCanvas(canvas);
    }
  }

  renderReadout(): void {
    // 读数由 getReadoutItems() 提供，由 SceneContainer 统一刷新
  }

  mount(): void {
    // 场景已在 renderAnimation 中初始化
  }

  unmount(): void {
    this.lifecycle.dispose();
    this.scene?.dispose();
  }

  startAll(): void {
    this.transport?.play();
    this.scene?.startAll?.();
  }

  pauseAll(): void {
    this.transport?.pause();
    this.scene?.pauseAll?.();
  }

  reset(): void {
    this.transport?.reset();
    this.scene?.reset?.();
    this.scene?.render();
    const c = this.controls as { refresh?(): void } | null;
    c?.refresh?.();
  }

  setTimeScale(scale: number): void {
    this.scene?.setTimeScale?.(scale);
  }

  setTheme(theme: Theme): void {
    this.scene?.setTheme(theme);
    this.scene?.render();
  }

  setMode(mode: 'normal' | 'presentation'): void {
    this.scene?.setMode(mode);
    this.scene?.resize();
    this.scene?.render();
  }

  getTransportState(): TransportState {
    if (this.scene?.getTransportState) {
      return this.scene.getTransportState();
    }
    // 默认从 transport 推断
    const isPlaying = this.transport
      ? ((this.transport as { transport?: { isPlaying?: boolean } }).transport
          ?.isPlaying ?? false)
      : false;
    return { isPlaying, speed: 1 };
  }

  getReadoutItems(): ReadoutItem[] {
    if (this.scene?.getReadoutItems) {
      return this.scene.getReadoutItems();
    }
    if (this.options.formatReadout && this.scene?.getState) {
      return this.options.formatReadout(this.scene.getState());
    }
    return this._readoutItems;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx > -1) this.listeners.splice(idx, 1);
    };
  }

  private refreshReadout(): void {
    if (!this.scene) return;
    if (this.scene.getReadoutItems) {
      this._readoutItems = this.scene.getReadoutItems();
    } else if (this.options.formatReadout && this.scene.getState) {
      this._readoutItems = this.options.formatReadout(this.scene.getState());
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('[SceneAdapter] Listener error:', e);
      }
    });
  }
}

/**
 * 统一启动场景页面
 *
 * 使用方式：
 * ```ts
 * bootScenePage({
 *   meta: projectileMeta,
 *   createScene: ({ canvas, theme, mode }) => createProjectileScene({ canvas, theme, mode }),
 *   createControls: ({ mount, scene }) => createProjectileControls({ mount, scene }),
 *   preferredLayout: 'split-right',
 *   layoutConfig: { hasGraph: false, defaultLeftRatio: 0.32 }
 * });
 * ```
 */
export function bootScenePage<TScene extends SceneInstance>(
  options: ScenePageOptions<TScene>
): void {
  const mount = document.getElementById('app');
  if (!mount) {
    throw new Error('Missing #app container');
  }

  // 统一注册所有布局（幂等）
  registerAllLayouts();

  // 创建场景容器
  const container = createSceneContainer({
    mount,
    defaultLayout: options.preferredLayout ?? 'split-right',
    defaultTheme: 'light',
    layoutConfig: {
      ...options.layoutConfig,
      title: options.meta.title
    }
  });

  // 创建场景适配器
  const adapter = new SceneAdapter<TScene>(options, (text) =>
    container.currentLayout?.updateStatus?.(text)
  );

  // 设置场景
  container.setScene(adapter);
}
