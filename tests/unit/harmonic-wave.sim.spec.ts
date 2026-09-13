import { describe, expect, it } from 'vitest';
import {
  createHarmonicWaveSim,
  harmonicWaveAcceleration,
  harmonicWaveVelocity,
  harmonicWaveY
} from '../../src/scenes/harmonic-wave/scene.sim';

describe('harmonic-wave sim', () => {
  it('uses the sinusoidal wave equation with a reference crest at x=0', () => {
    expect(harmonicWaveY(0, 0, 10, 4, 2, 'right')).toBeCloseTo(10, 8);
    expect(harmonicWaveY(2, 0, 10, 4, 2, 'right')).toBeCloseTo(-10, 8);
    expect(harmonicWaveY(4, 0, 10, 4, 2, 'right')).toBeCloseTo(10, 8);
  });

  it('keeps v = λ/T and reverses propagation sign', () => {
    const sim = createHarmonicWaveSim({ wavelength: 6, period: 3 });
    expect(sim.getState().waveSpeed).toBeCloseTo(2, 8);
    const right = harmonicWaveVelocity(0, 0.4, 8, 5, 2, 'right');
    const left = harmonicWaveVelocity(0, 0.4, 8, 5, 2, 'left');
    expect(right).toBeCloseTo(-left, 8);
  });

  it('reports acceleration toward equilibrium', () => {
    expect(harmonicWaveAcceleration(5, 2)).toBeLessThan(0);
    expect(harmonicWaveAcceleration(-5, 2)).toBeGreaterThan(0);
  });

  it('clamps controls, moves P, advances time and resets', () => {
    const sim = createHarmonicWaveSim();
    sim.setParams({ amplitude: 99, wavelength: -1, period: 99 });
    expect(sim.getParams()).toMatchObject({
      amplitude: 10,
      wavelength: 1,
      period: 4
    });
    sim.setPointX(99);
    expect(sim.getParams().pointX).toBe(8);
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 8);
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getParams().pointX).toBe(2);
  });
});
