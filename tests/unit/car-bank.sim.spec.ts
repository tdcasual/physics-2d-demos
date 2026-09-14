import { describe, expect, it } from 'vitest';
import {
  carBankAt,
  carBankConstants as C,
  createCarBankSim
} from '../../src/scenes/car-bank/scene.sim';

describe('car-bank simulation', () => {
  it('matches the no-friction critical-speed equation', () => {
    const state = carBankAt({
      bankAngle: 30,
      speed: 28.5,
      autoRun: true,
      showVectors: true
    });
    expect(state.criticalSpeed).toBeCloseTo(
      Math.sqrt(C.radius * C.gravity * Math.tan(Math.PI / 6)),
      8
    );
  });

  it('has near-zero friction at critical speed', () => {
    const base = carBankAt({
      bankAngle: 30,
      speed: 28.5,
      autoRun: true,
      showVectors: true
    });
    const state = carBankAt({
      bankAngle: 30,
      speed: base.criticalSpeed,
      autoRun: true,
      showVectors: true
    });
    expect(state.frictionForce).toBeLessThan(1e-6);
    expect(state.normalForce).toBeCloseTo(
      (C.mass * C.gravity) / Math.cos(Math.PI / 6),
      5
    );
  });

  it('reverses friction direction across the critical speed', () => {
    const low = carBankAt({
      bankAngle: 30,
      speed: 16,
      autoRun: true,
      showVectors: true
    });
    const high = carBankAt({
      bankAngle: 30,
      speed: 34,
      autoRun: true,
      showVectors: true
    });
    expect(low.frictionDirection).toBe('沿路面向上');
    expect(high.frictionDirection).toBe('沿路面向下');
    expect(low.trend).toContain('低速');
    expect(high.trend).toContain('高速');
  });

  it('pauses, steps, and resets', () => {
    const sim = createCarBankSim({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.1, 6);
    sim.setParams({ autoRun: false });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.1, 6);
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getParams().speed).toBe(C.defaultSpeed);
  });
});
