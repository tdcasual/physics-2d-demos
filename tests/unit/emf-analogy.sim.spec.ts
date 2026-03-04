import { describe, expect, it } from 'vitest';
import { createEmfAnalogySim } from '../../src/scenes/emf-analogy/scene.sim';

describe('emf-analogy sim', () => {
  it('produces positive current when system is on and opening > 0', () => {
    const sim = createEmfAnalogySim();
    sim.setSystemOn(true);
    sim.setTapOpening(0.6);
    const snapshot = sim.getSnapshot();
    expect(snapshot.state.currentI).toBeGreaterThan(0);
    expect(snapshot.state.terminalVoltage).toBeLessThan(1.5);
  });
});
