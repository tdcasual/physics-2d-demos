import { describe, expect, it } from 'vitest';
import {
  createInductionAcceleratorSim,
  inductionAcceleratorAt
} from '../../src/scenes/induction-accelerator/scene.sim';
describe('induction accelerator simulation', () => {
  it('maintains the 1:2 magnetic-field constraint', () => {
    const state = inductionAcceleratorAt({
      dBdt: 3,
      showVectors: true,
      autoRun: true,
      slowMode: false
    });
    expect(state.innerB / state.orbitB).toBeCloseTo(2, 8);
  });
  it('increases speed and force with |ΔB/Δt|', () => {
    const low = inductionAcceleratorAt({
      dBdt: 1,
      showVectors: true,
      autoRun: true,
      slowMode: false
    });
    const high = inductionAcceleratorAt({
      dBdt: 4,
      showVectors: true,
      autoRun: true,
      slowMode: false
    });
    expect(high.speed).toBeGreaterThan(low.speed);
    expect(high.lorentzForce).toBeGreaterThan(low.lorentzForce);
  });
  it('supports both ramp directions', () => {
    const rising = inductionAcceleratorAt({
      dBdt: 3,
      showVectors: true,
      autoRun: true,
      slowMode: false
    });
    const falling = inductionAcceleratorAt({
      dBdt: -3,
      showVectors: true,
      autoRun: true,
      slowMode: false
    });
    expect(falling.innerB).toBeCloseTo(rising.innerB, 8);
    expect(falling.orbitB).toBeCloseTo(rising.orbitB, 8);
  });
  it('reverses the induced-field direction when the ramp reverses', () => {
    const rising = inductionAcceleratorAt({
      dBdt: 3,
      showVectors: true,
      autoRun: true,
      slowMode: false
    });
    const falling = inductionAcceleratorAt({
      dBdt: -3,
      showVectors: true,
      autoRun: true,
      slowMode: false
    });
    expect(rising.fieldDirection).toBe(1);
    expect(falling.fieldDirection).toBe(-1);
  });
  it('accelerates the electron over time', () => {
    const initial = inductionAcceleratorAt(
      { dBdt: 3, showVectors: true, autoRun: true, slowMode: false },
      0
    );
    const later = inductionAcceleratorAt(
      { dBdt: 3, showVectors: true, autoRun: true, slowMode: false },
      1
    );
    expect(later.speed).toBeGreaterThan(initial.speed);
    expect(later.centripetalForce).toBeGreaterThan(initial.centripetalForce);
  });
  it('relaunches and resets the orbit state', () => {
    const sim = createInductionAcceleratorSim({ dBdt: 5 });
    sim.step(0.1);
    sim.relaunch();
    expect(sim.getState().time).toBe(0);
    sim.reset();
    expect(sim.getParams().dBdt).toBe(3);
  });
});
