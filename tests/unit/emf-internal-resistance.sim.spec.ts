import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeSceneParams } from '../../src/app/url-sync';
import { createEmfInternalScene } from '../../src/scenes/emf-internal-resistance/scene.entry';
import { emfInternalMeta } from '../../src/scenes/emf-internal-resistance/scene.meta';
import {
  asBool,
  asInternalResistance,
  asSourceVoltage,
  createEmfInternalSim,
  emfInternalConstants as C,
  restoredUrlParams
} from '../../src/scenes/emf-internal-resistance/scene.sim';

describe('emf-internal-resistance simulation', () => {
  it('satisfies the closed-circuit relation U + Ir = E', () => {
    const sim = createEmfInternalSim({
      sourceVoltage: 1.5,
      internalResistance: 0.5,
      rheostatResistance: 5,
      switchClosed: true,
      autoRun: false
    });
    const state = sim.getState();
    expect(
      state.terminalVoltage + state.current * state.internalResistance
    ).toBeCloseTo(1.5, 6);
    expect(state.terminalVoltage).toBeCloseTo(1.36, 2);
    expect(state.current).toBeCloseTo(0.27, 2);
  });

  it('snaps discrete E/r options and clamps illegal R and dt', () => {
    const sim = createEmfInternalSim({
      sourceVoltage: 4 as unknown as number,
      internalResistance: 1.4 as unknown as number,
      rheostatResistance: 99,
      autoRun: false
    });
    expect(sim.getParams().sourceVoltage).toBe(3);
    expect(sim.getParams().internalResistance).toBe(1);
    expect(sim.getParams().rheostatResistance).toBe(C.rheostatMax);
    sim.setParams({
      sourceVoltage: Number.NaN,
      rheostatResistance: -1
    });
    expect(sim.getParams().sourceVoltage).toBe(3);
    expect(sim.getParams().rheostatResistance).toBe(C.rheostatMin);
    const t0 = sim.getState().time;
    sim.step(Number.NaN);
    sim.step(-8);
    expect(sim.getState().time).toBe(t0);
    expect(asSourceVoltage('6')).toBe(6);
    expect(asInternalResistance('0.5')).toBe(0.5);
    expect(asBool('0', true)).toBe(false);
    expect(asBool(1, false)).toBe(true);
  });

  it('records varied loads, caps at six, and fits E and r', () => {
    const sim = createEmfInternalSim({
      sourceVoltage: 3,
      internalResistance: 1,
      switchClosed: true
    });
    expect(sim.fitRecords()).toBeNull();
    [2, 4, 7, 10, 12, 14, 15].forEach((rheostatResistance) => {
      sim.setParams({ rheostatResistance });
      sim.recordPoint();
    });
    expect(sim.getState().records).toHaveLength(6);
    expect(sim.recordPoint()).toBe(false);
    const fit = sim.fitRecords();
    expect(fit?.emf).toBeCloseTo(3, 5);
    expect(fit?.internalResistance).toBeCloseTo(1, 5);
  });

  it('reads cell terminal voltage with an open switch and refuses to record', () => {
    const ideal = createEmfInternalSim({
      sourceVoltage: 3,
      internalResistance: 1,
      rheostatResistance: 5,
      systematicError: false,
      switchClosed: false,
      autoRun: false
    });
    // Ideal open circuit: I=0 so U=E−Ir=E=3 V; recording stays disabled.
    expect(ideal.getState().current).toBe(0);
    expect(ideal.getState().trueCurrent).toBe(0);
    expect(ideal.getState().terminalVoltage).toBe(3);
    expect(ideal.recordPoint()).toBe(false);
    expect(ideal.getState().records).toHaveLength(0);

    const finite = createEmfInternalSim({
      sourceVoltage: 3,
      internalResistance: 1,
      systematicError: true,
      switchClosed: false,
      autoRun: false
    });
    // Finite voltmeter: only path is E–r–Rv, U=3×100/101=2.970297 V.
    expect(finite.getState().current).toBe(0);
    expect(finite.getState().terminalVoltage).toBeCloseTo(2.970297, 5);
    expect(finite.getState().trueCurrent).toBeCloseTo(0.029703, 5);
    expect(finite.recordPoint()).toBe(false);
    expect(finite.getState().records).toHaveLength(0);
  });

  it('shows the qualitative shunt error when the switch is closed', () => {
    const sim = createEmfInternalSim({
      sourceVoltage: 3,
      internalResistance: 1,
      systematicError: true,
      switchClosed: true
    });
    [2, 4, 7, 10].forEach((rheostatResistance) => {
      sim.setParams({ rheostatResistance });
      sim.recordPoint();
    });
    const fit = sim.fitRecords();
    expect(fit?.emf ?? 0).toBeLessThan(3);
    expect(fit?.internalResistance ?? 0).toBeLessThan(1);
    expect(Number.isFinite(fit?.emf ?? NaN)).toBe(true);
    expect(Number.isFinite(fit?.internalResistance ?? NaN)).toBe(true);
    const closed = sim.getState();
    expect(closed.trueCurrent).toBeGreaterThan(closed.current);
  });

  it('builds restored URL params as numbers with booleans as 0/1', () => {
    expect(
      restoredUrlParams({
        sourceVoltage: 3,
        internalResistance: 1,
        rheostatResistance: 8,
        switchClosed: false,
        systematicError: true,
        autoRun: false
      })
    ).toEqual({
      sourceVoltage: 3,
      internalResistance: 1,
      rheostatResistance: 8,
      switchClosed: 0,
      systematicError: 1,
      autoRun: 0
    });
  });

  it('persists all six restored keys in one batched URL write', async () => {
    window.history.replaceState(
      {},
      '',
      '/src/pages/emf-internal-resistance.html?switchClosed=0&systematicError=1'
    );
    writeSceneParams(
      restoredUrlParams({
        sourceVoltage: 1.5,
        internalResistance: 0.5,
        rheostatResistance: 5,
        switchClosed: true,
        systematicError: false,
        autoRun: true
      })
    );
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const url = new URL(window.location.href);
        expect(url.searchParams.get('sourceVoltage')).toBe('1.5');
        expect(url.searchParams.get('internalResistance')).toBe('0.5');
        expect(url.searchParams.get('rheostatResistance')).toBe('5');
        expect(url.searchParams.get('switchClosed')).toBe('1');
        expect(url.searchParams.get('systematicError')).toBe('0');
        expect(url.searchParams.get('autoRun')).toBe('1');
        window.history.replaceState({}, '', '/');
        resolve();
      }, 200);
    });
  });

  it('pauses electron flow until autoRun is on and restores URL baseline', () => {
    const sim = createEmfInternalSim({
      sourceVoltage: 6,
      internalResistance: 2,
      rheostatResistance: 8,
      autoRun: false,
      switchClosed: true
    });
    const t0 = sim.getState().time;
    sim.step(0.2);
    expect(sim.getState().time).toBe(t0);
    sim.setParams({ autoRun: true });
    sim.step(0.2);
    expect(sim.getState().time).toBeGreaterThan(t0);
    sim.setParams({ rheostatResistance: 3 });
    sim.recordPoint();
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      sourceVoltage: 6,
      internalResistance: 2,
      rheostatResistance: 8,
      autoRun: false
    });
    expect(sim.getState().records).toHaveLength(0);
    expect(sim.getState().time).toBe(0);
  });
});

describe('emf-internal-resistance entry', () => {
  it('applies construction params on first frame and exposes graph attach', () => {
    const scene = createEmfInternalScene({
      initialParams: {
        sourceVoltage: 6,
        internalResistance: 2,
        rheostatResistance: 9,
        autoRun: false,
        switchClosed: true
      }
    });
    scene.init();
    expect(scene.getParams()).toMatchObject({
      sourceVoltage: 6,
      internalResistance: 2,
      rheostatResistance: 9,
      autoRun: false
    });
    const keys = scene.getReadoutItems().map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'voltage',
        'current',
        'resistance',
        'records',
        'fit'
      ])
    );
    expect(emfInternalMeta.testProfile?.hasGraph).toBe(true);
    expect(typeof scene.attachGraphCanvas).toBe('function');
    scene.dispose();
  });

  it('keeps controls refresh contract in page source', () => {
    const pageSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/emf-internal-resistance/page.ts'),
      'utf8'
    );
    expect(pageSrc).not.toContain('readSceneParams');
    expect(pageSrc).toContain('asBool');
    expect(pageSrc).toContain("preferredLayout: 'split-right-graph-bottom'");
    expect(pageSrc).toContain('syncFromScene');
    expect(pageSrc).toContain('initialParams: paramsFromUrl(urlParams ?? {})');
    expect(pageSrc).toContain('shouldAutoPlay:');
    expect(pageSrc).toContain('paramsFromUrl(urlParams).autoRun !== false');
    expect(pageSrc).toContain('const originalReset = scene.reset.bind(scene)');
    expect(pageSrc).toContain('writeOwnedSceneParams');
    expect(pageSrc).toContain('if (syncingControls) return');
    expect(pageSrc).not.toContain('emfScene.reset =');
    const createSceneStart = pageSrc.indexOf('createScene:');
    const createControlsStart = pageSrc.indexOf('createControls:');
    const createSceneBody = pageSrc.slice(
      createSceneStart,
      createControlsStart
    );
    const createControlsBody = pageSrc.slice(createControlsStart);
    expect(createSceneBody).toContain('originalReset()');
    expect(createSceneBody).toContain('writeOwnedSceneParams');
    expect(createControlsBody).not.toContain('writeSceneParams');
    expect(createControlsBody).toContain('syncFromScene');
    expect(pageSrc).toContain("writeParam?.('switchClosed', closed ? 1 : 0)");
  });

  it('toolbar-captured createScene reset restores URL in one batch', async () => {
    const scene = createEmfInternalScene({
      initialParams: {
        sourceVoltage: 3,
        internalResistance: 1,
        rheostatResistance: 5,
        switchClosed: true,
        systematicError: false,
        autoRun: false
      }
    });
    const originalReset = scene.reset.bind(scene);
    const pageScene = {
      ...scene,
      reset(): void {
        originalReset();
        writeSceneParams(restoredUrlParams(scene.getParams()));
      }
    };
    const toolbarReset = pageScene.reset.bind(pageScene);

    window.history.replaceState(
      {},
      '',
      '/src/pages/emf-internal-resistance.html?autoRun=0&sourceVoltage=3&internalResistance=1&rheostatResistance=5&switchClosed=1&systematicError=0'
    );
    pageScene.setParams({ switchClosed: false, systematicError: true });
    writeSceneParams({ switchClosed: 0, systematicError: 1 });
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
    expect(new URL(window.location.href).searchParams.get('switchClosed')).toBe(
      '0'
    );
    expect(
      new URL(window.location.href).searchParams.get('systematicError')
    ).toBe('1');

    const laterWrap = pageScene.reset.bind(pageScene);
    pageScene.reset = () => {
      laterWrap();
    };
    toolbarReset();
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const url = new URL(window.location.href);
        expect(url.searchParams.get('sourceVoltage')).toBe('3');
        expect(url.searchParams.get('internalResistance')).toBe('1');
        expect(url.searchParams.get('rheostatResistance')).toBe('5');
        expect(url.searchParams.get('switchClosed')).toBe('1');
        expect(url.searchParams.get('systematicError')).toBe('0');
        expect(url.searchParams.get('autoRun')).toBe('0');
        expect(scene.getParams()).toMatchObject({
          switchClosed: true,
          systematicError: false
        });
        window.history.replaceState({}, '', '/');
        scene.dispose();
        resolve();
      }, 200);
    });
  });
});
