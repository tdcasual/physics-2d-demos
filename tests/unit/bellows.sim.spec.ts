import { describe, expect, it } from 'vitest';
import { createBellowsSim } from '../../src/scenes/bellows/scene.sim';

describe('bellows sim', () => {
  it('opens diagonal valves when pushing left', () => {
    const sim = createBellowsSim({ motion: 'left' });
    expect(sim.getState()).toMatchObject({
      direction: 'left',
      leftPressure: 'high',
      rightPressure: 'low',
      valves: { A: false, B: true, C: true, D: false }
    });
  });

  it('opens the opposite diagonal when pulling right', () => {
    const sim = createBellowsSim({ motion: 'right' });
    expect(sim.getState()).toMatchObject({
      direction: 'right',
      leftPressure: 'low',
      rightPressure: 'high',
      valves: { A: true, B: false, C: false, D: true }
    });
  });

  it('animates only in automatic mode and can pause', () => {
    const sim = createBellowsSim();
    sim.step(1);
    expect(sim.getState().t).toBeCloseTo(1, 8);
    sim.setParams({ autoRun: false });
    sim.step(1);
    expect(sim.getState().t).toBeCloseTo(1, 8);
  });
});
