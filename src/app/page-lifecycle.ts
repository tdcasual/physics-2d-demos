/**
 * 页面生命周期管理
 * 提供统一的 dispose 注册和调用机制，防止内存泄漏
 */

/** 页面清理函数 */
export type PageDisposer = () => void;

/** 页面生命周期接口 */
export type PageLifecycle = {
  /** 注册清理函数（已 disposed 时立即执行） */
  onDispose: (disposer: PageDisposer) => void;
  /** 执行所有已注册的清理函数 */
  dispose: () => void;
};

/**
 * 创建页面生命周期管理器
 * @returns 包含 onDispose 和 dispose 的生命周期对象
 */
export function createPageLifecycle(): PageLifecycle {
  const disposers: PageDisposer[] = [];
  let disposed = false;

  return {
    onDispose(disposer: PageDisposer): void {
      if (disposed) {
        disposer();
        return;
      }
      disposers.push(disposer);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const disposer of disposers.splice(0)) {
        try {
          disposer();
        } catch {
          // continue disposing remaining resources
        }
      }
    }
  };
}
