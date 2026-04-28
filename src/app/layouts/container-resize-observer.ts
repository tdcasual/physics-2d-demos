/**
 * 容器 ResizeObserver 管理器
 *
 * 封装 ResizeObserver 的生命周期管理：
 * - 监听容器尺寸变化
 * - 自动布局切换（基于选择器策略）
 * - 防抖处理（300ms）
 * - 向当前布局通知尺寸变化
 * - 向外部回调通知尺寸变化
 */

import type { Scene } from './types';

export interface ResizeObserverCallbacks {
  /** 获取当前场景 */
  getCurrentScene: () => Scene | null;
  /** 获取用户偏好布局 */
  getUserPreferredLayout: () => string | null;
  /** 获取当前布局 ID */
  getCurrentLayoutId: () => string | null;
  /** 解析场景应使用的布局 */
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
  private _lastLayoutId: string | null = null;

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

        // 使用选择器重新计算最佳布局（支持多断点、约束等）
        const scene = this._callbacks.getCurrentScene();
        const userPref = this._callbacks.getUserPreferredLayout();
        if (scene && !userPref) {
          const newLayoutId = this._callbacks.resolveLayout(scene);
          if (newLayoutId !== this._lastLayoutId) {
            this._lastLayoutId = newLayoutId;
            this._debounceSwitch(newLayoutId);
          }
        }

        // 通知布局
        this._callbacks.notifyLayoutResize(width, height);

        // 回调
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
  }

  /**
   * 防抖处理布局切换
   * @param targetLayoutId - 目标布局 ID（由选择器解析得出）
   */
  private _debounceSwitch(targetLayoutId: string): void {
    if (this._timer) {
      clearTimeout(this._timer);
    }
    this._timer = setTimeout(() => {
      // Skip if a manual switch is in progress, or if the user has set a
      // preference since the debounce started.
      if (this._callbacks.getSwitching() || this._callbacks.getUserPreferredLayout()) return;
      if (targetLayoutId !== this._callbacks.getCurrentLayoutId()) {
        this._callbacks.switchLayout(targetLayoutId).catch((err) => {
          console.error('[ContainerResizeObserver] Layout switch failed:', err);
        });
      }
    }, 300);
  }
}
