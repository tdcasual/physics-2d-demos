import { describe, expect, it } from 'vitest';
import { createResistorScene } from '../../src/scenes/resistor-measurement/scene.entry';
import {
  asBool,
  asCircuitMode,
  asMeterMode,
  createResistorSim,
  measuredFromMeters,
  parallel,
  resistorConstants as C
} from '../../src/scenes/resistor-measurement/scene.sim';

describe('resistor measurement simulation', () => {
  it('external connection measures Rx ∥ RV and is below Rx', () => {
    const rx = 25;
    const rv = 250;
    const expected = parallel(rx, rv);
    const sim = createResistorSim({
      autoRun: false,
      meterMode: 'external',
      targetResistance: rx,
      voltmeterResistance: rv
    });
    const state = sim.getState();
    expect(measuredFromMeters('external', rx, 1, rv)).toBeCloseTo(expected, 8);
    expect(state.measuredResistance).toBeCloseTo(expected, 6);
    expect(state.measuredResistance).toBeLessThan(rx);
    expect(state.errorPercent).toBeLessThan(0);
    expect(state.errorPercent).toBeCloseTo(((expected - rx) / rx) * 100, 5);
  });

  it('internal connection measures Rx + RA and is above Rx', () => {
    const rx = 25;
    const ra = 1;
    const expected = rx + ra;
    const sim = createResistorSim({
      autoRun: false,
      meterMode: 'internal',
      targetResistance: rx,
      ammeterResistance: ra
    });
    const state = sim.getState();
    expect(measuredFromMeters('internal', rx, ra, 250)).toBeCloseTo(
      expected,
      8
    );
    expect(state.measuredResistance).toBeCloseTo(expected, 6);
    expect(state.measuredResistance).toBeGreaterThan(rx);
    expect(state.errorPercent).toBeGreaterThan(0);
  });

  it('divider output rises with slider and can start near zero', () => {
    const sim = createResistorSim({
      autoRun: false,
      circuitMode: 'divider',
      rheostatPosition: 0
    });
    expect(sim.getState().voltageAcrossTarget).toBeLessThan(0.05);
    sim.setParams({ rheostatPosition: 0.2 });
    const low = sim.getState().voltageAcrossTarget;
    sim.setParams({ rheostatPosition: 0.9 });
    expect(sim.getState().voltageAcrossTarget).toBeGreaterThan(low);
    expect(sim.getState().sourceOutput).toBeCloseTo(6 * 0.9, 8);
  });

  it('limiting mode reduces current as series resistance grows', () => {
    const sim = createResistorSim({
      autoRun: false,
      circuitMode: 'limiting',
      rheostatPosition: 0.1
    });
    const highI = sim.getState().measuredCurrent;
    sim.setParams({ rheostatPosition: 0.9 });
    expect(sim.getState().measuredCurrent).toBeLessThan(highI);
    expect(sim.getState().rheostatResistance).toBeGreaterThan(
      C.rheostatMinResistance
    );
  });

  it('pause freezes time while readings stay consistent', () => {
    const sim = createResistorSim({ autoRun: false, circuitMode: 'divider' });
    const before = sim.getState();
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().flowPhase).toBe(before.flowPhase);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 8);
    const r = sim.getState().measuredResistance;
    expect(r).toBeCloseTo(
      sim.getState().voltageMeasured / sim.getState().measuredCurrent,
      8
    );
  });

  it('clamps Rx, RA, RV, E and slider, and ignores non-finite values', () => {
    const sim = createResistorSim({
      targetResistance: 999,
      ammeterResistance: -4,
      voltmeterResistance: 1e6,
      supplyVoltage: 40,
      rheostatPosition: 4
    });
    let p = sim.getParams();
    expect(p.targetResistance).toBe(C.targetMaxResistance);
    expect(p.ammeterResistance).toBe(C.ammeterMinResistance);
    expect(p.voltmeterResistance).toBe(C.voltmeterMaxResistance);
    expect(p.supplyVoltage).toBe(C.supplyMax);
    expect(p.rheostatPosition).toBe(1);
    sim.setParams({
      targetResistance: Number.NaN,
      rheostatPosition: Number.POSITIVE_INFINITY
    });
    p = sim.getParams();
    expect(p.targetResistance).toBe(C.targetMaxResistance);
    expect(p.rheostatPosition).toBe(1);
  });

  it('maps URL 0/1 tokens for circuit, meter and autoRun', () => {
    expect(asCircuitMode(0)).toBe('divider');
    expect(asCircuitMode('1')).toBe('limiting');
    expect(asMeterMode(0)).toBe('external');
    expect(asMeterMode(1)).toBe('internal');
    expect(asBool(0, true)).toBe(false);
    expect(asBool('1', false)).toBe(true);
    const sim = createResistorSim({
      circuitMode: asCircuitMode(1),
      meterMode: asMeterMode(0),
      autoRun: asBool(0, true)
    });
    expect(sim.getParams().circuitMode).toBe('limiting');
    expect(sim.getParams().meterMode).toBe('external');
    expect(sim.getParams().autoRun).toBe(false);
  });

  it('reset restores the URL baseline, not catalog defaults', () => {
    const sim = createResistorSim({
      circuitMode: 'limiting',
      meterMode: 'internal',
      targetResistance: 40,
      supplyVoltage: 9,
      rheostatPosition: 0.3,
      autoRun: false
    });
    sim.setParams({
      circuitMode: 'divider',
      targetResistance: 10,
      autoRun: true
    });
    sim.step(0.2);
    sim.reset();
    const p = sim.getParams();
    expect(p.circuitMode).toBe('limiting');
    expect(p.meterMode).toBe('internal');
    expect(p.targetResistance).toBe(40);
    expect(p.supplyVoltage).toBe(9);
    expect(p.rheostatPosition).toBeCloseTo(0.3, 8);
    expect(p.autoRun).toBe(false);
    expect(sim.getState().time).toBe(0);
  });

  it('scene readout items match sim voltage, current, R and error', () => {
    const scene = createResistorScene({
      initialParams: {
        autoRun: false,
        meterMode: 'external',
        targetResistance: 25
      }
    });
    const state = scene.getState();
    const items = scene.getReadoutItems();
    const byKey = Object.fromEntries(
      items.map((item) => [item.key, item.value])
    );
    expect(byKey.voltage).toBe(`${state.voltageMeasured.toFixed(2)} V`);
    expect(byKey.current).toBe(`${state.measuredCurrent.toFixed(3)} A`);
    expect(byKey.resistance).toBe(`${state.measuredResistance.toFixed(2)} Ω`);
    expect(byKey.error).toMatch(/%$/);
    scene.setParams({ meterMode: 'internal' });
    expect(scene.getState().measuredResistance).toBeGreaterThan(25);
  });
});
