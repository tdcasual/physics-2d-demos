import { describe, expect, it } from 'vitest';
import { readSceneParams } from '../../src/app/url-sync';
import { precisionToolMeta } from '../../src/scenes/precision-tools/scene.meta';
import {
  asPrecisionMode,
  createPrecisionToolSim,
  precisionToolConstants as C
} from '../../src/scenes/precision-tools/scene.sim';

describe('precision tools simulation', () => {
  it('computes 10/20/50 vernier readings from aligned divisions', () => {
    const ten = createPrecisionToolSim({
      mode: 'caliper10',
      adjustment: 0.2,
      autoRun: false
    }).getState();
    expect(ten.divisions).toBe(10);
    expect(ten.precision).toBeCloseTo(0.1, 8);
    expect(ten.vernierLength).toBe(9);
    expect(ten.alignmentIndex).toBeGreaterThanOrEqual(0);
    expect(ten.alignmentIndex).toBeLessThan(10);
    expect(ten.totalReading).toBeCloseTo(
      ten.mainScaleReading + ten.alignmentIndex * 0.1,
      8
    );

    const twenty = createPrecisionToolSim({
      mode: 'caliper20',
      adjustment: 0.4,
      autoRun: false
    }).getState();
    expect(twenty.divisions).toBe(20);
    expect(twenty.precision).toBeCloseTo(0.05, 8);
    expect(twenty.vernierLength).toBe(19);
    expect(twenty.alignmentIndex).toBeLessThan(20);
    expect(twenty.totalReading).toBeCloseTo(
      twenty.mainScaleReading + twenty.alignmentIndex * 0.05,
      8
    );

    const raw50 = C.caliperMinMm + 0.32 * (C.caliperMaxMm - C.caliperMinMm);
    const q50 = Math.round(raw50 / 0.02) * 0.02;
    const main50 = Math.floor(q50 + 1e-9);
    const align50 = Math.round((q50 - main50) / 0.02);
    const fifty = createPrecisionToolSim({
      mode: 'caliper50',
      adjustment: 0.32,
      autoRun: false
    }).getState();
    expect(fifty.divisions).toBe(50);
    expect(fifty.precision).toBeCloseTo(0.02, 8);
    expect(fifty.mainScaleReading).toBe(main50);
    expect(fifty.alignmentIndex).toBe(align50);
    expect(fifty.totalReading).toBeCloseTo(main50 + align50 * 0.02, 8);
  });

  it('computes micrometer as 0.5 mm / 50 = 0.01 mm', () => {
    const adj =
      (4.23 - C.micrometerMinMm) / (C.micrometerMaxMm - C.micrometerMinMm);
    const state = createPrecisionToolSim({
      mode: 'micrometer',
      adjustment: adj,
      autoRun: false
    }).getState();
    expect(state.precision).toBeCloseTo(0.01, 8);
    expect(state.divisions).toBe(50);
    expect(state.mainScaleReading).toBeCloseTo(4.0, 8);
    expect(state.fineReading).toBe(23);
    expect(state.totalReading).toBeCloseTo(4.23, 8);
    expect(state.totalReading).toBeCloseTo(
      state.mainScaleReading + state.fineReading * 0.01,
      8
    );
    expect(state.fineReading).toBeGreaterThanOrEqual(0);
    expect(state.fineReading).toBeLessThan(50);
  });

  it('clamps endpoints and normalizes illegal params', () => {
    const lo = createPrecisionToolSim({
      mode: 'caliper10',
      adjustment: -4,
      autoRun: false
    }).getState();
    expect(lo.params.adjustment).toBe(0);
    expect(lo.totalReading).toBeGreaterThanOrEqual(C.caliperMinMm - 1e-6);

    const hi = createPrecisionToolSim({
      mode: 'micrometer',
      adjustment: 9,
      autoRun: false
    }).getState();
    expect(hi.params.adjustment).toBe(1);
    expect(hi.totalReading).toBeLessThanOrEqual(C.micrometerMaxMm + 0.01);

    const sim = createPrecisionToolSim({
      mode: 'caliper50',
      adjustment: 0.2,
      autoRun: false
    });
    sim.setParams({
      mode: 'nope' as never,
      adjustment: Number.NaN,
      autoRun: '0' as never,
      showGuides: 'false' as never,
      showReading: 2 as never
    });
    const next = sim.getParams();
    expect(next.mode).toBe('caliper50');
    expect(next.adjustment).toBeCloseTo(0.2, 8);
    expect(next.autoRun).toBe(false);
    expect(next.showGuides).toBe(false);
    expect(next.showReading).toBe(true);
  });

  it('maps URL mode numbers and strings', () => {
    expect(asPrecisionMode(0)).toBe('caliper10');
    expect(asPrecisionMode('1')).toBe('caliper20');
    expect(asPrecisionMode(2)).toBe('caliper50');
    expect(asPrecisionMode('micrometer')).toBe('micrometer');
    expect(asPrecisionMode(99)).toBeUndefined();
  });

  it('lets readSceneParams keep mode tokens for asPrecisionMode', () => {
    window.history.replaceState(
      {},
      '',
      '/src/pages/precision-tools.html?mode=micrometer'
    );
    expect(readSceneParams(precisionToolMeta).mode).toBe('micrometer');
    expect(asPrecisionMode(readSceneParams(precisionToolMeta).mode)).toBe(
      'micrometer'
    );

    window.history.replaceState(
      {},
      '',
      '/src/pages/precision-tools.html?mode=2'
    );
    expect(readSceneParams(precisionToolMeta).mode).toBe('2');
    expect(asPrecisionMode(readSceneParams(precisionToolMeta).mode)).toBe(
      'caliper50'
    );

    window.history.replaceState(
      {},
      '',
      '/src/pages/precision-tools.html?mode=caliper10'
    );
    expect(asPrecisionMode(readSceneParams(precisionToolMeta).mode)).toBe(
      'caliper10'
    );

    window.history.replaceState(
      {},
      '',
      '/src/pages/precision-tools.html?mode=nope'
    );
    expect(asPrecisionMode(readSceneParams(precisionToolMeta).mode)).toBe(
      undefined
    );
  });

  it('pauses on autoRun=0 and reset restores the constructor baseline', () => {
    const sim = createPrecisionToolSim({
      mode: 'caliper20',
      adjustment: 0.15,
      autoRun: false,
      showGuides: false
    });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    expect(sim.getParams().adjustment).toBeCloseTo(0.15, 8);
    sim.setParams({ autoRun: true, adjustment: 0.9, mode: 'micrometer' });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 8);
    sim.reset();
    const restored = sim.getParams();
    expect(restored.mode).toBe('caliper20');
    expect(restored.adjustment).toBeCloseTo(0.15, 8);
    expect(restored.autoRun).toBe(false);
    expect(restored.showGuides).toBe(false);
    expect(restored.showReading).toBe(true);
    expect(sim.getState().time).toBe(0);
  });
});
