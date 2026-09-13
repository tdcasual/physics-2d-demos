import { describe, expect, it } from 'vitest';
import {
  createChargedParticleSim,
  orbitPeriod,
  orbitRadius
} from '../../src/scenes/charged-particle-circle/scene.sim';

describe('charged particle circle simulation', () => {
  it('uses radius proportional to mv and period independent of v', () => {
    const base = { mass: 4, charge: 1, velocity: 40, magneticField: 1 };
    expect(orbitRadius(base)).toBe(160);
    expect(orbitPeriod(base)).toBeCloseTo(8 * Math.PI, 8);
    expect(orbitPeriod({ mass: 4, charge: 1, magneticField: 1 })).toBeCloseTo(
      8 * Math.PI,
      8
    );
  });

  it('moves with Lorentz-force direction and pauses', () => {
    const sim = createChargedParticleSim({ autoRun: false });
    const before = sim.getState();
    sim.step(1);
    expect(sim.getState().time).toBe(before.time);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeGreaterThan(before.time);
    expect(sim.getState().position.x).not.toBe(before.position.x);
  });

  it('clamps controls and supports field direction', () => {
    const sim = createChargedParticleSim({
      mass: 99,
      charge: 0,
      velocity: 0,
      magneticField: 99
    });
    expect(sim.getParams().mass).toBe(8);
    expect(sim.getParams().velocity).toBe(10);
    expect(sim.getParams().magneticField).toBe(4);
    expect(Math.abs(sim.getParams().charge)).toBeGreaterThan(0);
    sim.setParams({ fieldDirection: 'out' });
    expect(sim.getParams().fieldDirection).toBe('out');
  });
});
