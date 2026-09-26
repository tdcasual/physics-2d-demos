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
import { layoutRegistry } from './registry';

import { layoutSelector } from './selector';
import type { LayoutSelectionContext } from './selector';
import {
  persistState as persistStateToStorage,
  restorePersistedState as restorePersistedStateFromStorage,
  saveLayoutState as saveLayoutStateToStorage,
  restoreLayoutState as restoreLayoutStateFromStorage
} from './container-persistence';
import { satisfiesConstraints } from './layout-constraints';
import { ContainerResizeObserver } from './container-resize-observer';
import { detectLowPowerMode } from './power-awareness';
import { CapabilityOrchestrator } from './capability-orchestrator';
import { renderSceneToSlots } from './scene-slot-renderer';
import { getStoredTheme, resolveThemePreference } from '../theme-store';
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
 * Stable data attributes used by controls to identify the same focus target
 * after a layout rebuild. Class names describe styling and are not an
 * identity contract, so they must not be used for focus restoration.
 */
const FOCUS_ID_ATTRIBUTES = [
  'data-focus-key',
  'data-control-key',
  'data-key',
  'data-tab',
  'data-preset-id',
  'data-role',
  'data-testid'
] as const;

type FocusIdentity = {
  tagName: string;
  attribute: (typeof FOCUS_ID_ATTRIBUTES)[number];
  value: string;
};

function captureFocusIdentity(
  element: HTMLElement | null,
  container: HTMLElement
): FocusIdentity | null {
  if (!element || !container.contains(element)) return null;

  for (const attribute of FOCUS_ID_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (value) {
      return { tagName: element.tagName, attribute, value };
    }
  }
  return null;
}

function findFocusTarget(
  container: HTMLElement,
  identity: FocusIdentity
): HTMLElement | null {
  const candidates = container.querySelectorAll<HTMLElement>(
    `[${identity.attribute}]`
  );
  for (const candidate of candidates) {
    if (
      candidate.tagName === identity.tagName &&
      candidate.getAttribute(identity.attribute) === identity.value &&
      typeof candidate.focus === 'function'
    ) {
      return candidate;
    }
  }
  return null;
}

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
  private _forceLayout: string | null = null;
  private _storageKey: string;
  private _onResize?: (width: number, height: number) => void;
  private _layoutConfig?: Record<string, unknown>;

  private _lowPowerMode = false;
  private _disposed = false;
  private _switching = false;
  /** 并发切换代际：新切换/安全计时器递增，旧协程在 await 边界作废。 */
  private _switchGeneration = 0;
  /** 手动切换请求排队（last-wins）；观察器自动切换不排队。 */
  private _pendingSwitchId: string | null = null;
  private _pendingScene: Scene | null = null;
  private _hasExplicitDefaultTheme: boolean;
  private _emitter: EventEmitter<SceneContainerEvents>;
  private _resizeObserver: ContainerResizeObserver;
  private _orchestrator = new CapabilityOrchestrator();

  constructor(options: CreateContainerOptions) {
    this._emitter = createEventEmitter<SceneContainerEvents>('SceneContainer');
    this.container = options.mount;
    this._storageKey = options.storageKey || 'physics-demos-container-state';
    this._onResize = options.onResize;
    this._currentTheme = options.defaultTheme || 'light';
    this._hasExplicitDefaultTheme = options.defaultTheme != null;
    this._layoutConfig = options.layoutConfig;
    this._forceLayout =
      options.forceLayout && layoutRegistry.has(options.forceLayout)
        ? options.forceLayout
        : null;

    // 设置容器基础样式（尺寸由各布局自行声明）
    this.container.style.cssText = `
      overflow: hidden;
      position: relative;
    `;

    // 初始化 ResizeObserver
    this._resizeObserver = new ContainerResizeObserver(this.container, {
      getCurrentScene: () => this._currentScene,
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
      forcedLayout: this._forceLayout ?? undefined,
      userPreference: this._userPreferredLayout,
      scenePreference: scene.preferredLayout || null,
      availableLayouts: layoutRegistry.getAllMetadata()
    };

    const selected = layoutSelector.select(ctx);

    // 低功耗/弱网模式下，若无强制布局且用户未指定偏好，优先选择渲染
    // 负担最小的 mobile-stack。强制档（?layout=）与用户偏好都不可被
    // 低功耗覆盖，否则强制语义与偏好粘滞被旁路。
    if (
      this._lowPowerMode &&
      !this._forceLayout &&
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

  /** 激活场景生命周期：Capability 装配、事件绑定、挂载 */
  private activateSceneLifecycle(scene: Scene, layout: ILayout): void {
    const slots = layout.getSlots?.() || {};

    // 装配布局声明的 capabilities（ILayout 约定 capabilities 必填）
    const ctx = this._buildCapabilityContext(scene);
    this._orchestrator.wire(layout, scene, slots, ctx);

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
   *
   * 并发语义：进行中时手动请求进 `_pendingSwitchId` 排队（last-wins），
   * 观察器自动请求直接丢弃（重解析后下次 resize 收敛）。
   * 每次切换取一个代际号；await 边界检查代际，被超时判死或被新切换
   * 取代的旧协程在下一个边界静默作废，不再触碰共享容器。
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
    if (this._switching) {
      if (reason === 'manual') this._pendingSwitchId = layoutId;
      return;
    }

    const generation = ++this._switchGeneration;
    // 旧协程作废谓词：被安全计时器判死或被新切换取代。
    const stale = () => generation !== this._switchGeneration || this._disposed;

    const SWITCH_TIMEOUT_MS = 10_000;
    const safetyTimer = setTimeout(() => {
      if (generation === this._switchGeneration && this._switching) {
        console.warn(
          '[SceneContainer] Layout switch timed out after 10s — abandoning current generation'
        );
        // 判死当前代（挂起协程在下一个 await 边界作废）并交棒：
        // 释放 _switching 允许新切换重建容器；排队中的手动切换/场景
        // 交给新代的 drain，避免被判死后永久搁置。
        this._switchGeneration += 1;
        this._switching = false;
        void this._drainPending(this._switchGeneration);
      }
    }, SWITCH_TIMEOUT_MS);

    this._switching = true;
    const fromLayout = this._currentLayout;
    const fromId = fromLayout?.id || null;

    // Save focused element before tearing down DOM (avoid focus loss to <body>)
    const activeEl = document.activeElement as HTMLElement | null;
    const focusIdentity = captureFocusIdentity(activeEl, this.container);

    try {
      await this._notifyLayoutWillChange(fromId, layoutId);
      if (stale()) return;

      const { preservedCanvas, layoutState } =
        this._captureOutgoingState(fromLayout);
      if (layoutState && fromLayout?.id) {
        saveLayoutStateToStorage(this._storageKey, fromLayout.id, layoutState);
      }

      await this._teardownOutgoingLayout(
        fromLayout,
        animate,
        transition,
        stale
      );
      if (stale()) return;
      this._currentLayout = null;
      if (this.container.childElementCount > 0) {
        this.container.replaceChildren();
      }

      const newLayout = await this._setupIncomingLayout(
        layoutId,
        preservedCanvas,
        stale
      );
      if (!newLayout || stale()) return;

      await this._finalizeLayoutSwitch(
        newLayout,
        fromId,
        layoutId,
        reason,
        animate,
        transition,
        savePreference,
        stale
      );
      if (stale()) return;

      // Restore focus to the equivalent data-identified control in the new layout.
      if (focusIdentity) {
        findFocusTarget(this.container, focusIdentity)?.focus();
      }
    } catch (err) {
      console.error('[SceneContainer] Layout switch failed:', err);

      // Attempt to recover the old layout from the pool so the container
      // isn't left in a blank state.
      if (fromId && !stale()) {
        try {
          const recovered = await layoutRegistry.create(
            fromId,
            this.container,
            {
              theme: this._currentTheme,
              ...this._resolveLayoutConfig(fromId)
            }
          );
          if (stale()) return;
          await recovered.mount();
          if (stale()) return;
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
      // 仅当前有效代管理 _switching 与排队消费；作废旧协程不触碰新代状态。
      if (generation === this._switchGeneration) {
        this._switching = false;
        await this._drainPending(generation);
      }
    }
  }

  /**
   * 原子取出并串行处理排队项（仅当前有效代的 finally 调用）：
   * pendingScene 先（setScene 自行解析布局，内部可能已含切换），
   * pendingSwitchId 后且目标==当前布局时跳过。drain 期间新到的排队项
   * 由内层 switchLayout 的 finally 再次消费，不会永久搁置。
   */
  private async _drainPending(generation: number): Promise<void> {
    if (generation !== this._switchGeneration || this._disposed) return;
    const pendingScene = this._pendingScene;
    this._pendingScene = null;
    const pendingSwitchId = this._pendingSwitchId;
    this._pendingSwitchId = null;
    try {
      if (pendingScene) {
        await this._doSetScene(pendingScene);
      }
      if (
        pendingSwitchId &&
        !this._disposed &&
        this._currentLayout?.id !== pendingSwitchId
      ) {
        await this.switchLayout(pendingSwitchId, {
          reason: 'manual',
          animate: true,
          savePreference: true
        });
      }
    } catch (err) {
      console.error('[SceneContainer] Pending drain failed:', err);
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
    transition: LayoutTransition,
    isStale: () => boolean
  ): Promise<void> {
    if (fromLayout && animate) {
      try {
        await fromLayout.exit?.(transition);
      } catch (err) {
        console.warn('[SceneContainer] Layout exit animation failed:', err);
      }
      if (isStale()) return;
    }
    if (fromLayout) {
      await fromLayout.unmount();
      if (isStale()) return;
      layoutRegistry.returnInstance(this.container, fromLayout.id, fromLayout);
    }
  }

  private async _setupIncomingLayout(
    layoutId: string,
    preservedCanvas: HTMLCanvasElement | null,
    isStale: () => boolean
  ): Promise<ILayout | null> {
    if (this._disposed)
      throw new Error('Container disposed before layout setup');

    // Reset grid-specific inline styles from previous layout to prevent
    // grid styles from a split layout corrupting e.g. mobile-stack.
    // Do NOT reset height/overflow — those are essential container-level
    // properties set by the constructor.
    this.container.style.display = '';
    this.container.style.gridTemplateColumns = '';
    this.container.style.gridTemplateRows = '';

    const newLayout = await layoutRegistry.create(layoutId, this.container, {
      theme: this._currentTheme,
      ...this._resolveLayoutConfig(layoutId),
      preservedCanvas
    });
    if (isStale()) return null;

    await newLayout.mount();
    if (isStale()) return null;
    this.container.dataset.layoutId = layoutId;
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

  private _resolveLayoutConfig(layoutId: string): LayoutConfig {
    const resolved: Record<string, unknown> = { ...(this._layoutConfig ?? {}) };
    const overrides = resolved.layoutOverrides;
    delete resolved.layoutOverrides;

    if (
      overrides &&
      typeof overrides === 'object' &&
      !Array.isArray(overrides)
    ) {
      const override = (overrides as Record<string, unknown>)[layoutId];
      if (
        override &&
        typeof override === 'object' &&
        !Array.isArray(override)
      ) {
        Object.assign(resolved, override);
      }
    }

    return resolved as LayoutConfig;
  }

  private async _finalizeLayoutSwitch(
    newLayout: ILayout,
    fromId: string | null,
    layoutId: string,
    reason: string,
    animate: boolean,
    transition: LayoutTransition,
    savePreference: boolean,
    isStale: () => boolean
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
      // enter 子过程内的 await 边界：被超时判死/新代取代的旧协程
      // 不得再写回调、事件与偏好（保存偏好是持久化副作用，最危险）。
      if (isStale()) return;
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
   *
   * 主题不在此持久化——主题由 theme-store 统一管理（bootstrapper 订阅
   * `theme:change` 事件写入），容器状态只保留布局偏好。
   */
  persistState(): void {
    persistStateToStorage(this._storageKey, this._userPreferredLayout);
  }

  /**
   * 从 localStorage 恢复状态
   *
   * 布局偏好从容器状态恢复；主题从 theme-store 统一读取（含旧容器状态
   * theme 字段的一次性迁移），调用方显式传入的 defaultTheme 优先。
   */
  restorePersistedState(): void {
    const restored = restorePersistedStateFromStorage(this._storageKey);
    if (restored?.preferredLayout) {
      this._userPreferredLayout = restored.preferredLayout;
    }
    if (!this._hasExplicitDefaultTheme) {
      const stored = getStoredTheme();
      if (stored) {
        this._currentTheme = resolveThemePreference(stored);
      }
    }
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
        this.container,
        this._currentLayout.id,
        this._currentLayout
      );
    }
    this._currentLayout = null;
    delete this.container.dataset.layoutId;

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
