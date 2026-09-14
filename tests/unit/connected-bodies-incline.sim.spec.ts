import { describe, expect, it } from 'vitest';
import {
  connectedBodiesInclineConstants as C,
  deriveConnectedBodiesIncline,
  createConnectedBodiesInclineSim
} from '../../src/scenes/connected-bodies-incline/scene.sim';

describe('connected-bodies-incline simulation', () => {
  it('recognises the reference near-balance state', () => {
    const state = deriveConnectedBodiesIncline({
      mode: 'freebody',
      massA: C.defaultMassA,
      massB: C.defaultMassB,
      angle: C.defaultAngle,
      mu: C.defaultMu,
      showForces: true,
      autoRun: false
    });
    expect(state.status).toBe('静止');
    expect(state.acceleration).toBe(0);
    expect(state.friction).toBeCloseTo(-state.drive, 5);
  });
  it('switches to uphill motion when hanging mass wins', () => {
    const state = deriveConnectedBodiesIncline(
      {
        mode: 'animation',
        massA: 2,
        massB: 5,
        angle: 30,
        mu: 0.2,
        showForces: true,
        autoRun: true
      },
      1
    );
    expect(state.status).toBe('加速上滑');
    expect(state.acceleration).toBeGreaterThan(0);
    expect(state.friction).toBeLessThan(0);
    expect(state.displacement).toBeGreaterThan(0);
  });
  it('switches to downhill motion when incline component wins', () => {
    const state = deriveConnectedBodiesIncline(
      {
        mode: 'animation',
        massA: 5,
        massB: 1,
        angle: 45,
        mu: 0.1,
        showForces: true,
        autoRun: true
      },
      1
    );
    expect(state.status).toBe('加速下滑');
    expect(state.acceleration).toBeLessThan(0);
    expect(state.friction).toBeGreaterThan(0);
  });
  it('normalizes controls and resets', () => {
    const sim = createConnectedBodiesInclineSim({
      massA: 99,
      angle: -4,
      mu: 4
    });
    expect(sim.getParams().massA).toBe(C.massMax);
    expect(sim.getParams().angle).toBe(C.angleMin);
    expect(sim.getParams().mu).toBe(C.muMax);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeGreaterThan(0);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      massA: C.defaultMassA,
      massB: C.defaultMassB,
      angle: C.defaultAngle,
      mu: C.defaultMu,
      autoRun: false
    });
  });
});
