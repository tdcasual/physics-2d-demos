import { describe, expect, it } from 'vitest';
import { createXtGraphScene } from '../../src/scenes/xt-graph/scene.entry';

describe('xt-graph entry（transport 状态机）', () => {
  it('startAll/pauseAll 驱动 getTransportState', () => {
    const scene = createXtGraphScene();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.startAll();
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.pauseAll();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.dispose();
  });

  it('播到 T_MAX 后 isPlaying 自动变 false；再次 startAll 从头重播', () => {
    const scene = createXtGraphScene();
    scene.startAll();
    // step 由 adapter 的 shell 循环驱动，这里直接推满 10 s
    for (let i = 0; i < 11; i += 1) scene.step(1);
    expect(scene.getState().finished).toBe(true);
    expect(scene.getTransportState().isPlaying).toBe(false);

    scene.startAll();
    expect(scene.getState().t).toBe(0);
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.dispose();
  });

  it('step 应用 timeScale：speed=2 时 step(0.5) 推进 1 s', () => {
    const scene = createXtGraphScene();
    scene.startAll();
    scene.setTimeScale(2);
    scene.step(0.5);
    expect(scene.getState().t).toBeCloseTo(1, 10);
    scene.dispose();
  });

  it('setTimeScale 钳制到 [0.25, 3]', () => {
    const scene = createXtGraphScene();
    scene.setTimeScale(10);
    expect(scene.getTimeScale()).toBe(3);
    scene.setTimeScale(0.01);
    expect(scene.getTimeScale()).toBe(0.25);
    scene.dispose();
  });

  it('setParams：speed → timeScale；preset → 切预设回零，播放状态保持', () => {
    const scene = createXtGraphScene();
    scene.startAll();
    scene.step(2);
    scene.setParams({ speed: 2, preset: 'accel' });
    expect(scene.getTimeScale()).toBe(2);
    expect(scene.getParams().speed).toBe(2);
    expect(scene.getState().preset).toBe('accel');
    expect(scene.getState().t).toBe(0);
    // 切预设不暂停：播放中切换 = 从头继续播（与 transport bar 一致）
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.dispose();
  });

  it('getReadoutItems 报告 t/x/v（uniform-pos：t=5 时 x=0, v=+1.6）', () => {
    const scene = createXtGraphScene();
    scene.startAll();
    scene.step(5);
    const items = scene.getReadoutItems();
    expect(items.find((i) => i.label === '时间 t')?.value).toBe('5.00 s');
    expect(items.find((i) => i.label === '位置 x')?.value).toBe('+0.00 m');
    expect(items.find((i) => i.label === '速度 v')?.value).toBe('+1.60 m/s');
    scene.dispose();
  });
});
