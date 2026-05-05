/**
 * 双缝干涉 — 物理模拟单元测试
 */

import { describe, it, expect } from 'vitest';
import { createDoubleSlitSim, lambdaToGap, lambdaToRgb, wavelengthToColor } from '../../src/scenes/double-slit/scene.sim';

describe('double-slit simulation', () => {
  it('initializes with correct default state', () => {
    const sim = createDoubleSlitSim({ step: 1, lambda: 532, slitDistance: 40, isPlaying: true, activeInstrument: 'caliper', showInstrumentReadout: false, micrometerOffset: 0, stripeOffset: 0 });
    const state = sim.getState();
    expect(state.params.step).toBe(1);
    expect(state.params.lambda).toBe(532);
    expect(state.params.slitDistance).toBe(40);
    expect(state.params.isPlaying).toBe(true);
    expect(state.time).toBe(0);
  });

  it('advances time when stepping while playing', () => {
    const sim = createDoubleSlitSim({ step: 1, lambda: 532, slitDistance: 40, isPlaying: true, activeInstrument: 'caliper', showInstrumentReadout: false, micrometerOffset: 0, stripeOffset: 0 });
    sim.step(16);
    expect(sim.getState().time).toBe(1.5);
    sim.step(16);
    expect(sim.getState().time).toBe(3.0);
  });

  it('does not advance time when paused', () => {
    const sim = createDoubleSlitSim({ step: 1, lambda: 532, slitDistance: 40, isPlaying: false, activeInstrument: 'caliper', showInstrumentReadout: false, micrometerOffset: 0, stripeOffset: 0 });
    sim.step(16);
    expect(sim.getState().time).toBe(0);
  });

  it('updates params via setParams', () => {
    const sim = createDoubleSlitSim({ step: 1, lambda: 532, slitDistance: 40, isPlaying: true, activeInstrument: 'caliper', showInstrumentReadout: false, micrometerOffset: 0, stripeOffset: 0 });
    sim.setParams({ step: 3, lambda: 650, slitDistance: 60 });
    const state = sim.getState();
    expect(state.params.step).toBe(3);
    expect(state.params.lambda).toBe(650);
    expect(state.params.slitDistance).toBe(60);
    expect(state.params.isPlaying).toBe(true); // unchanged
  });

  it('resets to initial values', () => {
    const sim = createDoubleSlitSim({ step: 1, lambda: 532, slitDistance: 40, isPlaying: true, activeInstrument: 'caliper', showInstrumentReadout: false, micrometerOffset: 0, stripeOffset: 0 });
    sim.setParams({ step: 5, lambda: 450, slitDistance: 20, isPlaying: false });
    sim.step(16);
    sim.reset();
    const state = sim.getState();
    expect(state.params.step).toBe(1);
    expect(state.params.lambda).toBe(532);
    expect(state.params.slitDistance).toBe(40);
    expect(state.params.isPlaying).toBe(true);
    expect(state.time).toBe(0);
  });

  it('lambdaToGap scales correctly', () => {
    expect(lambdaToGap(450)).toBeCloseTo(30, 0);
    expect(lambdaToGap(650)).toBeCloseTo(43.3, 0);
    expect(lambdaToGap(532)).toBeCloseTo(35.5, 0);
  });

  it('lambdaToRgb returns valid RGB for visible spectrum', () => {
    const [r, g, b] = lambdaToRgb(532);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(255);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThanOrEqual(255);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(255);
  });

  it('wavelengthToColor returns a string', () => {
    const color = wavelengthToColor(532);
    expect(typeof color).toBe('string');
    expect(color.startsWith('rgb(')).toBe(true);
  });
});
