import { describe, expect, it } from 'vitest';
import {
  calculateTwoBall,
  createTwoBallSim
} from '../../src/scenes/mechanical-energy-two-ball/scene.sim';
describe('mechanical-energy-two-ball simulation', () => {
  it('keeps total mechanical energy constant', () => {
    const s = calculateTwoBall(
      { length: 1, angle: 0.8, massA: 1, massB: 1, autoRun: false },
      0
    );
    expect(s.potential + s.kineticA + s.kineticB).toBeCloseTo(s.totalEnergy, 8);
  });
  it('updates positions and velocities during playback', () => {
    const sim = createTwoBallSim({ autoRun: true });
    const a = sim.getState();
    sim.step(0.5);
    const b = sim.getState();
    expect(b.time).toBeCloseTo(0.5);
    expect(b.x).not.toBeCloseTo(a.x, 5);
  });
  it('resets to selected defaults', () => {
    const sim = createTwoBallSim({ length: 1.2 });
    sim.setParams({ length: 0.7 });
    sim.reset();
    expect(sim.getParams().length).toBe(1.2);
  });
});
