import { describe, expect, it } from 'vitest';
import {
  createOscilloscopeSim,
  stableRatio
} from '../../src/scenes/oscilloscope/scene.sim';

describe('oscilloscope simulation', () => {
  it('detects integer frequency synchronisation', () => {
    expect(stableRatio(210, 70)).toBe(3);
    expect(createOscilloscopeSim().getState().stable).toBe(true);
  });
  it('moves the beam with the signal and scan', () => {
    const sim = createOscilloscopeSim({ autoRun: false });
    const before = sim.getState();
    sim.setParams({ autoRun: true });
    sim.step(0.1);
    const after = sim.getState();
    expect(after.time).toBeGreaterThan(before.time);
    expect(after.screenX).not.toBe(before.screenX);
  });
  it('pauses and clamps controls', () => {
    const sim = createOscilloscopeSim({
      signalAmplitude: 999,
      signalFrequency: 999,
      scanFrequency: 0
    });
    expect(sim.getParams().signalAmplitude).toBe(80);
    expect(sim.getParams().signalFrequency).toBe(400);
    expect(sim.getParams().scanFrequency).toBe(10);
    sim.setParams({ autoRun: false });
    const t = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(t);
  });
});
