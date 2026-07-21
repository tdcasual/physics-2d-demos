/**
 * 场景容器实现
 *
 * 管理场景和布局的协调，处理布局切换、主题切换、状态持久化
 *
 * @review-date 2026-04-02
 * @version 0.2.0
 */

import { createEventEmitter, type EventEmitter } from './event-emitter';
import { getBreakpoints } from './viewport-detection';
import { layoutRegistry, saveLayoutPreference } from './registry';

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
import { CapabilityOrchestrator } from './capability-orchestrator';
import { renderSceneToSlots } from './scene-slot-renderer';
import {
  buildCapabilityContext,
  updateCapabilityInstances
} from './capability-context';
import type {
  SceneContainer,
  Scene,
  LayoutConfig,
  Theme,
  SwitchOptions,
  LayoutTransition,
  LayoutChangeEvent,
  CreateContainerOptions,
  SceneContainerEvents,
  CapabilityContext,
  ILayout
} from './types';

/**
 * 场景容器实现类
 *
 * 管理场景和布局的协调，处理布局切换、主题切换、状态持久化
 */
export class SceneContainerImpl implements SceneContainer {
  readonly container: HTMLElement;

  private _currentLayout: ILayout | null = null;
  private _currentScene: Scene | null = null;
  private _currentTheme: Theme = 'light';
  private _userPreferredLayout: string | null = null;
  private _storageKey: string;
  private _onResize?: (width: number, height: number) => void;
  private _layoutConfig?: Record<string, unknown>;

  private _lowPowerMode = false;
  private _disposed = false;
  private _switching = false;
  private _pendingScene: Scene | null = null;
  private _emitter: EventEmitter<SceneContainerEvents>;
  private _resizeObserver: ContainerResizeObserver;
  private _orchestrator = new CapabilityOrchestrator();

  constructor(options: CreateContainerOptions) {
    this._emitter = createEventEmitter<SceneContainerEvents>('SceneContainer');
    this.container = options.mount;
    this._storageKey = options.storageKey || 'physics-demos-container-state';
    this._onResize = options.onResize;
    this._currentTheme = options.defaultTheme || 'light';
    this._layoutConfig = options.layoutConfig;

    // 设置容器基础样式（尺寸由各布局自行声明）
    this.container.style.cssText = `
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
      getSwitching: () => this._switching,
      notifyLayoutResize: (width, height) =>
        this._currentLayout?.handleResize(width, height),
      onResize: options.onResize
    });
    this._resizeObserver.start();

    // 尝试恢复持久化状态
    this.restorePersistedState();

    // 初始化电量/网络感知（异步，不阻塞）
    this.initPowerAwareness();
  }

  private async initPowerAwareness(): Promise<void> {
    try {
      const lowPower = await detectLowPowerMode();
      if (!this._disposed && lowPower) {
        this._lowPowerMode = true;
      }
    } catch {
      // Battery API not available or permission denied — non-critical
    }
  }

  // Getters
  get currentLayout(): ILayout | null {
    return this._currentLayout as ILayout | null;
  }

  get currentScene(): Scene | null {
    return this._currentScene;
  }

  /**
   * 解析当前场景应使用的布局
   * 使用布局选择器，支持策略插件化
   */
  private resolveLayout(scene: Scene): string {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
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
    if (
      this._lowPowerMode &&
      !this._userPreferredLayout &&
      selected !== 'mobile-stack'
    ) {
      const mobileMeta = ctx.availableLayouts.find(
        (l) => l.id === 'mobile-stack'
      );
      if (
        mobileMeta &&
        satisfiesConstraints(mobileMeta, ctx.viewport, ctx.orientation)
      ) {
        return 'mobile-stack';
      }
    }

    return selected;
  }

  /**
   * 设置场景
   * 如果布局切换正在进行中，将请求排队，切换完成后自动处理。
   * @param scene - 场景实例
   */
  async setScene(scene: Scene): Promise<void> {
    if (this._disposed) return;

    // 如果布局切换正在进行中，排队等待
    if (this._switching) {
      this._pendingScene = scene;
      return;
    }

    await this._doSetScene(scene);
  }

  private async _doSetScene(scene: Scene): Promise<void> {
    if (this._currentScene) {
      this.unmountCurrentScene();
    }

    this._currentScene = scene;

    const layoutId = this.resolveLayout(scene);

    if (!this._currentLayout || this._currentLayout.id !== layoutId) {
      await this.switchLayout(layoutId, { animate: false });
    } else {
      this.mountScene(scene);
    }
  }

  /**
   * 挂载场景到当前布局
   */
  private mountScene(scene: Scene, layout?: ILayout): void {
    const targetLayout = layout || this._currentLayout;
    if (!targetLayout) return;

    renderSceneToSlots(scene, targetLayout);
    this.activateSceneLifecycle(scene, targetLayout);
  }

  /** 激活场景生命周期：状态恢复、Capability 装配、事件绑定、挂载 */
  private activateSceneLifecycle(scene: Scene, layout: ILayout): void {
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

    const slots = layout.getSlots?.() || {};

    // Auto-wire capabilities
    if (Array.isArray(layout.capabilities)) {
      const ctx = this._buildCapabilityContext(scene);
      this._orchestrator.wire(layout, scene, slots, ctx);
    }

    scene.mount?.();
    this._emitter.emit('scene:mount', { sceneId: scene.id });
  }

  /** 构建 CapabilityContext — 桥接容器状态与 capability 运行时 */
  private _buildCapabilityContext(scene: Scene | null): CapabilityContext {
    return buildCapabilityContext({
      container: this.container,
      scene,
      getTheme: () => this._currentTheme,
      setTheme: (t: Theme) => this.setTheme(t),
      getCurrentLayoutId: () => this._currentLayout?.id ?? '',
      switchLayout: (id: string, save = true) => {
        this.switchLayout(id, { animate: true, savePreference: save });
      },
      getAvailableLayouts: () => {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        const orientation: 'portrait' | 'landscape' =
          w >= h ? 'landscape' : 'portrait';
        return layoutRegistry
          .getAllMetadata()
          .filter((m) =>
            satisfiesConstraints(m, { width: w, height: h }, orientation)
          )
          .map((m) => ({ id: m.id, name: m.name }));
      },
      emit: (event, payload) => this._emitter.emit(event, payload),
      on: (event, handler) => this._emitter.on(event, handler),
      updateDemoProfileInstances: (payload) => {
        updateCapabilityInstances(
          this._orchestrator.getInstances('demo-profile'),
          payload
        );
      }
    });
  }

  /**
   * 卸载当前场景
   */
  private unmountCurrentScene(): void {
    if (!this._currentScene) return;

    const scene = this._currentScene;

    // 取消场景状态订阅
    this._orchestrator.cleanupSceneBindings();

    // 保存场景状态
    try {
      const state = scene.saveState?.();
      if (state) {
        this.saveSceneState(scene.id, state);
      }
    } catch (err) {
      console.error(
        `[SceneContainer] Failed to save state for scene ${scene.id}:`,
        err
      );
    }

    // 调用场景卸载生命周期 — 必须在 null 赋值前确保执行
    try {
      scene.unmount?.();
    } catch (err) {
      console.error(`[SceneContainer] Scene ${scene.id} unmount threw:`, err);
    }

    // 触发事件
    try {
      this._emitter.emit('scene:unmount', { sceneId: scene.id });
    } catch {
      /* emitter error non-fatal */
    }

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
    if (this._disposed) return;
    if (!layoutRegistry.has(layoutId)) {
      throw new Error(`Layout "${layoutId}" not found`);
    }
    if (this._switching) return;

    const SWITCH_TIMEOUT_MS = 10_000;
    const safetyTimer = setTimeout(() => {
      if (this._switching && !this._disposed) {
        console.warn(
          '[SceneContainer] Layout switch timed out after 10s — resetting _switching'
        );
      }
      this._switching = false;
    }, SWITCH_TIMEOUT_MS);

    this._switching = true;
    const fromLayout = this._currentLayout;
    const fromId = fromLayout?.id || null;

    // Save focused element before tearing down DOM (avoid focus loss to <body>)
    const activeEl = document.activeElement as HTMLElement | null;
    const focusClass =
      activeEl && this.container.contains(activeEl) ? activeEl.className : null;

    try {
      await this._notifyLayoutWillChange(fromId, layoutId);
      if (this._disposed) return;

      const { preservedCanvas, layoutState } =
        this._captureOutgoingState(fromLayout);
      if (layoutState && fromLayout?.id) {
        saveLayoutStateToStorage(this._storageKey, fromLayout.id, layoutState);
      }

      await this._teardownOutgoingLayout(fromLayout, animate, transition);
      if (this._disposed) return;
      this._currentLayout = null;
      if (this.container.childElementCount > 0) {
        this.container.replaceChildren();
      }

      const newLayout = await this._setupIncomingLayout(
        layoutId,
        preservedCanvas
      );
      if (this._disposed) return;

      await this._finalizeLayoutSwitch(
        newLayout,
        fromId,
        layoutId,
        reason,
        animate,
        transition,
        savePreference
      );

      // Restore focus to a similar element in the new layout
      if (focusClass) {
        try {
          const el = this.container.querySelector(
            `.${focusClass.split(/\s+/).join('.')}`
          ) as HTMLElement | null;
          if (el && typeof el.focus === 'function') el.focus();
        } catch {
          /* invalid selector from className — non-critical */
        }
      }
    } catch (err) {
      console.error('[SceneContainer] Layout switch failed:', err);

      // Attempt to recover the old layout from the pool so the container
      // isn't left in a blank state.
      if (fromId && !this._disposed) {
        try {
          const recovered = layoutRegistry.create(fromId, this.container, {
            theme: this._currentTheme,
            ...((this._layoutConfig || {}) as LayoutConfig)
          });
          await recovered.mount();
          recovered.setTheme(this._currentTheme);
          if (this._currentScene) {
            this.mountScene(this._currentScene, recovered);
          }
          this._currentLayout = recovered;
          console.warn(
            `[SceneContainer] Recovered layout "${fromId}" after switch failure`
          );
        } catch (recoveryErr) {
          console.error(
            '[SceneContainer] Recovery also failed, container is empty:',
            recoveryErr
          );
          this.container.replaceChildren();
        }
      }
    } finally {
      clearTimeout(safetyTimer);
      this._switching = false;

      // 处理在切换期间排队的 setScene 请求
      if (this._pendingScene && !this._disposed) {
        const pending = this._pendingScene;
        this._pendingScene = null;
        this._doSetScene(pending).catch((err) => {
          console.error('[SceneContainer] Pending setScene failed:', err);
        });
      }
    }
  }

  private async _notifyLayoutWillChange(
    fromId: string | null,
    toId: string
  ): Promise<void> {
    if (this._currentScene?.onLayoutWillChange) {
      await this._currentScene.onLayoutWillChange(fromId || '', toId);
    }
  }

  private _captureOutgoingState(fromLayout: ILayout | null): {
    preservedCanvas: HTMLCanvasElement | null;
    layoutState: Record<string, unknown> | undefined;
  } {
    const preservedCanvas =
      fromLayout
        ?.getSlots?.()
        ?.animation?.querySelector<HTMLCanvasElement>('canvas') ?? null;
    const layoutState = fromLayout?.getLayoutState?.();
    return { preservedCanvas, layoutState };
  }

  private async _teardownOutgoingLayout(
    fromLayout: ILayout | null,
    animate: boolean,
    transition: LayoutTransition
  ): Promise<void> {
    if (fromLayout && animate) {
      try {
        await fromLayout.exit?.(transition);
      } catch (err) {
        console.warn('[SceneContainer] Layout exit animation failed:', err);
      }
    }
    if (fromLayout) {
      await fromLayout.unmount();
      layoutRegistry.returnInstance(fromLayout.id, fromLayout);
    }
  }

  private async _setupIncomingLayout(
    layoutId: string,
    preservedCanvas: HTMLCanvasElement | null
  ): Promise<ILayout> {
    if (this._disposed)
      throw new Error('Container disposed before layout setup');

    // Reset grid-specific inline styles from previous layout to prevent
    // grid styles from a split layout corrupting e.g. mobile-stack.
    // Do NOT reset height/overflow — those are essential container-level
    // properties set by the constructor.
    this.container.style.display = '';
    this.container.style.gridTemplateColumns = '';
    this.container.style.gridTemplateRows = '';

    const newLayout = layoutRegistry.create(layoutId, this.container, {
      theme: this._currentTheme,
      ...((this._layoutConfig || {}) as LayoutConfig),
      preservedCanvas
    });

    await newLayout.mount();
    this._currentLayout = newLayout;
    newLayout.setTheme(this._currentTheme);

    const savedLayoutState = restoreLayoutStateFromStorage(
      this._storageKey,
      layoutId
    );
    if (savedLayoutState) {
      newLayout.restoreLayoutState?.(savedLayoutState);
    }

    if (this._currentScene) {
      this.mountScene(this._currentScene, newLayout);
    }

    return newLayout;
  }

  private async _finalizeLayoutSwitch(
    newLayout: ILayout,
    fromId: string | null,
    layoutId: string,
    reason: string,
    animate: boolean,
    transition: LayoutTransition,
    savePreference: boolean
  ): Promise<void> {
    if (animate) {
      try {
        await newLayout.enter?.({
          ...transition,
          easing: 'ease-out'
        });
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
    if (this._disposed) return;
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
    if (this._disposed) return;
    if (this._currentTheme === theme) return;

    const fromTheme = this._currentTheme;
    this._currentTheme = theme;

    // 集中化管理：统一设置 document.documentElement
    document.documentElement.setAttribute('data-theme', theme);

    // 应用到当前布局
    this._currentLayout?.setTheme(theme);

    // 通知场景更新主题（canvas 绘制依赖主题颜色，SceneAdapter.setTheme 内会触发 re-render）
    try {
      this._currentScene?.setTheme?.(theme);
    } catch (err) {
      console.error('[SceneContainer] scene.setTheme failed:', err);
    }

    // 触发事件
    this._emitter.emit('theme:change', { from: fromTheme, to: theme });

    // 持久化状态
    this.persistState();
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

    // 卸载场景（有独立错误边界）
    try {
      this.unmountCurrentScene();
    } catch (err) {
      console.error(
        '[SceneContainer] Error during scene unmount in dispose:',
        err
      );
      this._currentScene = null;
    }

    // 卸载布局
    try {
      this._currentLayout?.unmount();
    } catch (err) {
      console.error(
        '[SceneContainer] Error during layout unmount in dispose:',
        err
      );
    }
    // 归还布局实例到池（不清理全局池，避免影响其他容器）
    if (this._currentLayout) {
      layoutRegistry.returnInstance(
        this._currentLayout.id,
        this._currentLayout
      );
    }
    this._currentLayout = null;

    // 清理 Capability 实例
    try {
      this._orchestrator.dispose();
    } catch (err) {
      console.error(
        '[SceneContainer] Error during capability cleanup in dispose:',
        err
      );
    }

    // 停止 ResizeObserver
    try {
      this._resizeObserver.stop();
    } catch (err) {
      console.error('[SceneContainer] Error stopping ResizeObserver:', err);
    }

    // 清空容器
    try {
      this.container.replaceChildren();
      this.container.style.display = '';
      this.container.style.gridTemplateColumns = '';
      this.container.style.gridTemplateRows = '';
    } catch (err) {
      console.error('[SceneContainer] Error clearing container:', err);
    }

    // 清空监听器
    this._emitter.clear();
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
