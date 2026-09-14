import { describe, expect, it } from 'vitest';
import {
  calculateRadioactive,
  createRadioactiveSim
} from '../../src/scenes/radioactive-decay/scene.sim';
describe('radioactive decay simulation', () => {
  it('starts with all nuclei and halves statistically', () => {
    const start = calculateRadioactive({ halfLife: 2, autoRun: false }, 0);
    const oneHalf = calculateRadioactive({ halfLife: 2, autoRun: false }, 2);
    expect(start.remaining).toBe(400);
    expect(oneHalf.theoryRemaining).toBeCloseTo(200, 8);
    expect(oneHalf.remaining).toBeGreaterThan(150);
    expect(oneHalf.remaining).toBeLessThan(250);
  });
  it('advances only while auto-running and resets', () => {
    const sim = createRadioactiveSim({ halfLife: 1, autoRun: true });
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(1, 8);
    sim.setParams({ autoRun: false });
    sim.step(2);
    expect(sim.getState().time).toBeCloseTo(1, 8);
    sim.reset();
    expect(sim.getState().time).toBe(0);
  });
  it('clamps the half-life range', () => {
    const sim = createRadioactiveSim({ halfLife: 99 });
    expect(sim.getParams().halfLife).toBe(5);
  });
});
