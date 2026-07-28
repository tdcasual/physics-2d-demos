/**
 * 自适应帧率控制器
 *
 * 周期性读取性能监控的推荐帧率，并在与当前目标帧率差异超过阈值时调整，
 * 使动画在低端设备上自动降帧、在高性能设备上恢复流畅。
 *
 * 从 SceneAdapter 抽出，便于独立测试与复用。
 */

export type AdaptiveFpsOptions = {
  /** 返回推荐帧率（通常来自 PerformanceMonitor.getRecommendedFps） */
  getRecommendedFps: () => number;
  /** 返回当前目标帧率 */
  getTargetFps: () => number;
  /** 设置目标帧率 */
  setTargetFps: (fps: number) => void;
  /** 采样间隔（毫秒），默认 2000 */
  intervalMs?: number;
  /** 触发调整的差异阈值（fps），默认 5 */
  threshold?: number;
};

export type AdaptiveFpsController = {
  /** 执行一次采样与调整（暴露以便测试） */
  tick(): void;
  start(): void;
  dispose(): void;
};

export function createAdaptiveFpsController(
  options: AdaptiveFpsOptions
): AdaptiveFpsController {
  const intervalMs = options.intervalMs ?? 2000;
  const threshold = options.threshold ?? 5;
  let timer: number | null = null;

  function tick(): void {
    const recommended = options.getRecommendedFps();
    const current = options.getTargetFps();
    if (Math.abs(recommended - current) >= threshold) {
      options.setTargetFps(recommended);
    }
  }

  return {
    tick,
    start(): void {
      if (timer !== null) return;
      timer = window.setInterval(tick, intervalMs);
    },
    dispose(): void {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }
  };
}
