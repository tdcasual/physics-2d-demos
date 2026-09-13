import { describe, expect, it } from 'vitest';
import {
  createBlockBoardSim,
  stateAt,
  syncTimeFor
} from '../../src/scenes/block-board/scene.sim';

describe('block-board simulation', () => {
  it('matches friction accelerations and the common-speed time', () => {
    const sim = createBlockBoardSim();
    const state = sim.getState();
    expect(state.blockAcceleration).toBeCloseTo(-2, 6);
    expect(state.boardAcceleration).toBeCloseTo(2, 6);
    expect(syncTimeFor(sim.getParams())).toBeCloseTo(1.5, 6);
  });

  it('conserves the common velocity after sliding stops', () => {
    const sim = createBlockBoardSim({ autoRun: false });
    const state = stateAt(sim.getParams(), 2);
    expect(state.sliding).toBe(false);
    expect(state.blockVelocity).toBeCloseTo(3, 6);
    expect(state.boardVelocity).toBeCloseTo(3, 6);
    expect(state.relativeDisplacement).toBeCloseTo(4.5, 6);
  });

  it('pauses and clamps unsafe parameters', () => {
    const sim = createBlockBoardSim({
      blockMass: 0,
      boardMass: 99,
      friction: 99
    });
    expect(sim.getParams().blockMass).toBe(0.5);
    expect(sim.getParams().boardMass).toBe(10);
    expect(sim.getParams().friction).toBe(0.8);
    sim.setParams({ autoRun: false });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
  });
});
