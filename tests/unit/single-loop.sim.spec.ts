import { describe, expect, it } from 'vitest';
import { applySceneUrlParams, writeSceneParams } from '../../src/app/url-sync';
import { createSingleLoopScene } from '../../src/scenes/single-loop/scene.entry';
import { singleLoopMeta } from '../../src/scenes/single-loop/scene.meta';
import {
  advancePosition,
  createSingleLoopSim,
  currentAtPosition,
  ixPolyline,
  overlapAt,
  regionAt,
  regionLabel,
  restoredUrlParams,
  singleLoopConstants as C,
  stallPosition,
  velocityAtPosition,
  vxPolyline,
  type SingleLoopParams
} from '../../src/scenes/single-loop/scene.sim';

const DEFAULT: SingleLoopParams = {
  initialVelocity: 10,
  fieldStrength: 1.5,
  mass: 2,
  resistance: 2,
  autoRun: false
};

function live(sim: ReturnType<typeof createSingleLoopSim>): void {
  sim.setParams({ autoRun: true });
}

describe('single-loop simulation', () => {
  it('uses front-edge x: enter 0–1, inside 1–4, exit 4–5', () => {
    expect(regionAt(-0.5)).toBe('before');
    expect(regionAt(0)).toBe('entering');
    expect(regionAt(0.5)).toBe('entering');
    expect(regionAt(1)).toBe('inside');
    expect(regionAt(2.5)).toBe('inside');
    expect(regionAt(4)).toBe('inside');
    expect(regionAt(4.01)).toBe('exiting');
    expect(regionAt(4.5)).toBe('exiting');
    expect(regionAt(5)).toBe('after');
    expect(regionLabel('inside')).toBe('匀速区');
  });

  it('matches hand-calculated v and I on the default cover point', () => {
    // k = B²d²/(mR) = 1.5² × 1.2² / (2×2) = 2.25 × 1.44 / 4 = 0.81
    // v(x) = 10 − 0.81·Δx_enter − 0.81·Δx_exit
    expect(velocityAtPosition(DEFAULT, -0.5)).toBeCloseTo(10, 10);
    expect(velocityAtPosition(DEFAULT, 0)).toBeCloseTo(10, 10);
    expect(velocityAtPosition(DEFAULT, 0.5)).toBeCloseTo(9.595, 10);
    expect(velocityAtPosition(DEFAULT, 1)).toBeCloseTo(9.19, 10);
    expect(velocityAtPosition(DEFAULT, 2.5)).toBeCloseTo(9.19, 10);
    expect(velocityAtPosition(DEFAULT, 4)).toBeCloseTo(9.19, 10);
    expect(velocityAtPosition(DEFAULT, 4.5)).toBeCloseTo(8.785, 10);
    expect(velocityAtPosition(DEFAULT, 5)).toBeCloseTo(8.38, 10);
    // I = ±Bdv/R, Bd/R = 1.5×1.2/2 = 0.9; enter +, inside 0, exit −
    expect(currentAtPosition(DEFAULT, -0.5)).toBe(0);
    expect(currentAtPosition(DEFAULT, 0)).toBeCloseTo(9, 10);
    expect(currentAtPosition(DEFAULT, 0.5)).toBeCloseTo(8.6355, 10);
    expect(currentAtPosition(DEFAULT, 1)).toBe(0);
    expect(currentAtPosition(DEFAULT, 4)).toBe(0);
    expect(currentAtPosition(DEFAULT, 4.5)).toBeCloseTo(-7.9065, 10);
    expect(currentAtPosition(DEFAULT, 5)).toBe(0);
  });

  it('keeps v continuous and I jumping at x=1 and x=4', () => {
    const eps = 1e-8;
    expect(velocityAtPosition(DEFAULT, 1 - eps)).toBeCloseTo(
      velocityAtPosition(DEFAULT, 1 + eps),
      6
    );
    expect(velocityAtPosition(DEFAULT, 4 - eps)).toBeCloseTo(
      velocityAtPosition(DEFAULT, 4 + eps),
      6
    );
    expect(currentAtPosition(DEFAULT, 1 - eps)).toBeGreaterThan(8);
    expect(currentAtPosition(DEFAULT, 1 + eps)).toBe(0);
    expect(currentAtPosition(DEFAULT, 4 - eps)).toBe(0);
    expect(currentAtPosition(DEFAULT, 4 + eps)).toBeLessThan(-8);
    expect(overlapAt(1)).toBeCloseTo(1, 10);
    expect(overlapAt(4)).toBeCloseTo(1, 10);
    expect(overlapAt(0.5)).toBeCloseTo(0.5, 10);
    expect(overlapAt(4.5)).toBeCloseTo(0.5, 10);
  });

  it('steepens the v-x slope when B rises or m/R fall', () => {
    // Independent k = B²d²/(mR); d=1.2 so d²=1.44
    const slope = (p: SingleLoopParams) =>
      velocityAtPosition(p, 0) - velocityAtPosition(p, 1);
    expect(slope(DEFAULT)).toBeCloseTo(0.81, 10);
    expect(slope({ ...DEFAULT, fieldStrength: 3 })).toBeCloseTo(3.24, 10); // 3²×1.44/4
    expect(slope({ ...DEFAULT, mass: 1 })).toBeCloseTo(1.62, 10); // /2
    expect(slope({ ...DEFAULT, resistance: 1 })).toBeCloseTo(1.62, 10);
    expect(slope({ ...DEFAULT, fieldStrength: 1 })).toBeCloseTo(0.36, 10);
    const mild = { ...DEFAULT, fieldStrength: 1, mass: 2, resistance: 4 };
    const strong = { ...DEFAULT, fieldStrength: 2, mass: 1, resistance: 1 };
    expect(slope(strong)).toBeGreaterThan(slope(mild));
  });

  it('shares one physical state among position, v, I, region and both graphs', () => {
    const sim = createSingleLoopSim({ autoRun: false });
    for (const x of [0, 0.5, 1, 2.5, 4, 4.5, 5]) {
      sim.setPosition(x);
      const s = sim.getState();
      expect(s.position).toBeCloseTo(x, 10);
      expect(s.velocity).toBeCloseTo(velocityAtPosition(s.params, x), 12);
      expect(s.current).toBeCloseTo(currentAtPosition(s.params, x), 12);
      expect(s.region).toBe(regionAt(x));
    }
    const vLine = vxPolyline(DEFAULT);
    const iLine = ixPolyline(DEFAULT);
    expect(vLine[0]).toEqual({ x: 0, y: 10 });
    expect(vLine.some((p) => p.x === 1 && Math.abs(p.y - 9.19) < 1e-9)).toBe(
      true
    );
    expect(iLine[0]?.y).toBeCloseTo(9, 10);
    expect(iLine.some((p) => p.y < -8)).toBe(true);
  });

  it('stops at the v=0 entering stall and keeps I=0 there', () => {
    // v0=2, B=3, m=0.5, R=0.5 → k=9×1.44/0.25=51.84; x_stall=2/51.84
    const sim = createSingleLoopSim({
      initialVelocity: 2,
      fieldStrength: 3,
      mass: 0.5,
      resistance: 0.5,
      autoRun: true
    });
    sim.setPosition(0);
    sim.step(4);
    const s = sim.getState();
    expect(s.position).toBeCloseTo(2 / 51.84, 6);
    expect(s.velocity).toBeCloseTo(0, 5);
    expect(s.current).toBeCloseTo(0, 8);
    expect(s.region).toBe('entering');
    expect(s.finished).toBe(true);
    expect(s.params.autoRun).toBe(false);
    expect(stallPosition(s.params)).toBeCloseTo(2 / 51.84, 10);
  });

  it('rewinds to the start when B/m/R/v0 change instead of jumping to the new stall', () => {
    // Repro: x=3 under defaults, then k=51.84 so stall≈0.03858. Clamping x
    // onto that stall would teleport the loop backward; restart instead.
    const sim = createSingleLoopSim({ autoRun: true });
    sim.setPosition(3);
    expect(sim.getState().region).toBe('inside');
    expect(sim.getState().position).toBeCloseTo(3, 10);
    sim.setParams({
      initialVelocity: 2,
      fieldStrength: 3,
      mass: 0.5,
      resistance: 0.5
    });
    const s = sim.getState();
    expect(s.position).toBeCloseTo(C.startPosition, 10);
    expect(s.position).not.toBeCloseTo(2 / 51.84, 3);
    expect(s.time).toBe(0);
    expect(s.params.autoRun).toBe(true);
    expect(s.region).toBe('before');
    expect(s.velocity).toBeCloseTo(2, 10);
    expect(s.current).toBe(0);
    expect(s.velocity).toBeCloseTo(
      velocityAtPosition(s.params, s.position),
      12
    );
    expect(s.current).toBeCloseTo(currentAtPosition(s.params, s.position), 12);
  });

  it('keeps x when only autoRun changes, and setPosition still clamps to stall', () => {
    const sim = createSingleLoopSim({ autoRun: false });
    sim.setPosition(3);
    sim.setParams({ autoRun: true });
    expect(sim.getState().position).toBeCloseTo(3, 10);
    expect(sim.getState().params.autoRun).toBe(true);
    sim.setParams({ autoRun: false });
    expect(sim.getState().position).toBeCloseTo(3, 10);

    sim.setParams({
      initialVelocity: 2,
      fieldStrength: 3,
      mass: 0.5,
      resistance: 0.5,
      autoRun: false
    });
    expect(sim.getState().position).toBeCloseTo(C.startPosition, 10);
    sim.setPosition(3);
    expect(sim.getState().position).toBeCloseTo(2 / 51.84, 6);
    expect(sim.getState().velocity).toBeCloseTo(0, 10);
    expect(sim.getState().velocity).toBeCloseTo(
      velocityAtPosition(sim.getParams(), sim.getState().position),
      12
    );
  });

  it('advances x(t) with the closed-form enter-then-coast solution', () => {
    // From x=0: t_enter = −ln(1 − kL/v0)/k = −ln(0.919)/0.81
    // ln(0.919) = −0.084469 by ln(1−0.081) series → t=0.104283 s
    const sim = createSingleLoopSim({ autoRun: true });
    sim.setPosition(0);
    sim.step(0.104283);
    expect(sim.getState().position).toBeCloseTo(1, 3);
    expect(sim.getState().region).toBe('inside');
    expect(sim.getState().velocity).toBeCloseTo(9.19, 3);
    expect(sim.getState().current).toBe(0);
  });

  it('keeps one large dt identical to many small steps', () => {
    const a = createSingleLoopSim({ autoRun: true });
    const b = createSingleLoopSim({ autoRun: true });
    a.setPosition(0);
    b.setPosition(0);
    a.step(0.2);
    for (let i = 0; i < 20; i += 1) b.step(0.01);
    expect(a.getState().position).toBeCloseTo(b.getState().position, 6);
    expect(a.getState().velocity).toBeCloseTo(b.getState().velocity, 6);
    expect(a.getState().current).toBeCloseTo(b.getState().current, 6);
    expect(a.getState().region).toBe(b.getState().region);
    // t=0.2: 0.104283 enter + 0.095717×9.19 coast → x≈1.8796
    expect(a.getState().position).toBeCloseTo(1.8796, 3);
  });

  it('does not move while paused and ignores a stored Euler velocity', () => {
    const sim = createSingleLoopSim({ autoRun: false });
    const x0 = sim.getState().position;
    sim.step(1);
    expect(sim.getState().position).toBe(x0);
    live(sim);
    sim.step(0.05);
    const moving = sim.getState();
    expect(moving.position).toBeGreaterThan(x0);
    expect(moving.velocity).toBeCloseTo(
      velocityAtPosition(moving.params, moving.position),
      12
    );
    expect(advancePosition(DEFAULT, 0, 0.05)).toBeGreaterThan(0);
  });
});

describe('single-loop scene entry and URL', () => {
  it('exposes readout keys, graph attach, and toolbar transport', () => {
    const scene = createSingleLoopScene();
    scene.init();
    const keys = scene.getReadoutItems().map((item) => item.key);
    expect(keys).toEqual(['region', 'position', 'velocity', 'current']);
    expect(scene.getReadoutItems()[0]?.value).toBe('未进入');
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.startAll();
    expect(scene.getParams().autoRun).toBe(true);
    scene.pauseAll();
    expect(scene.getParams().autoRun).toBe(false);
    expect(typeof scene.attachGraphCanvas).toBe('function');
    scene.dispose();
  });

  it('applies URL sliders and autoRun, then reset restores defaults', () => {
    const scene = createSingleLoopScene();
    window.history.replaceState(
      {},
      '',
      '/src/pages/single-loop.html?fieldStrength=2.5&mass=1&autoRun=1'
    );
    applySceneUrlParams(singleLoopMeta, {
      scene,
      controls: {
        setValue() {},
        setActive() {}
      },
      mount: document.createElement('div'),
      scheduleRender: () => scene.render()
    });
    expect(scene.getParams().fieldStrength).toBe(2.5);
    expect(scene.getParams().mass).toBe(1);
    expect(scene.getParams().autoRun).toBe(true);
    expect(scene.getState().position).toBeCloseTo(C.startPosition, 10);
    expect(scene.getState().time).toBe(0);
    scene.reset();
    expect(scene.getParams().fieldStrength).toBe(1.5);
    expect(scene.getParams().mass).toBe(2);
    expect(scene.getParams().initialVelocity).toBe(10);
    expect(scene.getParams().autoRun).toBe(false);
    expect(scene.getState().position).toBeCloseTo(C.startPosition, 10);
    scene.dispose();
  });

  it('toolbar reset and play write URL while keeping audit params', async () => {
    const scene = createSingleLoopScene();
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
      '/src/pages/single-loop.html?fieldStrength=2&mass=3&autoRun=0&audit=1'
    );
    pageScene.setParams({
      fieldStrength: 2,
      mass: 3,
      autoRun: false
    });
    pageScene.reset();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
    let url = new URL(window.location.href);
    expect(url.searchParams.get('fieldStrength')).toBe('1.5');
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
    expect(new URL(window.location.href).searchParams.get('audit')).toBe('1');
    window.history.replaceState({}, '', '/');
    scene.dispose();
  });
});
