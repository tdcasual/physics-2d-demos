/**
 * 性能监控器
 *
 * 跟踪 FPS、帧时间和内存使用量。
 * 适用于需要验证动画性能的场景。
 */

export type PerformanceMetrics = {
  /** 当前平均 FPS（基于最近 60 帧） */
  fps: number;
  /** 平均帧时间（毫秒） */
  frameTime: number;
  /** 已用 JS 堆内存（MB，仅 Chrome） */
  memoryMB?: number;
};

export class PerformanceMonitor {
  private frames: number[] = [];
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const delta = now - this.lastTime;
    this.frames.push(delta);
    if (this.frames.length > 60) this.frames.shift();
    this.lastTime = now;
    this.rafId = requestAnimationFrame(this.loop);
  };

  getMetrics(): PerformanceMetrics {
    const count = this.frames.length || 1;
    const avgDelta = this.frames.reduce((a, b) => a + b, 0) / count;
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    return {
      fps: avgDelta > 0 ? 1000 / avgDelta : 0,
      frameTime: avgDelta,
      memoryMB: perf.memory
        ? perf.memory.usedJSHeapSize / 1024 / 1024
        : undefined
    };
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.frames = [];
  }
}
