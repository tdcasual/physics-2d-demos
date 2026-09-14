import { describe, expect, it } from 'vitest';
import {
  calculateVelocitySelector,
  createVelocitySelectorSim,
  velocitySelectorSample
} from '../../src/scenes/velocity-selector/scene.sim';

describe('velocity-selector simulation', () => {
  it('uses v = E/B as the balanced speed', () => {
    const result = calculateVelocitySelector({
      electricField: 1,
      magneticField: 2,
      initialSpeed: 0.5,
      plateGap: 1,
      charge: 'positive'
    });
    expect(result.balanceSpeed).toBeCloseTo(0.5, 8);
    expect(result.netForce).toBeCloseTo(0, 8);
    expect(result.status).toBe('速度匹配');
  });

  it('classifies over-speed and under-speed with opposite deflections', () => {
    const over = velocitySelectorSample(
      {
        electricField: 1,
        magneticField: 1,
        initialSpeed: 1.5,
        plateGap: 1,
        charge: 'positive'
      },
      1
    );
    const under = velocitySelectorSample(
      {
        electricField: 1,
        magneticField: 1,
        initialSpeed: 0.5,
        plateGap: 1,
        charge: 'positive'
      },
      1
    );
    expect(over.status).toBe('速度过大');
    expect(under.status).toBe('速度过小');
    expect(over.deflection).toBeLessThan(0);
    expect(under.deflection).toBeGreaterThan(0);
  });

  it('reverses both force directions for a negative charge', () => {
    const positive = calculateVelocitySelector({
      electricField: 1,
      magneticField: 1,
      initialSpeed: 1.4,
      plateGap: 1,
      charge: 'positive'
    });
    const negative = calculateVelocitySelector({
      electricField: 1,
      magneticField: 1,
      initialSpeed: 1.4,
      plateGap: 1,
      charge: 'negative'
    });
    expect(negative.electricForce).toBe(-positive.electricForce);
    expect(negative.magneticForce).toBe(-positive.magneticForce);
    expect(negative.netForce).toBe(-positive.netForce);
  });

  it('normalizes parameters, pauses, and resets the animation', () => {
    const sim = createVelocitySelectorSim({
      electricField: 9,
      magneticField: 0,
      initialSpeed: 9,
      plateGap: 0
    });
    expect(sim.getParams().electricField).toBe(2);
    expect(sim.getParams().magneticField).toBe(0.4);
    expect(sim.getParams().initialSpeed).toBe(2);
    expect(sim.getParams().plateGap).toBe(0.8);
    sim.setParams({ autoRun: false });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true });
    sim.step(0.25);
    expect(sim.getState().time).toBeGreaterThan(0);
    sim.reset();
    expect(sim.getState().time).toBe(0);
  });
});
