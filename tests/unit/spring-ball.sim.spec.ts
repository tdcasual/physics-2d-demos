import { describe, expect, it } from 'vitest';
import { createSpringBallSim } from '../../src/scenes/spring-ball/scene.sim';

describe('spring ball simulation', () => {
  it('starts at the original length and reaches the symmetry point', () => {
    const sim = createSpringBallSim({ autoRun: true, releaseHeight: 0 });
    expect(sim.getState().equilibriumX).toBeCloseTo(0.25, 8);
    sim.step(0.5);
    const state = sim.getState();
    expect(state.bottomX).toBeCloseTo(0.5, 5);
    expect(state.stage).toBe('bottom');
    expect(Math.abs(state.acceleration)).toBeCloseTo(10, 2);
  });

  it('includes free fall before contact for elevated release', () => {
    const sim = createSpringBallSim({ releaseHeight: 0.5, autoRun: true });
    sim.step(0.1);
    expect(sim.getState().stage).toBe('free-fall');
    expect(sim.getState().x).toBeLessThan(0);
    sim.step(0.4);
    expect(sim.getState().stage).toBe('contact');
  });

  it('supports pause and continuous playback', () => {
    const sim = createSpringBallSim({ autoRun: false, mode: 'continuous' });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true });
    sim.step(0.4);
    expect(sim.getState().history.length).toBeGreaterThan(0);
  });
});
