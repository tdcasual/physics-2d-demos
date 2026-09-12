import { describe, expect, it } from 'vitest';
import {
  createForceCompositionSim,
  resultantMagnitude,
  vectorMagnitude
} from '../../src/scenes/force-composition/scene.sim';

const defaults = {
  tab: 'synthesis' as const,
  rule: 'parallelogram' as const,
  f1: 40,
  f2: 30,
  angle: 60,
  orthogonalF: 55,
  orthogonalAngle: 60,
  gravity: 40,
  inclineAngle: 30,
  rangeSweep: false
};

describe('force-composition sim', () => {
  it('uses the cosine law for the resultant', () => {
    const sim = createForceCompositionSim(defaults);
    const state = sim.getState();
    const expected = Math.sqrt(40 * 40 + 30 * 30 + 2 * 40 * 30 * 0.5);
    expect(vectorMagnitude(state.resultant)).toBeCloseTo(expected, 8);
    expect(resultantMagnitude(40, 30, 60)).toBeCloseTo(expected, 8);
  });

  it('keeps the resultant range between difference and sum', () => {
    const sim = createForceCompositionSim({ ...defaults, tab: 'range' });
    const state = sim.getState();
    const magnitude = vectorMagnitude(state.resultant);
    expect(magnitude).toBeGreaterThanOrEqual(
      Math.abs(defaults.f1 - defaults.f2)
    );
    expect(magnitude).toBeLessThanOrEqual(defaults.f1 + defaults.f2);
  });

  it('resolves an orthogonal force into perpendicular components', () => {
    const sim = createForceCompositionSim(defaults);
    sim.setParams({
      tab: 'orthogonal',
      orthogonalF: 50,
      orthogonalAngle: 36.869897
    });
    const state = sim.getState();
    expect(state.fx.x).toBeCloseTo(40, 5);
    expect(state.fy.y).toBeCloseTo(30, 5);
    expect(vectorMagnitude({ x: state.fx.x, y: state.fy.y })).toBeCloseTo(
      50,
      5
    );
  });

  it('resolves gravity along and normal to an incline', () => {
    const sim = createForceCompositionSim({ ...defaults, tab: 'effect' });
    const state = sim.getState();
    expect(state.g1.x + state.g2.x).toBeCloseTo(0, 8);
    expect(state.g1.y + state.g2.y).toBeCloseTo(-defaults.gravity, 8);
    expect(vectorMagnitude(state.g1)).toBeCloseTo(
      defaults.gravity * Math.sin((30 * Math.PI) / 180),
      8
    );
    expect(vectorMagnitude(state.g2)).toBeCloseTo(
      defaults.gravity * Math.cos((30 * Math.PI) / 180),
      8
    );
  });

  it('clamps invalid values and reset restores the initial parameters', () => {
    const sim = createForceCompositionSim(defaults);
    sim.setParams({ f1: 999, angle: -20, inclineAngle: 99 });
    expect(sim.getParams().f1).toBe(60);
    expect(sim.getParams().angle).toBe(0);
    expect(sim.getParams().inclineAngle).toBe(60);
    sim.reset();
    expect(sim.getParams()).toEqual(defaults);
    expect(sim.getState().t).toBe(0);
  });

  it('advances time and sweeps the range angle only when enabled', () => {
    const sim = createForceCompositionSim({
      ...defaults,
      tab: 'range',
      rangeSweep: true
    });
    sim.step(0.5);
    expect(sim.getState().t).toBeCloseTo(0.5);
    expect(sim.getParams().angle).not.toBe(defaults.angle);
  });
});
