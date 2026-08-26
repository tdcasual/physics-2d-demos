import { describe, expect, it } from 'vitest';
import {
  createWaveInterferenceSim,
  computeInterference
} from '../../src/scenes/ganshe/scene.sim';

describe('ganshe wave interference sim', () => {
  it('initializes with default parameters', () => {
    const sim = createWaveInterferenceSim();
    const state = sim.getState();
    expect(state.params.freq1).toBe(4);
    expect(state.params.freq2).toBe(4);
    expect(state.params.amp1).toBe(5);
    expect(state.params.amp2).toBe(5);
    expect(state.params.phaseDiff).toBe(0);
    expect(state.params.observerX).toBe(15);
    expect(state.params.mode).toBe('head-on');
    expect(state.time).toBe(0);
  });

  it('advances time on step', () => {
    const sim = createWaveInterferenceSim();
    sim.step(0.016);
    expect(sim.getState().time).toBeGreaterThan(0);
  });

  it('records history after stepping', () => {
    const sim = createWaveInterferenceSim();
    sim.step(0.016);
    const state = sim.getState();
    expect(state.history.length).toBeGreaterThan(0);
  });

  it('resets time and clears history', () => {
    const sim = createWaveInterferenceSim();
    sim.step(0.016);
    sim.step(0.016);
    expect(sim.getState().history.length).toBeGreaterThan(0);
    sim.reset();
    const state = sim.getState();
    expect(state.time).toBe(0);
    expect(state.history.length).toBe(0);
  });

  it('updates params and reflects in state', () => {
    const sim = createWaveInterferenceSim();
    sim.setParams({ freq1: 6, amp1: 8, phaseDiff: 90 });
    const params = sim.getParams();
    expect(params.freq1).toBe(6);
    expect(params.amp1).toBe(8);
    expect(params.phaseDiff).toBe(90);
  });

  it('clamps observerX to domain', () => {
    const sim = createWaveInterferenceSim();
    sim.setParams({ observerX: 50 });
    expect(sim.getParams().observerX).toBe(30);
    sim.setParams({ observerX: -5 });
    expect(sim.getParams().observerX).toBe(0);
  });

  it('computes constructive interference at center for identical sources', () => {
    const params = {
      freq1: 4,
      freq2: 4,
      amp1: 5,
      amp2: 5,
      phaseDiff: 0,
      observerX: 15,
      mode: 'head-on' as const,
      showWave1: true,
      showWave2: true,
      showInterference: true,
      isPulseMode: false,
      playbackSpeed: 1,
      observers: []
    };
    const interference = computeInterference(params, 15, 0);
    // At t=0, x=15 in head-on mode with identical sources:
    // phase1 = k*15, phase2 = k*15, so dphase = 0
    expect(interference.dphaseDeg).toBeCloseTo(0, 1);
    // Theoretical amplitude should be close to amp1 + amp2
    expect(interference.A_theory).toBeCloseTo(10, 1);
  });

  it('computes destructive interference with 180° phase diff', () => {
    const params = {
      freq1: 4,
      freq2: 4,
      amp1: 5,
      amp2: 5,
      phaseDiff: 180,
      observerX: 15,
      mode: 'head-on' as const,
      showWave1: true,
      showWave2: true,
      showInterference: true,
      isPulseMode: false,
      playbackSpeed: 1,
      observers: []
    };
    const interference = computeInterference(params, 15, 0);
    expect(interference.dphaseDeg).toBeCloseTo(180, 1);
    expect(interference.A_theory).toBeCloseTo(0, 1);
  });

  it('supports single-direction mode', () => {
    const sim = createWaveInterferenceSim({ mode: 'single' });
    expect(sim.getParams().mode).toBe('single');
    sim.step(0.016);
    expect(sim.getState().time).toBeGreaterThan(0);
  });

  it('respects playback speed', () => {
    const sim = createWaveInterferenceSim({ playbackSpeed: 2 });
    sim.step(0.1);
    // With 2x speed, dt=0.1 should advance time by 0.2
    expect(sim.getState().time).toBeCloseTo(0.2, 6);
  });
});
