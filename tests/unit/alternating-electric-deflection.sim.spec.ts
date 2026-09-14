import { describe, expect, it } from 'vitest';
import {
  alternatingElectricDeflectionSample,
  createAlternatingElectricDeflectionSim
} from '../../src/scenes/alternating-electric-deflection/scene.sim';

describe('alternating-electric-deflection simulation', () => {
  const params = {
    voltageAmplitude: 1,
    period: 1,
    plateGap: 1,
    flightDuration: 2,
    releasePhase: 0,
    charge: 'positive' as const
  };

  it('switches the square-wave field and force every half period', () => {
    const first = alternatingElectricDeflectionSample(params, 0.25);
    const second = alternatingElectricDeflectionSample(params, 0.75);
    expect(first.fieldSign).toBe(1);
    expect(second.fieldSign).toBe(-1);
    expect(first.acceleration).toBeGreaterThan(0);
    expect(second.acceleration).toBeLessThan(0);
  });

  it('integrates one half-cycle with a₀ and vₘ normalization', () => {
    const half = alternatingElectricDeflectionSample(params, 0.5);
    expect(half.velocityY).toBeCloseTo(0.5, 6);
    expect(half.positionY).toBeCloseTo(0.125, 6);
    const full = alternatingElectricDeflectionSample(params, 1);
    expect(full.velocityY).toBeCloseTo(0, 6);
    expect(full.positionY).toBeCloseTo(0.25, 6);
  });

  it('reverses acceleration for a negative charge while field stays fixed', () => {
    const positive = alternatingElectricDeflectionSample(params, 0.25);
    const negative = alternatingElectricDeflectionSample(
      { ...params, charge: 'negative' },
      0.25
    );
    expect(negative.fieldSign).toBe(positive.fieldSign);
    expect(negative.acceleration).toBe(-positive.acceleration);
  });

  it('supports release-phase presets and pauses when autoplay is disabled', () => {
    const shifted = alternatingElectricDeflectionSample(
      { ...params, releasePhase: 0.5 },
      0.1
    );
    expect(shifted.fieldSign).toBe(-1);
    const sim = createAlternatingElectricDeflectionSim({
      voltageAmplitude: 9,
      period: 0,
      plateGap: 0,
      flightDuration: 9,
      releasePhase: 9
    });
    expect(sim.getParams().voltageAmplitude).toBe(2);
    expect(sim.getParams().period).toBe(0.5);
    expect(sim.getParams().plateGap).toBe(0.8);
    expect(sim.getParams().flightDuration).toBe(3);
    expect(sim.getParams().releasePhase).toBe(1);
    expect(sim.getState().trajectory).toHaveLength(81);
    sim.setParams({ autoRun: false });
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
    sim.setParams({ autoRun: true });
    sim.step(0.25);
    expect(sim.getState().time).toBeGreaterThan(before);
    sim.reset();
    expect(sim.getState().time).toBe(0);
  });
});
