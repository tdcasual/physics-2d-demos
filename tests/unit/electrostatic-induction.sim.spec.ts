import { describe, expect, it } from 'vitest';
import {
  createElectrostaticInductionSim,
  electrostaticInductionAt
} from '../../src/scenes/electrostatic-induction/scene.sim';

describe('electrostatic-induction simulation', () => {
  it('starts neutral and reaches electrostatic equilibrium', () => {
    const initial = electrostaticInductionAt();
    const sim = createElectrostaticInductionSim({ mode: 'equilibrium' });
    sim.act('approach');
    expect(initial.chargeA).toBe(0);
    expect(sim.getState().internalField).toBe(0);
  });
  it('separates induced charges for a positive rod', () => {
    const sim = createElectrostaticInductionSim({
      rodPolarity: 'positive',
      mode: 'separate'
    });
    sim.act('approach');
    sim.act('separate');
    const state = sim.getState();
    expect(state.chargeA).toBeLessThan(0);
    expect(state.chargeB).toBeGreaterThan(0);
  });
  it('supports grounding and negative polarity', () => {
    const sim = createElectrostaticInductionSim({
      rodPolarity: 'negative',
      mode: 'grounding'
    });
    sim.act('approach');
    sim.act('separate');
    const state = sim.getState();
    expect(state.phase).toBe('grounded');
    expect(state.chargeB).toBe(0);
    expect(state.chargeA).toBeGreaterThan(0);
  });
  it('moves the rod away without losing separated charge', () => {
    const sim = createElectrostaticInductionSim();
    sim.act('approach');
    sim.act('separate');
    const before = sim.getState();
    sim.act('moveRod');
    const after = sim.getState();
    expect(after.rodDistance).toBeLessThan(before.rodDistance);
    expect(after.chargeA).toBe(before.chargeA);
  });
});
