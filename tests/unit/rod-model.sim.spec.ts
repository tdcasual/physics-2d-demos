import { describe, expect, it } from 'vitest';
import {
  accelerationAt,
  createRodModelSim,
  currentAt,
  dragCoefficient,
  equivalentMass
} from '../../src/scenes/rod-model/scene.sim';

describe('rod-model simulation', () => {
  it('uses magnetic drag and tends to the resistor terminal speed', () => {
    const sim = createRodModelSim({
      model: 'resistor',
      fieldStrength: 1,
      railGap: 1,
      externalForce: 2,
      mass: 0.5,
      resistance: 1,
      autoRun: false
    });
    const state = sim.getState();
    expect(dragCoefficient(state.params)).toBeCloseTo(1);
    expect(state.acceleration).toBeCloseTo(4);
    expect(state.terminalVelocity).toBeCloseTo(2);
    expect(currentAt(state.params, 2)).toBeCloseTo(2);
  });

  it('models the capacitor as an electromagnetic added mass', () => {
    const sim = createRodModelSim({
      model: 'capacitor',
      fieldStrength: 1,
      railGap: 1,
      externalForce: 2,
      mass: 0.5,
      capacitance: 0.5,
      autoRun: false
    });
    const state = sim.getState();
    expect(equivalentMass(state.params)).toBeCloseTo(1);
    expect(state.acceleration).toBeCloseTo(2);
    expect(state.current).toBeCloseTo(1);
    expect(state.terminalVelocity).toBeNull();
  });

  it('advances the two models with their distinct v-t slopes', () => {
    const resistor = createRodModelSim({ model: 'resistor', autoRun: true });
    const capacitor = createRodModelSim({ model: 'capacitor', autoRun: true });
    resistor.step(0.1);
    capacitor.step(0.1);
    expect(resistor.getState().velocity).toBeGreaterThan(0);
    expect(capacitor.getState().velocity).toBeGreaterThan(0);
    expect(capacitor.getState().acceleration).toBeCloseTo(2);
  });

  it('normalizes invalid mode and parameter values', () => {
    const sim = createRodModelSim({
      model: 'other' as never,
      fieldStrength: 99
    });
    expect(sim.getParams().model).toBe('resistor');
    expect(sim.getParams().fieldStrength).toBe(3);
    expect(accelerationAt(sim.getParams(), 0)).toBeGreaterThan(0);
  });
});
