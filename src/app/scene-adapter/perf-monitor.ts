import { createAdaptiveFpsController } from '../adaptive-fps';
import { PerformanceMonitor } from '../../core/performance-monitor';

export interface ScenePerformanceRuntimeOptions {
  registerCleanup(cleanup: () => void): void;
  getTargetFps(): number;
  setTargetFps(fps: number): void;
}

/** Create the on-demand performance monitor and bind its adaptive FPS loop. */
export function createScenePerformanceRuntime(
  options: ScenePerformanceRuntimeOptions
): PerformanceMonitor {
  const monitor = new PerformanceMonitor();
  (window as unknown as Record<string, unknown>).__perfMonitor = monitor;
  options.registerCleanup(() => {
    monitor.stop();
    delete (window as unknown as Record<string, unknown>).__perfMonitor;
  });

  const adaptiveFps = createAdaptiveFpsController({
    getRecommendedFps: () => monitor.getRecommendedFps(),
    getTargetFps: options.getTargetFps,
    setTargetFps: options.setTargetFps
  });
  adaptiveFps.start();
  options.registerCleanup(() => adaptiveFps.dispose());

  return monitor;
}
