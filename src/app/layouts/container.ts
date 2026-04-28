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
import { capabilityFactories } from './capabilities';
import type {
  SceneContainer,
  Scene,
  LayoutSlots,
  Theme,
  SwitchOptions,
  LayoutTransition,
  LayoutChangeEvent,
  CreateContainerOptions,
  SceneContainerEvents
} from './types';
import type { ILayout, CapabilityContext, CapabilityInstance, CapabilityEvents } from './core/types';

/** ILayout 子集：支持 enter/exit 动画钩子（旧布局兼容，无实现则为 no-op） */
type LayoutWithAnimation = ILayout & {
  enter?(transition: LayoutTransition): Promise<void>;
  exit?(transition: LayoutTransition): Promise<void>;
};

/**
 * 场景容器实现类
 *
 * 管理场景和布局的协调，处理布局切换、主题切换、状态持久化
 */
export class SceneContainerImpl implements SceneContainer {
  readonly container: HTMLElement;

  private _currentLayout: (ILayout) | null = null;
  private _currentScene: Scene | null = null;
  private _currentTheme: Theme = 'light';
  private _userPreferredLayout: string | null = null;
  private _storageKey: string;
  private _onResize?: (width: number, height: number) => void;
  private _layoutConfig?: Record<string, unknown>;

  private _sceneUnsubscribers: (() => void)[] = [];
  private _lowPowerMode = false;
  private _disposed = false;
  private _switching = false;
  private _emitter: EventEmitter<SceneContainerEvents>;
  private _resizeObserver: ContainerResizeObserver;
  private _capabilityInstances = new Map<string, CapabilityInstance[]>();

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
      getSwitching: () => this._switching,
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
    if (this._disposed) return;

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
  private mountScene(scene: Scene, layout?: ILayout): void {
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
  }

  /** 将场景渲染到布局的各 slot 中。先清空 slot 防止旧场景 DOM 累积。 */
  private renderSceneToSlots(scene: Scene, layout: ILayout): void {
    const slots = layout.getSlots?.() || {};

    // 清空 slot 再渲染：旧场景的 unmount() 可能未清理 DOM。
    // capability 元素会在后续 wireCapabilities 中重建。
    // 注意：不清理 animation slot —— canvas 由布局创建，必须保留
    // 供 scene.renderAnimation() -> querySelector('canvas') 查找。
    if (slots.header) { slots.header.innerHTML = ''; }
    if (slots.control) { slots.control.innerHTML = ''; }
    if (slots.graph) { slots.graph.innerHTML = ''; }
    if (slots.readout) { slots.readout.innerHTML = ''; }

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

  /** Capabilities scoped to ctx.container (not layout slots) — survive layout switches */
  private static readonly CONTAINER_SCOPED_CAPS = new Set([
    'theme-toggle', 'mode-toggle', 'demo-profile', 'debug-overlay'
  ]);

  /**
   * 为 ILayout 自动装配 Capability
   * 遍历 layout.capabilities 声明，创建实例并绑定到 scene。
   * 容器作用域的 capability 在布局切换时保留，避免不必要的销毁+重建。
   */
  private wireCapabilities(layout: ILayout, scene: Scene | null, slots: Partial<LayoutSlots>): void {
    // Preserve container-scoped instances before disposal (they survive layout switches)
    const preserved = new Map<string, CapabilityInstance[]>();
    for (const id of SceneContainerImpl.CONTAINER_SCOPED_CAPS) {
      const insts = this._capabilityInstances.get(id);
      if (insts && insts.length > 0) {
        preserved.set(id, [...insts]);
      }
    }

    // Dispose slot-dependent instances; keep container-scoped ones
    this._capabilityInstances.forEach((insts, id) => {
      if (SceneContainerImpl.CONTAINER_SCOPED_CAPS.has(id)) return;
      insts.forEach((inst) => inst.dispose());
    });
    this._capabilityInstances.clear();

    const ctx: CapabilityContext = {
      container: this.container,
      getTheme: () => this._currentTheme,
      setTheme: (t: Theme) => this.setTheme(t),
      getMode: () => (this.container.getAttribute('data-mode') === 'presentation' ? 'presentation' : 'normal'),
      setMode: (m: 'normal' | 'presentation') => {
        this.container.setAttribute('data-mode', m);
        const profile = m === 'presentation' ? (scene?.getDemoProfile?.() || null) : null;
        this._emitter.emit('layout:mode', { mode: m, profile });
        this.container.dispatchEvent(
          new CustomEvent('layout:modechange', { detail: { mode: m, profile }, bubbles: true })
        );
        (this._capabilityInstances.get('demo-profile') || []).forEach((inst) => {
          inst.update?.({ mode: m, profile });
        });
        scene?.setMode?.(m);
      },
      on: <K extends keyof CapabilityEvents>(
        event: K,
        handler: (payload: CapabilityEvents[K]) => void
      ) => {
        if (event === 'modechange') {
          return this._emitter.on(
            'layout:mode',
            (payload) => handler(payload as CapabilityEvents['modechange'])
          );
        }
        return () => {};
      }
    };

    const seenIds = new Set<string>();

    for (const decl of layout.capabilities ?? []) {
      const factory = capabilityFactories[decl.id];
      if (!factory) {
        console.warn(`[SceneContainer] Unknown capability: ${decl.id}`);
        continue;
      }

      if (seenIds.has(decl.id) && decl.id !== 'resizer') {
        console.warn(`[SceneContainer] Duplicate capability "${decl.id}" — skipping second instance`);
        continue;
      }
      seenIds.add(decl.id);

      // Reuse preserved container-scoped instance if available
      if (SceneContainerImpl.CONTAINER_SCOPED_CAPS.has(decl.id) && preserved.has(decl.id)) {
        const reused = preserved.get(decl.id)!;
        this._capabilityInstances.set(decl.id, reused);
        preserved.delete(decl.id); // consumed
        if (scene) {
          reused.forEach((inst) => this._bindCapabilityToScene(decl.id, inst, scene));
        }
        continue;
      }

      try {
        const def = factory(decl.config);
        // IMPORTANT: mount() must be atomic — if it throws after creating DOM
        // elements, the container has no way to clean them up. Each mount()
        // implementation is responsible for its own cleanup on failure.
        const instance = def.mount(slots as LayoutSlots, decl.config ?? {}, ctx);
        const existing = this._capabilityInstances.get(decl.id) || [];
        existing.push(instance);
        this._capabilityInstances.set(decl.id, existing);

        if (scene) {
          this._bindCapabilityToScene(decl.id, instance, scene);
        }
      } catch (err) {
        console.error(`[SceneContainer] Failed to mount capability ${decl.id}:`, err);
      }
    }

    // Dispose any preserved instances not consumed by the new layout
    preserved.forEach((insts) => insts.forEach((inst) => inst.dispose()));
  }

  /** Bind a capability instance to the scene's data/control methods */
  private _bindCapabilityToScene(
    id: string,
    instance: CapabilityInstance,
    scene: Scene
  ): void {
    switch (id) {
      case 'transport-bar':
        // Wire scene → capability: state sync for display
        if (scene.getTransportState && instance.update) {
          instance.update(scene.getTransportState());
        }
        if (scene.subscribe) {
          const unsub = scene.subscribe(() => {
            if (scene.getTransportState && instance.update) {
              instance.update(scene.getTransportState());
            }
          });
          this._sceneUnsubscribers.push(unsub);
        }
        // Wire capability → scene: button/slider callbacks
        if (instance.setCallbacks) {
          instance.setCallbacks({
            isPlaying: () => scene.getTransportState?.()?.isPlaying ?? false,
            onTogglePlay: () => {
              const state = scene.getTransportState?.();
              if (state?.isPlaying) {
                scene.pauseAll?.();
              } else {
                scene.startAll?.();
              }
            },
            onReset: () => scene.reset?.(),
            onSpeedChange: (speed: number) => scene.setTimeScale?.(speed),
            getSpeed: () => scene.getTransportState?.()?.speed ?? 1
          });
        }
        break;

      case 'readout-panel':
        if (scene.getReadoutItems && instance.update) {
          instance.update(scene.getReadoutItems());
        }
        if (scene.subscribe) {
          const unsub = scene.subscribe(() => {
            if (scene.getReadoutItems && instance.update) {
              instance.update(scene.getReadoutItems());
            }
          });
          this._sceneUnsubscribers.push(unsub);
        }
        break;
    }
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

    // Auto-wire capabilities (all layouts are ILayout with capabilities)
    if (this._isILayout(layout)) {
      this.wireCapabilities(layout, scene, slots);
    }

    scene.mount?.();
    this._emitter.emit('scene:mount', { sceneId: scene.id });
  }

  /** Check if a layout object has a capabilities array (v2 ILayout) */
  private _isILayout(layout: ILayout): boolean {
    return Array.isArray(layout.capabilities);
  }

  /**
   * 卸载当前场景
   */
  private unmountCurrentScene(): void {
    if (!this._currentScene) return;

    const scene = this._currentScene;

    // 取消场景状态订阅
    this._sceneUnsubscribers.forEach((fn) => fn());
    this._sceneUnsubscribers = [];

    // 保存场景状态
    try {
      const state = scene.saveState?.();
      if (state) {
        this.saveSceneState(scene.id, state);
      }
    } catch (err) {
      console.error(`[SceneContainer] Failed to save state for scene ${scene.id}:`, err);
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
    } catch { /* emitter error non-fatal */ }

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
      if (this._switching) {
        console.warn('[SceneContainer] Layout switch timed out after 10s — resetting _switching');
        this._switching = false;
      }
    }, SWITCH_TIMEOUT_MS);

    this._switching = true;
    const fromLayout = this._currentLayout;
    const fromId = fromLayout?.id || null;

    // Save focused element before tearing down DOM (avoid focus loss to <body>)
    const activeEl = document.activeElement as HTMLElement | null;
    const focusClass = activeEl && this.container.contains(activeEl)
      ? activeEl.className
      : null;

    try {

      await this._notifyLayoutWillChange(fromId, layoutId);

      const { preservedCanvas, layoutState } = this._captureOutgoingState(fromLayout);
      if (layoutState && fromLayout?.id) {
        saveLayoutStateToStorage(this._storageKey, fromLayout.id, layoutState);
      }

      await this._teardownOutgoingLayout(fromLayout, animate, transition);
      this._currentLayout = null;
      if (this.container.childElementCount > 0) {
        this.container.replaceChildren();
      }

      const newLayout = await this._setupIncomingLayout(layoutId, preservedCanvas);
      this._currentLayout = newLayout;

      await this._finalizeLayoutSwitch(newLayout, fromId, layoutId, reason, animate, transition, savePreference);

      // Restore focus to a similar element in the new layout
      if (focusClass) {
        const el = this.container.querySelector(`.${focusClass.split(/\s+/).join('.')}`) as HTMLElement | null;
        if (el && typeof el.focus === 'function') el.focus();
      }
    } catch (err) {
      console.error('[SceneContainer] Layout switch failed:', err);

      // Attempt to recover the old layout from the pool so the container
      // isn't left in a blank state.
      if (fromId && !this._disposed) {
        try {
          const recovered = layoutRegistry.create(fromId, this.container, {
            theme: this._currentTheme,
            ...(this._layoutConfig || {})
          });
          await recovered.mount();
          recovered.setTheme(this._currentTheme);
          if (this._currentScene) {
            this.mountScene(this._currentScene, recovered);
          }
          this._currentLayout = recovered;
          console.warn(`[SceneContainer] Recovered layout "${fromId}" after switch failure`);
        } catch (recoveryErr) {
          console.error('[SceneContainer] Recovery also failed, container is empty:', recoveryErr);
          this.container.replaceChildren();
        }
      }
    } finally {
      clearTimeout(safetyTimer);
      this._switching = false;
    }
  }

  private async _notifyLayoutWillChange(fromId: string | null, toId: string): Promise<void> {
    if (this._currentScene?.onLayoutWillChange) {
      await this._currentScene.onLayoutWillChange(fromId || '', toId);
    }
  }

  private _captureOutgoingState(fromLayout: (ILayout) | null): {
    preservedCanvas: HTMLCanvasElement | null;
    layoutState: Record<string, unknown> | undefined;
  } {
    const preservedCanvas = fromLayout?.getSlots?.()?.animation
      ?.querySelector<HTMLCanvasElement>('canvas') ?? null;
    const layoutState = fromLayout?.getLayoutState?.();
    return { preservedCanvas, layoutState };
  }

  private async _teardownOutgoingLayout(
    fromLayout: (ILayout) | null,
    animate: boolean,
    transition: LayoutTransition
  ): Promise<void> {
    if (fromLayout && animate) {
      await (fromLayout as LayoutWithAnimation).exit?.(transition);
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
    if (this._disposed) throw new Error('Container disposed before layout setup');

    // Reset grid-specific inline styles from previous layout to prevent
    // grid styles from a split layout corrupting e.g. mobile-stack.
    // Do NOT reset height/overflow — those are essential container-level
    // properties set by the constructor.
    this.container.style.display = '';
    this.container.style.gridTemplateColumns = '';
    this.container.style.gridTemplateRows = '';

    const newLayout = layoutRegistry.create(layoutId, this.container, {
      theme: this._currentTheme,
      ...(this._layoutConfig || {}),
      preservedCanvas
    });

    await newLayout.mount();
    newLayout.setTheme(this._currentTheme);

    const savedLayoutState = restoreLayoutStateFromStorage(this._storageKey, layoutId);
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
        await (newLayout as LayoutWithAnimation).enter?.({ ...transition, easing: 'ease-out' });
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
    if (this._currentScene?.setTheme) {
      this._currentScene.setTheme(theme);
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
      console.error('[SceneContainer] Error during scene unmount in dispose:', err);
      this._currentScene = null;
    }

    // 卸载布局
    try {
      this._currentLayout?.unmount();
    } catch (err) {
      console.error('[SceneContainer] Error during layout unmount in dispose:', err);
    }
    this._currentLayout = null;

    // 清理 Capability 实例
    try {
      this._capabilityInstances.forEach((insts) => insts.forEach((inst) => {
        try { inst.dispose(); } catch (err) { console.error('[SceneContainer] Capability dispose error:', err); }
      }));
      this._capabilityInstances.clear();
    } catch (err) {
      console.error('[SceneContainer] Error during capability cleanup in dispose:', err);
      this._capabilityInstances.clear();
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
    } catch (err) {
      console.error('[SceneContainer] Error clearing container:', err);
    }

    // 清空监听器
    this._emitter.clear();

    // 清空布局实例池
    layoutRegistry.clearPool();
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
