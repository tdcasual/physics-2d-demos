import { describe, expect, it } from 'vitest';
import {
  asChargedParticleKind,
  chargedSuperpositionAt,
  chargedSuperpositionConstants as C,
  createChargedSuperpositionSim
} from '../../src/scenes/charged-superposition/scene.sim';

describe('charged-superposition simulation', () => {
  it('maps particle presets and computes acceleration speed', () => {
    expect(asChargedParticleKind(0)).toBe('proton');
    expect(asChargedParticleKind(1)).toBe('alpha');
    const state = chargedSuperpositionAt({
      particle: 'proton',
      accelVoltage: 200,
      deflectVoltage: 30,
      autoRun: true,
      slowMode: false,
      showVectors: true
    });
    expect(state.exitSpeed).toBeGreaterThan(1e5);
  });
  it('keeps deflection independent of particle mass/charge ratio', () => {
    const proton = chargedSuperpositionAt({
      particle: 'proton',
      accelVoltage: 200,
      deflectVoltage: 30,
      autoRun: true,
      slowMode: false,
      showVectors: true
    });
    const alpha = chargedSuperpositionAt({
      particle: 'alpha',
      accelVoltage: 200,
      deflectVoltage: 30,
      autoRun: true,
      slowMode: false,
      showVectors: true
    });
    expect(alpha.screenOffsetMm).toBeCloseTo(proton.screenOffsetMm, 8);
  });
  it('reverses electron deflection and responds to U₂', () => {
    const electron = chargedSuperpositionAt({
      particle: 'electron',
      accelVoltage: 200,
      deflectVoltage: 30,
      autoRun: true,
      slowMode: false,
      showVectors: true
    });
    const zero = chargedSuperpositionAt({
      particle: 'proton',
      accelVoltage: 200,
      deflectVoltage: 0,
      autoRun: true,
      slowMode: false,
      showVectors: true
    });
    expect(electron.screenOffsetMm).toBeLessThan(0);
    expect(zero.screenOffsetMm).toBe(0);
    expect(Math.abs(electron.screenOffsetPx)).toBeLessThanOrEqual(
      C.maxDeflectionPx
    );
  });
  it('relaunches and advances in slow mode', () => {
    const sim = createChargedSuperpositionSim({
      autoRun: true,
      slowMode: true
    });
    sim.step(0.1);
    expect(sim.getState().progress).toBeGreaterThan(0);
    sim.relaunch();
    expect(sim.getState().progress).toBe(0);
    sim.setParams({ autoRun: false });
    sim.step(0.1);
    expect(sim.getState().progress).toBe(0);
  });
});
