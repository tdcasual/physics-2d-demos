import { describe, expect, it } from 'vitest';
import {
  createMechanicalEnergySim,
  effectiveAcceleration,
  mechanicalEnergyPoint
} from '../../src/scenes/mechanical-energy/scene.sim';

describe('mechanical-energy simulation', () => {
  it('uses reduced acceleration for the resistance environment', () => {
    const params = {
      environment: 'resist' as const,
      resistance: 0.06,
      mass: 1,
      gravity: 9.8,
      pointPeriod: 0.04,
      autoRun: false
    };
    expect(effectiveAcceleration(params)).toBeCloseTo(9.212, 3);
    const point = mechanicalEnergyPoint(params, 1);
    expect(point.height * 100).toBeCloseTo(0.737, 2);
    expect(point.speed).toBeCloseTo(0.368, 2);
  });

  it('keeps potential and kinetic energy equal in the ideal model', () => {
    const params = {
      environment: 'ideal' as const,
      resistance: 0.06,
      mass: 1,
      gravity: 9.8,
      pointPeriod: 0.04,
      autoRun: false
    };
    const point = mechanicalEnergyPoint(params, 5);
    expect(point.potentialLoss).toBeCloseTo(point.kineticGain, 8);
  });

  it('creates five A–E count points from the configured interval', () => {
    const sim = createMechanicalEnergySim({
      pointPeriod: 0.04,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.points).toHaveLength(5);
    expect(state.points[0].label).toBe('A');
    expect(state.points.at(-1)?.label).toBe('E');
    expect(state.points.at(-1)?.time).toBeCloseTo(0.2, 6);
  });

  it('advances only when autoRun is enabled and resets', () => {
    const sim = createMechanicalEnergySim({ autoRun: false });
    sim.step(0.1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true });
    sim.step(0.1);
    expect(sim.getState().time).toBeCloseTo(0.1, 6);
    sim.reset();
    expect(sim.getState().time).toBe(0);
  });
});
