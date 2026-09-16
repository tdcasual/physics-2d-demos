import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applySceneUrlParams, writeSceneParams } from '../../src/app/url-sync';
import { createPotentialGraphScene } from '../../src/scenes/potential-energy-graphs/scene.entry';
import { potentialGraphMeta } from '../../src/scenes/potential-energy-graphs/scene.meta';
import {
  createPotentialGraphSim,
  fieldSides,
  graphBounds,
  parseScenario,
  potentialAt,
  potentialGraphConstants as C,
  restoredUrlParams,
  sourceCharges
} from '../../src/scenes/potential-energy-graphs/scene.sim';

function finiteDifferenceField(
  scenario: 'segments' | 'point' | 'dipole',
  x: number,
  h = 1e-4
): number {
  const left = potentialAt(scenario, x - h).potential;
  const right = potentialAt(scenario, x + h).potential;
  return -(right - left) / (2 * h);
}

describe('potential-energy-graphs simulation', () => {
  it('matches E = −dφ/dx on smooth segments of every scenario', () => {
    const samples: Array<['segments' | 'point' | 'dipole', number]> = [
      ['segments', 1],
      ['segments', 5],
      ['segments', 8],
      ['point', 1],
      ['point', 4],
      ['dipole', 2],
      ['dipole', 5],
      ['dipole', 8]
    ];
    for (const [scenario, x] of samples) {
      expect(potentialAt(scenario, x).field).toBeCloseTo(
        finiteDifferenceField(scenario, x),
        3
      );
    }
  });

  it('uses the cover piecewise field: E=1.5 V/m and k=−1.5 at x=7.58 m', () => {
    // φ = 9 − 1.5(x−7) on [7,10] → φ(7.58)=9−0.87=8.13 V, E=+1.5 V/m
    const values = potentialAt('segments', 7.58);
    expect(values.field).toBeCloseTo(1.5, 6);
    expect(values.potential).toBeCloseTo(8.13, 2);
    const sim = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 7.58,
      probeCharge: 1,
      chargeMagnitude: 1,
      autoRun: false
    });
    const state = sim.getState();
    expect(state.slope).toBeCloseTo(-1.5, 6);
    expect(state.potentialEnergy).toBeCloseTo(state.potential, 6);
    expect(state.force).toBeCloseTo(1.5, 6);
  });

  it('treats x=3 m as a kink: φ continuous, dφ/dx undefined, one-sided E and F', () => {
    // Left piece φ=10−3x → φ(3)=1 V, E=3 V/m; right φ=1+2(x−3) → E=−2 V/m
    expect(potentialAt('segments', 3).potential).toBeCloseTo(1, 10);
    expect(fieldSides('segments', 3)).toEqual({
      left: 3,
      right: -2,
      kink: true
    });
    const plus = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 3,
      probeCharge: 1,
      chargeMagnitude: 1,
      autoRun: false
    });
    const s = plus.getState();
    expect(s.kink).toBe(true);
    expect(s.potential).toBeCloseTo(1, 10);
    expect(s.slope).toBeNull();
    expect(s.field).toBeNull();
    expect(s.force).toBeNull();
    expect(s.fieldLeft).toBeCloseTo(3, 10);
    expect(s.fieldRight).toBeCloseTo(-2, 10);
    expect(s.forceLeft).toBeCloseTo(3, 10);
    expect(s.forceRight).toBeCloseTo(-2, 10);
    const minus = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 3,
      probeCharge: -1,
      chargeMagnitude: 2,
      autoRun: false
    });
    const m = minus.getState();
    expect(m.fieldLeft).toBeCloseTo(plus.getState().fieldLeft, 10);
    expect(m.fieldRight).toBeCloseTo(plus.getState().fieldRight, 10);
    expect(m.forceLeft).toBeCloseTo(-6, 10);
    expect(m.forceRight).toBeCloseTo(4, 10);
  });

  it('treats x=7 m as a kink with opposite one-sided E and reversed F for −q', () => {
    // Left φ=1+2(x−3) → φ(7)=9 V, E=−2 V/m; right φ=9−1.5(x−7) → E=+1.5 V/m
    expect(potentialAt('segments', 7).potential).toBeCloseTo(9, 10);
    expect(fieldSides('segments', 7)).toEqual({
      left: -2,
      right: 1.5,
      kink: true
    });
    const plus = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 7,
      probeCharge: 1,
      chargeMagnitude: 1,
      autoRun: false
    });
    const s = plus.getState();
    expect(s.kink).toBe(true);
    expect(s.slope).toBeNull();
    expect(s.fieldLeft).toBeCloseTo(-2, 10);
    expect(s.fieldRight).toBeCloseTo(1.5, 10);
    expect(s.forceLeft).toBeCloseTo(-2, 10);
    expect(s.forceRight).toBeCloseTo(1.5, 10);
    plus.setParams({ probePosition: 6.9 });
    expect(plus.getState().kink).toBe(false);
    expect(plus.getState().field).toBeCloseTo(-2, 6);
    const minus = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 7,
      probeCharge: -1,
      chargeMagnitude: 1,
      autoRun: false
    });
    expect(minus.getState().forceLeft).toBeCloseTo(2, 10);
    expect(minus.getState().forceRight).toBeCloseTo(-1.5, 10);
  });

  it('takes signed E-x area from x=0 to x=7.58 m as φ(0)−φ(7.58)=1.87 V', () => {
    // ∫E dx = 3·3 + (−2)·4 + 1.5·0.58 = 9 − 8 + 0.87 = 1.87 V
    const sim = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 7.58,
      autoRun: false
    });
    expect(sim.getState().signedArea).toBeCloseTo(1.87, 2);
    expect(sim.getState().signedArea).toBeCloseTo(
      potentialAt('segments', 0).potential -
        potentialAt('segments', 7.58).potential,
      10
    );
  });

  it('gives point-charge φ=k/r and E=k/r² with k=8, source at x=−1', () => {
    // r(1)=2 m → φ=8/2=4 V, E=8/4=2 V/m, along +x
    const values = potentialAt('point', 1);
    expect(values.potential).toBeCloseTo(4, 10);
    expect(values.field).toBeCloseTo(2, 10);
    expect(values.field).toBeGreaterThan(0);
    const far = potentialAt('point', 9);
    expect(far.potential).toBeLessThan(values.potential);
    expect(sourceCharges('point')).toEqual([{ x: C.pointChargeX, q: 1 }]);
  });

  it('builds the dipole by superposition of +Q at −1 m and −Q at 11 m', () => {
    // x=5 m: φ=8/6 − 8/6=0; E=8/36 + 8/36=4/9 V/m (both contributions +x)
    const values = potentialAt('dipole', 5);
    expect(values.potential).toBeCloseTo(0, 10);
    expect(values.field).toBeCloseTo(4 / 9, 10);
    const sources = sourceCharges('dipole');
    expect(sources).toEqual([
      { x: C.pointChargeX, q: 1 },
      { x: C.negativeChargeX, q: -1 }
    ]);
  });

  it('reverses Uₚ and F for a negative probe without changing the source field', () => {
    const plus = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 7.58,
      probeCharge: 1,
      chargeMagnitude: 2,
      autoRun: false
    });
    const minus = createPotentialGraphSim({
      scenario: 'segments',
      probePosition: 7.58,
      probeCharge: -1,
      chargeMagnitude: 2,
      autoRun: false
    });
    const plusState = plus.getState();
    const minusState = minus.getState();
    expect(plusState.field).not.toBeNull();
    expect(plusState.force).not.toBeNull();
    expect(minusState.field).not.toBeNull();
    expect(minusState.force).not.toBeNull();
    const plusField = plusState.field;
    const plusForce = plusState.force;
    const minusField = minusState.field;
    const minusForce = minusState.force;
    if (
      plusField === null ||
      plusForce === null ||
      minusField === null ||
      minusForce === null
    ) {
      throw new Error('expected unique E and F at x=7.58 m');
    }
    expect(minusState.potential).toBeCloseTo(plusState.potential, 10);
    expect(minusField).toBeCloseTo(plusField, 10);
    expect(minusState.potentialEnergy).toBeCloseTo(
      -plusState.potentialEnergy,
      10
    );
    expect(minusForce).toBeCloseTo(-plusForce, 10);
    expect(minusForce).toBeCloseTo(-3, 6);
  });

  it('does not let the probe rewrite φ(x) or E(x) of the source field', () => {
    const before = potentialAt('dipole', 4);
    const sim = createPotentialGraphSim({
      scenario: 'dipole',
      probePosition: 4,
      probeCharge: -1,
      chargeMagnitude: 2
    });
    sim.setParams({ probePosition: 8, probeCharge: 1, chargeMagnitude: 0.5 });
    expect(potentialAt('dipole', 4).potential).toBeCloseTo(
      before.potential,
      12
    );
    expect(potentialAt('dipole', 4).field).toBeCloseTo(before.field, 12);
    expect(sim.getState().field).not.toBeCloseTo(before.field, 3);
  });

  it('clamps probe position and |q|, and keeps illegal charge signs unchanged', () => {
    const sim = createPotentialGraphSim({
      probePosition: 0,
      chargeMagnitude: 9,
      probeCharge: 1
    });
    expect(sim.getParams().probePosition).toBe(C.probeMin);
    expect(sim.getParams().chargeMagnitude).toBe(C.chargeMax);
    sim.setParams({
      probePosition: 40,
      chargeMagnitude: 0,
      probeCharge: 4 as unknown as 1
    });
    expect(sim.getParams().probePosition).toBe(C.probeMax);
    expect(sim.getParams().chargeMagnitude).toBe(C.chargeMin);
    expect(sim.getParams().probeCharge).toBe(1);
    sim.setParams({ probeCharge: -1 });
    expect(sim.getParams().probeCharge).toBe(-1);
  });

  it('pauses the scan on the current x instead of snapping back', () => {
    const sim = createPotentialGraphSim({
      probePosition: 2,
      autoRun: true
    });
    sim.step(1);
    const moving = sim.getState().probePosition;
    expect(moving).toBeGreaterThan(2);
    sim.setParams({ autoRun: false });
    const frozen = sim.getState().probePosition;
    expect(frozen).toBeCloseTo(moving, 10);
    sim.step(1);
    expect(sim.getState().probePosition).toBeCloseTo(frozen, 10);
  });

  it('resets toolbar state to the default probe and scenario', () => {
    const sim = createPotentialGraphSim({
      scenario: 'dipole',
      probeCharge: -1,
      chargeMagnitude: 2,
      probePosition: 1,
      autoRun: true
    });
    sim.step(2);
    sim.reset();
    const p = sim.getParams();
    expect(p.scenario).toBe('segments');
    expect(p.probeCharge).toBe(1);
    expect(p.chargeMagnitude).toBe(1);
    expect(p.probePosition).toBeCloseTo(7.58, 6);
    expect(p.autoRun).toBe(false);
    expect(sim.getState().time).toBe(0);
  });

  it('keeps φ and E extrema inside graph bounds for every scenario', () => {
    for (const scenario of ['segments', 'point', 'dipole'] as const) {
      const bounds = graphBounds(scenario);
      for (let i = 0; i <= 40; i += 1) {
        const x = C.xMin + ((C.xMax - C.xMin) * i) / 40;
        const { potential, field } = potentialAt(scenario, x);
        expect(potential).toBeGreaterThanOrEqual(bounds.phiMin);
        expect(potential).toBeLessThanOrEqual(bounds.phiMax);
        expect(field).toBeGreaterThanOrEqual(bounds.eMin);
        expect(field).toBeLessThanOrEqual(bounds.eMax);
      }
    }
  });

  it('parses scenario tokens used by URL init', () => {
    expect(parseScenario('point')).toBe('point');
    expect(parseScenario(2)).toBe('dipole');
    expect(parseScenario('nope', 'segments')).toBe('segments');
  });
});

describe('potential-energy-graphs scene entry and URL', () => {
  it('exposes readout keys, graph attach, and play/pause', () => {
    const scene = createPotentialGraphScene();
    scene.init();
    const keys = scene.getReadoutItems().map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'position',
        'potential',
        'slope',
        'field',
        'energy',
        'force',
        'area'
      ])
    );
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.startAll();
    expect(scene.getParams().autoRun).toBe(true);
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.pauseAll();
    expect(scene.getParams().autoRun).toBe(false);
    expect(typeof scene.attachGraphCanvas).toBe('function');
    scene.setParams({ scenario: 'segments', probePosition: 3 });
    const kinkItems = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(kinkItems.slope).toBe('未定义');
    expect(kinkItems.field).toContain('E₋');
    expect(kinkItems.field).toContain('E₊');
    expect(kinkItems.force).toContain('F₋');
    expect(kinkItems.force).toContain('F₊');
    scene.setParams({ probeCharge: -1, probePosition: 7 });
    const reversed = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(reversed.slope).toBe('未定义');
    expect(reversed.force).toContain('F₋');
    expect(reversed.force).toContain('+2.00');
    expect(reversed.force).toContain('−1.50');
    scene.dispose();
  });

  it('applies URL scenario, sign, x, and autoRun without leaving the clamp window', () => {
    const scene = createPotentialGraphScene();
    window.history.replaceState(
      {},
      '',
      '/src/pages/potential-energy-graphs.html?scenario=point&probeCharge=-1&probePosition=0&chargeMagnitude=9&autoRun=1'
    );
    applySceneUrlParams(potentialGraphMeta, {
      scene,
      controls: {
        setValue() {},
        setActive() {}
      },
      mount: document.createElement('div'),
      scheduleRender: () => scene.render()
    });
    const p = scene.getParams();
    expect(p.scenario).toBe('point');
    expect(p.probeCharge).toBe(-1);
    expect(p.probePosition).toBe(C.probeMin);
    expect(p.chargeMagnitude).toBe(C.chargeMax);
    expect(p.autoRun).toBe(true);
    scene.reset();
    expect(scene.getParams().scenario).toBe('segments');
    expect(scene.getParams().probeCharge).toBe(1);
    expect(scene.getParams().autoRun).toBe(false);
    scene.dispose();
  });

  it('encodes the live scene into a full URL snapshot', () => {
    const defaults = restoredUrlParams(createPotentialGraphSim().getParams());
    expect(defaults).toEqual({
      scenario: 'segments',
      probeCharge: 1,
      chargeMagnitude: 1,
      probePosition: 7.58,
      showTangent: 1,
      showArea: 1,
      autoRun: 0
    });
    const live = restoredUrlParams(
      createPotentialGraphSim({
        scenario: 'dipole',
        probeCharge: -1,
        probePosition: 5,
        autoRun: false
      }).getParams()
    );
    expect(live.scenario).toBe('dipole');
    expect(live.probeCharge).toBe(-1);
    expect(live.probePosition).toBe(5);
    expect(live.autoRun).toBe(0);
  });

  it('toolbar reset and play/pause write the actual state while keeping audit params', async () => {
    const scene = createPotentialGraphScene();
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
      '/src/pages/potential-energy-graphs.html?scenario=dipole&probeCharge=-1&probePosition=5&autoRun=0&audit=1'
    );
    pageScene.setParams({
      scenario: 'dipole',
      probeCharge: -1,
      probePosition: 5,
      autoRun: false
    });
    pageScene.reset();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
    let url = new URL(window.location.href);
    expect(url.searchParams.get('scenario')).toBe('segments');
    expect(url.searchParams.get('probeCharge')).toBe('1');
    expect(url.searchParams.get('probePosition')).toBe('7.58');
    expect(url.searchParams.get('autoRun')).toBe('0');
    expect(url.searchParams.get('audit')).toBe('1');

    pageScene.startAll();
    pageScene.step(1);
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
    url = new URL(window.location.href);
    expect(url.searchParams.get('autoRun')).toBe('0');
    expect(Number(url.searchParams.get('probePosition'))).toBeCloseTo(
      pageScene.getParams().probePosition,
      5
    );
    expect(url.searchParams.get('audit')).toBe('1');
    window.history.replaceState({}, '', '/');
    scene.dispose();
  });

  it('wires createScene reset and transport to a batched URL write', () => {
    const pageSrc = readFileSync(
      resolve(process.cwd(), 'src/scenes/potential-energy-graphs/page.ts'),
      'utf8'
    );
    expect(pageSrc).toContain(
      'writeSceneParams(restoredUrlParams(scene.getParams()))'
    );
    expect(pageSrc).toContain('const originalReset = scene.reset.bind(scene)');
    expect(pageSrc).toContain(
      'const originalStartAll = scene.startAll.bind(scene)'
    );
    expect(pageSrc).toContain(
      'const originalPauseAll = scene.pauseAll.bind(scene)'
    );
    const createSceneStart = pageSrc.indexOf('createScene:');
    const createControlsStart = pageSrc.indexOf('createControls:');
    const createSceneBody = pageSrc.slice(
      createSceneStart,
      createControlsStart
    );
    const createControlsBody = pageSrc.slice(createControlsStart);
    expect(createSceneBody).toContain('originalReset()');
    expect(createSceneBody).toContain('originalStartAll()');
    expect(createSceneBody).toContain('originalPauseAll()');
    expect(createSceneBody).toContain('syncUrl()');
    expect(createControlsBody).not.toContain('writeSceneParams');
  });
});
