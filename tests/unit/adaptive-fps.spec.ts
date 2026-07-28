import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAdaptiveFpsController } from '../../src/app/adaptive-fps';

describe('createAdaptiveFpsController', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('adjusts target fps when difference meets the default threshold', () => {
    const setTargetFps = vi.fn();
    const ctrl = createAdaptiveFpsController({
      getRecommendedFps: () => 30,
      getTargetFps: () => 60,
      setTargetFps
    });
    ctrl.tick();
    expect(setTargetFps).toHaveBeenCalledWith(30);
  });

  it('does not adjust when difference is below the threshold', () => {
    const setTargetFps = vi.fn();
    const ctrl = createAdaptiveFpsController({
      getRecommendedFps: () => 58,
      getTargetFps: () => 60,
      setTargetFps
    });
    ctrl.tick();
    expect(setTargetFps).not.toHaveBeenCalled();
  });

  it('respects a custom threshold', () => {
    const setTargetFps = vi.fn();
    const ctrl = createAdaptiveFpsController({
      getRecommendedFps: () => 50,
      getTargetFps: () => 60,
      setTargetFps,
      threshold: 20 // 差异 10 < 20 → 不调整
    });
    ctrl.tick();
    expect(setTargetFps).not.toHaveBeenCalled();
  });

  it('starts a periodic interval and stops it on dispose', () => {
    vi.useFakeTimers();
    const setTargetFps = vi.fn();
    const ctrl = createAdaptiveFpsController({
      getRecommendedFps: () => 30,
      getTargetFps: () => 60,
      setTargetFps,
      intervalMs: 1000
    });
    ctrl.start();
    vi.advanceTimersByTime(3000);
    expect(setTargetFps).toHaveBeenCalledTimes(3);

    ctrl.dispose();
    vi.advanceTimersByTime(3000);
    expect(setTargetFps).toHaveBeenCalledTimes(3); // dispose 后不再触发
  });

  it('start is idempotent (no duplicate intervals)', () => {
    vi.useFakeTimers();
    const setTargetFps = vi.fn();
    const ctrl = createAdaptiveFpsController({
      getRecommendedFps: () => 30,
      getTargetFps: () => 60,
      setTargetFps,
      intervalMs: 1000
    });
    ctrl.start();
    ctrl.start();
    vi.advanceTimersByTime(1000);
    expect(setTargetFps).toHaveBeenCalledTimes(1);
    ctrl.dispose();
  });
});
