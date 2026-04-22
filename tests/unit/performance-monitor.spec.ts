import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from '../../src/core/performance-monitor';

describe('PerformanceMonitor', () => {
  let rafCallbacks: Array<(timestamp: number) => void> = [];
  let rafId = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    vi.useFakeTimers();

    vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('performance', {
      now: () => Date.now()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function simulateFrames(count: number, deltaMs = 16) {
    for (let i = 0; i < count; i++) {
      const callbacks = [...rafCallbacks];
      rafCallbacks = [];
      for (const cb of callbacks) {
        cb(performance.now() + i * deltaMs);
      }
    }
  }

  it('should start and stop', () => {
    const monitor = new PerformanceMonitor();
    expect(() => monitor.start()).not.toThrow();
    expect(() => monitor.stop()).not.toThrow();
  });

  it('should not start twice', () => {
    const monitor = new PerformanceMonitor();
    monitor.start();
    const firstRafId = rafId;
    monitor.start();
    expect(rafId).toBe(firstRafId);
    monitor.stop();
  });

  it('should return metrics with default values', () => {
    const monitor = new PerformanceMonitor();
    const metrics = monitor.getMetrics();
    expect(metrics.fps).toBe(0);
    expect(metrics.frameTime).toBe(0);
    expect(metrics.recommendedFps).toBe(60);
  });

  it('should calculate fps after frames', () => {
    const monitor = new PerformanceMonitor();
    monitor.start();
    simulateFrames(60, 16);
    const metrics = monitor.getMetrics();
    expect(metrics.fps).toBeGreaterThan(50);
    expect(metrics.frameTime).toBeGreaterThan(0);
    monitor.stop();
  });

  it('should throttle down when fps is low', () => {
    const monitor = new PerformanceMonitor();
    monitor.start();
    // Simulate 60 frames at 100ms each (10 fps, below threshold 30)
    simulateFrames(180, 100);
    const metrics = monitor.getMetrics();
    expect(metrics.recommendedFps).toBeLessThan(60);
    monitor.stop();
  });

  it('should not throttle below minFps', () => {
    const monitor = new PerformanceMonitor({ minFps: 20 });
    monitor.start();
    // Simulate many low-fps frames
    simulateFrames(500, 200);
    const metrics = monitor.getMetrics();
    expect(metrics.recommendedFps).toBeGreaterThanOrEqual(20);
    monitor.stop();
  });

  it('should return 1fps when hidden and pauseWhenHidden is true', () => {
    const monitor = new PerformanceMonitor({ pauseWhenHidden: true });
    // Simulate document.hidden = true
    Object.defineProperty(document, 'hidden', {
      value: true,
      writable: true,
      configurable: true
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(monitor.getRecommendedFps()).toBe(1);
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
      configurable: true
    });
  });

  it('should return normal fps when hidden but pauseWhenHidden is false', () => {
    const monitor = new PerformanceMonitor({ pauseWhenHidden: false });
    Object.defineProperty(document, 'hidden', {
      value: true,
      writable: true,
      configurable: true
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(monitor.getRecommendedFps()).toBe(60);
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
      configurable: true
    });
  });

  it('should expose isHidden getter', () => {
    const monitor = new PerformanceMonitor();
    expect(typeof monitor.isHidden).toBe('boolean');
  });

  it('should accept custom config', () => {
    const monitor = new PerformanceMonitor({
      minFps: 10,
      defaultFps: 30,
      throttleThreshold: 20
    });
    expect(monitor.getMetrics().recommendedFps).toBe(30);
  });

  it('should reset frames on stop', () => {
    const monitor = new PerformanceMonitor();
    monitor.start();
    simulateFrames(60, 16);
    monitor.stop();
    const metrics = monitor.getMetrics();
    expect(metrics.fps).toBe(0);
    expect(metrics.frameTime).toBe(0);
  });

  it('should include memoryMB when available', () => {
    const monitor = new PerformanceMonitor();
    // Mock memory API
    Object.defineProperty(performance, 'memory', {
      value: { usedJSHeapSize: 1024 * 1024 * 10 }, // 10 MB
      writable: true,
      configurable: true
    });
    const metrics = monitor.getMetrics();
    expect(metrics.memoryMB).toBe(10);
    delete (performance as unknown as Record<string, unknown>).memory;
  });
});
