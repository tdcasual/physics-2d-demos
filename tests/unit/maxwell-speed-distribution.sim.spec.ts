import { describe, expect, it } from 'vitest';
import {
  calculateMaxwell,
  createMaxwellSim,
  maxwellDensity
} from '../../src/scenes/maxwell-speed-distribution/scene.sim';
describe('Maxwell speed distribution simulation', () => {
  it('computes the three characteristic speeds in order', () => {
    const s = calculateMaxwell({
      temperature: 600,
      molarMass: 28,
      autoRun: false
    });
    // 保留：√(2RT/M)=596.921 vs 教科书圆整 597，Δ=7.93e-2 无法进 precision 1
    expect(s.mostProbable).toBeCloseTo(597, 0);
    expect(s.mostProbable).toBeLessThan(s.meanSpeed);
    expect(s.meanSpeed).toBeLessThan(s.rmsSpeed);
  });
  it('moves the distribution right when temperature rises', () => {
    const low = calculateMaxwell({
      temperature: 300,
      molarMass: 28,
      autoRun: false
    });
    const high = calculateMaxwell({
      temperature: 900,
      molarMass: 28,
      autoRun: false
    });
    expect(high.mostProbable).toBeGreaterThan(low.mostProbable);
    expect(maxwellDensity(high.mostProbable, high)).toBeGreaterThan(0);
  });
  it('updates and resets selected parameters', () => {
    const sim = createMaxwellSim({ temperature: 400, molarMass: 32 });
    sim.setParams({ temperature: 800 });
    expect(sim.getParams().temperature).toBe(800);
    sim.reset();
    expect(sim.getParams().temperature).toBe(400);
  });
});
