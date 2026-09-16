import { describe, expect, it } from 'vitest';
import {
  asBool,
  asMode,
  asPreset,
  createSpringBallSim,
  springBallConstants
} from '../../src/scenes/spring-ball/scene.sim';

describe('spring ball simulation', () => {
  it('starts at the original length and reaches the symmetry point', () => {
    const sim = createSpringBallSim({ autoRun: true, releaseHeight: 0 });
    expect(sim.getState().equilibriumX).toBeCloseTo(0.25, 8);
    sim.step(0.5);
    const state = sim.getState();
    expect(state.bottomX).toBeCloseTo(0.5, 5);
    expect(state.stage).toBe('bottom');
    expect(Math.abs(state.acceleration)).toBeCloseTo(10, 2);
  });

  it('includes free fall before contact for elevated release', () => {
    const sim = createSpringBallSim({ releaseHeight: 0.5, autoRun: true });
    sim.step(0.1);
    expect(sim.getState().stage).toBe('free-fall');
    expect(sim.getState().x).toBeLessThan(0);
    sim.step(0.4);
    expect(sim.getState().stage).toBe('contact');
  });

  it('supports pause and continuous playback', () => {
    const sim = createSpringBallSim({ autoRun: false, mode: 'continuous' });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true });
    sim.step(0.4);
    expect(sim.getState().history.length).toBeGreaterThan(0);
  });

  it('uses energy-derived bottom point for elevated release', () => {
    const sim = createSpringBallSim({ releaseHeight: 0.5, autoRun: true });
    sim.step(0.7);
    const state = sim.getState();
    expect(state.contactTime).toBeCloseTo(Math.sqrt(0.1), 8);
    expect(state.bottomX).toBeGreaterThan(2 * state.equilibriumX);
    expect(state.stage).toBe('bottom');
    expect(state.acceleration).toBeLessThan(-springBallConstants.gravity);
  });

  it('normalizes URL-style enums, booleans and invalid values', () => {
    const sim = createSpringBallSim({
      preset: 'h-2x0',
      mode: 'continuous',
      autoRun: 'false' as unknown as boolean,
      slow: '1' as unknown as boolean,
      releaseHeight: Number.NaN
    });
    expect(sim.getParams().releaseHeight).toBeCloseTo(0.5, 8);
    expect(sim.getParams().autoRun).toBe(false);
    expect(sim.getParams().slow).toBe(true);
    sim.setParams({ releaseHeight: Number.POSITIVE_INFINITY });
    expect(sim.getParams().releaseHeight).toBeCloseTo(0.5, 8);
    expect(asBool('0', true)).toBe(false);
    expect(asMode('1')).toBe('continuous');
    expect(asPreset(2)).toBe('h-2x0');
  });

  it('resets to the construction baseline and keeps slow mode out of physics', () => {
    const sim = createSpringBallSim({
      releaseHeight: 0.25,
      mode: 'continuous',
      autoRun: false,
      slow: true
    });
    const initial = sim.getState();
    sim.setParams({
      releaseHeight: 0.75,
      mode: 'single',
      autoRun: true,
      slow: false
    });
    sim.step(0.2);
    sim.reset();
    expect(sim.getParams()).toEqual({
      releaseHeight: 0.25,
      mode: 'continuous',
      preset: 'h0',
      autoRun: false,
      slow: true
    });
    expect(sim.getState().time).toBe(0);
    const fast = createSpringBallSim({
      releaseHeight: 0.25,
      autoRun: true,
      slow: false
    });
    const slow = createSpringBallSim({
      releaseHeight: 0.25,
      autoRun: true,
      slow: true
    });
    fast.step(0.1);
    slow.step(0.1);
    expect(slow.getState().x).not.toBe(fast.getState().x);
    expect(slow.getState().bottomX).toBeCloseTo(fast.getState().bottomX, 10);
    expect(initial.time).toBe(0);
  });
});
