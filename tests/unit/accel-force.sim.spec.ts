import { describe, expect, it } from 'vitest';
import {
  createAccelForceSim,
  theoreticalAcceleration
} from '../../src/scenes/accel-force/scene.sim';

describe('accel-force sim', () => {
  it('computes the ideal acceleration', () => {
    expect(theoreticalAcceleration(0.4, 0.03)).toBeCloseTo(0.688, 2);
  });

  it('reports whether friction was balanced', () => {
    const sim = createAccelForceSim({ balanced: true, autoRun: false });
    expect(sim.getState().status).toBe('已平衡摩擦力');
    sim.setParams({ balanced: false });
    expect(sim.getState().status).toContain('不得宣称正比');
  });

  it('clamps parameters and pauses when requested', () => {
    const sim = createAccelForceSim({
      cartMass: 99,
      hangerMass: -1,
      autoRun: false
    });
    expect(sim.getParams().cartMass).toBe(1);
    expect(sim.getParams().hangerMass).toBe(0);
    sim.step(2);
    expect(sim.getState().time).toBe(0);
  });
});
