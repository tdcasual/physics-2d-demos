import { describe, expect, it } from 'vitest';
import { applySceneUrlParams } from '../../src/app/url-sync';
import { createAccelForceScene } from '../../src/scenes/accel-force/scene.entry';
import { accelForceMeta } from '../../src/scenes/accel-force/scene.meta';
import {
  accelForceConstants as C,
  accelForceDynamics,
  apparatusInsideFrame,
  apparatusLayout,
  cartNewtonResidual,
  createAccelForceSim,
  graphFrame,
  parseAccelForceMode,
  ropeTension,
  tapeAcceleration,
  theoreticalAcceleration,
  tickPositions
} from '../../src/scenes/accel-force/scene.sim';

describe('accel-force system and cart equations', () => {
  it('uses a = mg/(M+m) and F = Mmg/(M+m) after balancing', () => {
    // M=0.40 kg, m=0.03 kg, g=9.8：mg=0.294，M+m=0.43
    // a=0.294/0.43=0.68372；F=0.4×0.294/0.43=0.27349（封面 0.273 N / 0.68 m/s²）
    expect(theoreticalAcceleration(0.4, 0.03, true)).toBeCloseTo(0.68372, 5);
    expect(ropeTension(0.4, 0.03, true)).toBeCloseTo(0.27349, 5);
    const state = createAccelForceSim({
      cartMass: 0.4,
      hangerMass: 0.03,
      balanced: true,
      autoRun: false
    }).getState();
    expect(state.acceleration).toBeCloseTo(0.68372, 5);
    expect(state.force).toBeCloseTo(0.27349, 5);
    expect(state.friction).toBe(0);
    expect(state.force).toBeCloseTo(
      state.params.cartMass * state.acceleration,
      10
    );
    expect(cartNewtonResidual(0.4, 0.03, true)).toBeCloseTo(0, 12);
  });

  it('keeps F − f = Ma when friction is not balanced', () => {
    // μ=0.05，M=0.4 → f=0.05×0.4×9.8=0.196
    // mg−f=0.098，a=0.098/0.43=0.22791
    // T=Ma+f=0.09116+0.196=0.28716
    const d = accelForceDynamics(0.4, 0.03, false);
    expect(d.friction).toBeCloseTo(0.196, 10);
    expect(d.acceleration).toBeCloseTo(0.22791, 5);
    expect(d.tension).toBeCloseTo(0.28716, 5);
    expect(d.tension - d.friction).toBeCloseTo(0.4 * d.acceleration, 10);
    expect(cartNewtonResidual(0.4, 0.03, false)).toBeCloseTo(0, 12);
    const state = createAccelForceSim({
      balanced: false,
      autoRun: false
    }).getState();
    expect(state.status).toContain('不得宣称正比');
    expect(state.acceleration / state.force).not.toBeCloseTo(1 / 0.4, 3);
  });

  it('stalls when mg ≤ f and keeps a finite', () => {
    // m=0.01 → mg=0.098 < f=0.196，小车不动，T=mg
    const d = accelForceDynamics(0.4, 0.01, false);
    expect(d.acceleration).toBe(0);
    expect(d.tension).toBeCloseTo(0.098, 10);
    expect(d.stalled).toBe(true);
    expect(Number.isFinite(d.tension)).toBe(true);
    const sim = createAccelForceSim({
      hangerMass: 0.01,
      balanced: false,
      autoRun: true
    });
    sim.step(1);
    expect(sim.getState().position).toBe(0);
    expect(sim.getState().velocity).toBe(0);
  });

  it('gives a ∝ F only after balancing, never when friction remains', () => {
    const masses = [0.05, 0.1, 0.15];
    const balanced = masses.map((m) => {
      const d = accelForceDynamics(0.4, m, true);
      return d.acceleration / d.tension;
    });
    balanced.forEach((ratio) => expect(ratio).toBeCloseTo(2.5, 8));
    const raw = masses.map((m) => {
      const d = accelForceDynamics(0.4, m, false);
      return d.acceleration / d.tension;
    });
    raw.forEach((ratio) => expect(ratio).not.toBeCloseTo(2.5, 2));
    expect(raw[0]).not.toBeCloseTo(raw[2]!, 3);
  });
});

describe('accel-force control-variable records', () => {
  it('records a–F with M held and a–1/M with F (m) held', () => {
    const sim = createAccelForceSim({
      mode: 'force',
      cartMass: 0.4,
      hangerMass: 0.03,
      autoRun: false
    });
    const forcePoint = sim.recordPoint();
    expect(forcePoint.mode).toBe('force');
    expect(forcePoint.x).toBeCloseTo(0.27349, 5);
    expect(forcePoint.y).toBeCloseTo(0.68372, 5);

    sim.setParams({ mode: 'inverseMass', hangerMass: 0.03 });
    const massPoint = sim.recordPoint();
    expect(massPoint.mode).toBe('inverseMass');
    expect(massPoint.x).toBeCloseTo(2.5, 10);
    expect(
      sim.getState().records.filter((item) => item.mode === 'force')
    ).toHaveLength(1);
    expect(
      sim.getState().records.filter((item) => item.mode === 'inverseMass')
    ).toHaveLength(1);
  });

  it('clears only the active mode and keeps the other series', () => {
    const sim = createAccelForceSim({ mode: 'force', autoRun: false });
    sim.recordPoint();
    sim.setParams({ mode: 'inverseMass' });
    sim.recordPoint();
    sim.clearRecords();
    expect(
      sim.getState().records.filter((item) => item.mode === 'inverseMass')
    ).toHaveLength(0);
    expect(
      sim.getState().records.filter((item) => item.mode === 'force')
    ).toHaveLength(1);
  });

  it('drops a–F points when the held cart mass changes', () => {
    const sim = createAccelForceSim({ mode: 'force', autoRun: false });
    sim.recordPoint();
    sim.setParams({ cartMass: 0.6 });
    expect(sim.getState().records).toHaveLength(0);
  });
});

describe('accel-force ticker tape and motion', () => {
  it('matches successive difference Δs = a(Δt)² on the tape', () => {
    // a=0.68372，Δt=0.10 → a(Δt)²=0.0068372 m
    const a = theoreticalAcceleration(0.4, 0.03, true);
    const ticks = tickPositions(0.4, a);
    const measured = tapeAcceleration(ticks, 5, 0.1);
    expect(measured).not.toBeNull();
    expect(measured!).toBeCloseTo(a, 6);
    expect(measured!).toBeCloseTo(0.0068372 / 0.01, 5);
  });

  it('widens tick spacing as speed increases', () => {
    const a = theoreticalAcceleration(0.4, 0.03, true);
    const ticks = tickPositions(0.2, a);
    expect(ticks.length).toBeGreaterThan(6);
    const d1 = ticks[2]! - ticks[1]!;
    const d0 = ticks[1]! - ticks[0]!;
    expect(d1).toBeGreaterThan(d0);
    expect(d0).toBeGreaterThan(0);
  });

  it('stops at the track end with finite v = √(2as)', () => {
    const sim = createAccelForceSim({ autoRun: true, balanced: true });
    sim.step(4);
    const s = sim.getState();
    expect(s.position).toBeCloseTo(C.sMax, 8);
    expect(s.finished).toBe(true);
    expect(s.params.autoRun).toBe(false);
    expect(s.velocity).toBeCloseTo(Math.sqrt(2 * s.acceleration * C.sMax), 6);
    expect(Number.isFinite(s.velocity)).toBe(true);
  });

  it('pauses unless autoRun or a keyboard 0.016 step is applied', () => {
    const sim = createAccelForceSim({ autoRun: false });
    sim.step(0.5);
    expect(sim.getState().time).toBe(0);
    sim.step(C.keyboardDt);
    expect(sim.getState().time).toBeCloseTo(C.keyboardDt, 8);
    sim.step(-C.keyboardDt);
    expect(sim.getState().time).toBeCloseTo(0, 8);
    sim.stepFrame(0.1);
    expect(sim.getState().time).toBeCloseTo(0.1, 8);
  });

  it('release/resetCart/restart close the experiment loop', () => {
    const sim = createAccelForceSim({ autoRun: false });
    sim.setParams({ hangerMass: 0.05 });
    sim.stepFrame(0.4);
    sim.recordPoint();
    expect(sim.getState().time).toBeGreaterThan(0);
    sim.resetCart();
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().params.autoRun).toBe(false);
    expect(sim.getState().records).toHaveLength(1);
    sim.release();
    expect(sim.getState().params.autoRun).toBe(true);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      cartMass: C.cartDefault,
      hangerMass: C.hangerDefault,
      balanced: true
    });
    expect(sim.getState().records).toHaveLength(0);
  });
});

describe('accel-force force direction and geometry', () => {
  it('points F toward the pulley and f opposite when unbalanced', () => {
    const balanced = createAccelForceSim({
      balanced: true,
      autoRun: false
    }).getState();
    const bLayout = apparatusLayout(balanced);
    expect(bLayout.forceArrow).not.toBeNull();
    expect(bLayout.forceArrow!.x2).toBeGreaterThan(bLayout.forceArrow!.x1);
    expect(bLayout.frictionArrow).toBeNull();

    const raw = createAccelForceSim({
      balanced: false,
      hangerMass: 0.08,
      autoRun: false
    }).getState();
    const rLayout = apparatusLayout(raw);
    expect(rLayout.frictionArrow).not.toBeNull();
    expect(rLayout.frictionArrow!.x2).toBeLessThan(rLayout.frictionArrow!.x1);
    expect(rLayout.forceArrow!.x2).toBeGreaterThan(rLayout.forceArrow!.x1);
  });

  it('keeps apparatus inside the design frame and above the transport bar', () => {
    const state = createAccelForceSim({
      balanced: true,
      hangerMass: 0.2,
      autoRun: false
    }).getState();
    const layout = apparatusLayout(state);
    expect(apparatusInsideFrame(layout)).toBe(true);
    expect(layout.hanger.y).toBeLessThan(C.baseHeight - C.transportClearY);
    expect(layout.pulley.x).toBeLessThan(C.baseWidth);
  });

  it('clamps parameters and rejects NaN / Infinity', () => {
    const sim = createAccelForceSim({
      cartMass: 99,
      hangerMass: -1,
      autoRun: false
    });
    expect(sim.getParams().cartMass).toBe(C.cartMax);
    expect(sim.getParams().hangerMass).toBe(C.hangerMin);
    sim.setParams({
      cartMass: Number.NaN,
      hangerMass: Number.POSITIVE_INFINITY
    });
    expect(sim.getParams().cartMass).toBe(C.cartMax);
    expect(sim.getParams().hangerMass).toBe(C.hangerMin);
    const s = sim.getState();
    expect(Number.isFinite(s.force)).toBe(true);
    expect(Number.isFinite(s.acceleration)).toBe(true);
  });

  it('parses mode from URL tokens 0 / 1 / force / inverseMass', () => {
    expect(parseAccelForceMode(0)).toBe('force');
    expect(parseAccelForceMode('1')).toBe('inverseMass');
    expect(parseAccelForceMode('inverseMass')).toBe('inverseMass');
  });

  it('keeps graph axis-title offsets inside the canvas', () => {
    const frame = graphFrame(624, 147);
    expect(frame.bottom + 28).toBeLessThanOrEqual(147);
    expect(frame.top - 12).toBeGreaterThanOrEqual(0);
    expect(frame.right).toBeLessThanOrEqual(624);
    expect(frame.left).toBeGreaterThan(0);
  });
});

describe('accel-force scene entry and URL', () => {
  it('exposes readout, graph attach, and transport hooks', () => {
    const scene = createAccelForceScene();
    scene.init();
    const keys = scene.getReadoutItems().map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'force',
        'inverseMass',
        'accelTheory',
        'accelTape',
        'friction',
        'status'
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

  it('restores mode and masses from URL params', () => {
    const scene = createAccelForceScene();
    window.history.replaceState(
      {},
      '',
      '/src/pages/accel-force.html?mode=inverseMass&cartMass=0.6&balanced=0&autoRun=0'
    );
    applySceneUrlParams(accelForceMeta, {
      scene,
      controls: {
        setValue() {},
        setActive() {}
      },
      mount: document.createElement('div'),
      scheduleRender: () => scene.render()
    });
    const p = scene.getParams();
    expect(p.mode).toBe('inverseMass');
    expect(p.cartMass).toBeCloseTo(0.6, 8);
    expect(p.balanced).toBe(false);
    expect(p.autoRun).toBe(false);
    scene.dispose();
  });
});
