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
import { ModeOwner } from './mode-owner';
import { SidebarStateOwner } from './sidebar-state';
import { WorkspaceUiState } from './workspace-ui-state';
import type {
  LayoutSwitchRuntime,
  SwitchRuntimeHost
} from './layout-switch-runtime';
import {
  SwitchQuarantinedError,
  SWITCH_QUARANTINE_MESSAGE,
  SWITCH_STATUS_ATTR
} from './switch-errors';
import type {
  SceneContainer,
  Scene,
  LayoutConfig,
  Theme,
  SwitchOptions,
  CreateContainerOptions,
  SceneContainerEvents,
  CapabilityContext,
  ILayout
} from './types';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { LayoutSwitchState } from './switch-errors';

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
  private _hasExplicitDefaultTheme: boolean;
  private _emitter: EventEmitter<SceneContainerEvents>;
  private _resizeObserver: ContainerResizeObserver;
  private _orchestrator = new CapabilityOrchestrator();
  private _modeOwner: ModeOwner;
  private _sidebar = new SidebarStateOwner();
  private _workspaceUi = new WorkspaceUiState();
  private _switch: LayoutSwitchRuntime | null = null;
  private _switchReady: Promise<LayoutSwitchRuntime> | null = null;
  private _boot: Promise<void> | null = null;
  private _bootQueuedScene: Scene | null = null;

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

    this._modeOwner = new ModeOwner({
      container: this.container,
      getScene: () => this._currentScene,
      applyAdapterMode: (mode, hints) => {
        const scene = this._currentScene as
          | (Scene & {
              setMode?(m: 'normal' | 'presentation', h?: DemoRenderHints): void;
            })
          | null;
        if (mode === 'presentation' && hints) {
          scene?.setMode?.(mode, hints);
        } else {
          scene?.setMode?.(mode);
        }
      },
      emitMode: (payload) => this._emitter.emit('layout:mode', payload),
      updateCapabilities: (payload) => {
        const instances = [
          ...this._orchestrator.getInstances('demo-profile'),
          ...this._orchestrator.getInstances('mode-toggle'),
          ...this._orchestrator.getInstances('sidebar-toggle'),
          ...this._orchestrator.getInstances('data-workspace')
        ];
        updateCapabilityInstances(instances, payload);
      }
    });

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
      getSwitching: () => this._switch?.state === 'switching',
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

  private switchHost(): SwitchRuntimeHost {
    return {
      container: this.container,
      storageKey: this._storageKey,
      getTheme: () => this._currentTheme,
      resolveLayoutConfig: (id) => this._resolveLayoutConfig(id),
      isDisposed: () => this._disposed,
      getCurrentLayout: () => this._currentLayout,
      setCurrentLayout: (layout) => {
        this._currentLayout = layout;
      },
      getCurrentScene: () => this._currentScene,
      mode: this._modeOwner,
      sidebar: this._sidebar,
      workspaceUi: this._workspaceUi,
      orchestrator: this._orchestrator,
      emitLayoutChange: (event) => this._emitter.emit('layout:change', event),
      emitSwitchError: (payload) => {
        this.surfaceSwitchError(payload);
        this._emitter.emit('layout:switch-error', payload);
      },
      savePreference: (id) => this.setUserPreferredLayout(id),
      mountScene: (scene, layout) => this.mountScene(scene, layout),
      onLayoutDidChange: (to) => this._currentScene?.onLayoutDidChange?.(to),
      drainResize: () => this._resizeObserver.drain(),
      captureFocus: () => {
        const activeEl = document.activeElement as HTMLElement | null;
        const identity = captureFocusIdentity(activeEl, this.container);
        return {
          restore: () => {
            if (identity) findFocusTarget(this.container, identity)?.focus();
          }
        };
      }
    };
  }

  private ensureSwitch(): Promise<LayoutSwitchRuntime> {
    if (this._switch) return Promise.resolve(this._switch);
    if (!this._switchReady) {
      this._switchReady = import('./layout-switch-runtime').then(
        ({ LayoutSwitchRuntime }) => {
          const runtime = new LayoutSwitchRuntime(this.switchHost());
          runtime.hostSetScene = (scene) => this._doSetScene(scene);
          runtime.adoptCurrentCanvas();
          this._switch = runtime;
          return runtime;
        }
      );
    }
    return this._switchReady;
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
    this._switch?.rejectIfQuarantined();

    if (this._boot) {
      this._bootQueuedScene = scene;
      return;
    }

    if (this._switch?.state === 'switching') {
      this._switch.pendingScene = scene;
      return;
    }

    if (!this._currentLayout) {
      await this._initialSetScene(scene);
      return;
    }

    await this._doSetScene(scene);
  }

  /**
   * First empty-container mount: create the layout, project owners, attach
   * the scene, then load capability factories. Does not import the switch
   * coordinator chunk.
   */
  private async _initialSetScene(scene: Scene): Promise<void> {
    if (this._disposed) return;
    let settleBoot: () => void = () => {};
    this._boot = new Promise<void>((resolve) => {
      settleBoot = resolve;
    });
    try {
      this._modeOwner.resetToNormal('new-scene');
      this._sidebar.resetForNewScene();
      this._workspaceUi.resetForNewScene();
      this._currentScene = scene;

      const layoutId = this.resolveLayout(scene);
      const created = await layoutRegistry.create(layoutId, this.container, {
        theme: this._currentTheme,
        ...this._resolveLayoutConfig(layoutId),
        preservedCanvas: null
      });
      if (this._disposed) {
        try {
          await created.unmount();
        } catch (err) {
          console.error(
            '[SceneContainer] Layout unmount rejected during boot abort:',
            err
          );
        }
        return;
      }

      this._modeOwner.project('reproject');
      this._sidebar.project(this.container);
      await created.mount();
      if (this._disposed) {
        try {
          await created.unmount();
        } catch (err) {
          console.error(
            '[SceneContainer] Layout unmount rejected during boot abort:',
            err
          );
        }
        return;
      }

      this.container.dataset.layoutId = layoutId;
      this._currentLayout = created;
      created.setTheme(this._currentTheme);
      const savedLayoutState = restoreLayoutStateFromStorage(
        this._storageKey,
        layoutId
      );
      if (savedLayoutState) {
        created.restoreLayoutState?.(savedLayoutState);
      }
      this._modeOwner.project('reproject');
      this._sidebar.project(this.container);

      this.attachScene(scene, created);
      this._switch?.adoptCurrentCanvas();

      await this._orchestrator.preload();
      if (this._disposed) return;
      this.wireCapabilities(scene, created);
    } finally {
      const queued = this._bootQueuedScene;
      this._bootQueuedScene = null;
      this._boot = null;
      settleBoot();
      if (queued && queued !== scene && !this._disposed) {
        await this.setScene(queued);
      }
    }
  }

  private async _doSetScene(scene: Scene): Promise<void> {
    if (this._currentScene) {
      this.unmountCurrentScene();
    }

    this._modeOwner.resetToNormal('new-scene');
    this._sidebar.resetForNewScene();
    this._workspaceUi.resetForNewScene();
    this._currentScene = scene;

    const layoutId = this.resolveLayout(scene);

    if (!this._currentLayout || this._currentLayout.id !== layoutId) {
      await this.switchLayout(layoutId, {
        animate: false,
        skipWillChange: true
      });
    } else {
      this._modeOwner.project('reproject');
      this._sidebar.project(this.container);
      this.mountScene(scene);
    }
  }

  /**
   * 挂载场景到当前布局
   */
  private mountScene(scene: Scene, layout?: ILayout): void {
    const targetLayout = layout || this._currentLayout;
    if (!targetLayout) return;

    this.attachScene(scene, targetLayout);
    this.wireCapabilities(scene, targetLayout);
  }

  private attachScene(scene: Scene, layout: ILayout): void {
    renderSceneToSlots(scene, layout);
    scene.mount?.();
    this._emitter.emit('scene:mount', { sceneId: scene.id });
  }

  private wireCapabilities(scene: Scene, layout: ILayout): void {
    const slots = layout.getSlots?.() || {};
    const ctx = this._buildCapabilityContext(scene);
    this._orchestrator.wire(layout, scene, slots, ctx);
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
        const p = this.switchLayout(id, {
          animate: true,
          savePreference: save
        });
        p.catch((err) =>
          this.surfaceSwitchError({
            generation: this._switch?.generation ?? 0,
            error: err,
            state: this.getSwitchState()
          })
        );
        return p;
      },
      modeOwner: this._modeOwner,
      sidebar: this._sidebar,
      workspaceUi: this._workspaceUi,
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
      on: (event, handler) => this._emitter.on(event, handler)
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
   * 切换布局。唯一事务 owner：并发手动请求合并为最新目标；
   * 超时只 abort 当前等待，不解锁 generation / 不清 switching。
   */
  async switchLayout(
    layoutId: string,
    options: SwitchOptions = {}
  ): Promise<void> {
    if (this._boot) await this._boot;
    if (this._disposed) return;
    const [sw] = await Promise.all([
      this.ensureSwitch(),
      this._orchestrator.preload()
    ]);
    if (this._disposed) {
      sw.dispose();
      return;
    }
    await sw.switchLayout(layoutId, options);
  }

  getSwitchState(): LayoutSwitchState {
    return this._switch?.getSwitchState() ?? 'idle';
  }

  resetSwitchQuarantine(): boolean {
    if (!this._switch) return false;
    const ok = this._switch.resetSwitchQuarantine();
    if (ok) this.hideSwitchStatus();
    if (!ok && this._switch.getSwitchState() === 'quarantined') {
      throw new SwitchQuarantinedError(
        this._switch.generation,
        'Cannot reset switch quarantine'
      );
    }
    return ok;
  }

  getMode(): 'normal' | 'presentation' {
    return this._modeOwner.getMode();
  }

  setMode(mode: 'normal' | 'presentation'): void {
    if (this._disposed) return;
    if (this._switch?.state === 'quarantined') {
      throw new SwitchQuarantinedError(this._switch.generation);
    }
    this._modeOwner.setMode(mode, 'api');
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
   * Production consumer of `layout:switch-error`: console + status bar.
   * Quarantine is page-terminal (reload) unless resetSwitchQuarantine
   * succeeds. See docs/layout-switch-lifecycle.md.
   */
  private surfaceSwitchError(payload: {
    generation: number;
    error: unknown;
    state: LayoutSwitchState;
  }): void {
    if (payload.state === 'quarantined') {
      console.error(
        `[SceneContainer] Layout switch quarantined (generation ${payload.generation}). ` +
          `${SWITCH_QUARANTINE_MESSAGE}. Cause:`,
        payload.error
      );
      this.showQuarantineStatus();
      return;
    }
    console.error(
      `[SceneContainer] Layout switch error (generation ${payload.generation}, state=${payload.state}):`,
      payload.error
    );
  }

  private showQuarantineStatus(): void {
    let bar = this.container.querySelector<HTMLElement>(
      `[${SWITCH_STATUS_ATTR}]`
    );
    if (!bar) {
      bar = document.createElement('div');
      bar.setAttribute(SWITCH_STATUS_ATTR, 'quarantined');
      bar.setAttribute('role', 'status');
      bar.setAttribute('aria-live', 'assertive');
      bar.style.cssText = [
        'position:absolute',
        'left:0',
        'right:0',
        'top:0',
        'z-index:10000',
        'padding:8px 12px',
        'background:var(--danger,#b91c1c)',
        'color:#fff',
        'font-size:14px',
        'text-align:center'
      ].join(';');
      this.container.appendChild(bar);
    }
    bar.textContent = SWITCH_QUARANTINE_MESSAGE;
  }

  private hideSwitchStatus(): void {
    this.container.querySelector(`[${SWITCH_STATUS_ATTR}]`)?.remove();
  }

  /**
   * 销毁容器
   */
  dispose(): void {
    this._disposed = true;
    try {
      this._switch?.dispose();
    } catch (err) {
      console.error(
        '[SceneContainer] Error aborting in-flight switch in dispose:',
        err
      );
    }

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

    // Capabilities first: they still need the live layout DOM.
    try {
      this._orchestrator.dispose();
    } catch (err) {
      console.error(
        '[SceneContainer] Error during capability cleanup in dispose:',
        err
      );
    }

    // 卸载布局（同步契约；仍观测 Promise rejection）
    try {
      const unmount = this._currentLayout?.unmount();
      if (unmount) {
        void Promise.resolve(unmount).catch((err: unknown) => {
          console.error(
            '[SceneContainer] Layout unmount rejected in dispose:',
            err
          );
        });
      }
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
