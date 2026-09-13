import { describe, expect, it } from 'vitest';
import {
  calculateDeflection,
  createElectricDeflectionSim
} from '../../src/scenes/electric-deflection/scene.sim';

describe('electric-deflection simulation', () => {
  it('derives field strength from voltage and gap', () => {
    const result = calculateDeflection({
      particle: 'electron',
      voltage: 40,
      plateGap: 30,
      initialSpeed: 3
    });
    expect(result.field).toBeCloseTo(133.333, 2);
    expect(result.deflection).toBeLessThan(0);
  });

  it('reverses the deflection direction for a proton', () => {
    const electron = calculateDeflection({
      particle: 'electron',
      voltage: 40,
      plateGap: 30,
      initialSpeed: 3
    });
    const proton = calculateDeflection({
      particle: 'proton',
      voltage: 40,
      plateGap: 30,
      initialSpeed: 3
    });
    expect(electron.deflection).toBeLessThan(0);
    expect(proton.deflection).toBeGreaterThan(0);
    expect(Math.abs(electron.deflection)).toBeGreaterThan(
      Math.abs(proton.deflection)
    );
  });

  it('reduces deflection when the gap or speed increases', () => {
    const baseline = calculateDeflection({
      particle: 'electron',
      voltage: 40,
      plateGap: 30,
      initialSpeed: 3
    });
    const wideGap = calculateDeflection({
      particle: 'electron',
      voltage: 40,
      plateGap: 60,
      initialSpeed: 3
    });
    const faster = calculateDeflection({
      particle: 'electron',
      voltage: 40,
      plateGap: 30,
      initialSpeed: 6
    });
    expect(Math.abs(wideGap.deflection)).toBeLessThan(
      Math.abs(baseline.deflection)
    );
    expect(Math.abs(faster.deflection)).toBeLessThan(
      Math.abs(baseline.deflection)
    );
  });

  it('clamps parameters and pauses time when autoplay is disabled', () => {
    const sim = createElectricDeflectionSim({
      voltage: 999,
      plateGap: 1,
      initialSpeed: 99
    });
    expect(sim.getParams().voltage).toBe(120);
    expect(sim.getParams().plateGap).toBe(10);
    expect(sim.getParams().initialSpeed).toBe(8);
    sim.setParams({ autoRun: false });
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
  });
});
