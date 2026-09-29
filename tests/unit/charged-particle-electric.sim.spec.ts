import { describe, expect, it } from 'vitest';
import {
  createChargedParticleElectricSim,
  electricDeflection,
  particleSpeed
} from '../../src/scenes/charged-particle-electric/scene.sim';

describe('charged-particle-electric simulation', () => {
  it('computes the expected proton entry speed at 200 V', () => {
    // √(2qV/m)=195745.737，Δ=3.72e-2 → precision 1（阈 5e-2）
    expect(particleSpeed('proton', 200)).toBeCloseTo(195745.7, 1);
  });

  it('keeps the deflection direction tied to charge and voltage sign', () => {
    const proton = electricDeflection({
      particle: 'proton',
      accelVoltage: 200,
      deflectVoltage: 60,
      plateGap: 12
    });
    const electron = electricDeflection({
      particle: 'electron',
      accelVoltage: 200,
      deflectVoltage: 60,
      plateGap: 12
    });
    expect(proton.y).toBeGreaterThan(0);
    expect(electron.y).toBeLessThan(0);
    expect(Math.abs(proton.y)).toBeCloseTo(Math.abs(electron.y), 6);
  });

  it('reduces deflection when acceleration voltage increases', () => {
    const low = electricDeflection({
      particle: 'proton',
      accelVoltage: 100,
      deflectVoltage: 60,
      plateGap: 12
    });
    const high = electricDeflection({
      particle: 'proton',
      accelVoltage: 400,
      deflectVoltage: 60,
      plateGap: 12
    });
    expect(Math.abs(high.y)).toBeLessThan(Math.abs(low.y));
  });

  it('normalizes parameters and advances only when autoplay is enabled', () => {
    const sim = createChargedParticleElectricSim({ accelVoltage: 999 });
    expect(sim.getParams().accelVoltage).toBe(500);
    const initial = sim.getState().time;
    sim.step(0.5);
    expect(sim.getState().time).toBeGreaterThan(initial);
    sim.setParams({ autoRun: false });
    const paused = sim.getState().time;
    sim.step(0.5);
    expect(sim.getState().time).toBe(paused);
  });
});
