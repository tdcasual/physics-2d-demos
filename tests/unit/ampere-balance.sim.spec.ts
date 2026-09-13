import { describe, expect, it } from 'vitest';
import {
  ampereBalanceValues,
  ampereForceMagnitude,
  createAmpereBalanceSim,
  type AmpereBalanceParams
} from '../../src/scenes/ampere-balance/scene.sim';

const defaults: AmpereBalanceParams = {
  inclineAngle: 30,
  magneticField: 1,
  current: 4.6,
  mass: 0.8,
  fieldDirection: 'down',
  currentDirection: 'out',
  autoRun: true
};

describe('ampere-balance simulation', () => {
  it('computes Fₐ = BIL and the default smooth-incline acceleration', () => {
    const values = ampereBalanceValues(defaults);
    expect(ampereForceMagnitude(defaults)).toBeCloseTo(4.6, 6);
    expect(values.normalForce).toBeCloseTo(4.63, 2);
    expect(values.slopeNet).toBeCloseTo(7.98, 2);
    expect(values.acceleration).toBeCloseTo(9.98, 2);
    expect(values.trend).toBe('下滑趋势');
  });

  it('reverses the ampere-force direction when current reverses', () => {
    const out = ampereBalanceValues(defaults);
    const inside = ampereBalanceValues({ ...defaults, currentDirection: 'in' });
    expect(out.ampereVector.x).toBeCloseTo(-inside.ampereVector.x, 6);
    expect(out.ampereVector.y).toBeCloseTo(-inside.ampereVector.y, 6);
  });

  it('detects loss of contact when the normal reaction is negative', () => {
    const values = ampereBalanceValues({
      ...defaults,
      magneticField: 2.4,
      fieldDirection: 'right'
    });
    expect(values.detached).toBe(true);
    expect(values.normalForce).toBe(0);
  });

  it('normalizes parameters and advances the animated block only when enabled', () => {
    const sim = createAmpereBalanceSim({ autoRun: false });
    const before = sim.getState();
    sim.step(1);
    expect(sim.getState().time).toBe(before.time);
    sim.setParams({ autoRun: true, magneticField: 9 });
    expect(sim.getParams().magneticField).toBe(3);
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 6);
  });
});
