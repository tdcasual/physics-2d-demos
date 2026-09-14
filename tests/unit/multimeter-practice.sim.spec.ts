import { describe, expect, it } from 'vitest';
import { createMultimeterSim } from '../../src/scenes/multimeter-practice/scene.sim';

describe('multimeter-practice simulation', () => {
  it('reads resistance as scale times the selected multiplier', () => {
    const sim = createMultimeterSim({
      target: 'resistor150',
      range: 'ohm10',
      connected: true,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.measuredValue).toBe(150);
    expect(state.scaleReading).toBe(15);
    expect(state.bestRange).toBe(true);
  });

  it('switches to voltage and diode logic with correct polarity', () => {
    const battery = createMultimeterSim({
      target: 'battery15',
      mode: 'voltage',
      range: 'volt2_5',
      connected: true,
      autoRun: false
    });
    expect(battery.getState().measuredValue).toBe(1.5);
    const diode = createMultimeterSim({
      target: 'diodeReverse',
      mode: 'diode',
      connected: true,
      autoRun: false
    });
    expect(diode.getState().measuredText).toContain('截止');
  });

  it('requires a connection and clamps controls', () => {
    const sim = createMultimeterSim({ zeroAdjust: 2, autoRun: false });
    expect(sim.getParams().zeroAdjust).toBe(0.08);
    expect(sim.getState().measuredValue).toBeNull();
    sim.autoConnect();
    expect(sim.getState().connected).toBe(true);
    sim.disconnect();
    expect(sim.getState().connected).toBe(false);
  });
});
