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
import type { DemoRenderHints, SceneDemoProfile } from './demo-profile';
import { createSceneShell } from './scene-shell';
import { KeyboardShortcutManager } from '../platform/input/keyboard-shortcuts';
import { PerformanceMonitor } from '../core/performance-monitor';
import { createPageLifecycle } from './page-lifecycle';
import type { SceneInstance, ScenePageOptions } from './scene-bootstrapper-types';

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
    this.slots = slots;

    const canvas = container.querySelector('canvas');
    if (!canvas) {
      console.error('[SceneAdapter] Canvas not found in animation slot');
      return;
    }

    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${this.options.meta.title}演示图`);

    const theme =
      (container.closest('[data-theme]')?.getAttribute('data-theme') as Theme) ||
      (document.documentElement.getAttribute('data-theme') as Theme) ||
      'light';
    const mode =
      (container.closest('[data-mode]')?.getAttribute('data-mode') as
        | 'normal'
        | 'presentation') || 'normal';

    const demoHints =
      mode === 'presentation'
        ? (this.options.demoProfile ?? this.options.meta.demoProfile)?.renderHints
        : undefined;
    this.scene = this.options.createScene({ canvas, slots, theme, mode, demoHints });

    this.scene.init();

    this.transport = createSceneShell({
      stepSeconds: this.options.stepSeconds ?? 1 / 60,
      maxSubSteps: this.options.maxSubSteps ?? 5,
      onStep: (dt) => this.scene?.step(dt),
      onRender: () => this.scene?.render()
    });
    this.lifecycle.onDispose(() => this.transport?.dispose());

    this.keyboard = new KeyboardShortcutManager();
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
      }
    });
    this.keyboard.init();
    this.lifecycle.onDispose(() => this.keyboard?.dispose());

    this.perfMonitor = new PerformanceMonitor();
    this.perfMonitor.start();
    (window as unknown as Record<string, unknown>).__perfMonitor = this.perfMonitor;
    this.lifecycle.onDispose(() => {
      this.perfMonitor?.stop();
      delete (window as unknown as Record<string, unknown>).__perfMonitor;
    });

    const fpsCheckInterval = window.setInterval(() => {
      if (!this.transport || !this.perfMonitor) return;
      const recommended = this.perfMonitor.getRecommendedFps();
      const current = this.transport.getTargetFps();
      if (Math.abs(recommended - current) >= 5) {
        this.transport.setTargetFps(recommended);
      }
    }, 2000);
    this.lifecycle.onDispose(() => window.clearInterval(fpsCheckInterval));

    if (!this._resizeHandlerAdded) {
      const handleResize = () => {
        this.scene?.resize();
        this.scene?.render();
      };
      window.addEventListener('resize', handleResize);
      this.lifecycle.onDispose(() =>
        window.removeEventListener('resize', handleResize)
      );
      this._resizeHandlerAdded = true;
    }

    if (this._deferredControlContainer) {
      this._createControls(this._deferredControlContainer);
      this._deferredControlContainer = null;
    }

    if (slots.graph && !this._graphRendered) {
      this._renderGraphSlot(slots.graph);
    }

    this.scene.resize();
    this.scene.render();

    if (this.scene.subscribe) {
      const unsubscribe = this.scene.subscribe(() => {
        this.refreshReadout();
        this.notifyListeners();
      });
      this.lifecycle.onDispose(() => unsubscribe());
    }
  }

  renderGraph(container: HTMLElement): void {
    this._renderGraphSlot(container);
  }

  private _renderGraphSlot(container: HTMLElement): void {
    if (this._graphRendered) return;
    this._graphRendered = true;

    const scene = this.scene as {
      renderGraph?(container: HTMLElement): void;
      attachGraphCanvas?(canvas: HTMLCanvasElement): void;
    } | null;

    if (scene && typeof scene.renderGraph === 'function') {
      scene.renderGraph(container);
      return;
    }

    if (scene && typeof scene.attachGraphCanvas === 'function') {
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
    if (this.scene?.setMode) {
      if (mode === 'presentation' && profile) {
        const sceneWithHints = this.scene as unknown as {
          setMode(m: 'normal' | 'presentation', hints?: DemoRenderHints): void;
        };
        sceneWithHints.setMode(mode, profile.renderHints);
      } else {
        this.scene.setMode(mode);
      }
    }

    this.scene?.resize();
    this.scene?.render();
  }

  getDemoProfile(): import('./demo-profile').SceneDemoProfile | null {
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
    const getSnapshot = (this.scene as { getSnapshot?: () => unknown }).getSnapshot;
    if (typeof getSnapshot === 'function') {
      return getSnapshot();
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
