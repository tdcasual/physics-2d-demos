import { describe, expect, it } from 'vitest';
import { createPrecisionToolSim } from '../../src/scenes/precision-tools/scene.sim';

describe('precision tools simulation', () => {
  it('computes 50-division vernier reading from aligned divisions', () => {
    const sim = createPrecisionToolSim({
      mode: 'caliper50',
      adjustment: 0.32,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.divisions).toBe(50);
    expect(state.precision).toBeCloseTo(0.02, 8);
    expect(state.totalReading).toBeCloseTo(
      state.mainScaleReading + state.alignmentIndex * 0.02,
      8
    );
  });

  it('computes micrometer pitch and fine reading', () => {
    const sim = createPrecisionToolSim({
      mode: 'micrometer',
      adjustment: 0.5,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.precision).toBeCloseTo(0.01, 8);
    expect(state.totalReading).toBeCloseTo(
      state.mainScaleReading + state.fineReading * 0.01,
      8
    );
    expect(state.drumRotation).toBeGreaterThan(0);
  });

  it('pauses and advances the animated adjustment clock', () => {
    const sim = createPrecisionToolSim({ autoRun: false });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 8);
  });
});
