import { describe, expect, it } from 'vitest';
import {
  createUniformElectricAccelerationSim,
  uniformElectricAccelerationMeasures
} from '../../src/scenes/uniform-electric-acceleration/scene.sim';

describe('uniform-electric-acceleration simulation', () => {
  it('keeps final speed independent of plate gap at fixed U, q and m', () => {
    const narrow = uniformElectricAccelerationMeasures({
      voltage: 50,
      plateGap: 6,
      charge: 1,
      mass: 1
    });
    const wide = uniformElectricAccelerationMeasures({
      voltage: 50,
      plateGap: 18,
      charge: 1,
      mass: 1
    });
    expect(narrow.finalSpeed).toBeCloseTo(wide.finalSpeed, 8);
    expect(narrow.electricField).toBeGreaterThan(wide.electricField);
    expect(narrow.force).toBeGreaterThan(wide.force);
    expect(wide.passageDuration).toBeGreaterThan(narrow.passageDuration);
  });

  it('converts electrical work to kinetic energy during the run', () => {
    const sim = createUniformElectricAccelerationSim({ autoRun: true });
    const start = sim.getState();
    sim.step(2);
    const end = sim.getState();
    expect(start.progress).toBe(0);
    expect(end.progress).toBe(1);
    expect(end.kineticEnergy).toBeCloseTo(end.work, 28);
    expect(end.finalSpeed).toBeGreaterThan(0);
  });

  it('normalizes parameters and pauses when autoplay is disabled', () => {
    const sim = createUniformElectricAccelerationSim({
      voltage: 999,
      plateGap: 0,
      charge: 20,
      mass: 0
    });
    expect(sim.getParams().voltage).toBe(100);
    expect(sim.getParams().plateGap).toBe(4);
    expect(sim.getParams().charge).toBe(3);
    expect(sim.getParams().mass).toBe(0.5);
    sim.setParams({ autoRun: false });
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
  });
});
