import { describe, expect, it } from 'vitest';
import { createChargedParticleScene } from '../../src/scenes/charged-particle-circle/scene.entry';
import {
  asBool,
  asFieldDirection,
  chargedParticleConstants,
  createChargedParticleSim,
  lorentzForceMagnitude,
  orbitFitsDesignFrame,
  orbitPeriod,
  orbitRadius,
  visualOrbitRadius
} from '../../src/scenes/charged-particle-circle/scene.sim';

describe('charged particle circle simulation', () => {
  it('uses R = mv/(|q|B) with independently computed values', () => {
    // m=4, v=40, |q|=1, B=1 → R = 160
    expect(
      orbitRadius({ mass: 4, charge: 1, velocity: 40, magneticField: 1 })
    ).toBe(160);
    // doubling v doubles R; doubling B halves R; |q| in the denominator
    expect(
      orbitRadius({ mass: 4, charge: -2, velocity: 40, magneticField: 1 })
    ).toBe(80);
    expect(
      orbitRadius({ mass: 4, charge: 1, velocity: 80, magneticField: 2 })
    ).toBe(160);
  });

  it('uses T = 2πm/(|q|B) and keeps T independent of v', () => {
    // m=4, |q|=1, B=1 → T = 8π
    expect(orbitPeriod({ mass: 4, charge: 1, magneticField: 1 })).toBeCloseTo(
      8 * Math.PI,
      10
    );
    expect(orbitPeriod({ mass: 4, charge: 1, magneticField: 1 })).toBeCloseTo(
      orbitPeriod({ mass: 4, charge: -1, magneticField: 1 }),
      10
    );
    const slow = createChargedParticleSim({ velocity: 10, autoRun: false });
    const fast = createChargedParticleSim({ velocity: 80, autoRun: false });
    expect(slow.getState().period).toBeCloseTo(fast.getState().period, 10);
    expect(slow.getState().radius).toBeLessThan(fast.getState().radius);
  });

  it('uses |F| = |q|vB', () => {
    // |q|=1, v=40, B=1 → 40
    expect(
      lorentzForceMagnitude({ charge: 1, velocity: 40, magneticField: 1 })
    ).toBe(40);
    expect(
      lorentzForceMagnitude({ charge: -2, velocity: 40, magneticField: 0.5 })
    ).toBe(40);
  });

  it('advances by 2π in one period and scales ω with |q|B/m', () => {
    const sim = createChargedParticleSim({
      mass: 4,
      charge: 1,
      magneticField: 1,
      autoRun: true
    });
    const start = sim.getState().angle;
    sim.step(8 * Math.PI);
    expect(sim.getState().angle).toBeCloseTo(
      start + sim.getState().angularSign * 2 * Math.PI,
      8
    );
    expect(sim.getState().angularSpeed).toBeCloseTo(0.25, 10);

    const stronger = createChargedParticleSim({
      mass: 2,
      charge: 1,
      magneticField: 2,
      autoRun: true
    });
    stronger.step(0.4);
    // ω = |q|B/m = 1; Δθ = 0.4
    expect(
      Math.abs(stronger.getState().angle - chargedParticleConstants.startAngle)
    ).toBeCloseTo(0.4, 8);
  });

  it('reverses sense when charge sign or field direction flips', () => {
    const positiveInto = createChargedParticleSim({
      charge: 1,
      fieldDirection: 'into',
      autoRun: true
    });
    const negativeInto = createChargedParticleSim({
      charge: -1,
      fieldDirection: 'into',
      autoRun: true
    });
    const positiveOut = createChargedParticleSim({
      charge: 1,
      fieldDirection: 'out',
      autoRun: true
    });
    positiveInto.step(0.5);
    negativeInto.step(0.5);
    positiveOut.step(0.5);
    expect(positiveInto.getState().angularSign).toBe(-1);
    expect(negativeInto.getState().angularSign).toBe(1);
    expect(positiveOut.getState().angularSign).toBe(1);
    expect(positiveInto.getState().angle).toBeLessThan(
      chargedParticleConstants.startAngle
    );
    expect(negativeInto.getState().angle).toBeGreaterThan(
      chargedParticleConstants.startAngle
    );
    expect(
      Math.sign(
        positiveInto.getState().angle - chargedParticleConstants.startAngle
      )
    ).toBe(
      -Math.sign(
        positiveOut.getState().angle - chargedParticleConstants.startAngle
      )
    );
  });

  it('does not advance while autoRun is false', () => {
    const sim = createChargedParticleSim({ autoRun: false });
    const before = sim.getState();
    sim.step(1);
    expect(sim.getState().time).toBe(before.time);
    expect(sim.getState().angle).toBe(before.angle);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeGreaterThan(before.time);
    expect(sim.getState().position.x).not.toBe(before.position.x);
  });

  it('clamps illegal values and keeps q=0 from producing NaN', () => {
    const sim = createChargedParticleSim({
      mass: 99,
      charge: 0,
      velocity: 0,
      magneticField: 99
    });
    const params = sim.getParams();
    expect(params.mass).toBe(8);
    expect(params.velocity).toBe(10);
    expect(params.magneticField).toBe(4);
    expect(Math.abs(params.charge)).toBeGreaterThan(0);
    const state = sim.getState();
    expect(Number.isFinite(state.radius)).toBe(true);
    expect(Number.isFinite(state.period)).toBe(true);
    expect(Number.isFinite(state.forceMagnitude)).toBe(true);
    expect(Number.isFinite(state.angularSpeed)).toBe(true);
    expect(state.period).toBeGreaterThan(0);
    sim.setParams({
      mass: Number.NaN,
      charge: Number.POSITIVE_INFINITY,
      velocity: Number.NEGATIVE_INFINITY,
      magneticField: 'bad' as unknown as number
    });
    const next = sim.getState();
    expect(Number.isFinite(next.radius)).toBe(true);
    expect(Number.isFinite(next.period)).toBe(true);
  });

  it('accepts URL-style booleans and fieldDirection tokens', () => {
    expect(asBool('0', true)).toBe(false);
    expect(asBool('false', true)).toBe(false);
    expect(asBool(1, false)).toBe(true);
    expect(asBool('true', false)).toBe(true);
    expect(asFieldDirection(0)).toBe('into');
    expect(asFieldDirection(1)).toBe('out');
    expect(asFieldDirection('into')).toBe('into');
    expect(asFieldDirection('out')).toBe('out');
    const sim = createChargedParticleSim({
      autoRun: '0' as unknown as boolean,
      showVelocity: 'false' as unknown as boolean,
      showForce: '1' as unknown as boolean,
      fieldDirection: 1 as unknown as 'into'
    });
    expect(sim.getParams().autoRun).toBe(false);
    expect(sim.getParams().showVelocity).toBe(false);
    expect(sim.getParams().showForce).toBe(true);
    expect(sim.getParams().fieldDirection).toBe('out');
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ fieldDirection: '0' as unknown as 'into' });
    expect(sim.getParams().fieldDirection).toBe('into');
  });

  it('reset restores the construction URL baseline rather than hard-coded defaults', () => {
    const sim = createChargedParticleSim({
      mass: 2,
      charge: -1,
      velocity: 70,
      magneticField: 2,
      fieldDirection: 'out',
      autoRun: false,
      showVelocity: false,
      showForce: false
    });
    sim.setParams({
      mass: 8,
      charge: 2,
      velocity: 10,
      magneticField: 0.4,
      fieldDirection: 'into',
      autoRun: true,
      showVelocity: true,
      showForce: true
    });
    sim.step(0.8);
    sim.reset();
    expect(sim.getParams()).toEqual({
      mass: 2,
      charge: -1,
      velocity: 70,
      magneticField: 2,
      fieldDirection: 'out',
      autoRun: false,
      showVelocity: false,
      showForce: false
    });
    expect(sim.getState().time).toBe(0);
  });

  it('keeps visual orbits inside the design frame at extreme radii', () => {
    expect(orbitFitsDesignFrame(160)).toBe(true);
    expect(orbitFitsDesignFrame(1.25)).toBe(true);
    expect(orbitFitsDesignFrame(6400)).toBe(true);
    expect(visualOrbitRadius(160)).toBeGreaterThan(
      chargedParticleConstants.minRadiusPx
    );
    expect(visualOrbitRadius(6400)).toBe(chargedParticleConstants.maxRadiusPx);
  });
});

describe('charged particle circle scene entry', () => {
  it('applies initial URL params before the first readout and reset', () => {
    const scene = createChargedParticleScene({
      initialParams: {
        mass: 2,
        velocity: 80,
        autoRun: false,
        fieldDirection: 'out'
      }
    });
    scene.init();
    expect(scene.getParams()).toMatchObject({
      mass: 2,
      velocity: 80,
      autoRun: false,
      fieldDirection: 'out'
    });
    const items = scene.getReadoutItems();
    expect(items.map((item) => item.key)).toEqual(
      expect.arrayContaining(['radius', 'period', 'force', 'period-hint'])
    );
    expect(items.find((item) => item.key === 'period-hint')?.value).toBe(
      'T 与 v 无关'
    );
    expect(items.find((item) => item.key === 'period')?.value).toContain('π');
    scene.setParams({ mass: 8, autoRun: true });
    scene.reset();
    expect(scene.getParams().mass).toBe(2);
    expect(scene.getParams().autoRun).toBe(false);
    scene.dispose();
  });
});
