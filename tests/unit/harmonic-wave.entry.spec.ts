import { describe, expect, it, vi } from 'vitest';
import { createHarmonicWaveScene } from '../../src/scenes/harmonic-wave/scene.entry';

describe('harmonic-wave entry（transport 状态机）', () => {
  it('startAll/pauseAll 驱动 getTransportState', () => {
    const scene = createHarmonicWaveScene();
    expect(scene.getTransportState()).toEqual({ isPlaying: false, speed: 1 });
    scene.startAll();
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.pauseAll();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.dispose();
  });

  it('startAll 后 step 推进 t（对应 adapter autoPlay 调用 startAll）', () => {
    const scene = createHarmonicWaveScene();
    expect(scene.getState().time).toBe(0);
    scene.step(0.5);
    expect(scene.getState().time).toBe(0);
    scene.startAll();
    scene.step(0.5);
    expect(scene.getState().time).toBeCloseTo(0.5, 8);
    scene.dispose();
  });

  it('暂停后 t 不再增长，恢复后继续', () => {
    const scene = createHarmonicWaveScene();
    scene.startAll();
    scene.step(0.4);
    expect(scene.getState().time).toBeCloseTo(0.4, 8);

    scene.pauseAll();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.step(0.4);
    expect(scene.getState().time).toBeCloseTo(0.4, 8);

    scene.startAll();
    scene.step(0.3);
    expect(scene.getState().time).toBeCloseTo(0.7, 8);
    scene.dispose();
  });

  it('reset 将 playing 置 false 并清零 t', () => {
    const scene = createHarmonicWaveScene();
    scene.startAll();
    scene.step(1);
    expect(scene.getTransportState().isPlaying).toBe(true);
    expect(scene.getState().time).toBeCloseTo(1, 8);

    scene.reset();
    expect(scene.getTransportState().isPlaying).toBe(false);
    expect(scene.getState().time).toBe(0);
    scene.step(0.5);
    expect(scene.getState().time).toBe(0);
    scene.dispose();
  });

  it('step 应用 timeScale：speed=2 时 step(0.5) 推进 1 s', () => {
    const scene = createHarmonicWaveScene();
    scene.startAll();
    scene.setTimeScale(2);
    expect(scene.getTimeScale()).toBe(2);
    expect(scene.getTransportState().speed).toBe(2);
    scene.step(0.5);
    expect(scene.getState().time).toBeCloseTo(1, 8);
    scene.dispose();
  });

  it('setTimeScale 钳制到 [0.25, 3]', () => {
    const scene = createHarmonicWaveScene();
    scene.setTimeScale(10);
    expect(scene.getTimeScale()).toBe(3);
    expect(scene.getTransportState().speed).toBe(3);
    scene.setTimeScale(0.01);
    expect(scene.getTimeScale()).toBe(0.25);
    expect(scene.getTransportState().speed).toBe(0.25);
    scene.dispose();
  });

  it('start/pause/reset 触发 notify', () => {
    const scene = createHarmonicWaveScene();
    const listener = vi.fn();
    scene.subscribe(listener);
    scene.startAll();
    scene.pauseAll();
    scene.reset();
    expect(listener).toHaveBeenCalledTimes(3);
    scene.dispose();
  });
});
