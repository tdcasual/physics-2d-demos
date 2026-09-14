import { describe, expect, it } from 'vitest';
import {
  createGalileoInclineSim,
  galileoInclineAt,
  galileoInclineConstants as C
} from '../../src/scenes/galileo-incline/scene.sim';

describe('galileo-incline simulation', () => {
  it('starts at the release height with all energy gravitational', () => {
    const state = galileoInclineAt({
      theta2: 36,
      mu: 0,
      autoRun: true,
      showVectors: true
    });
    expect(state.height).toBe(C.startHeight);
    expect(state.potentialEnergy).toBe(C.mass * C.g * C.startHeight);
    expect(state.kineticEnergy).toBe(0);
  });
  it('uses the right-slope acceleration and ideal horizontal limit', () => {
    const sim = createGalileoInclineSim({ theta2: 0, mu: 0, autoRun: true });
    sim.release();
    for (let i = 0; i < 30; i += 1) sim.step(0.05);
    const state = sim.getState();
    expect(state.segment).toBe('limit');
    expect(state.velocity).toBeGreaterThan(0);
    expect(state.acceleration).toBeCloseTo(0, 6);
  });
  it('friction dissipates energy on both slopes', () => {
    const clean = createGalileoInclineSim({ theta2: 30, mu: 0, autoRun: true });
    const rough = createGalileoInclineSim({
      theta2: 30,
      mu: 0.2,
      autoRun: true
    });
    clean.release();
    rough.release();
    for (let i = 0; i < 24; i += 1) {
      clean.step(0.05);
      rough.step(0.05);
    }
    expect(rough.getState().kineticEnergy).toBeLessThan(
      clean.getState().kineticEnergy
    );
  });
  it('pauses and resets', () => {
    const sim = createGalileoInclineSim({ autoRun: true });
    sim.release();
    sim.step(0.05);
    const t = sim.getState().time;
    sim.setParams({ autoRun: false });
    sim.step(0.05);
    expect(sim.getState().time).toBe(t);
    sim.reset();
    expect(sim.getState().released).toBe(false);
    expect(sim.getParams().theta2).toBe(C.defaultTheta2);
  });
});
