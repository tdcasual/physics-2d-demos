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
import type {
  SceneContainer,
  Scene,
  LayoutMaster,
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
  private _resizeObserver: ResizeObserver | null = null;
  private _onResize?: (width: number, height: number) => void;
  private _layoutConfig?: Record<string, unknown>;
  private _transportBridge = new TransportBridge();
  private _sceneUnsubscribers: (() => void)[] = [];
  private _lowPowerMode = false;
  private _disposed = false;
  private _layoutThemeHandler?: (e: Event) => void;
  private _layoutModeHandler?: (e: Event) => void;
  private _emitter: EventEmitter<SceneContainerEvents>;

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
    this.initResizeObserver();

    // 尝试恢复持久化状态
    this.restorePersistedState();

    // 初始化电量/网络感知（异步，不阻塞）
    this.initPowerAwareness();
  }

  private async initPowerAwareness(): Promise<void> {
    try {
      // 低电量检测
      if ('getBattery' in navigator) {
        const battery = await (navigator as unknown as { getBattery(): Promise<{ charging: boolean; level: number }> }).getBattery();
        if (this._disposed) return;
        if (!battery.charging && battery.level < 0.2) {
          this._lowPowerMode = true;
        }
      }
      // 弱网/省流量检测
      if ('connection' in navigator) {
        const conn = (navigator as unknown as { connection: { saveData?: boolean; effectiveType?: string } }).connection;
        if (this._disposed) return;
        if (conn.saveData || /2g|slow-2g/.test(conn.effectiveType || '')) {
          this._lowPowerMode = true;
        }
      }
    } catch {
      // API 不可用，忽略
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
      (scene.renderAnimation as (c: HTMLElement, s?: LayoutSlots) => void).call(
        scene,
        slots.animation,
        slots as LayoutSlots
      );
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
      const custom = e as CustomEvent<{ theme: Theme }>;
      if (custom.detail?.theme && scene.setTheme) {
        scene.setTheme(custom.detail.theme);
      }
    };
    this._layoutModeHandler = (e: Event) => {
      const custom = e as CustomEvent<{ mode: 'normal' | 'presentation' }>;
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

    // 检查是否已经是当前布局
    if (this._currentLayout?.id === layoutId) {
      return;
    }

    // 检查布局是否存在
    if (!layoutRegistry.has(layoutId)) {
      throw new Error(`Layout "${layoutId}" not found`);
    }

    const fromLayout = this._currentLayout;
    const fromId = fromLayout?.id || null;

    // layout switch begins

    // 通知场景布局即将变化
    if (this._currentScene?.onLayoutWillChange) {
      await this._currentScene.onLayoutWillChange(fromId || '', layoutId);
    }

    // 保存旧 canvas，以便布局切换时复用，避免闪烁和内容丢失
    const preservedCanvas = fromLayout?.getSlots?.()?.animation
      ?.querySelector('canvas') as HTMLCanvasElement | null;

    // 保存旧布局状态（侧边栏比例、读数面板折叠等）
    if (fromLayout?.id) {
      const layoutState = fromLayout.getLayoutState?.();
      if (layoutState) {
        saveLayoutStateToStorage(this._storageKey, fromLayout.id, layoutState);
      }
    }

    // 退出当前布局动画
    if (fromLayout && animate) {
      await fromLayout.exit(transition);
    }

    // 卸载当前布局
    if (fromLayout) {
      await fromLayout.unmount();
    }

    // 清空容器
    this.container.replaceChildren();

    // 创建并挂载新布局（事务准备阶段）
    const newLayout = layoutRegistry.create(layoutId, this.container, {
      theme: this._currentTheme,
      ...(this._layoutConfig || {})
    });

    await newLayout.mount();
    newLayout.setTheme(this._currentTheme);

    // 恢复新布局的持久化状态（侧边栏比例等）
    const savedLayoutState = restoreLayoutStateFromStorage(this._storageKey, layoutId);
    if (savedLayoutState) {
      newLayout.restoreLayoutState?.(savedLayoutState);
    }

    // 将旧 canvas 注入新布局，消除 DOM 重建导致的闪烁
    if (preservedCanvas && newLayout.replaceSlotElement) {
      const replaced = newLayout.replaceSlotElement('animation', preservedCanvas);
      if (replaced) {
        replaced.remove();
      }
    }

    // 如果有场景，重新渲染到新的布局
    if (this._currentScene) {
      this.mountScene(this._currentScene, newLayout);
    }

    // 事务提交：mount 成功后立即更新引用（enter 动画失败不影响布局可用性）
    this._currentLayout = newLayout;

    // 进入动画（可选视觉效果，失败不破坏状态）
    if (animate) {
      try {
        const enterTransition: LayoutTransition = {
          ...transition,
          easing: 'ease-out'
        };
        await newLayout.enter(enterTransition);
      } catch {
        // 动画被中断或失败，布局本身已可用
      }
    }

    // 通知场景布局已变化
    this._currentScene?.onLayoutDidChange?.(layoutId);

    // 触发事件
    const event: LayoutChangeEvent = { from: fromId, to: layoutId, reason };
    this._emitter.emit('layout:change', event);

    // 保存用户偏好
    if (savePreference) {
      this.setUserPreferredLayout(layoutId);
    }

    // layout switch complete
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
   * 初始化 ResizeObserver
   */
  private initResizeObserver(): void {
    if (!window.ResizeObserver) return;

    let lastLayoutId = this._currentLayout?.id || null;

    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // 使用选择器重新计算最佳布局（支持多断点、约束等）
        if (this._currentScene && !this._userPreferredLayout) {
          const newLayoutId = this.resolveLayout(this._currentScene);
          if (newLayoutId !== lastLayoutId) {
            lastLayoutId = newLayoutId;
            this.debounceLayoutSwitch(newLayoutId);
          }
        }

        // 通知布局
        this._currentLayout?.handleResize(width, height);

        // 回调
        this._onResize?.(width, height);
      }
    });

    this._resizeObserver.observe(this.container);
  }

  private _layoutSwitchTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 防抖处理布局切换
   * @param targetLayoutId - 目标布局 ID（由选择器解析得出）
   */
  private debounceLayoutSwitch(targetLayoutId: string): void {
    if (this._layoutSwitchTimer) {
      clearTimeout(this._layoutSwitchTimer);
    }
    this._layoutSwitchTimer = setTimeout(() => {
      if (targetLayoutId !== this._currentLayout?.id) {
        this.switchLayout(targetLayoutId, { animate: false });
      }
    }, 300);
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
    // 清除布局切换防抖定时器
    if (this._layoutSwitchTimer) {
      clearTimeout(this._layoutSwitchTimer);
      this._layoutSwitchTimer = null;
    }

    // 卸载场景
    this.unmountCurrentScene();

    // 卸载布局
    this._currentLayout?.unmount();
    this._currentLayout = null;

    // 断开 ResizeObserver
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

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
