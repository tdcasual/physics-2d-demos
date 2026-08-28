/**
 * 渲染合帧调度器
 *
 * 将高频同步 render 调用（滑块 input、拖拽 pointermove 等）合并为
 * 每帧最多一次的 rAF 渲染，避免 Firefox/Android 一帧派发多个 input
 * 事件时的重复全量重绘（如 thin-film 白光模式每事件 ~3.1 万次 sin）。
 */

export type RenderScheduler = {
  /** 请求下一帧渲染；同帧内多次调用合并为一次 */
  schedule(): void;
  /** 同步执行渲染（并取消挂起的 rAF），用于需要立即出帧的场景 */
  flush(): void;
  /** 取消挂起的 rAF 并停用调度器（之后的 schedule/flush 均为 no-op） */
  dispose(): void;
};

/**
 * 创建渲染调度器
 *
 * @param render - 实际渲染函数，每帧最多被调用一次
 */
export function createRenderScheduler(render: () => void): RenderScheduler {
  let rafId: number | null = null;
  let disposed = false;

  const run = (): void => {
    // 先清零 rafId 再渲染：render 回调内再次 schedule 只会排到下一帧，
    // 不会在同一帧内同步重入导致死循环。
    rafId = null;
    if (disposed) return;
    render();
  };

  return {
    schedule() {
      if (disposed || rafId !== null) return;
      rafId = window.requestAnimationFrame(run);
    },
    flush() {
      if (disposed) return;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      render();
    },
    dispose() {
      disposed = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  };
}
