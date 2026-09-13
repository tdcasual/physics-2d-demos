import { describe, expect, it } from 'vitest';
import {
  alternatingElectricFieldSample,
  createAlternatingElectricFieldSim
} from '../../src/scenes/alternating-electric-field/scene.sim';

describe('alternating-electric-field simulation', () => {
  it('switches the square-wave field every half period', () => {
    const params = {
      voltageAmplitude: 60,
      period: 2,
      plateGap: 10,
      phaseOffset: 0,
      charge: 'positive' as const
    };
    const first = alternatingElectricFieldSample(params, 0.25);
    const second = alternatingElectricFieldSample(params, 1.25);
    expect(first.fieldSign).toBe(1);
    expect(second.fieldSign).toBe(-1);
    expect(first.acceleration).toBeGreaterThan(0);
    expect(second.acceleration).toBeLessThan(0);
  });

  it('reverses acceleration for an electron while the field stays fixed', () => {
    const positive = alternatingElectricFieldSample(
      {
        voltageAmplitude: 60,
        period: 2,
        plateGap: 10,
        phaseOffset: 0,
        charge: 'positive'
      },
      0.25
    );
    const electron = alternatingElectricFieldSample(
      {
        voltageAmplitude: 60,
        period: 2,
        plateGap: 10,
        phaseOffset: 0,
        charge: 'electron'
      },
      0.25
    );
    expect(electron.fieldSign).toBe(positive.fieldSign);
    expect(electron.acceleration).toBe(-positive.acceleration);
  });

  it('normalizes parameters and pauses when autoplay is disabled', () => {
    const sim = createAlternatingElectricFieldSim({
      voltageAmplitude: 999,
      period: 0,
      plateGap: 1,
      phaseOffset: 2
    });
    expect(sim.getParams().voltageAmplitude).toBe(120);
    expect(sim.getParams().period).toBe(1);
    expect(sim.getParams().plateGap).toBe(6);
    expect(sim.getParams().phaseOffset).toBe(0.5);
    sim.setParams({ autoRun: false });
    const before = sim.getState().time;
    sim.step(1);
    expect(sim.getState().time).toBe(before);
  });
});
