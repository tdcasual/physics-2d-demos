/**
 * 场景容器实现
 *
 * 管理场景和布局的协调，处理布局切换、主题切换、状态持久化
 *
 * @review-date 2026-04-02
 * @version 0.1.0
 */

import { createEventEmitter, type EventEmitter } from './event-emitter';
import {
  getBreakpoints
} from './viewport-detection';
import { layoutRegistry, saveLayoutPreference } from './registry';
import { TransportBridge } from './transport-bridge';
import { layoutSelector } from './selector';
import type { LayoutSelectionContext } from './selector';
import {
  persistState as persistStateToStorage,
  restorePersistedState as restorePersistedStateFromStorage,
  saveSceneState as saveSceneStateToStorage,
  saveLayoutState as saveLayoutStateToStorage,
  restoreLayoutState as restoreLayoutStateFromStorage,
  restoreSceneState as restoreSceneStateFromStorage
} from './container-persistence';
import { satisfiesConstraints } from './layout-constraints';
import { ContainerResizeObserver } from './container-resize-observer';
import { detectLowPowerMode } from './power-awareness';
import type {
  SceneContainer,
  Scene,
  LayoutMaster,
  LayoutThemeChangeEvent,
  LayoutModeChangeEvent,
  LayoutSlots,
  Theme,
  SwitchOptions,
  LayoutTransition,
  LayoutChangeEvent,
  CreateContainerOptions,
  SceneContainerEvents
} from './types';

/**
 * 场景容器实现类
 *
 * 管理场景和布局的协调，处理布局切换、主题切换、状态持久化
 */
export class SceneContainerImpl implements SceneContainer {
  readonly container: HTMLElement;

  private _currentLayout: LayoutMaster | null = null;
  private _currentScene: Scene | null = null;
  private _currentTheme: Theme = 'light';
  private _userPreferredLayout: string | null = null;
  private _storageKey: string;
  private _onResize?: (width: number, height: number) => void;
  private _layoutConfig?: Record<string, unknown>;
  private _transportBridge = new TransportBridge();
  private _sceneUnsubscribers: (() => void)[] = [];
  private _lowPowerMode = false;
  private _disposed = false;
  private _layoutThemeHandler?: (e: Event) => void;
  private _layoutModeHandler?: (e: Event) => void;
  private _emitter: EventEmitter<SceneContainerEvents>;
  private _resizeObserver: ContainerResizeObserver;

  constructor(options: CreateContainerOptions) {
    this._emitter = createEventEmitter<SceneContainerEvents>('SceneContainer');
    this.container = options.mount;
    this._storageKey = options.storageKey || 'physics-demos-container-state';
    this._onResize = options.onResize;
    this._currentTheme = options.defaultTheme || 'light';
    this._layoutConfig = options.layoutConfig;

    // 设置容器样式
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
    `;

    // 初始化 ResizeObserver
    this._resizeObserver = new ContainerResizeObserver(this.container, {
      getCurrentScene: () => this._currentScene,
      getUserPreferredLayout: () => this._userPreferredLayout,
      getCurrentLayoutId: () => this._currentLayout?.id || null,
      resolveLayout: (scene) => this.resolveLayout(scene),
      switchLayout: (id) => this.switchLayout(id, { animate: false }),
      notifyLayoutResize: (width, height) => this._currentLayout?.handleResize(width, height),
      onResize: options.onResize
    });
    this._resizeObserver.start();

    // 尝试恢复持久化状态
    this.restorePersistedState();

    // 初始化电量/网络感知（异步，不阻塞）
    this.initPowerAwareness();
  }

  private async initPowerAwareness(): Promise<void> {
    const lowPower = await detectLowPowerMode();
    if (!this._disposed && lowPower) {
      this._lowPowerMode = true;
    }
  }

  // Getters
  get currentLayout(): LayoutMaster | null {
    return this._currentLayout;
  }

  get currentScene(): Scene | null {
    return this._currentScene;
  }

  /**
   * 解析当前场景应使用的布局
   * 使用布局选择器，支持策略插件化
   */
  private resolveLayout(scene: Scene): string {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const { mobile, tablet } = getBreakpoints(this._layoutConfig);

    const ctx: LayoutSelectionContext = {
      viewport: { width, height },
      isMobile: width < mobile,
      isTablet: width >= mobile && width < tablet,
      isDesktop: width >= tablet,
      orientation: width >= height ? 'landscape' : 'portrait',
      userPreference: this._userPreferredLayout,
      scenePreference: scene.preferredLayout || null,
      availableLayouts: layoutRegistry.getAllMetadata()
    };

    const selected = layoutSelector.select(ctx);

    // 低功耗/弱网模式下，若用户未指定偏好，优先选择渲染负担最小的 mobile-stack
    if (this._lowPowerMode && !this._userPreferredLayout && selected !== 'mobile-stack') {
      const mobileMeta = ctx.availableLayouts.find((l) => l.id === 'mobile-stack');
      if (mobileMeta && satisfiesConstraints(mobileMeta, ctx.viewport, ctx.orientation)) {
        return 'mobile-stack';
      }
    }

    return selected;
  }

  /**
   * 设置场景
   * @param scene - 场景实例
   */
  async setScene(scene: Scene): Promise<void> {
    // 如果有旧场景，先卸载
    if (this._currentScene) {
      this.unmountCurrentScene();
    }

    this._currentScene = scene;

    // 使用布局选择器解析最佳布局（策略插件化）
    const layoutId = this.resolveLayout(scene);

    // 如果当前布局与需要的布局不同，切换布局
    if (!this._currentLayout || this._currentLayout.id !== layoutId) {
      await this.switchLayout(layoutId, { animate: false });
    } else {
      this.mountScene(scene);
    }
  }

  /**
   * 挂载场景到当前布局
   */
  private mountScene(scene: Scene, layout?: LayoutMaster): void {
    const targetLayout = layout || this._currentLayout;
    if (!targetLayout) return;

    this.cleanupSceneBindings();
    this.renderSceneToSlots(scene, targetLayout);
    this.activateSceneLifecycle(scene, targetLayout);
  }

  /** 清理旧场景的订阅和事件监听，防止重复挂载累积 */
  private cleanupSceneBindings(): void {
    this._sceneUnsubscribers.forEach((fn) => fn());
    this._sceneUnsubscribers = [];
    if (this._layoutThemeHandler) {
      this.container.removeEventListener(
        'layout:themechange',
        this._layoutThemeHandler
      );
      this._layoutThemeHandler = undefined;
    }
    if (this._layoutModeHandler) {
      this.container.removeEventListener(
        'layout:modechange',
        this._layoutModeHandler
      );
      this._layoutModeHandler = undefined;
    }
  }

  /** 将场景渲染到布局的各 slot 中 */
  private renderSceneToSlots(scene: Scene, layout: LayoutMaster): void {
    const slots = layout.getSlots?.() || {};

    if (slots.header && scene.renderHeader) {
      scene.renderHeader(slots.header);
    }
    if (slots.control && scene.renderControl) {
      scene.renderControl(slots.control);
    }
    if (slots.animation && scene.renderAnimation) {
      scene.renderAnimation(slots.animation, slots as LayoutSlots);
    }
    if (slots.graph && scene.renderGraph) {
      scene.renderGraph(slots.graph);
    }
    if (slots.readout && scene.renderReadout) {
      scene.renderReadout(slots.readout);
    }
  }

  /** 激活场景生命周期：状态恢复、同步、事件绑定、挂载 */
  private activateSceneLifecycle(scene: Scene, layout: LayoutMaster): void {
    // 恢复持久化状态
    const savedState = this.restoreSceneState(scene.id);
    if (savedState && scene.restoreState) {
      try {
        scene.restoreState(savedState);
      } catch (err) {
        console.error(
          `[SceneContainer] Failed to restore state for scene ${scene.id}:`,
          err
        );
      }
    }

    // 同步状态并订阅变化
    this._transportBridge.syncSceneStateToLayout(scene, layout);
    const unsubscribe = this._transportBridge.subscribeSceneChanges(scene, layout);
    this._sceneUnsubscribers.push(unsubscribe);

    // 绑定布局事件转发
    this.bindLayoutEventForwarders(scene, layout);

    // 绑定运输控制
    if (scene.getTransportState) {
      this._transportBridge.bindFloatingControls(layout, {
        isPlaying: () => scene.getTransportState!().isPlaying,
        onTogglePlay: () => {
          const isPlaying = scene.getTransportState!().isPlaying;
          if (isPlaying) scene.pauseAll?.();
          else scene.startAll?.();
        },
        onReset: () => scene.reset?.(),
        onSpeedChange: (speed: number) => scene.setTimeScale?.(speed),
        getSpeed: () => scene.getTransportState!().speed ?? 1
      });
    }

    scene.mount?.();
    this._emitter.emit('scene:mount', { sceneId: scene.id });
  }

  /** 绑定布局主题/模式变化事件，转发给场景 */
  private bindLayoutEventForwarders(scene: Scene, layout: LayoutMaster): void {
    this._layoutThemeHandler = (e: Event) => {
      const custom = e as LayoutThemeChangeEvent;
      if (custom.detail?.theme && scene.setTheme) {
        scene.setTheme(custom.detail.theme);
      }
    };
    this._layoutModeHandler = (e: Event) => {
      const custom = e as LayoutModeChangeEvent;
      const mode = custom.detail?.mode;
      if (!mode) return;

      if (scene.setMode) {
        scene.setMode(mode);
      }

      if (mode === 'presentation') {
        const profile = scene.getDemoProfile?.() || null;
        if (profile && layout.applyDemoProfile) {
          layout.applyDemoProfile(profile);
        }
      } else if (mode === 'normal' && layout.resetDemoProfile) {
        layout.resetDemoProfile();
      }
    };
    this.container.addEventListener(
      'layout:themechange',
      this._layoutThemeHandler
    );
    this.container.addEventListener(
      'layout:modechange',
      this._layoutModeHandler
    );
  }

  /**
   * 卸载当前场景
   */
  private unmountCurrentScene(): void {
    if (!this._currentScene) return;

    // 取消场景状态订阅
    this._sceneUnsubscribers.forEach((fn) => fn());
    this._sceneUnsubscribers = [];

    // 清理 TransportBridge
    this._transportBridge.dispose();

    // 移除布局事件监听
    if (this._layoutThemeHandler) {
      this.container.removeEventListener(
        'layout:themechange',
        this._layoutThemeHandler
      );
      this._layoutThemeHandler = undefined;
    }
    if (this._layoutModeHandler) {
      this.container.removeEventListener(
        'layout:modechange',
        this._layoutModeHandler
      );
      this._layoutModeHandler = undefined;
    }

    // 保存场景状态
    const state = this._currentScene.saveState?.();
    if (state) {
      this.saveSceneState(this._currentScene.id, state);
    }

    // 调用场景卸载生命周期
    this._currentScene.unmount?.();

    // 触发事件
    this._emitter.emit('scene:unmount', { sceneId: this._currentScene.id });

    this._currentScene = null;
  }

  /**
   * 切换布局
   */
  async switchLayout(
    layoutId: string,
    options: SwitchOptions = {}
  ): Promise<void> {
    const {
      reason = 'manual',
      animate = true,
      transition = { type: 'fade', duration: 250, easing: 'ease-in-out' },
      savePreference = false
    } = options;

    if (this._currentLayout?.id === layoutId) return;
    if (!layoutRegistry.has(layoutId)) {
      throw new Error(`Layout "${layoutId}" not found`);
    }

    const fromLayout = this._currentLayout;
    const fromId = fromLayout?.id || null;

    await this._notifyLayoutWillChange(fromId, layoutId);

    const { preservedCanvas, layoutState } = this._captureOutgoingState(fromLayout);
    if (layoutState && fromLayout?.id) {
      saveLayoutStateToStorage(this._storageKey, fromLayout.id, layoutState);
    }

    await this._teardownOutgoingLayout(fromLayout, animate, transition);
    this.container.replaceChildren();

    const newLayout = await this._setupIncomingLayout(layoutId, preservedCanvas);
    this._currentLayout = newLayout;

    await this._finalizeLayoutSwitch(newLayout, fromId, layoutId, reason, animate, transition, savePreference);
  }

  private async _notifyLayoutWillChange(fromId: string | null, toId: string): Promise<void> {
    if (this._currentScene?.onLayoutWillChange) {
      await this._currentScene.onLayoutWillChange(fromId || '', toId);
    }
  }

  private _captureOutgoingState(fromLayout: LayoutMaster | null): {
    preservedCanvas: HTMLCanvasElement | null;
    layoutState: Record<string, unknown> | undefined;
  } {
    const preservedCanvas = fromLayout?.getSlots?.()?.animation
      ?.querySelector<HTMLCanvasElement>('canvas') ?? null;
    const layoutState = fromLayout?.getLayoutState?.();
    return { preservedCanvas, layoutState };
  }

  private async _teardownOutgoingLayout(
    fromLayout: LayoutMaster | null,
    animate: boolean,
    transition: LayoutTransition
  ): Promise<void> {
    if (fromLayout && animate) {
      await fromLayout.exit(transition);
    }
    if (fromLayout) {
      await fromLayout.unmount();
    }
  }

  private async _setupIncomingLayout(
    layoutId: string,
    preservedCanvas: HTMLCanvasElement | null
  ): Promise<LayoutMaster> {
    const newLayout = layoutRegistry.create(layoutId, this.container, {
      theme: this._currentTheme,
      ...(this._layoutConfig || {})
    });

    await newLayout.mount();
    newLayout.setTheme(this._currentTheme);

    const savedLayoutState = restoreLayoutStateFromStorage(this._storageKey, layoutId);
    if (savedLayoutState) {
      newLayout.restoreLayoutState?.(savedLayoutState);
    }

    if (preservedCanvas && newLayout.replaceSlotElement) {
      const replaced = newLayout.replaceSlotElement('animation', preservedCanvas);
      if (replaced) {
        replaced.remove();
      }
    }

    if (this._currentScene) {
      this.mountScene(this._currentScene, newLayout);
    }

    return newLayout;
  }

  private async _finalizeLayoutSwitch(
    newLayout: LayoutMaster,
    fromId: string | null,
    layoutId: string,
    reason: string,
    animate: boolean,
    transition: LayoutTransition,
    savePreference: boolean
  ): Promise<void> {
    if (animate) {
      try {
        await newLayout.enter({ ...transition, easing: 'ease-out' });
      } catch {
        // 动画被中断或失败，布局本身已可用
      }
    }

    this._currentScene?.onLayoutDidChange?.(layoutId);

    const event: LayoutChangeEvent = { from: fromId, to: layoutId, reason };
    this._emitter.emit('layout:change', event);

    if (savePreference) {
      this.setUserPreferredLayout(layoutId);
    }
  }

  /**
   * 设置用户偏好的布局
   */
  setUserPreferredLayout(layoutId: string): void {
    this._userPreferredLayout = layoutId;
    saveLayoutPreference(layoutId);
    this.persistState();
  }

  /**
   * 获取用户偏好的布局
   */
  getUserPreferredLayout(): string | null {
    return this._userPreferredLayout;
  }

  /**
   * 设置主题
   */
  setTheme(theme: Theme): void {
    if (this._currentTheme === theme) return;

    const fromTheme = this._currentTheme;
    this._currentTheme = theme;

    // 应用到当前布局
    this._currentLayout?.setTheme(theme);

    // 触发事件
    this._emitter.emit('theme:change', { from: fromTheme, to: theme });

    // 持久化状态
    this.persistState();

    // theme changed
  }

  /**
   * 获取当前主题
   */
  getTheme(): Theme {
    return this._currentTheme;
  }

  /**
   * 保存状态到 localStorage
   */
  persistState(): void {
    persistStateToStorage(
      this._storageKey,
      this._currentTheme,
      this._userPreferredLayout
    );
  }

  /**
   * 从 localStorage 恢复状态
   */
  restorePersistedState(): void {
    const restored = restorePersistedStateFromStorage(this._storageKey);
    if (restored?.theme) {
      this._currentTheme = restored.theme;
    }
    if (restored?.preferredLayout) {
      this._userPreferredLayout = restored.preferredLayout;
    }
  }

  /**
   * 保存场景状态
   */
  private saveSceneState(sceneId: string, state: object): void {
    saveSceneStateToStorage(this._storageKey, sceneId, state);
  }

  /**
   * 恢复场景状态
   */
  restoreSceneState(sceneId: string): object | null {
    return restoreSceneStateFromStorage(this._storageKey, sceneId);
  }



/**
   * 添加事件监听
   */
  on<K extends keyof SceneContainerEvents>(
    event: K,
    listener: (payload: SceneContainerEvents[K]) => void
  ): () => void {
    return this._emitter.on(event, listener);
  }

  /**
   * 销毁容器
   */
  dispose(): void {
    this._disposed = true;

    // 卸载场景
    this.unmountCurrentScene();

    // 卸载布局
    this._currentLayout?.unmount();
    this._currentLayout = null;

    // 停止 ResizeObserver
    this._resizeObserver.stop();

    // 清空容器
    this.container.replaceChildren();

    // 清空监听器
    this._emitter.clear();

    // 清理 TransportBridge
    this._transportBridge.dispose();

    // container disposed
  }
}

/**
 * 创建场景容器的便捷函数
 */
export function createSceneContainer(
  options: CreateContainerOptions
): SceneContainer {
  return new SceneContainerImpl(options);
}
