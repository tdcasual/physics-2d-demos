/**
 * 双缝干涉 — 物理模拟单元测试
 */

import { describe, it, expect } from 'vitest';
import { createDoubleSlitSim, lambdaToGap, lambdaToRgb, wavelengthToColor, computeFringeSpacingPx, PHYSICAL_L, PHYSICAL_D_SCALE, PIXEL_TO_MM } from '../../src/scenes/double-slit/scene.sim';

const defaultParams = {
  step: 1 as const,
  lambda: 532,
  slitDistance: 40,
  isPlaying: true,
  activeInstrument: 'caliper' as const,
  showInstrumentReadout: false,
  micrometerOffset: 0,
  stripeOffset: 0,
};

describe('double-slit simulation', () => {
  it('initializes with correct default state', () => {
    const sim = createDoubleSlitSim(defaultParams);
    const state = sim.getState();
    expect(state.params.step).toBe(1);
    expect(state.params.lambda).toBe(532);
    expect(state.params.slitDistance).toBe(40);
    expect(state.params.isPlaying).toBe(true);
    expect(state.time).toBe(0);
  });

  describe('step() time advancement', () => {
    it('advances time proportionally to dt', () => {
      const sim = createDoubleSlitSim(defaultParams);
      sim.step(16);
      expect(sim.getState().time).toBeCloseTo(16 * 0.09, 6);
      sim.step(16);
      expect(sim.getState().time).toBeCloseTo(32 * 0.09, 6);
    });

    it('does not advance time when paused', () => {
      const sim = createDoubleSlitSim({ ...defaultParams, isPlaying: false });
      sim.step(16);
      expect(sim.getState().time).toBe(0);
    });

    it('handles varying dt', () => {
      const sim = createDoubleSlitSim(defaultParams);
      sim.step(10);
      sim.step(20);
      expect(sim.getState().time).toBeCloseTo(30 * 0.09, 6);
    });
  });

  it('updates params via setParams', () => {
    const sim = createDoubleSlitSim(defaultParams);
    sim.setParams({ step: 3, lambda: 650, slitDistance: 60 });
    const state = sim.getState();
    expect(state.params.step).toBe(3);
    expect(state.params.lambda).toBe(650);
    expect(state.params.slitDistance).toBe(60);
    expect(state.params.isPlaying).toBe(true);
  });

  it('resets to initial values', () => {
    const sim = createDoubleSlitSim(defaultParams);
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

describe('computeFringeSpacingPx', () => {
  it('returns correct value for default params (λ=532, d=40)', () => {
    const px = computeFringeSpacingPx(532, 40);
    // Δx = λL/d = 532e-9 * 0.7 / (40 * 1e-5) = 9.31e-4 m = 93.1 px
    expect(px).toBeCloseTo(93.1, 0);
  });

  it('proportional to lambda', () => {
    const px400 = computeFringeSpacingPx(400, 40);
    const px700 = computeFringeSpacingPx(700, 40);
    expect(px700 / px400).toBeCloseTo(700 / 400, 2);
  });

  it('inversely proportional to slitDistance', () => {
    const px20 = computeFringeSpacingPx(532, 20);
    const px60 = computeFringeSpacingPx(532, 43);
    expect(px20 / px60).toBeCloseTo(43 / 20, 2);
  });

  it('matches formula Δx = λL/d', () => {
    const lambda = 650;
    const d = 30;
    const px = computeFringeSpacingPx(lambda, d);
    const lambdaM = lambda * 1e-9;
    const dM = d * PHYSICAL_D_SCALE;
    const deltaXM = (lambdaM * PHYSICAL_L) / dM;
    const expected = deltaXM / (PIXEL_TO_MM * 1e-3);
    expect(px).toBeCloseTo(expected, 6);
  });

  it('lambda=400, slitDistance=20', () => {
    const px = computeFringeSpacingPx(400, 20);
    expect(Number.isFinite(px)).toBe(true);
    expect(px).toBeGreaterThan(0);
  });

  it('lambda=700, slitDistance=60', () => {
    const px = computeFringeSpacingPx(700, 60);
    expect(Number.isFinite(px)).toBe(true);
    expect(px).toBeGreaterThan(0);
  });

  it('slitDistance=20 gives larger spacing', () => {
    const px20 = computeFringeSpacingPx(532, 20);
    const px40 = computeFringeSpacingPx(532, 40);
    expect(px20).toBeGreaterThan(px40);
  });

  it('lambda=700 gives larger spacing', () => {
    const px400 = computeFringeSpacingPx(400, 40);
    const px700 = computeFringeSpacingPx(700, 40);
    expect(px700).toBeGreaterThan(px400);
  });
});

describe('boundary values', () => {
  it('step=1', () => {
    const sim = createDoubleSlitSim({ ...defaultParams, step: 1 });
    expect(sim.getState().params.step).toBe(1);
  });

  it('step=6', () => {
    const sim = createDoubleSlitSim({ ...defaultParams, step: 6 });
    expect(sim.getState().params.step).toBe(6);
  });

  it('lambda=400', () => {
    const sim = createDoubleSlitSim({ ...defaultParams, lambda: 400 });
    expect(sim.getState().params.lambda).toBe(400);
    expect(Number.isFinite(lambdaToGap(400))).toBe(true);
  });

  it('lambda=700', () => {
    const sim = createDoubleSlitSim({ ...defaultParams, lambda: 700 });
    expect(sim.getState().params.lambda).toBe(700);
    expect(Number.isFinite(lambdaToGap(700))).toBe(true);
  });

  it('slitDistance=20', () => {
    const sim = createDoubleSlitSim({ ...defaultParams, slitDistance: 20 });
    expect(sim.getState().params.slitDistance).toBe(20);
  });

  it('slitDistance=43', () => {
    const sim = createDoubleSlitSim({ ...defaultParams, slitDistance: 43 });
    expect(sim.getState().params.slitDistance).toBe(43);
  });
});
