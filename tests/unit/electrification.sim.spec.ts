import { describe, expect, it } from 'vitest';
import { createElectrificationSim } from '../../src/scenes/electrification/scene.sim';

describe('electrification sim', () => {
  it('advances scene step and updates explanation text', () => {
    const sim = createElectrificationSim();
    const before = sim.getSnapshot();
    sim.runSceneAction();
    const after = sim.getSnapshot();
    expect(after.state.stepIndex).toBeGreaterThanOrEqual(
      before.state.stepIndex
    );
    expect(after.state.explanation).not.toBe(before.state.explanation);
  });

  it('setStepIndex jumps to a clamped step without looping actions', () => {
    const sim = createElectrificationSim();
    sim.setStepIndex(2);
    expect(sim.getSnapshot().state.stepIndex).toBe(2);
    sim.setStepIndex(99);
    expect(sim.getSnapshot().state.stepIndex).toBe(2);
    sim.setStepIndex(-1);
    expect(sim.getSnapshot().state.stepIndex).toBe(0);
  });
});
