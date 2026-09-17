import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applySceneUrlParams, writeSceneParams } from '../../src/app/url-sync';
import { createRodModelScene } from '../../src/scenes/rod-model/scene.entry';
import { rodModelMeta } from '../../src/scenes/rod-model/scene.meta';
import {
  accelerationAt,
  capacitorAcceleration,
  capacitorEquivalentMass,
  capacitorVelocityAt,
  createRodModelSim,
  currentAt,
  magneticDrag,
  motionEndTime,
  resistorPositionAt,
  resistorTerminalVelocity,
  resistorTimeConstant,
  resistorVelocityAt,
  restoredUrlParams,
  rodModelConstants as C,
  timeToRail,
  type RodParams
} from '../../src/scenes/rod-model/scene.sim';

const DEFAULT: RodParams = {
  model: 'resistor',
  fieldStrength: 1,
  railGap: 1,
  externalForce: 2,
  mass: 0.5,
  resistance: 1,
  capacitance: 0.5,
  autoRun: false
};

describe('rod-model simulation', () => {
  it('matches hand-calculated resistor values at rest and at t=0.5 s', () => {
    // B=1, L=1, F=2, m=0.5, R=1 → γ=B²L²/R=1, vₘ=F/γ=2, τ=m/γ=0.5
    // t=0: v=0, a=F/m=4, I=0, F安=0
    const sim = createRodModelSim({ ...DEFAULT, autoRun: false });
    const rest = sim.getState();
    expect(magneticDrag(rest.params)).toBeCloseTo(1, 10);
    expect(resistorTerminalVelocity(rest.params)).toBeCloseTo(2, 10);
    expect(resistorTimeConstant(rest.params)).toBeCloseTo(0.5, 10);
    expect(rest.velocity).toBeCloseTo(0, 10);
    expect(rest.acceleration).toBeCloseTo(4, 10);
    expect(rest.current).toBeCloseTo(0, 10);
    expect(rest.magneticForce).toBeCloseTo(0, 10);
    expect(rest.heatingPower).toBeCloseTo(0, 10);
    expect(rest.position).toBeCloseTo(0, 10);

    // t=0.5=τ: v=2(1−1/e)=1.264241, a=4/e=1.471518
    // x=vₘτ(1−1+1/e)=1/e=0.367879; I=BLv/R=v; F安=γv=v
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    const s = sim.getState();
    expect(s.time).toBeCloseTo(0.5, 10);
    expect(s.velocity).toBeCloseTo(1.264241, 6);
    expect(s.acceleration).toBeCloseTo(1.471518, 6);
    expect(s.position).toBeCloseTo(0.367879, 6);
    expect(s.current).toBeCloseTo(1.264241, 6);
    expect(s.magneticForce).toBeCloseTo(1.264241, 6);
    expect(s.heatingPower).toBeCloseTo(1.598305, 5);
    expect(s.terminalVelocity).toBeCloseTo(2, 10);
  });

  it('matches hand-calculated capacitor equivalent mass and uniform a', () => {
    // B=1, L=1, F=2, m=0.5, C=0.5 → m*=m+B²L²C=1, a=F/m*=2
    // I=CBL a=1, F安=BIL=1; t=0.5 → v=1, x=0.5 a t²=0.25
    const sim = createRodModelSim({
      ...DEFAULT,
      model: 'capacitor',
      autoRun: true
    });
    const rest = sim.getState();
    expect(capacitorEquivalentMass(rest.params)).toBeCloseTo(1, 10);
    expect(rest.acceleration).toBeCloseTo(2, 10);
    expect(rest.current).toBeCloseTo(1, 10);
    expect(rest.magneticForce).toBeCloseTo(1, 10);
    expect(rest.terminalVelocity).toBeNull();
    expect(rest.heatingPower).toBe(0);
    sim.step(0.5);
    const s = sim.getState();
    expect(s.velocity).toBeCloseTo(1, 10);
    expect(s.position).toBeCloseTo(0.25, 10);
    expect(s.acceleration).toBeCloseTo(2, 10);
    expect(s.current).toBeCloseTo(1, 10);
  });

  it('keeps comparison curves independent of the active model', () => {
    // Same B,L,F,m,R,C. Capacitor state has terminalVelocity=null;
    // resistor curve must still be v=2(1−e^{-2t}), not 0.
    const cap = createRodModelSim({
      ...DEFAULT,
      model: 'capacitor',
      autoRun: false
    });
    const params = cap.getParams();
    expect(cap.getState().terminalVelocity).toBeNull();
    expect(resistorVelocityAt(params, 0.5)).toBeCloseTo(1.264241, 6);
    expect(resistorVelocityAt(params, 0)).toBeCloseTo(0, 10);
    expect(capacitorVelocityAt(params, 0.5)).toBeCloseTo(1, 10);
    expect(capacitorVelocityAt(params, 1)).toBeCloseTo(2, 10);

    const res = createRodModelSim({ ...DEFAULT, model: 'resistor' });
    expect(capacitorVelocityAt(res.getParams(), 1)).toBeCloseTo(2, 10);
    expect(resistorVelocityAt(res.getParams(), 0.5)).toBeCloseTo(
      resistorVelocityAt(params, 0.5),
      12
    );
  });

  it('clamps legal extrema and keeps closed-form values finite', () => {
    const sim = createRodModelSim({
      fieldStrength: 99,
      railGap: 0,
      externalForce: 0,
      mass: 0,
      resistance: 0,
      capacitance: 0
    });
    const lo = sim.getParams();
    expect(lo.fieldStrength).toBe(C.fieldMax);
    expect(lo.railGap).toBe(C.railGapMin);
    expect(lo.externalForce).toBe(C.forceMin);
    expect(lo.mass).toBe(C.massMin);
    expect(lo.resistance).toBe(C.resistanceMin);
    expect(lo.capacitance).toBe(C.capacitanceMin);
    expect(Number.isFinite(magneticDrag(lo))).toBe(true);
    expect(Number.isFinite(resistorTerminalVelocity(lo))).toBe(true);
    expect(Number.isFinite(capacitorAcceleration(lo))).toBe(true);
    expect(resistorVelocityAt(lo, 1)).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(resistorPositionAt(lo, 4))).toBe(true);

    sim.setParams({
      fieldStrength: 0.01,
      railGap: 9,
      externalForce: 80,
      mass: 9,
      resistance: 9,
      capacitance: 9
    });
    const hi = sim.getParams();
    expect(hi.fieldStrength).toBe(C.fieldMin);
    expect(hi.railGap).toBe(C.railGapMax);
    expect(hi.externalForce).toBe(C.forceMax);
    expect(hi.mass).toBe(C.massMax);
    expect(hi.resistance).toBe(C.resistanceMax);
    expect(hi.capacitance).toBe(C.capacitanceMax);
    const a = capacitorAcceleration(hi);
    expect(a).toBeGreaterThan(0);
    expect(Number.isFinite(a)).toBe(true);
    expect(accelerationAt(hi, 0)).toBeGreaterThan(0);
  });

  it('restarts from rest when the model or a physical parameter changes', () => {
    const sim = createRodModelSim({ ...DEFAULT, autoRun: true });
    sim.step(0.8);
    expect(sim.getState().time).toBeGreaterThan(0.5);
    expect(sim.getState().velocity).toBeGreaterThan(0.5);
    sim.setParams({ model: 'capacitor' });
    expect(sim.getState().time).toBeCloseTo(0, 10);
    expect(sim.getState().velocity).toBeCloseTo(0, 10);
    expect(sim.getState().position).toBeCloseTo(0, 10);
    expect(sim.getParams().model).toBe('capacitor');
    expect(sim.getParams().autoRun).toBe(true);

    sim.step(0.4);
    expect(sim.getState().velocity).toBeCloseTo(0.8, 10);
    sim.setParams({ fieldStrength: 2 });
    expect(sim.getState().time).toBeCloseTo(0, 10);
    expect(sim.getState().velocity).toBeCloseTo(0, 10);
    sim.setParams({ autoRun: false });
    expect(sim.getState().time).toBeCloseTo(0, 10);
  });

  it('pauses without advancing and Reset restores defaults from rest', () => {
    const sim = createRodModelSim({
      model: 'capacitor',
      fieldStrength: 2,
      autoRun: false
    });
    sim.step(1);
    expect(sim.getState().time).toBe(0);
    sim.setParams({ autoRun: true });
    sim.step(0.3);
    expect(sim.getState().time).toBeCloseTo(0.3, 10);
    sim.setParams({ autoRun: false });
    const paused = sim.getState();
    sim.step(2);
    expect(sim.getState().time).toBeCloseTo(paused.time, 10);
    expect(sim.getState().velocity).toBeCloseTo(paused.velocity, 10);
    sim.reset();
    expect(sim.getParams()).toEqual({
      model: 'resistor',
      fieldStrength: 1,
      railGap: 1,
      externalForce: 2,
      mass: 0.5,
      resistance: 1,
      capacitance: 0.5,
      autoRun: true
    });
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().velocity).toBe(0);
    expect(sim.getState().finished).toBe(false);
  });

  it('freezes animation and data together at the rail end', () => {
    // Default capacitor: a=2, t_rail=√(2×6/2)=√6≈2.44949, v=a t=4.898979
    const sim = createRodModelSim({
      ...DEFAULT,
      model: 'capacitor',
      autoRun: true
    });
    expect(timeToRail(sim.getParams())).toBeCloseTo(2.44949, 5);
    sim.step(8);
    const s = sim.getState();
    expect(s.finished).toBe(true);
    expect(s.params.autoRun).toBe(false);
    expect(s.time).toBeCloseTo(2.44949, 4);
    expect(s.position).toBeCloseTo(C.railLength, 6);
    expect(s.velocity).toBeCloseTo(4.898979, 4);
    const frozen = s.time;
    sim.setParams({ autoRun: true });
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(frozen, 6);
    expect(sim.getState().position).toBeCloseTo(C.railLength, 6);
  });

  it('does not let resistor time run past the motion end', () => {
    const sim = createRodModelSim({ ...DEFAULT, autoRun: true });
    const end = motionEndTime(sim.getParams());
    expect(end).toBeLessThan(C.timeMax);
    sim.step(C.timeMax + 2);
    expect(sim.getState().time).toBeCloseTo(end, 6);
    expect(sim.getState().finished).toBe(true);
    expect(sim.getState().position).toBeCloseTo(C.railLength, 5);
    expect(sim.getState().velocity).toBeLessThan(2);
    expect(sim.getState().velocity).toBeGreaterThan(1.9);
  });

  it('uses I=BLv/R on the resistor and I=CBL a on the capacitor', () => {
    expect(currentAt({ ...DEFAULT, model: 'resistor' }, 2)).toBeCloseTo(2, 10);
    expect(currentAt({ ...DEFAULT, model: 'capacitor' }, 99)).toBeCloseTo(
      1,
      10
    );
  });

  it('lets a legal capacitor reach the rail faster than 10 m/s', () => {
    // B=0.2, L=0.5, F=6, m=0.2, C=0.1 → m*=0.2+0.04×0.25×0.1=0.201
    // a=6/0.201; 2s/a=0.402; t=√0.402≈0.6340; v=√(2as)=√(72/0.201)≈18.926
    const sim = createRodModelSim({
      model: 'capacitor',
      fieldStrength: 0.2,
      railGap: 0.5,
      externalForce: 6,
      mass: 0.2,
      resistance: 4,
      capacitance: 0.1,
      autoRun: true
    });
    expect(timeToRail(sim.getParams())).toBeCloseTo(0.634, 3);
    sim.step(8);
    const s = sim.getState();
    expect(s.finished).toBe(true);
    expect(s.position).toBeCloseTo(C.railLength, 6);
    expect(s.velocity).toBeCloseTo(18.926, 3);
    expect(s.velocity).toBeGreaterThan(10);
  });
});

describe('rod-model scene entry, transport and URL', () => {
  it('exposes readout keys, graph attach, and toolbar transport', () => {
    const scene = createRodModelScene();
    scene.init();
    const keys = scene.getReadoutItems().map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'model',
        'time',
        'velocity',
        'acceleration',
        'magneticForce',
        'current',
        'heatingPower',
        'terminalVelocity'
      ])
    );
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.pauseAll();
    expect(scene.getParams().autoRun).toBe(false);
    scene.startAll();
    expect(scene.getParams().autoRun).toBe(true);
    expect(typeof scene.attachGraphCanvas).toBe('function');
    scene.dispose();
  });

  it('applies URL model and B, then reset restores defaults', () => {
    const scene = createRodModelScene();
    window.history.replaceState(
      {},
      '',
      '/src/pages/rod-model.html?model=1&fieldStrength=2&autoRun=0'
    );
    applySceneUrlParams(rodModelMeta, {
      scene,
      controls: {
        setValue() {},
        setActive() {}
      },
      mount: document.createElement('div'),
      scheduleRender: () => scene.render()
    });
    expect(scene.getParams().model).toBe('capacitor');
    expect(scene.getParams().fieldStrength).toBe(2);
    expect(scene.getParams().autoRun).toBe(false);
    expect(scene.getTransportState().isPlaying).toBe(false);
    expect(scene.getState().time).toBe(0);
    scene.reset();
    expect(scene.getParams().model).toBe('resistor');
    expect(scene.getParams().fieldStrength).toBe(1);
    expect(scene.getParams().autoRun).toBe(true);
    expect(scene.getState().time).toBe(0);
    scene.dispose();
  });

  it('toolbar reset and play write URL while keeping audit params', async () => {
    const scene = createRodModelScene();
    const originalReset = scene.reset.bind(scene);
    const originalStartAll = scene.startAll.bind(scene);
    const originalPauseAll = scene.pauseAll.bind(scene);
    const syncUrl = (): void => {
      writeSceneParams(restoredUrlParams(scene.getParams()));
    };
    const pageScene = {
      ...scene,
      reset(): void {
        originalReset();
        syncUrl();
      },
      startAll(): void {
        originalStartAll();
        syncUrl();
      },
      pauseAll(): void {
        originalPauseAll();
        syncUrl();
      }
    };
    window.history.replaceState(
      {},
      '',
      '/src/pages/rod-model.html?audit=scene30&fieldStrength=2'
    );
    pageScene.setParams({ fieldStrength: 2, model: 'capacitor' });
    pageScene.pauseAll();
    await new Promise((resolveWait) => {
      window.setTimeout(resolveWait, 180);
    });
    expect(window.location.search).toContain('audit=scene30');
    pageScene.reset();
    await new Promise((resolveWait) => {
      window.setTimeout(resolveWait, 180);
    });
    const url = new URL(window.location.href);
    expect(url.searchParams.get('audit')).toBe('scene30');
    expect(url.searchParams.get('model')).toBe('0');
    expect(url.searchParams.get('fieldStrength')).toBe('1');
    scene.dispose();
  });

  it('declares split-right-graph-bottom and a graph slot in page.ts', () => {
    const pageSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/rod-model/page.ts'),
      'utf8'
    );
    expect(pageSrc).toContain("preferredLayout: 'split-right-graph-bottom'");
    expect(pageSrc).toContain('hasGraph: true');
    expect(rodModelMeta.testProfile?.hasGraph).toBe(true);
  });

  it('reads URL autoRun for autoPlay so autoRun=0 is not restarted at boot', () => {
    const pageSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/rod-model/page.ts'),
      'utf8'
    );
    expect(pageSrc).toContain('readSceneParams(rodModelMeta)');
    expect(pageSrc).toContain(
      'rawInitial.autoRun === undefined ? true : asBool(rawInitial.autoRun, true)'
    );
    expect(pageSrc).not.toMatch(/autoPlay:\s*true/);
    expect(pageSrc).toContain(
      'ctx.scene.setParams({ autoRun: asBool(value, false) })'
    );
  });

  it('exposes equivalentMass on the capacitor readout', () => {
    const scene = createRodModelScene();
    scene.init();
    scene.setParams({ model: 'capacitor' });
    const keys = scene.getReadoutItems().map((item) => item.key);
    expect(keys).toContain('equivalentMass');
    expect(keys).not.toContain('terminalVelocity');
    scene.dispose();
  });
});
