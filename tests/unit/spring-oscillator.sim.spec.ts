import { describe, expect, it } from 'vitest';
import {
  createSpringOscillatorSim,
  createOscillatorState,
  OSCILLATOR_COLORS,

} from '../../src/scenes/spring-oscillator/scene.sim';

describe('spring-oscillator sim', () => {
  it('creates an empty sim', () => {
    const sim = createSpringOscillatorSim();
    expect(sim.oscillators).toHaveLength(0);
    expect(sim.globalTime).toBe(0);
  });

  it('adds an oscillator with default params', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator();
    expect(sim.oscillators).toHaveLength(1);
    expect(osc.params.k).toBe(10);
    expect(osc.params.m).toBe(1);
    expect(osc.params.x0).toBe(5);
    expect(osc.params.orientation).toBe('horizontal');
    expect(osc.isPlaying).toBe(false);
    expect(osc.color).toBe(OSCILLATOR_COLORS[0]);
  });

  it('adds an oscillator with custom params', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 20, m: 2, x0: -8, orientation: 'vertical' });
    expect(osc.params.k).toBe(20);
    expect(osc.params.m).toBe(2);
    expect(osc.params.x0).toBe(-8);
    expect(osc.params.orientation).toBe('vertical');
  });

  it('clamps parameters to valid ranges', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 200, m: 0.01, x0: 50 });
    expect(osc.params.k).toBe(100);
    expect(osc.params.m).toBe(0.1);
    expect(osc.params.x0).toBe(20);
  });

  it('assigns colors in rotation', () => {
    const sim = createSpringOscillatorSim();
    const osc1 = sim.addOscillator();
    const osc2 = sim.addOscillator();
    const osc3 = sim.addOscillator();
    expect(osc1.color).toBe(OSCILLATOR_COLORS[0]);
    expect(osc2.color).toBe(OSCILLATOR_COLORS[1]);
    expect(osc3.color).toBe(OSCILLATOR_COLORS[2]);
  });

  it('removes an oscillator by id', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator();
    expect(sim.removeOscillator(osc.id)).toBe(true);
    expect(sim.oscillators).toHaveLength(0);
    expect(sim.removeOscillator('nonexistent')).toBe(false);
  });

  it('computes omega = sqrt(k/m)', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 16, m: 4 });
    expect(sim.getOmega(osc.id)).toBeCloseTo(2, 6);
  });

  it('computes period = 2*pi/omega', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 10, m: 1 });
    const omega = Math.sqrt(10);
    expect(sim.getPeriod(osc.id)).toBeCloseTo((2 * Math.PI) / omega, 6);
  });

  it('does not move a paused oscillator on step', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ x0: 5 });
    const before = osc.state.x;
    sim.step(1);
    expect(osc.state.x).toBe(before);
    expect(sim.globalTime).toBe(1);
  });

  it('moves a playing oscillator according to SHM', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 10, m: 1, x0: 5 });
    sim.startOscillator(osc.id);
    sim.step(1);
    const omega = Math.sqrt(10);
    const expected = 5 * Math.cos(omega * 1);
    expect(osc.state.x).toBeCloseTo(expected, 6);
  });

  it('computes velocity and acceleration correctly', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 10, m: 1, x0: 5 });
    sim.startOscillator(osc.id);
    sim.step(1);
    const omega = Math.sqrt(10);
    const t = 1;
    expect(osc.state.v).toBeCloseTo(-5 * omega * Math.sin(omega * t), 6);
    expect(osc.state.a).toBeCloseTo(-5 * omega * omega * Math.cos(omega * t), 6);
  });

  it('handles startDelay: oscillator stays at initial position during delay', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 10, m: 1, x0: 5 }, 0.5);
    sim.startOscillator(osc.id);
    sim.step(0.3);
    // 仍在延迟期内
    expect(osc.state.x).toBe(5);
    expect(osc.state.v).toBe(0);
    expect(osc.state.a).toBe(0);
    sim.step(0.3);
    // 延迟已结束，开始运动
    const expected = 5 * Math.cos(Math.sqrt(10) * 0.1);
    expect(osc.state.x).toBeCloseTo(expected, 6);
  });

  it('updates oscillator params and preserves phase', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 10, m: 1, x0: 5 });
    sim.startOscillator(osc.id);
    sim.step(1);
    sim.updateOscillator(osc.id, { k: 20 });
    // 更新后重置到初始状态但使用新参数
    expect(osc.params.k).toBe(20);
    expect(osc.state.x).toBe(5);
    expect(osc.state.phase).toBe(0); // x0 >= 0 => phase = 0
  });

  it('updates oscillator with custom phase', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 10, m: 1, x0: 5 });
    sim.updateOscillator(osc.id, { k: 10, m: 1, x0: 5, phase: Math.PI / 2 });
    expect(osc.initial.phase).toBeCloseTo(Math.PI / 2, 6);
  });

  it('resets a single oscillator', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ k: 10, m: 1, x0: 5 });
    sim.startOscillator(osc.id);
    sim.step(1);
    expect(osc.state.x).not.toBe(5);
    sim.resetOscillator(osc.id);
    expect(osc.state.x).toBe(5);
    expect(osc.state.v).toBe(0);
    expect(osc.isPlaying).toBe(false);
    expect(osc.localTime).toBe(0);
  });

  it('resets all oscillators', () => {
    const sim = createSpringOscillatorSim();
    const osc1 = sim.addOscillator({ x0: 5 });
    const osc2 = sim.addOscillator({ x0: -3 });
    sim.startOscillator(osc1.id);
    sim.startOscillator(osc2.id);
    sim.step(1);
    sim.resetAll();
    expect(osc1.state.x).toBe(5);
    expect(osc2.state.x).toBe(-3);
    expect(sim.globalTime).toBe(0);
  });

  it('computes phase difference between two oscillators', () => {
    const sim = createSpringOscillatorSim();
    const T = 2 * Math.PI * Math.sqrt(1 / 10);
    const osc1 = sim.addOscillator({ k: 10, m: 1, x0: 8 }, 0);
    const osc2 = sim.addOscillator({ k: 10, m: 1, x0: 8 }, T / 2);
    const diff = sim.getPhaseDifference(osc1.id, osc2.id);
    expect(diff).not.toBeNull();
    // 归一化到 [-π, π]，π 和 -π 在物理上等价
    expect(Math.abs(diff!)).toBeCloseTo(Math.PI, 2);
  });

  it('computes zero phase difference for in-phase oscillators', () => {
    const sim = createSpringOscillatorSim();
    const osc1 = sim.addOscillator({ k: 10, m: 1, x0: 8 }, 0);
    const osc2 = sim.addOscillator({ k: 10, m: 1, x0: 8 }, 0);
    const diff = sim.getPhaseDifference(osc1.id, osc2.id);
    expect(diff!).toBeCloseTo(0, 6);
  });

  it('returns null for nonexistent oscillator ids', () => {
    const sim = createSpringOscillatorSim();
    sim.addOscillator();
    expect(sim.getPhaseDifference('bad1', 'bad2')).toBeNull();
  });

  it('handles dt <= 0 safely', () => {
    const sim = createSpringOscillatorSim();
    const osc = sim.addOscillator({ x0: 5 });
    sim.startOscillator(osc.id);
    sim.step(0);
    expect(osc.state.x).toBe(5);
    sim.step(-1);
    expect(osc.state.x).toBe(5);
    expect(sim.globalTime).toBe(0);
  });

  it('createOscillatorState uses custom phase when provided', () => {
    const state = createOscillatorState({ k: 10, m: 1, x0: 5, orientation: 'horizontal' }, Math.PI / 3);
    expect(state.phase).toBe(Math.PI / 3);
  });

  it('createOscillatorState infers phase from x0 sign', () => {
    const statePos = createOscillatorState({ k: 10, m: 1, x0: 5, orientation: 'horizontal' });
    expect(statePos.phase).toBe(0);
    const stateNeg = createOscillatorState({ k: 10, m: 1, x0: -5, orientation: 'horizontal' });
    expect(stateNeg.phase).toBe(Math.PI);
  });
});
