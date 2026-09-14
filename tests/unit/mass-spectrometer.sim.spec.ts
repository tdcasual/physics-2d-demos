import { describe, expect, it } from 'vitest';
import {
  createMassSpectrometerSim,
  massSpectrometerAt,
  massSpectrometerConstants as C,
  type MassSpectrometerParams
} from '../../src/scenes/mass-spectrometer/scene.sim';

const base: MassSpectrometerParams = {
  voltage: C.defaultVoltage,
  fieldStrength: C.defaultField,
  showProtium: true,
  showDeuterium: true,
  showTritium: true,
  autoRun: true,
  showVectors: true
};

describe('mass spectrometer simulation', () => {
  it('computes speed from acceleration voltage and separates masses by radius', () => {
    const state = massSpectrometerAt(base, 0.6);
    expect(state.particles[0].speed).toBeGreaterThan(state.particles[1].speed);
    expect(state.particles[1].radius).toBeGreaterThan(
      state.particles[0].radius
    );
    expect(state.particles[2].radius).toBeGreaterThan(
      state.particles[1].radius
    );
    expect(state.calculatedMass).toBeCloseTo(2, 5);
  });

  it('responds to U and B with the expected radius trends', () => {
    const highVoltage = massSpectrometerAt({ ...base, voltage: 60 }, 0.6);
    const lowField = massSpectrometerAt({ ...base, fieldStrength: 0.06 }, 0.6);
    expect(highVoltage.particles[1].radius).toBeGreaterThan(
      massSpectrometerAt(base, 0.6).particles[1].radius
    );
    expect(lowField.particles[1].radius).toBeGreaterThan(
      massSpectrometerAt(base, 0.6).particles[1].radius
    );
  });

  it('pauses and resets the beam animation', () => {
    const sim = createMassSpectrometerSim(base);
    sim.step(0.5);
    expect(sim.getState().phase).toBeGreaterThan(0);
    sim.setParams({ autoRun: false });
    const paused = sim.getState().phase;
    sim.step(1);
    expect(sim.getState().phase).toBe(paused);
    sim.reset();
    expect(sim.getState().phase).toBe(0);
    expect(sim.getParams().voltage).toBe(C.defaultVoltage);
  });
});
