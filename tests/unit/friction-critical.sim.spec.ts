import { describe, expect, it } from 'vitest';
import {
  deriveFriction,
  createFrictionSim
} from '../../src/scenes/friction-critical/scene.sim';

describe('friction-critical simulation', () => {
  it('matches static friction below the threshold', () => {
    const state = deriveFriction({
      mode: 'single',
      force: 4,
      mass: 2,
      upperMass: 1,
      lowerMass: 2,
      muK: 0.4,
      autoRun: false
    });
    expect(state.friction).toBeCloseTo(4);
    expect(state.acceleration).toBe(0);
    expect(state.status).toBe('静止');
  });
  it('switches to kinetic friction beyond the threshold', () => {
    const state = deriveFriction({
      mode: 'single',
      force: 21.5,
      mass: 2,
      upperMass: 1,
      lowerMass: 2,
      muK: 0.4,
      autoRun: false
    });
    expect(state.maxStatic).toBeCloseTo(10);
    expect(state.friction).toBeCloseTo(8);
    expect(state.acceleration).toBeCloseTo(6.75);
    expect(state.status).toBe('整体滑动');
  });
  it('supports stacked-body relative slip and bounded animation', () => {
    const sim = createFrictionSim({
      mode: 'stacked',
      force: 40,
      autoRun: true
    });
    let seenSlip = false;
    for (let i = 0; i < 120; i += 1) {
      sim.step(1 / 60);
      const state = sim.getState();
      seenSlip ||= state.status === '上块相对滑动';
      expect(state.position).toBeGreaterThanOrEqual(-0.35);
      expect(state.position).toBeLessThanOrEqual(0.35);
    }
    expect(seenSlip).toBe(true);
  });
});
