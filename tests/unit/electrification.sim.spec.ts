import { describe, expect, it } from 'vitest';
import { createElectrificationSim } from '../../src/scenes/electrification/scene.sim';

describe('electrification sim', () => {
  it('advances scene step and updates explanation text', () => {
    const sim = createElectrificationSim();
    const before = sim.getSnapshot();
    sim.runSceneAction();
    const after = sim.getSnapshot();
    expect(after.state.stepIndex).toBeGreaterThanOrEqual(before.state.stepIndex);
    expect(after.state.explanation).not.toBe(before.state.explanation);
  });
});
