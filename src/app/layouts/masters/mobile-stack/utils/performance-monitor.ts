/**
 * 性能监控器
 *
 * 通过 requestAnimationFrame 统计 FPS 和内存使用量
 */

export interface LayoutMetrics {
  fps: number;
  memory: number;
  scrollPosition: number;
  visibleSections: string[];
  renderTime: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
  };
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private rafId: number | null = null;

  constructor(private onMetrics: (metrics: LayoutMetrics) => void) {
    this.start();
  }

  private start() {
    const measure = () => {
      this.frameCount++;
      const now = performance.now();

      if (now >= this.lastTime + 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
        this.frameCount = 0;
        this.lastTime = now;

        const perf = performance as PerformanceWithMemory;
        this.onMetrics({
          fps: this.fps,
          memory: perf.memory?.usedJSHeapSize || 0,
          scrollPosition: 0,
          visibleSections: [],
          renderTime: 0
        });
      }

      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);
  }

  destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }

  getFPS(): number {
    return this.fps;
  }
}
