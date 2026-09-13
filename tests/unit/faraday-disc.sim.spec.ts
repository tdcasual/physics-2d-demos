import { describe, expect, it } from 'vitest';
import {
  createFaradaySim,
  faradayEmf
} from '../../src/scenes/faraday-disc/scene.sim';

describe('faraday-disc sim', () => {
  it('uses E = 1/2 BωR²', () => {
    expect(faradayEmf(1, 10, 0.2)).toBeCloseTo(0.2, 8);
  });

  it('couples current and power to the external circuit', () => {
    const sim = createFaradaySim({
      B: 1,
      omega: 10,
      radius: 0.2,
      externalResistance: 2
    });
    expect(sim.getState().current).toBeCloseTo(0.1, 3);
    expect(sim.getState().power).toBeCloseTo(0.02, 3);
    sim.setParams({ closed: false });
    expect(sim.getState().current).toBe(0);
  });

  it('clamps parameters and advances/reset time', () => {
    const sim = createFaradaySim();
    sim.setParams({ B: 99, omega: -1, radius: 2, externalResistance: -1 });
    expect(sim.getParams()).toMatchObject({
      B: 2,
      omega: 2,
      radius: 0.4,
      externalResistance: 0.5
    });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 8);
    sim.reset();
    expect(sim.getState().time).toBe(0);
  });
});
