import { describe, expect, it } from 'vitest';
import { applySceneUrlParams } from '../../src/app/url-sync';
import { createMechanicalEnergyScene } from '../../src/scenes/mechanical-energy/scene.entry';
import { mechanicalEnergyMeta } from '../../src/scenes/mechanical-energy/scene.meta';
import {
  COVER_ACCELERATION,
  countPointsAt,
  createMechanicalEnergySim,
  dissipationWork,
  effectiveAcceleration,
  endTime,
  formatFixed,
  heightAt,
  kineticGain,
  measuredSpeedAt,
  mechanicalEnergyConstants as C,
  potentialLoss,
  resistanceForce,
  restoredUrlParams,
  shouldShowResistance,
  tapeDotsAt,
  trueSpeedAt
} from '../../src/scenes/mechanical-energy/scene.sim';

describe('mechanical-energy simulation', () => {
  it('matches the cover resist case: a=9.4 and the rounded A–E table', () => {
    // Cover: g=9.8 m/s², a=9.4 m/s² → k=1−9.4/9.8.
    // T₀=0.04 s. h=½ a t², v=a t = (hₙ₊₁−hₙ₋₁)/(2T₀).
    // E at t=0.20 s: h=½×9.4×0.04=0.188 m=18.80 cm, v=1.880 m/s.
    const params = {
      environment: 'resist' as const,
      resistance: C.defaultResistance,
      mass: 1,
      gravity: 9.8,
      pointPeriod: 0.04,
      autoRun: false
    };
    expect(C.defaultResistance).toBeCloseTo(1 - 9.4 / 9.8, 12);
    expect(effectiveAcceleration(params)).toBeCloseTo(COVER_ACCELERATION, 12);
    expect(resistanceForce(params)).toBeCloseTo(
      1 * 9.8 * C.defaultResistance,
      12
    );
    expect(heightAt(9.4, 0.04)).toBeCloseTo(0.00752, 10);
    expect(measuredSpeedAt(params, 1)).toBeCloseTo(0.376, 10);
    expect(trueSpeedAt(9.4, 0.04)).toBeCloseTo(0.376, 10);
    const hA = heightAt(9.4, 0.04);
    expect(potentialLoss(params, hA)).toBeCloseTo(0.073696, 10);
    expect(kineticGain(params, 0.376)).toBeCloseTo(0.070688, 10);
    expect(potentialLoss(params, hA) - kineticGain(params, 0.376)).toBeCloseTo(
      dissipationWork(params, hA),
      10
    );

    const rows = countPointsAt(params, endTime(params)).map((point) => [
      point.label,
      formatFixed(point.height * 100, 2),
      formatFixed(point.speed, 3),
      formatFixed(point.potentialLoss, 3),
      formatFixed(point.kineticGain, 3)
    ]);
    expect(rows).toEqual([
      ['A', '0.75', '0.376', '0.074', '0.071'],
      ['B', '3.01', '0.752', '0.295', '0.283'],
      ['C', '6.77', '1.128', '0.663', '0.636'],
      ['D', '12.03', '1.504', '1.179', '1.131'],
      ['E', '18.80', '1.880', '1.842', '1.767']
    ]);
  });

  it('keeps ΔEₚ = ΔEₖ = ½ m (a t)² when the environment is ideal', () => {
    // k ignored, a=g=9.8, t=0.20 s, h=½×9.8×0.04=0.196 m
    // ΔEₚ=1×9.8×0.196=1.9208 J; ΔEₖ=½×(1.96)²=1.9208 J
    const params = {
      environment: 'ideal' as const,
      resistance: 0.2,
      mass: 1,
      gravity: 9.8,
      pointPeriod: 0.04,
      autoRun: false
    };
    expect(effectiveAcceleration(params)).toBeCloseTo(9.8, 10);
    expect(resistanceForce(params)).toBe(0);
    const h = heightAt(9.8, 0.2);
    const v = trueSpeedAt(9.8, 0.2);
    expect(h).toBeCloseTo(0.196, 10);
    expect(v).toBeCloseTo(1.96, 10);
    expect(potentialLoss(params, h)).toBeCloseTo(kineticGain(params, v), 12);
    expect(dissipationWork(params, h)).toBe(0);
  });

  it('uses a real next sample for v_E and does not invent neighbors', () => {
    const params = {
      environment: 'resist' as const,
      resistance: C.defaultResistance,
      mass: 1,
      gravity: 9.8,
      pointPeriod: 0.04,
      autoRun: false
    };
    expect(measuredSpeedAt(params, 0)).toBeNull();
    expect(measuredSpeedAt(params, 1.5)).toBeNull();
    const hD = heightAt(9.4, 0.16);
    const hF = heightAt(9.4, 0.24);
    expect(hD).toBeCloseTo(0.12032, 10);
    expect(hF).toBeCloseTo(0.27072, 10);
    expect(measuredSpeedAt(params, 5)).toBeCloseTo((hF - hD) / 0.08, 12);
    expect(measuredSpeedAt(params, 5)).toBeCloseTo(1.88, 10);
    expect(countPointsAt(params, 0.04)).toHaveLength(0);
    expect(countPointsAt(params, 0.08).map((p) => p.label)).toEqual(['A']);
    const complete = countPointsAt(params, 0.24);
    expect(complete).toHaveLength(5);
    expect(complete[0]?.label).toBe('A');
    expect(complete[4]?.label).toBe('E');
    expect(complete[4]?.time).toBeCloseTo(0.2, 10);
    expect(complete[4]?.height).toBeCloseTo(0.188, 10);
  });

  it('hides k in the ideal environment and keeps it for resist', () => {
    expect(shouldShowResistance('ideal')).toBe(false);
    expect(shouldShowResistance('resist')).toBe(true);
    const sim = createMechanicalEnergySim();
    expect(shouldShowResistance(sim.getParams().environment)).toBe(true);
    sim.setParams({ environment: 'ideal' });
    expect(shouldShowResistance(sim.getParams().environment)).toBe(false);
    expect(effectiveAcceleration(sim.getParams())).toBeCloseTo(9.8, 10);
    sim.setParams({ environment: 'resist' });
    expect(shouldShowResistance(sim.getParams().environment)).toBe(true);
    expect(effectiveAcceleration(sim.getParams())).toBeCloseTo(9.4, 10);
  });

  it('keeps tape-dot gaps increasing and units consistent on A–E', () => {
    const params = {
      environment: 'ideal' as const,
      resistance: 0,
      mass: 1,
      gravity: 9.8,
      pointPeriod: 0.04,
      autoRun: true
    };
    const dots = tapeDotsAt(params, endTime(params));
    const heights = dots.map((dot) => dot.height);
    for (let i = 2; i < heights.length; i += 1) {
      const prev = heights[i - 1]! - heights[i - 2]!;
      const gap = heights[i]! - heights[i - 1]!;
      expect(gap).toBeGreaterThan(prev);
    }
    const points = countPointsAt(params, endTime(params));
    for (const point of points) {
      expect(point.time).toBeCloseTo(point.index * 0.04, 10);
      expect(point.height).toBeCloseTo(heightAt(9.8, point.time), 12);
      expect(point.speed).toBeCloseTo(trueSpeedAt(9.8, point.time), 12);
      expect(point.potentialLoss).toBeCloseTo(point.kineticGain, 10);
      expect(0.5 * point.speed * point.speed).toBeCloseTo(
        9.8 * point.height,
        10
      );
    }
  });

  it('covers resistance ends, other g/T₀, and invalid input', () => {
    const zero = {
      environment: 'resist' as const,
      resistance: 0,
      mass: 1,
      gravity: 9.8,
      pointPeriod: 0.04,
      autoRun: false
    };
    expect(effectiveAcceleration(zero)).toBeCloseTo(9.8, 10);
    const maxK = { ...zero, resistance: 0.25 };
    expect(effectiveAcceleration(maxK)).toBeCloseTo(7.35, 10);
    // g=10, T₀=0.02 s → A at 0.02 s, needs t≥0.04; h=½×10×0.0004=0.002 m
    const other = {
      environment: 'ideal' as const,
      resistance: 0.1,
      mass: 2,
      gravity: 10,
      pointPeriod: 0.02,
      autoRun: false
    };
    expect(effectiveAcceleration(other)).toBe(10);
    expect(endTime(other)).toBeCloseTo(0.12, 10);
    const aPoint = countPointsAt(other, 0.04)[0];
    expect(aPoint?.height).toBeCloseTo(0.002, 10);
    expect(aPoint?.speed).toBeCloseTo(0.2, 10);
    expect(aPoint?.potentialLoss).toBeCloseTo(0.04, 10);
    expect(aPoint?.kineticGain).toBeCloseTo(0.04, 10);

    const sim = createMechanicalEnergySim({
      mass: Number.NaN,
      gravity: Number.POSITIVE_INFINITY,
      resistance: -4,
      pointPeriod: 0.033,
      environment: 'nope' as never
    });
    const p = sim.getParams();
    expect(p.mass).toBe(C.defaultMass);
    expect(p.gravity).toBe(C.defaultGravity);
    expect(p.resistance).toBe(0);
    expect(p.pointPeriod).toBeCloseTo(0.04, 10);
    expect(p.environment).toBe('resist');
    sim.setParams({ gravity: 100, mass: 0, pointPeriod: 0.07 });
    expect(sim.getParams().gravity).toBe(C.gravityMax);
    expect(sim.getParams().mass).toBe(C.massMin);
    expect(sim.getParams().pointPeriod).toBeCloseTo(0.08, 10);
  });

  it('pauses, continues, resets, and restarts when physics params change', () => {
    const sim = createMechanicalEnergySim();
    sim.setParams({ autoRun: true });
    sim.step(0.1);
    expect(sim.getState().time).toBeCloseTo(0.1, 6);
    sim.setParams({ autoRun: false });
    sim.step(0.1);
    expect(sim.getState().time).toBeCloseTo(0.1, 6);
    sim.setParams({ autoRun: true });
    sim.step(0.05);
    expect(sim.getState().time).toBeCloseTo(0.15, 6);
    sim.setParams({ mass: 1.5 });
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true });
    sim.step(endTime(sim.getParams()) + 1);
    expect(sim.getState().finished).toBe(true);
    expect(sim.getState().params.autoRun).toBe(false);
    expect(sim.getState().points).toHaveLength(5);
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getParams().mass).toBe(C.defaultMass);
    expect(sim.getParams().autoRun).toBe(false);
  });

  it('round-trips URL params, play/pause, and attachGraphCanvas', () => {
    const scene = createMechanicalEnergyScene();
    window.history.replaceState(
      {},
      '',
      '/src/pages/mechanical-energy.html?environment=0&mass=1.5&gravity=10&pointPeriod=0.06&autoRun=1'
    );
    applySceneUrlParams(mechanicalEnergyMeta, {
      scene,
      controls: {
        setValue() {},
        setActive() {}
      },
      mount: document.createElement('div'),
      scheduleRender: () => scene.render()
    });
    expect(scene.getParams().environment).toBe('ideal');
    expect(scene.getParams().mass).toBe(1.5);
    expect(scene.getParams().gravity).toBe(10);
    expect(scene.getParams().pointPeriod).toBeCloseTo(0.06, 10);
    expect(scene.getParams().autoRun).toBe(true);
    expect(restoredUrlParams(scene.getParams()).environment).toBe(0);
    scene.pauseAll();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.setTimeScale(0.25);
    expect(scene.getTimeScale()).toBe(0.25);
    expect(scene.getTransportState().speed).toBe(0.25);
    scene.startAll();
    expect(scene.getParams().autoRun).toBe(true);
    scene.step(0.08);
    expect(scene.getState().time).toBeCloseTo(0.02, 6);
    expect(scene.getState().finished).toBe(false);
    scene.reset();
    expect(scene.getParams().environment).toBe('resist');
    expect(scene.getParams().mass).toBe(1);
    expect(scene.getParams().autoRun).toBe(false);
    expect(typeof scene.attachGraphCanvas).toBe('function');
    const items = scene.getReadoutItems().map((item) => item.key);
    expect(items).toEqual([
      'acceleration',
      'height',
      'speed',
      'potentialLoss',
      'kineticGain',
      'dissipation'
    ]);
    scene.dispose();
  });
});
