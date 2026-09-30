/**
 * 容器 ResizeObserver 管理器
 *
 * 封装 ResizeObserver 的生命周期管理：
 * - 监听容器尺寸变化
 * - 自动布局切换（防抖 300ms 后**按最新上下文重解析**）
 * - 切换事务进行中只聚合 dirty，commit/rollback 后 drain 一次
 */

import type { Scene } from './types';

export interface ResizeObserverCallbacks {
  /** 获取当前场景 */
  getCurrentScene: () => Scene | null;
  /** 获取当前布局 ID */
  getCurrentLayoutId: () => string | null;
  /** 解析场景应使用的布局（防抖到期时以最新视口/偏好重解析） */
  resolveLayout: (scene: Scene) => string;
  /** 执行布局切换 */
  switchLayout: (id: string) => Promise<void>;
  /** 容器是否正在切换中 */
  getSwitching: () => boolean;
  /** 通知当前布局尺寸变化 */
  notifyLayoutResize: (width: number, height: number) => void;
  /** 可选的外部 resize 回调 */
  onResize?: (width: number, height: number) => void;
}

/**
 * 管理容器尺寸观察与自动布局切换
 */
export class ContainerResizeObserver {
  private _observer: ResizeObserver | null = null;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _dirty = false;
  private _lastRect: { width: number; height: number } | null = null;

  constructor(
    private _container: HTMLElement,
    private _callbacks: ResizeObserverCallbacks
  ) {}

  /** 启动观察 */
  start(): void {
    if (!window.ResizeObserver) return;

    this._observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this._lastRect = { width, height };
        if (this._callbacks.getCurrentScene()) {
          this._debounceSwitch();
        }

        this._callbacks.notifyLayoutResize(width, height);
        this._callbacks.onResize?.(width, height);
      }
    });

    this._observer.observe(this._container);
  }

  /** 停止观察并清理资源 */
  stop(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._observer?.disconnect();
    this._observer = null;
    this._dirty = false;
  }

  /**
   * Called after a switch commit/rollback barrier. Re-resolves against the
   * latest measurement; never starts a parallel transition from inside an
   * in-flight switch.
   */
  drain(): void {
    if (this._callbacks.getSwitching()) {
      this._dirty = true;
      return;
    }
    if (!this._dirty && !this._lastRect) return;
    this._dirty = false;
    this.evaluate();
  }

  /**
   * 防抖处理布局切换。目标布局在防抖到期后**重新解析**。
   * 事务进行中只置 dirty，不启动新 switch。
   */
  private _debounceSwitch(): void {
    if (this._timer) {
      clearTimeout(this._timer);
    }
    this._timer = setTimeout(() => {
      this._timer = null;
      if (this._callbacks.getSwitching()) {
        this._dirty = true;
        return;
      }
      this.evaluate();
    }, 300);
  }

  private evaluate(): void {
    const scene = this._callbacks.getCurrentScene();
    if (!scene) return;
    const target = this._callbacks.resolveLayout(scene);
    if (target !== this._callbacks.getCurrentLayoutId()) {
      this._callbacks.switchLayout(target).catch((err) => {
        console.error('[ContainerResizeObserver] Layout switch failed:', err);
      });
    }
  }
}
