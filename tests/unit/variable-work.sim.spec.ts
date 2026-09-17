import { describe, expect, it } from 'vitest';
import { applySceneUrlParams } from '../../src/app/url-sync';
import { createVariableWorkScene } from '../../src/scenes/variable-work/scene.entry';
import { variableWorkMeta } from '../../src/scenes/variable-work/scene.meta';
import {
  asMode,
  endTime,
  fillStartX,
  piecewiseBreakTime,
  forceAt,
  integrateForce,
  integratePower,
  omega,
  powerPosition,
  riemannWork,
  sampleAt,
  timeToReach,
  variableWorkConstants as C,
  workFromStart,
  createVariableWorkSim
} from '../../src/scenes/variable-work/scene.sim';

describe('variable-work simulation', () => {
  it('keeps linear F=kx, v=dx/dt, ΔK=W, and P=Fv', () => {
    // m=2 kg, k=2 N/m → ω=√(k/m)=1 s⁻¹. Rest at x0=0.5 m.
    // x=x0 cosh(ωt). Pick t=acosh(2) so x=1.0 m.
    // sinh(acosh 2)=√3, v=x0 ω sinh=0.5√3.
    // W=½k(x²−x0²)=1×(1−0.25)=0.75 J; ½mv²=v²=0.75 J.
    const params = {
      mode: 'linear' as const,
      mass: 2,
      k: 2,
      power: 10,
      microsteps: 0
    };
    expect(omega(params)).toBeCloseTo(1, 12);
    const t = Math.acosh(2);
    const s = sampleAt(params, t);
    expect(s.x).toBeCloseTo(1, 10);
    expect(s.velocity).toBeCloseTo(0.5 * Math.sqrt(3), 10);
    expect(workFromStart(params, 1)).toBeCloseTo(0.75, 12);
    expect(s.work).toBeCloseTo(0.75, 10);
    expect(s.kineticGain).toBeCloseTo(s.work, 10);
    expect(s.force).toBeCloseTo(2, 10);
    expect(s.power).toBeCloseTo(s.force * s.velocity, 12);
    expect(forceAt(params, 1)).toBeCloseTo(2, 12);
  });

  it('keeps constant power P=Fv=P0 from v0 at t=0 through the run', () => {
    // P=10 W, m=2 kg, v0=1 m/s, x0=0.5 m.
    // v²=v0²+2Pt/m; W=Pt=½m(v²−v0²); F=P/v.
    const params = {
      mode: 'power' as const,
      mass: 2,
      k: 2,
      power: 10,
      microsteps: 0
    };
    const s0 = sampleAt(params, 0);
    expect(s0.x).toBeCloseTo(C.x0, 12);
    expect(s0.velocity).toBeCloseTo(C.powerV0, 12);
    expect(s0.force).toBeCloseTo(10, 10);
    expect(s0.force * s0.velocity).toBeCloseTo(10, 10);
    expect(s0.power).toBeCloseTo(10, 10);
    expect(s0.work).toBeCloseTo(0, 12);
    expect(s0.kineticGain).toBeCloseTo(0, 12);
    expect(forceAt(params, 0)).toBe(0);
    expect(forceAt(params, C.x0 - 1e-6)).toBe(0);
    expect(forceAt(params, C.x0)).toBeCloseTo(params.power / C.powerV0, 10);
    expect(forceAt(params, C.x0 - 0.1)).toBe(0);

    const s = sampleAt(params, 2);
    expect(s.velocity).toBeCloseTo(Math.sqrt(21), 10);
    expect(s.work).toBeCloseTo(20, 10);
    expect(s.kineticGain).toBeCloseTo(20, 10);
    expect(s.force * s.velocity).toBeCloseTo(10, 8);
    expect(s.power).toBeCloseTo(10, 8);
    expect(s.x).toBeCloseTo(powerPosition(params, 2), 12);
    const near = sampleAt(params, 1e-3);
    expect(near.force * near.velocity).toBeCloseTo(10, 6);
    expect(integrateForce(params, s.x, 256)).toBeCloseTo(s.work, 2);
    expect(workFromStart(params, s.x)).toBeCloseTo(10 * 2, 10);
    expect(integrateForce(params, s.x, 256)).toBeCloseTo(s.kineticGain, 2);
  });

  it('matches piecewise F and W at the break and after it', () => {
    // k=2, break 3 m. x=3: W_origin=½k·9=9; from x0: 9−½k x0²=9−0.25=8.75.
    // x=4: W_origin=9 + k·3·1 − 0.25k·1=9+6−0.5=14.5; from start 14.25.
    const params = {
      mode: 'piecewise' as const,
      mass: 2,
      k: 2,
      power: 10,
      microsteps: 0
    };
    expect(forceAt(params, 3)).toBeCloseTo(6, 12);
    expect(forceAt(params, 4)).toBeCloseTo(5, 12);
    expect(workFromStart(params, 3)).toBeCloseTo(8.75, 12);
    expect(workFromStart(params, 4)).toBeCloseTo(14.25, 12);
    const t1 = piecewiseBreakTime(params);
    const atBreak = sampleAt(params, t1);
    expect(atBreak.x).toBeCloseTo(C.pieceBreak, 3);
    const s = sampleAt(params, timeToReach(params, 4));
    expect(s.x).toBeCloseTo(4, 3);
    expect(s.kineticGain).toBeCloseTo(s.work, 6);
    expect(fillStartX(params)).toBe(C.x0);
    sampleAt(params, 0);
    const tEnd = endTime(params);
    const t0 = performance.now();
    for (let i = 0; i < 120; i += 1) sampleAt(params, (tEnd * i) / 119);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(8);
  });

  it('lets left-endpoint rectangles underestimate F=kx and converge with n', () => {
    const linear = {
      mode: 'linear' as const,
      mass: 2,
      k: 2,
      power: 10,
      microsteps: 4
    };
    const exact = workFromStart(linear, 2);
    // ½k(x²−x0²)=3.75. Left sum k(b-a)[a+(b-a)(n-1)/(2n)].
    expect(exact).toBeCloseTo(3.75, 12);
    const n4 = riemannWork(linear, 2, 4).value;
    const n8 = riemannWork(linear, 2, 8).value;
    const n32 = riemannWork(linear, 2, 32).value;
    expect(n4).toBeCloseTo(3.1875, 10);
    expect(n8).toBeCloseTo(3.46875, 10);
    expect(n4).toBeLessThan(exact);
    expect(n8).toBeLessThan(exact);
    expect(n32).toBeLessThan(exact);
    expect(exact - n8).toBeLessThan(exact - n4);
    expect(exact - n32).toBeLessThan(exact - n8);

    const power = {
      mode: 'power' as const,
      mass: 2,
      k: 2,
      power: 10,
      microsteps: 4
    };
    const x = powerPosition(power, 2);
    const w = workFromStart(power, x);
    const p4 = Math.abs(w - riemannWork(power, x, 4).value);
    const p32 = Math.abs(w - riemannWork(power, x, 32).value);
    expect(p4).toBeGreaterThan(p32);
    const rects = riemannWork(linear, 2, 4).rectangles;
    expect(rects[0]!.x).toBeCloseTo(fillStartX(linear), 12);
    expect(rects[0]!.height).toBeCloseTo(forceAt(linear, C.x0), 12);
    expect(rects.reduce((s, r) => s + r.width, 0)).toBeCloseTo(2 - C.x0, 10);
  });

  it('makes P-t trapezoids match analytical W', () => {
    const linear = {
      mode: 'linear' as const,
      mass: 2,
      k: 2,
      power: 10,
      microsteps: 0
    };
    const t = Math.acosh(2);
    const s = sampleAt(linear, t);
    expect(integratePower(linear, t, 64)).toBeCloseTo(s.work, 3);
    const power = {
      mode: 'power' as const,
      mass: 2,
      k: 2,
      power: 10,
      microsteps: 0
    };
    expect(integratePower(power, 2, 8)).toBeCloseTo(20, 8);
    expect(integrateForce(linear, 1, 48)).toBeCloseTo(0.75, 3);
  });

  it('freezes time while paused and stops at xMax instead of wrapping', () => {
    const sim = createVariableWorkSim();
    sim.start();
    sim.step(0.4);
    const paused = sim.getState().time;
    expect(paused).toBeCloseTo(0.4, 6);
    expect(paused).not.toBeCloseTo(2.5, 2);
    sim.pause();
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(paused, 6);
    expect(sim.getState().playing).toBe(false);
    sim.start();
    sim.step(endTime(sim.getParams()) + 5);
    const end = sim.getState();
    expect(end.finished).toBe(true);
    expect(end.x).toBeCloseTo(C.xMax, 3);
    expect(end.time).toBeCloseTo(endTime(sim.getParams()), 6);
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().x).toBeCloseTo(C.x0, 6);
    expect(sim.getState().velocity).toBeCloseTo(0, 6);
  });

  it('round-trips URL mode and keeps startAll/pauseAll', () => {
    const scene = createVariableWorkScene();
    window.history.replaceState(
      {},
      '',
      '/src/pages/variable-work.html?mode=1&mass=3&power=8&microsteps=6'
    );
    applySceneUrlParams(variableWorkMeta, {
      scene,
      controls: {
        setValue() {},
        setActive() {}
      },
      mount: document.createElement('div'),
      scheduleRender: () => scene.render()
    });
    expect(scene.getParams().mode).toBe('power');
    expect(scene.getParams().mass).toBe(3);
    expect(scene.getParams().power).toBe(8);
    expect(scene.getParams().microsteps).toBe(6);
    scene.startAll();
    expect(scene.getTransportState().isPlaying).toBe(true);
    scene.pauseAll();
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.reset();
    expect(scene.getParams().mode).toBe('linear');
    expect(typeof scene.attachGraphCanvas).toBe('function');
  });

  it('rewinds to t=0 when mode or motion params change, not for n', () => {
    const sim = createVariableWorkSim();
    sim.start();
    sim.step(0.8);
    expect(sim.getState().time).toBeGreaterThan(0.5);
    sim.setParams({ mode: 'power' });
    const afterMode = sim.getState();
    expect(afterMode.time).toBeCloseTo(0, 12);
    expect(afterMode.x).toBeCloseTo(C.x0, 6);
    expect(afterMode.velocity).toBeCloseTo(C.powerV0, 6);
    expect(afterMode.params.mode).toBe('power');
    sim.step(0.5);
    sim.setParams({ mass: 4 });
    expect(sim.getState().time).toBeCloseTo(0, 12);
    sim.step(0.4);
    const t = sim.getState().time;
    sim.setParams({ microsteps: 8 });
    expect(sim.getState().time).toBeCloseTo(t, 6);
    expect(asMode(0)).toBe('linear');
    sim.setParams({ mode: 'linear' });
    expect(sim.getParams().mode).toBe('linear');
    expect(sim.getState().time).toBeCloseTo(0, 12);
    expect(sim.getState().velocity).toBeCloseTo(0, 6);
  });

  it('covers extrema, end time, pause/resume, and power deep-link', () => {
    const hi = createVariableWorkSim({
      mode: 'linear',
      mass: 0.5,
      k: 6,
      microsteps: 0
    });
    hi.start();
    hi.step(endTime(hi.getParams()) + 1);
    expect(hi.getState().finished).toBe(true);
    expect(hi.getState().x).toBeCloseTo(C.xMax, 3);
    const pw = createVariableWorkSim({ mode: 'power', mass: 5, power: 2 });
    expect(endTime(pw.getParams())).toBeGreaterThan(1);
    const s0 = pw.getState();
    expect(s0.force * s0.velocity).toBeCloseTo(2, 6);
    pw.start();
    pw.step(0.3);
    pw.pause();
    const paused = pw.getState();
    pw.step(1);
    expect(pw.getState().time).toBeCloseTo(paused.time, 8);
    pw.start();
    pw.step(0.2);
    expect(pw.getState().time).toBeGreaterThan(paused.time);
  });

  it('normalize() clamps out-of-range mass/k/power/microsteps and illegal mode to finite values', () => {
    const sim = createVariableWorkSim({
      mass: -2,
      k: 99,
      power: 0,
      microsteps: 100,
      mode: 'nope' as never
    });
    const lo = sim.getParams();
    expect(lo.mass).toBe(C.massMin);
    expect(lo.k).toBe(C.kMax);
    expect(lo.power).toBe(C.powerMin);
    expect(lo.microsteps).toBe(C.microstepsMax);
    expect(lo.mode).toBe('linear');
    const s0 = sim.getState();
    expect(Number.isFinite(s0.x)).toBe(true);
    expect(Number.isFinite(s0.force)).toBe(true);
    expect(Number.isFinite(s0.velocity)).toBe(true);
    expect(Number.isFinite(s0.power)).toBe(true);
    expect(Number.isFinite(s0.work)).toBe(true);

    sim.setParams({
      mass: Number.NaN,
      k: Number.POSITIVE_INFINITY,
      power: Number.NEGATIVE_INFINITY,
      microsteps: 1.4,
      mode: 9 as never
    });
    const next = sim.getParams();
    expect(next.mass).toBe(C.massMin);
    expect(next.k).toBe(C.kMax);
    expect(next.power).toBe(C.powerMin);
    expect(next.microsteps).toBe(1);
    expect(next.mode).toBe('linear');
    expect(
      Object.values(next).every(
        (value) => typeof value === 'number' || typeof value === 'string'
      )
    ).toBe(true);
    expect(Number.isFinite(next.mass)).toBe(true);
    expect(Number.isFinite(next.k)).toBe(true);
    expect(Number.isFinite(next.power)).toBe(true);
    expect(Number.isFinite(next.microsteps)).toBe(true);
  });
});
