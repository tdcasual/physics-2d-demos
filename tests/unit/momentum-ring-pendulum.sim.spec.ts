import { describe, expect, it } from 'vitest';
import {
  calculateRingPendulum,
  createRingPendulumSim
} from '../../src/scenes/momentum-ring-pendulum/scene.sim';
describe('momentum ring pendulum simulation', () => {
  it('keeps horizontal momentum near zero', () => {
    const s = calculateRingPendulum(
      {
        ringMass: 2,
        ballMass: 1,
        length: 1.5,
        angle: 0.84,
        showForces: true,
        showTrail: true,
        autoRun: true
      },
      0.8
    );
    expect(s.horizontalMomentum).toBeCloseTo(0, 8);
  });
  it('converts potential energy into kinetic energy', () => {
    const s = calculateRingPendulum(
      {
        ringMass: 2,
        ballMass: 1,
        length: 1.5,
        angle: 0.84,
        showForces: true,
        showTrail: true,
        autoRun: true
      },
      1.2
    );
    expect(s.ballKinetic + s.ringKinetic + s.potential).toBeCloseTo(
      s.totalEnergy,
      8
    );
    expect(s.ballVelocity).toBeGreaterThan(0);
  });
  it('updates and resets parameters', () => {
    const sim = createRingPendulumSim({ ringMass: 3 });
    sim.setParams({ length: 2 });
    expect(sim.getParams().length).toBe(2);
    sim.reset();
    expect(sim.getParams().length).toBe(1.5);
  });
});
