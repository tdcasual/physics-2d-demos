import { describe, expect, it } from 'vitest';
import { createElectricFieldSim } from '../../src/scenes/electric-field-establish/scene.sim';
describe('electric-field-establish sim', () => {
  it('derives field strength and drift speed from voltage', () => {
    const s = createElectricFieldSim({
      voltage: 3,
      closed: true,
      autoRun: false
    }).getState();
    expect(s.fieldStrength).toBeCloseTo(1, 6);
    expect(s.driftVelocity).toBeCloseTo(0.8, 6);
    expect(s.current).toBeCloseTo(0.75, 6);
  });
  it('removes the established field when the circuit is open', () => {
    const s = createElectricFieldSim({
      closed: false,
      autoRun: false
    }).getState();
    expect(s.fieldStrength).toBe(0);
    expect(s.driftVelocity).toBe(0);
    expect(s.status).toContain('开路');
  });
  it('clamps voltage and advances time only during autoplay', () => {
    const sim = createElectricFieldSim({ voltage: 9, autoRun: false });
    expect(sim.getParams().voltage).toBe(6);
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
  });
});
