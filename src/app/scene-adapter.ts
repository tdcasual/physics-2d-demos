/**
 * 场景适配器
 *
 * 将场景实例适配为标准 Scene 接口，供 SceneContainer 使用。
 * 核心职责：
 * - 延迟控制面板创建
 * - 桥接场景生命周期到容器（init / resize / theme / mode）
 * - 聚合场景状态并通知布局刷新
 * - 管理运输控制循环（play/pause/step/reset/speed）
 */

import type {
  Scene,
  Theme,
  LayoutSlots,
  ReadoutItem,
  TransportState
} from './layouts/types';
import {
  resolveDemoProfile,
  type DemoRenderHints,
  type ResolvedDemoProfile
} from '../platform/demo-profile';
import { createSceneShell } from './scene-shell';
import { KeyboardShortcutManager } from '../platform/input/keyboard-shortcuts';
import { PerformanceMonitor } from '../core/performance-monitor';
import { createPageLifecycle } from './page-lifecycle';
import { createKeyboardHelpOverlay } from '../ui/components/KeyboardHelp';
import type { KeyboardHelpOverlay } from '../ui/components/KeyboardHelp';
import type {
  SceneInstance,
  ScenePageOptions
} from './scene-bootstrapper-types';
import {
  paramsFromScene,
  syncControlsFromLiveParams
} from './control-projection';
import { filterPresentationReadout } from './scene-adapter/readout-filter';
import { registerSceneKeyboardShortcuts } from './scene-adapter/keyboard-shortcuts';
import { createScenePerformanceRuntime } from './scene-adapter/perf-monitor';
import {
  bindActiveSceneWriter,
  createSceneParamWriter,
  persistSceneParams,
  readSceneParams,
  resolveUrlSyncKeys
} from './url-sync';

export { filterPresentationReadout } from './scene-adapter/readout-filter';

export class SceneAdapter<
  TScene extends SceneInstance = SceneInstance
> implements Scene {
  readonly id: string;
  readonly preferredLayout: string;

  private scene: TScene | null = null;
  private controls: unknown = null;
  private lifecycle = createPageLifecycle();
  private transport: ReturnType<typeof createSceneShell> | null = null;
  private keyboard: KeyboardShortcutManager | null = null;
  private perfMonitor: PerformanceMonitor | null = null;
  private keyboardHelp: KeyboardHelpOverlay | null = null;
  private slots: LayoutSlots | null = null;
  private currentState: unknown = null;
  private _readoutItems: ReadoutItem[] = [];
  private listeners: (() => void)[] = [];
  private _deferredControlContainer: HTMLElement | null = null;
  private _resizeHandlerAdded = false;
  private _ro: ResizeObserver | null = null;
  private _graphRendered = false;
  private _graphVisibilityRo: ResizeObserver | null = null;
  private _scheduleResize: (() => void) | null = null;
  private _mode: 'normal' | 'presentation' = 'normal';
  private _resolvedProfile: ResolvedDemoProfile | null = null;
  private _fullscreenHost: HTMLElement | null = null;
  private _urlRestore: 'notStarted' | 'consuming' | 'complete' | 'failed' =
    'notStarted';
  private _urlSnapshot: Readonly<Record<string, number | string>> = {};
  private _sceneWriter: import('./url-sync').SceneParamWriter | null = null;
  private _unbindWriter: (() => void) | null = null;

  constructor(
    private options: ScenePageOptions<TScene>,
    private layoutUpdateStatus?: (text: string) => void
  ) {
    this.id = options.meta.id;
    this.preferredLayout = options.preferredLayout ?? 'split-right';
  }

  takeUrlRestorePermit(): {
    first: boolean;
    snapshot: Readonly<Record<string, number | string>>;
  } {
    if (this._urlRestore === 'notStarted') {
      this._urlRestore = 'consuming';
      return { first: true, snapshot: this._urlSnapshot };
    }
    return { first: false, snapshot: {} };
  }

  completeUrlRestore(ok: boolean): void {
    if (this._urlRestore !== 'consuming') return;
    this._urlRestore = ok ? 'complete' : 'failed';
  }

  getSceneWriter(): import('./url-sync').SceneParamWriter | null {
    return this._sceneWriter;
  }

  captureUrlSnapshot(snapshot: Record<string, number | string>): void {
    if (this._urlRestore !== 'notStarted') return;
    this._urlSnapshot = Object.freeze({ ...snapshot });
  }

  private _disposeControls(): void {
    const c = this.controls as { dispose?(): void } | null;
    c?.dispose?.();
    this.controls = null;
  }

  private _createControls(container: HTMLElement): void {
    if (!this.scene || !this.options.createControls) return;
    this.controls =
      this.options.createControls({
        mount: container,
        scene: this.scene,
        onStatus: (text) => this.layoutUpdateStatus?.(text)
      }) || null;
  }

  renderControl(container: HTMLElement): void {
    if (!this.options.createControls) return;
    if (!this.scene) {
      this._deferredControlContainer = container;
      return;
    }
    this._disposeControls();
    this._createControls(container);
  }

  private _firstFrameHost(): HTMLElement | null {
    return (
      this.slots?.animation?.closest('.layout-master') ??
      document.querySelector('.layout-master')
    );
  }

  private _resolveFullscreenHost(): HTMLElement | null {
    const fromSlot = this.slots?.animation?.closest('.layout-master');
    if (fromSlot instanceof HTMLElement) return fromSlot;
    return this._fullscreenHost;
  }

  private _syncNativeFullscreenClass(): void {
    const host = this._resolveFullscreenHost();
    if (host) this._fullscreenHost = host;
    const active = Boolean(document.fullscreenElement);
    if (host) host.classList.toggle('is-native-fullscreen', active);
  }

  private _bindNativeFullscreen(): void {
    const ac = new AbortController();
    const onChange = () => {
      if (ac.signal.aborted) return;
      this._syncNativeFullscreenClass();
    };
    document.addEventListener('fullscreenchange', onChange, {
      signal: ac.signal
    });
    this.lifecycle.onDispose(() => {
      ac.abort();
      document.removeEventListener('fullscreenchange', onChange);
      this._fullscreenHost?.classList.remove('is-native-fullscreen');
      this._fullscreenHost = null;
    });
    this._syncNativeFullscreenClass();
  }

  private _clearFirstFrame(): void {
    const host = this._firstFrameHost();
    if (host) delete host.dataset.firstFrame;
  }

  private _markFirstFrame(): void {
    const host = this._firstFrameHost();
    if (host) host.dataset.firstFrame = 'ready';
    const canvas = this.slots?.animation?.querySelector('canvas');
    if (canvas) canvas.dataset.firstFrame = 'ready';
  }

  renderAnimation(container: HTMLElement, slots: LayoutSlots): void {
    this.slots = slots;
    this._clearFirstFrame();

    if (this.scene && this.transport) {
      this._reattachLiveScene(container, slots);
      return;
    }

    // 渲染面 = 动画区容器；canvas 供 canvas 类场景使用，非 canvas 渲染时为空
    const canvas = container.querySelector('canvas') ?? undefined;
    if (canvas) {
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `${this.options.meta.title}演示图`);
    } else {
      container.setAttribute('role', 'img');
      container.setAttribute('aria-label', `${this.options.meta.title}演示区`);
    }

    const theme =
      (container
        .closest('[data-theme]')
        ?.getAttribute('data-theme') as Theme) ||
      (document.documentElement.getAttribute('data-theme') as Theme) ||
      'light';
    const mode = this._mode;

    const demoHints =
      mode === 'presentation'
        ? (this.options.demoProfile ?? this.options.meta.demoProfile)
            ?.renderHints
        : undefined;
    if (!this._sceneWriter) {
      this._sceneWriter = createSceneParamWriter(
        resolveUrlSyncKeys(this.options.meta)
      );
      this._unbindWriter = bindActiveSceneWriter(this._sceneWriter);
      this.lifecycle.onDispose(() => {
        this._sceneWriter?.close();
        this._unbindWriter?.();
        this._sceneWriter = null;
        this._unbindWriter = null;
      });
      this.captureUrlSnapshot(readSceneParams(this.options.meta));
    }

    this.scene = this.options.createScene({
      canvas,
      container,
      slots,
      theme,
      mode,
      demoHints,
      sceneWriter: this._sceneWriter
    });

    this.scene.init();

    const canvases = new Set<HTMLCanvasElement>([
      ...container.querySelectorAll('canvas'),
      ...Object.values(this.slots ?? {}).flatMap((slot) =>
        slot instanceof HTMLElement
          ? Array.from(slot.querySelectorAll<HTMLCanvasElement>('canvas'))
          : []
      )
    ]);
    // 为后插入的 canvas（如图表插槽 attachGraphCanvas）补 role/aria-label。
    // 观察范围收窄到动画容器与已提供的插槽元素，而非 document.body 整个子树。
    const labelRoots = Array.from(
      new Set<HTMLElement>([
        container,
        ...Object.values(this.slots ?? {}).filter(
          (slot): slot is HTMLElement => slot instanceof HTMLElement
        )
      ])
    );
    let canvasIndex = 0;
    const labelCanvases = () => {
      labelRoots.forEach((rootEl) => {
        rootEl.querySelectorAll<HTMLCanvasElement>('canvas').forEach((node) => {
          node.setAttribute('role', 'img');
          if (!node.getAttribute('aria-label')) {
            node.setAttribute('aria-label', `${this.options.meta.title}演示图`);
          }
        });
      });
    };
    canvases.forEach((node) => {
      node.setAttribute('role', 'img');
      if (!node.getAttribute('aria-label')) {
        node.setAttribute(
          'aria-label',
          `${this.options.meta.title}演示图${canvasIndex > 0 ? ` ${canvasIndex + 1}` : ''}`
        );
      }
      canvasIndex += 1;
    });
    labelCanvases();
    const canvasObserver = new MutationObserver(labelCanvases);
    labelRoots.forEach((rootEl) =>
      canvasObserver.observe(rootEl, { childList: true, subtree: true })
    );
    this.lifecycle.onDispose(() => canvasObserver.disconnect());

    this.transport = createSceneShell({
      stepSeconds: this.options.stepSeconds ?? 1 / 60,
      maxSubSteps: this.options.maxSubSteps ?? 5,
      onStep: (dt) => this.scene?.step(dt),
      onRender: () => this.scene?.render()
    });
    this.lifecycle.onDispose(() => this.transport?.dispose());

    this.keyboard = new KeyboardShortcutManager();
    this.keyboardHelp = createKeyboardHelpOverlay();
    this.lifecycle.onDispose(() => this.keyboardHelp?.dispose());

    registerSceneKeyboardShortcuts(this.keyboard, this.keyboardHelp, {
      isPlaying: () => this.transport?.transport.isPlaying ?? false,
      start: () => this.startAll(),
      pause: () => this.pauseAll(),
      reset: () => {
        this.transport?.reset?.();
        this.perfMonitor?.stop();
        this.scene?.reset?.();
      },
      toggleTheme: (next) => {
        if (this.options.onToggleTheme) {
          // 统一走 container.setTheme：同步 container 状态、布局与持久化
          this.options.onToggleTheme(next);
          return;
        }
        this.scene?.setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
      },
      step: (delta) => this.scene?.step?.(delta),
      adjustTimeScale: (delta) => {
        const next = Math.min(
          3,
          Math.max(0.25, (this.scene?.getTimeScale?.() ?? 1) + delta)
        );
        this.scene?.setTimeScale?.(next);
      },
      toggleFullscreen: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      },
      switchLayout: () => {
        this.options.onSwitchLayout?.();
      },
      exitPresentation: () => {
        if (this._mode !== 'presentation') return;
        if (this.options.onSetMode) {
          this.options.onSetMode('normal');
          return;
        }
        this.setMode('normal');
      }
    });
    this.keyboard.init();
    this.lifecycle.onDispose(() => this.keyboard?.dispose());
    this._bindNativeFullscreen();

    // 性能监控不再常驻采样：仅播放时运行（startAll/键盘空格/autoPlay 启动，
    // pauseAll/reset 停止），dispose 时彻底停止。
    this.perfMonitor = createScenePerformanceRuntime({
      registerCleanup: (cleanup) => this.lifecycle.onDispose(cleanup),
      getTargetFps: () => this.transport?.getTargetFps() ?? 60,
      setTargetFps: (fps) => this.transport?.setTargetFps(fps)
    });

    if (!this._resizeHandlerAdded) {
      // rAF 合帧：同帧内多次触发（window resize + ResizeObserver）只执行一次
      // resize+render；dispose 时取消挂起的 rAF。
      let resizeScheduled = false;
      let resizeRafId: number | null = null;
      const scheduleResize = () => {
        if (resizeScheduled) return;
        resizeScheduled = true;
        resizeRafId = window.requestAnimationFrame(() => {
          resizeScheduled = false;
          resizeRafId = null;
          this.scene?.resize();
          this.scene?.render();
        });
      };
      const cancelScheduledResize = () => {
        if (resizeRafId !== null) {
          window.cancelAnimationFrame(resizeRafId);
          resizeRafId = null;
        }
        resizeScheduled = false;
      };
      window.addEventListener('resize', scheduleResize);
      this._scheduleResize = scheduleResize;
      this.lifecycle.onDispose(() => {
        window.removeEventListener('resize', scheduleResize);
        cancelScheduledResize();
        this._scheduleResize = null;
      });

      this._observeAnimationSurface(canvas, container);
      this._resizeHandlerAdded = true;
    }

    if (this._deferredControlContainer) {
      this._createControls(this._deferredControlContainer);
      this._deferredControlContainer = null;
    }

    // Graph rendering is handled by renderSceneToSlots via the 'graph' entry
    // in SLOT_RENDER_MAP. Do NOT render here — the slot's clear:true would wipe it.

    this.scene.resize();
    this.scene.render();
    this._markFirstFrame();

    // 自动播放：场景挂载后立即启动动画循环
    if (this.options.autoPlay) {
      this.startAll();
    }

    if (this.scene.subscribe) {
      const unsubscribe = this.scene.subscribe(() => {
        this.refreshReadout();
        this.notifyListeners();
        this._syncShellToSceneTransport();
      });
      this.lifecycle.onDispose(() => unsubscribe());
    } else if (this.scene.getReadoutItems) {
      console.warn(
        `[scene-adapter] Scene "${this.options.meta.id}" exposes getReadoutItems but not subscribe. ` +
          `Readout panel will not update automatically. ` +
          `If using createStandardSceneEntry, you now get subscribe/notify for free. ` +
          `Otherwise use createNotifySystem() or createSceneListener() in your scene.entry.ts.`
      );
    }
  }

  private _observeAnimationSurface(
    canvas: HTMLCanvasElement | undefined,
    container: HTMLElement
  ): void {
    this._ro?.disconnect();
    this._ro = null;
    const parent = canvas?.parentElement ?? container;
    const scheduleResize = this._scheduleResize;
    if (!parent || typeof ResizeObserver === 'undefined' || !scheduleResize) {
      return;
    }
    let resizing = false;
    this._ro = new ResizeObserver(() => {
      if (resizing) return;
      resizing = true;
      try {
        scheduleResize();
      } finally {
        resizing = false;
      }
    });
    this._ro.observe(parent);
    this.lifecycle.onDispose(() => {
      this._ro?.disconnect();
      this._ro = null;
    });
  }

  private _disconnectGraphVisibility(): void {
    this._graphVisibilityRo?.disconnect();
    this._graphVisibilityRo = null;
  }

  /**
   * 布局切换：保住 sim 与 shell，把渲染面绑到新槽。
   * 禁止 dispose / init / createScene（init 会 reset 物理时钟）。
   */
  private _reattachLiveScene(container: HTMLElement, slots: LayoutSlots): void {
    const canvas = container.querySelector('canvas') ?? undefined;
    const theme =
      (container
        .closest('[data-theme]')
        ?.getAttribute('data-theme') as Theme) ||
      (document.documentElement.getAttribute('data-theme') as Theme) ||
      'light';

    this.scene?.setTheme(theme);
    this.setMode(this._mode);

    if (this.scene?.reattach) {
      this.scene.reattach({ container, canvas, slots });
    } else if (this.scene?.attachStageSlot) {
      this.scene.attachStageSlot(container);
    }

    this._observeAnimationSurface(canvas, container);
    this._disconnectGraphVisibility();
    this._graphRendered = false;
    this._syncNativeFullscreenClass();

    this.scene?.resize();
    this.scene?.render();
    this._markFirstFrame();
  }

  /** 场景宣称已停时停掉 shell，避免 finished 后 step 空转。 */
  private _syncShellToSceneTransport(): void {
    if (!this.scene?.getTransportState || !this.transport) return;
    if (
      this.transport.transport.isPlaying &&
      this.scene.getTransportState().isPlaying === false
    ) {
      this.pauseAll();
    }
  }

  renderGraph(container: HTMLElement): void {
    this._renderGraphSlot(container);
  }

  private _renderGraphSlot(container: HTMLElement): void {
    if (this._graphRendered || !this.scene) return;

    if (this.scene.renderGraph) {
      this._graphRendered = true;
      this.scene.renderGraph(container);
      this._observeGraphSlotVisibility(container);
      return;
    }

    if (this.scene.attachGraphCanvas) {
      this._graphRendered = true;
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.replaceChildren();
      container.appendChild(canvas);
      this.scene.attachGraphCanvas(canvas);
      this._observeGraphSlotVisibility(container);
    }
  }

  // Hidden mobile graph tabs are remeasured when they become visible.
  // 共享 resize 路径已改为 rAF 合帧；但 0→非 0 的可见性跃迁（如 mobile-stack
  // 切到图表 tab）必须立即重排——attach 时面板 display:none 会把 canvas
  // 量成 1×1 显式 CSS 尺寸，合帧延迟会让它保持数帧甚至错过断言窗口。
  private _observeGraphSlotVisibility(container: HTMLElement): void {
    this._ro?.observe(container);
    this._disconnectGraphVisibility();
    if (typeof ResizeObserver === 'undefined') return;
    let lastW = container.clientWidth;
    let lastH = container.clientHeight;
    this._graphVisibilityRo = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      const w = entry?.contentRect.width ?? 0;
      const h = entry?.contentRect.height ?? 0;
      const becameVisible = (lastW === 0 || lastH === 0) && w > 0 && h > 0;
      lastW = w;
      lastH = h;
      if (becameVisible) {
        this.scene?.resize();
        this.scene?.render();
      }
    });
    this._graphVisibilityRo.observe(container);
  }

  renderReadout(): void {
    // 读数由 getReadoutItems() 提供，由 SceneContainer 统一刷新
  }

  requestStageRepaint(): void {
    // 复用既有 rAF 合帧通道（resize+render 一次、dispose 取消挂起），
    // 不在此另起 rAF——双 rAF 两套 cancel，布局切换时旧 rAF 可能打到新槽。
    this._scheduleResize?.();
  }

  mount(): void {
    // 场景已在 renderAnimation 中初始化
  }

  unmount(): void {
    this._disconnectGraphVisibility();
    this._ro?.disconnect();
    this._ro = null;
    this._disposeControls();
    this._sceneWriter?.flush();
    persistSceneParams(this.id);
    this.scene?.dispose();
    this.lifecycle.dispose();
    this.scene = null;
    this.controls = null;
    this.transport = null;
    this.keyboard = null;
    this.perfMonitor = null;
    this.slots = null;
    this._fullscreenHost = null;
    this.keyboardHelp = null;
    this.currentState = null;
    this._readoutItems = [];
    this.listeners.length = 0;
    this._graphRendered = false;
    this._resizeHandlerAdded = false;
    this._deferredControlContainer = null;
    this._scheduleResize = null;
  }

  startAll(): void {
    this.transport?.play();
    this.perfMonitor?.start();
    this.scene?.startAll?.();
  }

  pauseAll(): void {
    this.transport?.pause();
    this.perfMonitor?.stop();
    this.scene?.pauseAll?.();
  }

  reset(): void {
    this.transport?.reset();
    this.perfMonitor?.stop();
    this.scene?.reset?.();
    this.scene?.render();
    if (this.controls) {
      syncControlsFromLiveParams({
        params: paramsFromScene(this.scene),
        handle: this.controls,
        paramSync: this.options.paramSync
      });
    }
  }

  setTimeScale(scale: number): void {
    this.scene?.setTimeScale?.(scale);
  }

  setTheme(theme: Theme): void {
    this.scene?.setTheme(theme);
    this.scene?.render();
  }

  setMode(mode: 'normal' | 'presentation', hints?: DemoRenderHints): void {
    this._mode = mode;
    const raw =
      mode === 'presentation'
        ? (this.options.demoProfile ?? this.options.meta.demoProfile)
        : null;
    this._resolvedProfile =
      mode === 'presentation' && raw
        ? resolveDemoProfile(raw, { sceneId: this.id })
        : null;

    try {
      if (this.scene?.setMode) {
        if (mode === 'presentation' && this._resolvedProfile) {
          const sceneWithHints = this.scene as unknown as {
            setMode(
              m: 'normal' | 'presentation',
              nextHints?: DemoRenderHints
            ): void;
          };
          sceneWithHints.setMode(
            mode,
            hints ?? this._resolvedProfile.renderHints
          );
        } else {
          this.scene.setMode(mode);
        }
      }
    } finally {
      this.scene?.resize();
      this.scene?.render();
      this.refreshReadout();
      this.notifyListeners();
    }
  }

  getDemoProfile(): import('../platform/demo-profile').SceneDemoProfile | null {
    return this.options.demoProfile ?? this.options.meta.demoProfile ?? null;
  }

  getTransportState(): TransportState {
    if (this.scene?.getTransportState) {
      return this.scene.getTransportState();
    }
    const isPlaying = this.transport?.transport.isPlaying ?? false;
    const speed = this.scene?.getTimeScale?.() ?? 1;
    return { isPlaying, speed };
  }

  getDataWorkspace() {
    return this.scene?.getDataWorkspace?.() ?? null;
  }

  getReadoutItems(): ReadoutItem[] {
    let items: ReadoutItem[];
    if (this.scene?.getReadoutItems) {
      items = this.scene.getReadoutItems();
    } else {
      const state = this.resolveSceneState();
      if (this.options.formatReadout && state !== undefined) {
        items = this.options.formatReadout(state);
      } else {
        items = this._readoutItems;
      }
    }
    return filterPresentationReadout(items, this._mode, this._resolvedProfile);
  }

  private resolveSceneState(): unknown {
    if (!this.scene) return undefined;
    if (this.scene.getState) {
      return this.scene.getState();
    }
    if (this.scene.getSnapshot) {
      return this.scene.getSnapshot();
    }
    return undefined;
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
      return;
    }
    const state = this.resolveSceneState();
    if (this.options.formatReadout && state !== undefined) {
      this._readoutItems = this.options.formatReadout(state);
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
