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
import type { DemoRenderHints } from '../platform/demo-profile';
import { createSceneShell } from './scene-shell';
import { KeyboardShortcutManager } from '../platform/input/keyboard-shortcuts';
import { PerformanceMonitor } from '../core/performance-monitor';
import { createAdaptiveFpsController } from './adaptive-fps';
import { createPageLifecycle } from './page-lifecycle';
import { createKeyboardHelpOverlay } from '../ui/components/KeyboardHelp';
import type { KeyboardHelpOverlay } from '../ui/components/KeyboardHelp';
import type {
  SceneInstance,
  ScenePageOptions
} from './scene-bootstrapper-types';

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
  private _graphRendered = false;

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
    if (!this.scene) {
      this._deferredControlContainer = container;
      return;
    }
    this._createControls(container);
  }

  renderAnimation(container: HTMLElement, slots: LayoutSlots): void {
    // Dispose old resources if called multiple times
    if (this.scene || this.transport) {
      this.scene?.dispose();
      this.lifecycle.dispose();
      this.lifecycle = createPageLifecycle();
      this._resizeHandlerAdded = false;
      this._graphRendered = false;
    }

    this.slots = slots;

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
    const mode =
      (container.closest('[data-mode]')?.getAttribute('data-mode') as
        | 'normal'
        | 'presentation') || 'normal';

    const demoHints =
      mode === 'presentation'
        ? (this.options.demoProfile ?? this.options.meta.demoProfile)
            ?.renderHints
        : undefined;
    this.scene = this.options.createScene({
      canvas,
      container,
      slots,
      theme,
      mode,
      demoHints
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
    let canvasIndex = 0;
    const labelCanvases = () => {
      document.querySelectorAll<HTMLCanvasElement>('canvas').forEach((node) => {
        node.setAttribute('role', 'img');
        if (!node.getAttribute('aria-label')) {
          node.setAttribute('aria-label', `${this.options.meta.title}演示图`);
        }
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
    canvasObserver.observe(document.body, { childList: true, subtree: true });
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

    this.keyboard.registerMultiple({
      ' ': () => {
        if (this.transport?.transport.isPlaying) {
          this.transport?.pause();
        } else {
          this.transport?.play();
        }
      },
      r: () => {
        this.transport?.reset?.();
        this.scene?.reset?.();
      },
      t: () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        this.scene?.setTheme(next as Theme);
        document.documentElement.setAttribute('data-theme', next);
      },
      arrowleft: () => this.scene?.step?.(-0.016),
      arrowright: () => this.scene?.step?.(0.016),
      a: () => {
        const next = Math.min(3, (this.scene?.getTimeScale?.() ?? 1) + 0.25);
        this.scene?.setTimeScale?.(next);
      },
      d: () => {
        const next = Math.max(0.25, (this.scene?.getTimeScale?.() ?? 1) - 0.25);
        this.scene?.setTimeScale?.(next);
      },
      f: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      },
      l: () => {
        document
          .querySelector('.layout-switch-btn')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      },
      '?': () => {
        this.keyboardHelp?.toggle();
      },
      escape: () => {
        this.keyboardHelp?.hide();
        const layoutEl = document.querySelector('.layout-master');
        if (layoutEl?.getAttribute('data-mode') === 'presentation') {
          this.setMode('normal');
        }
      }
    });
    this.keyboard.init();
    this.lifecycle.onDispose(() => this.keyboard?.dispose());

    this.perfMonitor = new PerformanceMonitor();
    this.perfMonitor.start();
    (window as unknown as Record<string, unknown>).__perfMonitor =
      this.perfMonitor;
    this.lifecycle.onDispose(() => {
      this.perfMonitor?.stop();
      delete (window as unknown as Record<string, unknown>).__perfMonitor;
    });

    const adaptiveFps = createAdaptiveFpsController({
      getRecommendedFps: () => this.perfMonitor?.getRecommendedFps() ?? 60,
      getTargetFps: () => this.transport?.getTargetFps() ?? 60,
      setTargetFps: (fps) => this.transport?.setTargetFps(fps)
    });
    adaptiveFps.start();
    this.lifecycle.onDispose(() => adaptiveFps.dispose());

    if (!this._resizeHandlerAdded) {
      const handleResize = () => {
        this.scene?.resize();
        this.scene?.render();
      };
      window.addEventListener('resize', handleResize);
      this.lifecycle.onDispose(() =>
        window.removeEventListener('resize', handleResize)
      );

      // Observe render surface for size changes (sidebar toggle, layout changes, etc.)
      // window.resize doesn't fire on internal layout changes like sidebar toggle.
      // canvas 类场景观察 canvas 父级；非 canvas 渲染回退到动画区容器。
      const parent = canvas?.parentElement ?? container;
      if (parent && typeof ResizeObserver !== 'undefined') {
        let resizing = false;
        const observer = new ResizeObserver(() => {
          if (resizing) return;
          resizing = true;
          try {
            this.scene?.resize();
            this.scene?.render();
          } finally {
            resizing = false;
          }
        });
        observer.observe(parent);
        this.lifecycle.onDispose(() => observer.disconnect());
      }

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

    // 自动播放：场景挂载后立即启动动画循环
    if (this.options.autoPlay) {
      this.transport?.play();
    }

    if (this.scene.subscribe) {
      const unsubscribe = this.scene.subscribe(() => {
        this.refreshReadout();
        this.notifyListeners();
      });
      this.lifecycle.onDispose(() => unsubscribe());
    } else if (this.scene.getReadoutItems) {
      // eslint-disable-next-line no-console
      console.warn(
        `[scene-adapter] Scene "${this.options.meta.id}" exposes getReadoutItems but not subscribe. ` +
          `Readout panel will not update automatically. ` +
          `If using createStandardSceneEntry, you now get subscribe/notify for free. ` +
          `Otherwise use createNotifySystem() or createSceneListener() in your scene.entry.ts.`
      );
    }
  }

  renderGraph(container: HTMLElement): void {
    this._renderGraphSlot(container);
  }

  private _renderGraphSlot(container: HTMLElement): void {
    if (this._graphRendered) return;

    const scene = this.scene as {
      renderGraph?(container: HTMLElement): void;
      attachGraphCanvas?(canvas: HTMLCanvasElement): void;
    } | null;

    if (scene && typeof scene.renderGraph === 'function') {
      this._graphRendered = true;
      scene.renderGraph(container);
      return;
    }

    if (scene && typeof scene.attachGraphCanvas === 'function') {
      this._graphRendered = true;
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.replaceChildren();
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
    this.scene?.dispose();
    this.lifecycle.dispose();
    this.scene = null;
    this.controls = null;
    this.transport = null;
    this.keyboard = null;
    this.perfMonitor = null;
    this.slots = null;
    this.keyboardHelp = null;
    this.currentState = null;
    this._readoutItems = [];
    this.listeners.length = 0;
    this._graphRendered = false;
    this._resizeHandlerAdded = false;
    this._deferredControlContainer = null;
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
    const profile =
      mode === 'presentation'
        ? (this.options.demoProfile ?? this.options.meta.demoProfile)
        : null;

    // Dispatch event so SceneContainerImpl can apply/reset demo profile on layout
    const layoutEl = document.querySelector('.layout-master');
    if (layoutEl) {
      layoutEl.dispatchEvent(
        new CustomEvent('layout:modechange', {
          detail: { mode },
          bubbles: true
        })
      );
    }

    // Forward to scene
    try {
      if (this.scene?.setMode) {
        if (mode === 'presentation' && profile) {
          const sceneWithHints = this.scene as unknown as {
            setMode(
              m: 'normal' | 'presentation',
              hints?: DemoRenderHints
            ): void;
          };
          sceneWithHints.setMode(mode, profile.renderHints);
        } else {
          this.scene.setMode(mode);
        }
      }
    } finally {
      this.scene?.resize();
      this.scene?.render();
    }
  }

  getDemoProfile(): import('../platform/demo-profile').SceneDemoProfile | null {
    return this.options.demoProfile ?? this.options.meta.demoProfile ?? null;
  }

  getTransportState(): TransportState {
    if (this.scene?.getTransportState) {
      return this.scene.getTransportState();
    }
    const isPlaying = this.transport
      ? ((this.transport as { transport?: { isPlaying?: boolean } }).transport
          ?.isPlaying ?? false)
      : false;
    const speed = this.scene?.getTimeScale?.() ?? 1;
    return { isPlaying, speed };
  }

  getReadoutItems(): ReadoutItem[] {
    if (this.scene?.getReadoutItems) {
      return this.scene.getReadoutItems();
    }
    const state = this.resolveSceneState();
    if (this.options.formatReadout && state !== undefined) {
      return this.options.formatReadout(state);
    }
    return this._readoutItems;
  }

  private resolveSceneState(): unknown {
    if (!this.scene) return undefined;
    if (this.scene.getState) {
      return this.scene.getState();
    }
    const getSnapshot = (this.scene as { getSnapshot?: () => unknown })
      .getSnapshot;
    if (typeof getSnapshot === 'function') {
      return getSnapshot.call(this.scene);
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
