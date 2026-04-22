/**
 * 性能监控器
 *
 * 跟踪 FPS、帧时间和内存使用量。
 * 支持自适应 RAF 节流：当 FPS 低于阈值时自动降低目标帧率。
 */

export type PerformanceMetrics = {
  /** 当前平均 FPS（基于最近 60 帧） */
  fps: number;
  /** 平均帧时间（毫秒） */
  frameTime: number;
  /** 已用 JS 堆内存（MB，仅 Chrome） */
  memoryMB?: number;
  /** 推荐的目标帧率（经自适应节流后） */
  recommendedFps: number;
};

export type ThrottleConfig = {
  /** 最低目标 FPS */
  minFps: number;
  /** 默认目标 FPS */
  defaultFps: number;
  /** 当 FPS 持续低于此值时开始节流 */
  throttleThreshold: number;
  /** 节流步长 */
  throttleStep: number;
  /** 是否在 tab 隐藏时自动暂停 */
  pauseWhenHidden: boolean;
};

const DEFAULT_THROTTLE: ThrottleConfig = {
  minFps: 15,
  defaultFps: 60,
  throttleThreshold: 30,
  throttleStep: 5,
  pauseWhenHidden: true
};

export class PerformanceMonitor {
  private frames: number[] = [];
  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private targetFps: number;
  private config: ThrottleConfig;
  private lowFpsCount = 0;
  private highFpsCount = 0;
  private _hidden = false;

  constructor(config?: Partial<ThrottleConfig>) {
    this.config = { ...DEFAULT_THROTTLE, ...config };
    this.targetFps = this.config.defaultFps;
    this._setupVisibilityHandler();
  }

  private _setupVisibilityHandler(): void {
    if (typeof document === 'undefined') return;
    const handler = () => {
      this._hidden = document.hidden;
    };
    document.addEventListener('visibilitychange', handler);
  }

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

    // 自适应节流：每 60 帧评估一次
    if (this.frames.length >= 60) {
      this._adapt();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private _adapt(): void {
    const avgDelta =
      this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    const fps = avgDelta > 0 ? 1000 / avgDelta : 60;

    if (fps < this.config.throttleThreshold) {
      this.lowFpsCount++;
      this.highFpsCount = 0;
      if (this.lowFpsCount >= 3) {
        this.targetFps = Math.max(
          this.config.minFps,
          this.targetFps - this.config.throttleStep
        );
        this.lowFpsCount = 0;
      }
    } else if (fps > this.targetFps + 5) {
      this.highFpsCount++;
      this.lowFpsCount = 0;
      if (this.highFpsCount >= 10) {
        this.targetFps = Math.min(
          this.config.defaultFps,
          this.targetFps + this.config.throttleStep
        );
        this.highFpsCount = 0;
      }
    } else {
      this.lowFpsCount = 0;
      this.highFpsCount = 0;
    }
  }

  /** 当前是否因 tab 隐藏而被建议暂停 */
  get isHidden(): boolean {
    return this._hidden;
  }

  /** 当前推荐的目标帧率 */
  getRecommendedFps(): number {
    if (this._hidden && this.config.pauseWhenHidden) {
      return 1; // tab 隐藏时降到 1fps
    }
    return this.targetFps;
  }

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
        : undefined,
      recommendedFps: this.getRecommendedFps()
    };
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.frames = [];
  }
}
