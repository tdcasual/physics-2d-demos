import { describe, expect, it } from 'vitest';
import {
  createWaveSuperposeSim,
  waveComponent
} from '../../src/scenes/wave-superpose/scene.sim';

describe('wave-superpose simulation', () => {
  it('adds the two component displacements', () => {
    const sim = createWaveSuperposeSim({
      autoRun: false,
      observationX: 0,
      amplitude1: 1.5,
      amplitude2: 1.5
    });
    const state = sim.getState();
    expect(state.sum).toBeCloseTo(state.y1 + state.y2, 8);
    expect(state.waveSpeed1).toBeCloseTo(1.6, 8);
  });

  it('supports opposite source directions', () => {
    const right = waveComponent(0, 0, 1, 2, 'up', 'left');
    const left = waveComponent(0, 0, 1, 2, 'down', 'right');
    expect(right).toBeCloseTo(left, 8);
  });

  it('clamps wave controls', () => {
    const sim = createWaveSuperposeSim({
      amplitude1: 9,
      wavelength2: 0,
      observationX: 99
    });
    expect(sim.getParams()).toMatchObject({
      amplitude1: 2,
      wavelength2: 1,
      observationX: 6
    });
  });
});
