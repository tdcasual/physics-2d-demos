/**
 * 容器 ResizeObserver 管理器
 *
 * 封装 ResizeObserver 的生命周期管理：
 * - 监听容器尺寸变化
 * - 自动布局切换（防抖 300ms 后**按最新上下文重解析**——用户偏好经策略 1 的
 *   约束检查参与解析：满足时解析结果即偏好（== 当前布局，无切换），违反时
 *   自动回落；不存在「有偏好即禁用自动切换」的旁路）
 * - 向当前布局通知尺寸变化
 * - 向外部回调通知尺寸变化
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

  constructor(
    private _container: HTMLElement,
    private _callbacks: ResizeObserverCallbacks
  ) {}

  /** 启动观察 */
  start(): void {
    if (!window.ResizeObserver) return;

    this._observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // 有场景时安排一次重评估；目标布局在防抖到期后按最新上下文重解析
        //（偏好约束化后不设「有偏好即禁用」旁路）。
        if (this._callbacks.getCurrentScene()) {
          this._debounceSwitch();
        }

        const { width, height } = entry.contentRect;
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
   * 防抖处理布局切换。目标布局在防抖到期后**重新解析**（resolveLayout 经
   * 策略链：强制 > 偏好（约束内）> 场景偏好 > 自动匹配），避免沿用观察
   * 时刻的过期目标；解析结果 == 当前布局时为 no-op。
   */
  private _debounceSwitch(): void {
    if (this._timer) {
      clearTimeout(this._timer);
    }
    this._timer = setTimeout(() => {
      this._timer = null;
      if (this._callbacks.getSwitching()) return;
      const scene = this._callbacks.getCurrentScene();
      if (!scene) return;
      const target = this._callbacks.resolveLayout(scene);
      if (target !== this._callbacks.getCurrentLayoutId()) {
        this._callbacks.switchLayout(target).catch((err) => {
          console.error('[ContainerResizeObserver] Layout switch failed:', err);
        });
      }
    }, 300);
  }
}
