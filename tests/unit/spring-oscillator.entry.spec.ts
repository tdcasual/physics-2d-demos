import { describe, expect, it, vi } from 'vitest';
import { createSpringOscillatorScene } from '../../src/scenes/spring-oscillator/scene.entry';

describe('spring-oscillator entry', () => {
  it('creates a scene with required methods', () => {
    const scene = createSpringOscillatorScene();
    expect(typeof scene.sim).toBe('object');
    expect(typeof scene.view).toBe('object');
    expect(typeof scene.init).toBe('function');
    expect(typeof scene.step).toBe('function');
    expect(typeof scene.render).toBe('function');
    expect(typeof scene.resetAll).toBe('function');
    expect(typeof scene.resize).toBe('function');
    expect(typeof scene.setMode).toBe('function');
    expect(typeof scene.setTheme).toBe('function');
    expect(typeof scene.addOscillator).toBe('function');
    expect(typeof scene.removeOscillator).toBe('function');
    expect(typeof scene.updateOscillator).toBe('function');
    expect(typeof scene.startOscillator).toBe('function');
    expect(typeof scene.pauseOscillator).toBe('function');
    expect(typeof scene.resetOscillator).toBe('function');
    expect(typeof scene.startAll).toBe('function');
    expect(typeof scene.pauseAll).toBe('function');
    expect(typeof scene.setTimeScale).toBe('function');
    expect(typeof scene.getTimeScale).toBe('function');
    expect(typeof scene.getReadoutItems).toBe('function');
    expect(typeof scene.getTransportState).toBe('function');
    expect(typeof scene.subscribe).toBe('function');
    expect(typeof scene.dispose).toBe('function');
  });

  it('init adds two default oscillators', () => {
    const scene = createSpringOscillatorScene();
    expect(scene.sim.oscillators).toHaveLength(0);
    scene.init();
    expect(scene.sim.oscillators).toHaveLength(2);
    expect(scene.sim.oscillators[0].params.k).toBe(10);
    expect(scene.sim.oscillators[0].params.m).toBe(1);
    expect(scene.sim.oscillators[0].params.x0).toBe(8);
    expect(scene.sim.oscillators[0].params.orientation).toBe('horizontal');
  });

  it('getReadoutItems returns basic info', () => {
    const scene = createSpringOscillatorScene();
    scene.init();
    scene.startAll();
    scene.step(0.5);
    const items = scene.getReadoutItems();
    expect(items.some(i => i.label === '全局时间')).toBe(true);
    expect(items.some(i => i.label === '振子数量' && i.value === '2')).toBe(true);
    expect(items.some(i => i.label === '#1 ω')).toBe(true);
    expect(items.some(i => i.label === '#1 T')).toBe(true);
    expect(items.some(i => i.label === '#1 相位')).toBe(true);
  });

  it('getReadoutItems includes phase difference for two running oscillators', () => {
    const scene = createSpringOscillatorScene();
    scene.init();
    scene.startAll();
    const items = scene.getReadoutItems();
    expect(items.some(i => i.label === '相位差 φ₂-φ₁')).toBe(true);
  });

  it('getReadoutItems does not include phase diff with fewer than 2 running', () => {
    const scene = createSpringOscillatorScene();
    scene.init();
    // 默认不启动任何振子
    const items = scene.getReadoutItems();
    expect(items.some(i => i.label === '相位差 φ₂-φ₁')).toBe(false);
  });

  it('setTimeScale clamps to [0.05, 3]', () => {
    const scene = createSpringOscillatorScene();
    scene.setTimeScale(0);
    expect(scene.getTimeScale()).toBe(0.05);
    scene.setTimeScale(5);
    expect(scene.getTimeScale()).toBe(3);
    scene.setTimeScale(1.5);
    expect(scene.getTimeScale()).toBe(1.5);
  });

  it('subscribe notifies on add/remove/update/start/pause/reset', () => {
    const scene = createSpringOscillatorScene();
    const listener = vi.fn();
    const unsub = scene.subscribe(listener);

    scene.addOscillator();
    expect(listener).toHaveBeenCalledTimes(1);

    const osc = scene.sim.oscillators[0];
    scene.removeOscillator(osc.id);
    expect(listener).toHaveBeenCalledTimes(2);

    const osc2 = scene.addOscillator();
    scene.updateOscillator(osc2.id, { k: 20 });
    expect(listener).toHaveBeenCalledTimes(4);

    scene.startOscillator(osc2.id);
    expect(listener).toHaveBeenCalledTimes(5);

    scene.pauseOscillator(osc2.id);
    expect(listener).toHaveBeenCalledTimes(6);

    scene.resetOscillator(osc2.id);
    expect(listener).toHaveBeenCalledTimes(7);

    unsub();
  });

  it('startAll and pauseAll affect all oscillators', () => {
    const scene = createSpringOscillatorScene();
    scene.init();
    scene.startAll();
    expect(scene.sim.oscillators.every(o => o.isPlaying)).toBe(true);
    scene.pauseAll();
    expect(scene.sim.oscillators.every(o => !o.isPlaying)).toBe(true);
  });

  it('getTransportState reflects playing state and speed', () => {
    const scene = createSpringOscillatorScene();
    scene.init();
    const state1 = scene.getTransportState();
    expect(state1.isPlaying).toBe(false);
    expect(state1.speed).toBe(1);

    scene.startAll();
    const state2 = scene.getTransportState();
    expect(state2.isPlaying).toBe(true);

    scene.setTimeScale(2);
    const state3 = scene.getTransportState();
    expect(state3.speed).toBe(2);
  });

  it('resetAll clears sim state and notifies', () => {
    const scene = createSpringOscillatorScene();
    scene.init();
    scene.startAll();
    scene.step(1);
    const listener = vi.fn();
    scene.subscribe(listener);
    scene.resetAll();
    expect(scene.sim.globalTime).toBe(0);
    expect(scene.sim.oscillators.every(o => o.state.x === o.initial.x)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('step applies timeScale', () => {
    const scene = createSpringOscillatorScene();
    scene.init();
    scene.startAll();
    scene.setTimeScale(2);
    scene.step(0.5);
    expect(scene.sim.globalTime).toBeCloseTo(1, 6);
  });

  it('dispose does not throw', () => {
    const scene = createSpringOscillatorScene();
    scene.init();
    expect(() => scene.dispose()).not.toThrow();
  });
});
