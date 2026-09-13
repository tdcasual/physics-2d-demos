import { describe, expect, it } from 'vitest';
import { createTirSim } from '../../src/scenes/semicylinder-tir/scene.sim';

describe('semicylinder-tir sim', () => {
  it('computes critical and refracted angles with Snell law', () => {
    const state = createTirSim({
      refractiveIndex: 1.5,
      height: 5.24,
      autoRun: false
    }).getState();
    expect((state.criticalAngle * 180) / Math.PI).toBeCloseTo(41.81, 2);
    expect((state.incidentAngle * 180) / Math.PI).toBeCloseTo(31.6, 2);
    expect(state.refractedAngle).not.toBeNull();
    expect(state.status).toBe('折射透出圆弧面');
  });
  it('switches to total internal reflection above the critical height', () => {
    const state = createTirSim({
      refractiveIndex: 1.5,
      height: 7,
      autoRun: false
    }).getState();
    expect(state.criticalHeight).toBeCloseTo(6.6667, 3);
    expect(state.refractedAngle).toBeNull();
    expect(state.status).toBe('发生全反射');
  });
  it('clamps parameters and keeps manual height fixed during animation', () => {
    const sim = createTirSim({ autoRun: true });
    sim.setParams({ refractiveIndex: 9, height: -1 });
    expect(sim.getState().refractiveIndex).toBe(2.4);
    expect(sim.getState().height).toBe(0);
    sim.step(0.1);
    expect(sim.getState().height).toBe(0);
    expect(sim.getState().time).toBeCloseTo(0.05);
  });
});
