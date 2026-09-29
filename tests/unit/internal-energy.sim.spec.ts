import { describe, expect, it } from 'vitest';
import {
  asMode,
  createInternalEnergySim,
  equilibriumTemperatureC,
  internalEnergyConstants as C,
  processEndTime,
  sampleAt,
  type InternalEnergyParams
} from '../../src/scenes/internal-energy/scene.sim';

function gas(partial: Partial<InternalEnergyParams> = {}) {
  return createInternalEnergySim({ mode: 'compress', ...partial });
}

describe('internal-energy simulation', () => {
  it('starts at cover pV T with W = Q = ΔU = 0', () => {
    const s = gas().getState();
    expect(s.temperature).toBeCloseTo(20, 6);
    expect(s.volume).toBeCloseTo(80, 6);
    expect(s.pressure).toBeCloseTo(100, 5);
    expect(s.work).toBeCloseTo(0, 8);
    expect(s.heat).toBeCloseTo(0, 8);
    expect(s.deltaU).toBeCloseTo(0, 8);
  });

  it('keeps ΔU = W + Q on compress, expand, and heat', () => {
    const cases: Array<Partial<InternalEnergyParams>> = [
      { mode: 'compress', ratio: 3 },
      { mode: 'expand', ratio: 2 },
      { mode: 'heat', tHot: 80, tCold: 20, cHot: 200, cCold: 200 }
    ];
    for (const input of cases) {
      const sim = createInternalEnergySim(input);
      sim.start();
      sim.step(1.2);
      const s = sim.getState();
      expect(s.deltaU).toBeCloseTo(s.work + s.heat, 8);
    }
  });

  it('raises T to the schematic 180 °C band for r = 3 adiabatic compression', () => {
    // T V^{γ−1}=const, γ−1=0.4; T2=293.15×3^0.4
    // 3^0.4 ≈ 1.55184557 → T2 ≈ 454.92 K = 181.77 °C
    const sim = gas({ ratio: 3 });
    sim.start();
    sim.step(C.gasDuration);
    const s = sim.getState();
    expect(s.heat).toBeCloseTo(0, 8);
    expect(s.work).toBeGreaterThan(0);
    expect(s.deltaU).toBeCloseTo(s.work, 8);
    expect(s.temperature).toBeCloseTo(181.77, 1);
    expect(s.volume).toBeCloseTo(80 / 3, 5);
    // p = p0 (T/T0)(V0/V) = 100 × 1.55184557 × 3 = 465.55 kPa
    expect(s.pressure).toBeCloseTo(465.55, 1);
    expect(s.ignited).toBe(true);
  });

  it('does not claim ignition at a mild compression ratio', () => {
    const sim = gas({ ratio: 1.5 });
    sim.start();
    sim.step(C.gasDuration);
    const s = sim.getState();
    // T2=293.15×1.5^0.4−273.15=71.618，Δ=1.76e-2 → precision 1
    expect(s.temperature).toBeCloseTo(71.6, 1);
    expect(s.ignited).toBe(false);
  });

  it('cools on adiabatic expansion with W < 0 and Q ≈ 0', () => {
    // T2=293.15×2^{-0.4}; 2^0.4 ≈ 1.31951 → T2 ≈ 222.17 K = −50.98 °C
    const sim = createInternalEnergySim({
      mode: 'expand',
      ratio: 2,
      wet: true
    });
    sim.start();
    sim.step(C.gasDuration);
    const s = sim.getState();
    expect(s.heat).toBeCloseTo(0, 8);
    expect(s.work).toBeLessThan(0);
    expect(s.deltaU).toBeCloseTo(s.work, 8);
    expect(s.temperature).toBeCloseTo(-50.98, 1);
    expect(s.volume).toBeCloseTo(160, 5);
  });

  it('shows fog only for wet air below the dew point', () => {
    const wet = createInternalEnergySim({
      mode: 'expand',
      ratio: 2,
      wet: true,
      dewPoint: 5
    });
    wet.start();
    wet.step(C.gasDuration);
    expect(wet.getState().fog).toBe(true);

    const dry = createInternalEnergySim({
      mode: 'expand',
      ratio: 2,
      wet: false,
      dewPoint: 5
    });
    dry.start();
    dry.step(C.gasDuration);
    expect(dry.getState().fog).toBe(false);
    expect(dry.getState().temperature).toBeCloseTo(-50.98, 1);

    const aboveDew = createInternalEnergySim({
      mode: 'expand',
      ratio: 1.2,
      wet: true,
      dewPoint: -10
    });
    aboveDew.start();
    aboveDew.step(C.gasDuration);
    // r=1.2 → T≈−0.6 °C, still above dew −10 °C, so no fog
    expect(aboveDew.getState().temperature).toBeGreaterThan(-10);
    expect(aboveDew.getState().fog).toBe(false);
  });

  it('uses heat-capacity-weighted Teq and conserves heat', () => {
    // Teq = (100×80 + 300×20) / 400 = 35 °C
    const params: Partial<InternalEnergyParams> = {
      mode: 'heat',
      tHot: 80,
      tCold: 20,
      cHot: 100,
      cCold: 300
    };
    const full = createInternalEnergySim(params).getParams();
    expect(equilibriumTemperatureC(full)).toBeCloseTo(35, 8);
    const sim = createInternalEnergySim(params);
    expect(sim.getState().tEq).toBeCloseTo(35, 8);
    expect(sim.getState().tHotNow).toBeCloseTo(80, 8);
    expect(sim.getState().tColdNow).toBeCloseTo(20, 8);
    const settled = sampleAt(full, processEndTime(full));
    expect(settled.tHotNow).toBeCloseTo(35, 1);
    expect(settled.tColdNow).toBeCloseTo(35, 1);
    expect(settled.work).toBeCloseTo(0, 8);
    expect(settled.heat).toBeCloseTo(0, 8);
    expect(settled.deltaU).toBeCloseTo(0, 8);
    // Q_h = 100×(35−80) = −4500 J; Q_c = 300×(35−20) = 4500 J
    expect(settled.heatHot).toBeCloseTo(-4500, -1);
    expect(settled.heatCold).toBeCloseTo(4500, -1);
    expect(settled.heatSum).toBeCloseTo(0, 5);
    sim.start();
    sim.step(processEndTime(sim.getParams()));
    const s = sim.getState();
    expect(s.tHotNow).toBeLessThan(80);
    expect(s.tColdNow).toBeGreaterThan(20);
    expect(s.heatSum).toBeCloseTo(0, 5);
  });

  it('sends heat from the hotter body even if labels are swapped', () => {
    const sim = createInternalEnergySim({
      mode: 'heat',
      tHot: 20,
      tCold: 80,
      cHot: 200,
      cCold: 200
    });
    sim.start();
    sim.step(1);
    const s = sim.getState();
    expect(s.tHotNow).toBeGreaterThan(20);
    expect(s.tColdNow).toBeLessThan(80);
    expect(s.heatHot).toBeGreaterThan(0);
    expect(s.heatCold).toBeLessThan(0);
    expect(s.heatSum).toBeCloseTo(0, 6);
  });

  it('clamps non-finite inputs and maps illegal mode to compress', () => {
    const sim = gas({ ratio: 3, tHot: 80 });
    const next = sim.setParams({
      mode: 'law' as never,
      ratio: Number.NaN,
      dewPoint: Number.POSITIVE_INFINITY,
      tHot: Number.NEGATIVE_INFINITY,
      cHot: 1e9,
      wet: 'maybe' as never
    });
    expect(next.mode).toBe('compress');
    expect(asMode(0)).toBe('compress');
    expect(asMode(1)).toBe('expand');
    expect(asMode(2)).toBe('heat');
    expect(next.ratio).toBe(3);
    expect(next.dewPoint).toBe(C.dewPointMax);
    expect(next.tHot).toBe(C.tHotMin);
    expect(next.cHot).toBe(C.cMax);
    expect(next.wet).toBe(true);
  });

  it('freezes on pause, rewinds on mode change, and resets to defaults', () => {
    const sim = gas();
    sim.setParams({ ratio: 2.5 });
    sim.start();
    sim.step(0.8);
    const mid = sim.getState().time;
    expect(mid).toBeCloseTo(0.8, 6);
    sim.pause();
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(mid, 6);
    expect(sim.getState().playing).toBe(false);

    sim.setParams({ mode: 'expand' });
    expect(sim.getState().time).toBeCloseTo(0, 8);
    expect(sim.getParams().mode).toBe('expand');

    sim.reset();
    const s = sim.getState();
    expect(s.params.mode).toBe('compress');
    expect(s.params.ratio).toBe(C.defaultRatio);
    expect(s.time).toBeCloseTo(0, 8);
    expect(s.playing).toBe(false);
  });

  it('does not advance while paused, then continues from the frozen time', () => {
    const sim = gas();
    sim.start();
    sim.step(0.4);
    sim.pause();
    const frozen = sim.getState();
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(frozen.time, 8);
    expect(sim.getState().molecules[0]?.x).toBeCloseTo(
      frozen.molecules[0]?.x ?? -1,
      8
    );
    sim.start();
    sim.step(0.2);
    expect(sim.getState().time).toBeCloseTo(0.6, 6);
  });

  it('matches independent p = nRT/V at a mid-stroke sample', () => {
    const s = sampleAt({ ...gas().getParams(), ratio: 3 }, 1.5);
    const tK = s.temperature + 273.15;
    const vM3 = s.volume * 1e-6;
    const n = (100000 * 80e-6) / (8.314 * 293.15);
    const pKPa = (n * 8.314 * tK) / vM3 / 1000;
    expect(s.pressure).toBeCloseTo(pKPa, 5);
    expect(s.progress).toBeCloseTo(0.5, 6);
  });
});
