import { describe, expect, it } from 'vitest';
import {
  createElectrostaticShieldingSim,
  electrostaticShieldingAt,
  electrostaticShieldingConstants
} from '../../src/scenes/electrostatic-shielding/scene.sim';

describe('electrostatic shielding simulation', () => {
  it('keeps the conductor and cavity field at zero', () => {
    const cavity = electrostaticShieldingAt({
      externalField: true,
      cavityCharge: true,
      cavityChargeValue: 3,
      grounded: true,
      showGaussian: true,
      showProbe: true,
      autoRun: true,
      slowMode: false,
      probeX: 500,
      probeY: 388
    });
    const metal = electrostaticShieldingAt({
      ...cavity,
      probeX: 500 + 150,
      probeY: 388
    });
    expect(cavity.region).toBe('空腔内部');
    expect(cavity.measuredField).toBe(0);
    expect(metal.region).toBe('导体内部');
    expect(metal.measuredField).toBe(0);
  });
  it('reports the external field at a free-space probe', () => {
    const state = electrostaticShieldingAt({
      externalField: true,
      cavityCharge: false,
      cavityChargeValue: 0,
      grounded: true,
      showGaussian: true,
      showProbe: true,
      autoRun: true,
      slowMode: false,
      probeX: 820,
      probeY: 120
    });
    expect(state.region).toBe('外部自由空间');
    expect(state.measuredField).toBeCloseTo(3.52, 2);
  });
  it('grounds away the external field contribution from the cavity charge', () => {
    const grounded = electrostaticShieldingAt({
      externalField: false,
      cavityCharge: true,
      cavityChargeValue: 3,
      grounded: true,
      showGaussian: true,
      showProbe: true,
      autoRun: true,
      slowMode: false,
      probeX: 820,
      probeY: 120
    });
    const isolated = electrostaticShieldingAt({ ...grounded, grounded: false });
    expect(grounded.measuredField).toBe(0);
    expect(isolated.measuredField).toBeGreaterThan(0);
    expect(isolated.outerNetCharge).toBe(3);
  });
  it('moves and resets the draggable probe', () => {
    const sim = createElectrostaticShieldingSim();
    sim.setProbe(500, 388);
    expect(sim.getState().region).toBe('空腔内部');
    sim.reset();
    expect(sim.getParams().probeX).toBe(
      electrostaticShieldingConstants.probeDefaultX
    );
  });
});
