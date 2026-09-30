import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applySceneUrlParams, writeSceneParams } from '../../src/app/url-sync';
import { createImpulseMomentumScene } from '../../src/scenes/impulse-momentum/scene.entry';
import { impulseMomentumMeta } from '../../src/scenes/impulse-momentum/scene.meta';
import {
  createImpulseMomentumSim,
  forceAt,
  impulseAt,
  impulseMomentumConstants as C,
  restoredUrlParams
} from '../../src/scenes/impulse-momentum/scene.sim';

describe('impulse-momentum simulation', () => {
  it('matches the cover constant-force point: I=21.50 N·s and v=10.75 m/s', () => {
    // m=2 kg, v0=0, F=10 N, t=2.15 s → I=F t=21.50; v=I/m=10.75
    const sim = createImpulseMomentumSim({
      forceModel: 'constant',
      mass: 2,
      initialVelocity: 0,
      peakForce: 10,
      autoRun: true
    });
    sim.step(2.15);
    const state = sim.getState();
    expect(state.impulse).toBeCloseTo(21.5, 6);
    expect(state.momentumChange).toBeCloseTo(21.5, 6);
    expect(state.velocity).toBeCloseTo(10.75, 6);
    expect(state.momentum).toBeCloseTo(21.5, 6);
    expect(state.initialMomentum).toBeCloseTo(0, 10);
    expect(state.impulse).toBeCloseTo(
      state.params.mass * (state.velocity - state.params.initialVelocity),
      10
    );
    expect(state.momentum).toBeCloseTo(
      state.initialMomentum + state.impulse,
      10
    );
    // x = (1/2) a t² = 10 * 2.15² / 4 = 11.55625 m
    expect(state.position).toBeCloseTo(11.55625, 3);
  });

  it('keeps I_x = ∫F_x dt = Δp_x for all four force laws', () => {
    const cases: Array<{
      model: 'constant' | 'triangle' | 'halfSine' | 'ramp';
      t: number;
      expectedI: number;
    }> = [
      { model: 'constant', t: 2.15, expectedI: 21.5 },
      { model: 'triangle', t: 4, expectedI: 20 },
      { model: 'triangle', t: 2, expectedI: 10 },
      { model: 'halfSine', t: 4, expectedI: 80 / Math.PI },
      { model: 'ramp', t: 5, expectedI: 40 }
    ];
    for (const item of cases) {
      const sim = createImpulseMomentumSim({
        forceModel: item.model,
        mass: 2,
        initialVelocity: 0,
        peakForce: 10,
        autoRun: true
      });
      sim.step(item.t);
      const s = sim.getState();
      expect(impulseAt(item.model, item.t, 10)).toBeCloseTo(item.expectedI, 8);
      expect(s.impulse).toBeCloseTo(item.expectedI, 6);
      expect(s.momentumChange).toBeCloseTo(s.impulse, 10);
      expect(s.impulse).toBeCloseTo(2 * (s.velocity - 0), 8);
      expect(s.momentum).toBeCloseTo(s.initialMomentum + s.impulse, 10);
    }
  });

  it('drops triangle and half-sine force to zero after the 4 s pulse', () => {
    expect(forceAt('triangle', 4, 10)).toBeCloseTo(0, 10);
    expect(forceAt('triangle', 4.2, 10)).toBe(0);
    expect(forceAt('halfSine', 4, 10)).toBeCloseTo(0, 10);
    expect(forceAt('halfSine', 4.5, 10)).toBe(0);
    expect(impulseAt('triangle', 5, 10)).toBeCloseTo(20, 10);
    expect(impulseAt('halfSine', 5, 10)).toBeCloseTo(80 / Math.PI, 10);
    expect(forceAt('triangle', 2, 10)).toBeCloseTo(10, 10);
    expect(forceAt('ramp', 3, 10)).toBeCloseTo(10, 10);
    expect(forceAt('constant', 5, 10)).toBeCloseTo(10, 10);
  });

  it('clamps mass, v₀ and F_max and keeps a negative launch physically consistent', () => {
    const sim = createImpulseMomentumSim({
      forceModel: 'constant',
      mass: 0,
      initialVelocity: -20,
      peakForce: 0
    });
    expect(sim.getParams().mass).toBe(C.massMin);
    expect(sim.getParams().initialVelocity).toBe(C.velocityMin);
    expect(sim.getParams().peakForce).toBe(C.forceMinControl);
    sim.setParams({ mass: 9, initialVelocity: 40, peakForce: 80 });
    expect(sim.getParams().mass).toBe(C.massMax);
    expect(sim.getParams().initialVelocity).toBe(C.velocityMax);
    expect(sim.getParams().peakForce).toBe(C.forceMaxControl);

    const neg = createImpulseMomentumSim({
      forceModel: 'constant',
      mass: 4,
      initialVelocity: -2,
      peakForce: 8,
      autoRun: true
    });
    neg.step(1);
    const s = neg.getState();
    // p0=4*(−2)=−8; I=8*1=8; v=−2+8/4=0
    expect(s.initialMomentum).toBeCloseTo(-8, 10);
    expect(s.impulse).toBeCloseTo(8, 10);
    expect(s.velocity).toBeCloseTo(0, 8);
    expect(s.momentum).toBeCloseTo(0, 8);
    expect(s.position).toBeLessThan(0);
  });

  it('pauses at t_max and rewinds on the next play', () => {
    const sim = createImpulseMomentumSim({ autoRun: true });
    sim.step(C.timeMax + 1);
    expect(sim.getState().time).toBe(C.timeMax);
    expect(sim.getParams().autoRun).toBe(false);
    sim.setTime(0);
    sim.setParams({ autoRun: true });
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().finished).toBe(false);
  });
});

describe('impulse-momentum scene entry and URL', () => {
  it('exposes readout keys, graph attach, and toolbar transport', () => {
    const scene = createImpulseMomentumScene();
    scene.init();
    const keys = scene.getReadoutItems().map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'time',
        'force',
        'impulse',
        'p0',
        'dp',
        'p',
        'velocity'
      ])
    );
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.startAll();
    expect(scene.getParams().autoRun).toBe(true);
    scene.pauseAll();
    expect(scene.getParams().autoRun).toBe(false);
    expect(typeof scene.attachGraphCanvas).toBe('function');
    scene.dispose();
  });

  it('applies URL model, mass and autoRun, then reset restores defaults', () => {
    const scene = createImpulseMomentumScene();
    window.history.replaceState(
      {},
      '',
      '/src/pages/impulse-momentum.html?forceModel=triangle&mass=3&peakForce=8&autoRun=1'
    );
    applySceneUrlParams(impulseMomentumMeta, {
      scene,
      controls: {
        setValue() {},
        setActive() {}
      },
      mount: document.createElement('div'),
      scheduleRender: () => scene.render()
    });
    expect(scene.getParams().forceModel).toBe('triangle');
    expect(scene.getParams().mass).toBe(3);
    expect(scene.getParams().peakForce).toBe(8);
    expect(scene.getParams().autoRun).toBe(true);
    scene.reset();
    expect(scene.getParams().forceModel).toBe('constant');
    expect(scene.getParams().mass).toBe(2);
    expect(scene.getParams().autoRun).toBe(false);
    scene.dispose();
  });

  it('toolbar reset and play write URL while keeping audit params', async () => {
    const scene = createImpulseMomentumScene();
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
      '/src/pages/impulse-momentum.html?forceModel=halfSine&mass=3&autoRun=0&audit=1'
    );
    pageScene.setParams({
      forceModel: 'halfSine',
      mass: 3,
      autoRun: false
    });
    pageScene.reset();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
    let url = new URL(window.location.href);
    expect(url.searchParams.get('forceModel')).toBe('constant');
    expect(url.searchParams.get('mass')).toBe('2');
    expect(url.searchParams.get('autoRun')).toBe('0');
    expect(url.searchParams.get('audit')).toBe('1');
    pageScene.startAll();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
    url = new URL(window.location.href);
    expect(url.searchParams.get('autoRun')).toBe('1');
    expect(url.searchParams.get('audit')).toBe('1');
    pageScene.pauseAll();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
    expect(new URL(window.location.href).searchParams.get('autoRun')).toBe('0');
    window.history.replaceState({}, '', '/');
    scene.dispose();
  });

  it('wires createScene reset and transport to a batched URL write', () => {
    const pageSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/impulse-momentum/page.ts'),
      'utf8'
    );
    expect(pageSrc).toContain('writeOwnedSceneParams');
    expect(pageSrc).not.toContain("key: 'autoRun'");
    const createControlsBody = pageSrc.slice(
      pageSrc.indexOf('createControls:')
    );
    expect(createControlsBody).not.toContain('writeSceneParams');
  });
});
