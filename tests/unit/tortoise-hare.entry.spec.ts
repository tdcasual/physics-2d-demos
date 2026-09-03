import { describe, expect, it } from 'vitest';
import { createTortoiseHareScene } from '../../src/scenes/tortoise-hare/scene.entry';

describe('tortoise-hare entry（transport 状态机）', () => {
  it('startAll/pauseAll 驱动 getTransportState', () => {
    const scene = createTortoiseHareScene();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.startAll();
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.pauseAll();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.dispose();
  });

  it('播到 T_MAX 后 isPlaying 自动变 false；再次 startAll 从头重播', () => {
    const scene = createTortoiseHareScene();
    scene.startAll();
    for (let i = 0; i < 11; i += 1) scene.step(1);
    expect(scene.getState().finished).toBe(true);
    expect(scene.getTransportState().isPlaying).toBe(false);

    scene.startAll();
    expect(scene.getState().t).toBe(0);
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.dispose();
  });

  it('step 应用 timeScale：speed=2 时 step(0.5) 推进 1 s', () => {
    const scene = createTortoiseHareScene();
    scene.startAll();
    scene.setTimeScale(2);
    scene.step(0.5);
    // 龟 v=1.6：x(1) = 1.6
    expect(scene.getState().t).toBeCloseTo(1, 10);
    expect(scene.getState().xa).toBeCloseTo(1.6, 10);
    scene.dispose();
  });

  it('setTimeScale 钳制到 [0.25, 3]', () => {
    const scene = createTortoiseHareScene();
    scene.setTimeScale(10);
    expect(scene.getTimeScale()).toBe(3);
    scene.setTimeScale(0.01);
    expect(scene.getTimeScale()).toBe(0.25);
    scene.dispose();
  });

  it('setParams：preset → 切预设回零，播放状态保持', () => {
    const scene = createTortoiseHareScene();
    scene.startAll();
    scene.step(2);
    scene.setParams({ preset: 'opposite' });
    expect(scene.getState().preset).toBe('opposite');
    expect(scene.getState().t).toBe(0);
    // opposite：兔从 x=16 出发
    expect(scene.getState().xb).toBeCloseTo(16, 10);
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.dispose();
  });

  it('getReadoutItems 报告 t、双方位置与间距（opposite t=4 相遇）', () => {
    const scene = createTortoiseHareScene();
    scene.setParams({ preset: 'opposite' });
    scene.startAll();
    scene.step(4);
    const items = scene.getReadoutItems();
    expect(items.find((i) => i.label === '时间 t')?.value).toBe('4.00 s');
    expect(items.find((i) => i.label === '乌龟 x')?.value).toBe('8.00 m');
    expect(items.find((i) => i.label === '兔子 x')?.value).toBe('8.00 m');
    expect(items.find((i) => i.label === '间距 Δx')?.value).toBe('0.00 m');
    scene.dispose();
  });
});
