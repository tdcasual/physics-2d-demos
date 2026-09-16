import { describe, expect, it } from 'vitest';
import { createUvtScene } from '../../src/scenes/uniformly-varied-motion/scene.entry';
import {
  createUvtSim,
  hasFloatingReadout,
  stageLayoutFrom,
  stageTransform,
  uvtAreaSegments,
  uvtCarX,
  uvtConstants as C,
  uvtDisplacement,
  uvtVelocity,
  uvtZeroCrossingTime,
  wrapUvtTime
} from '../../src/scenes/uniformly-varied-motion/scene.sim';

function trapArea(segment: ReturnType<typeof uvtAreaSegments>[number]): number {
  const t0 = segment.points[0]!.t;
  const t1 = segment.points[3]!.t;
  const v0 = segment.points[1]!.v;
  const v1 = segment.points[2]!.v;
  return 0.5 * (v0 + v1) * (t1 - t0);
}

describe('uniformly varied motion sim', () => {
  it('matches v = v0 + a t and x = v0 t + 1/2 a t^2', () => {
    // v0=10, a=-2, t=5 → v=0, x=10·5 + ½(−2)·25 = 50 − 25 = 25
    expect(uvtVelocity(10, -2, 5)).toBe(0);
    expect(uvtDisplacement(10, -2, 5)).toBe(25);

    // t=0 keeps rest values
    expect(uvtVelocity(10, -3, 0)).toBe(10);
    expect(uvtDisplacement(10, -3, 0)).toBe(0);

    // v0=10, a=-3, t=10 → v=10−30=−20, x=100 + ½(−3)·100 = 100−150=−50
    expect(uvtVelocity(10, -3, 10)).toBe(-20);
    expect(uvtDisplacement(10, -3, 10)).toBe(-50);

    const sim = createUvtSim({ v0: 10, acceleration: -2 });
    sim.step(5);
    expect(sim.getState()).toMatchObject({
      time: 5,
      velocity: 0,
      displacement: 25,
      stopped: true
    });
  });

  it('keeps negative velocity and acceleration consistent with the formulas', () => {
    // reverse launch: v0=-8, a=-2, t=3 → v=-14, x=-8·3 + ½(−2)·9 = -24−9=-33
    expect(uvtVelocity(-8, -2, 3)).toBe(-14);
    expect(uvtDisplacement(-8, -2, 3)).toBe(-33);

    const sim = createUvtSim({ v0: -8, acceleration: -2 });
    sim.step(3);
    const state = sim.getState();
    expect(state.velocity).toBe(-14);
    expect(state.displacement).toBe(-33);
    expect(state.stopped).toBe(false);
    expect(uvtCarX(state.displacement)).toBeLessThan(C.trackOriginX);
  });

  it('splits algebraic area at the v=0 crossing and sums to displacement', () => {
    // v0=10, a=-2 → zero at t=5. t=8: +triangle 25, −triangle ½·3·6=9, net 16
    expect(uvtZeroCrossingTime(10, -2)).toBe(5);
    expect(uvtDisplacement(10, -2, 8)).toBe(16);
    const segs = uvtAreaSegments(10, -2, 8);
    expect(segs).toHaveLength(2);
    expect(segs[0]?.sign).toBe(1);
    expect(segs[1]?.sign).toBe(-1);
    expect(segs[0]?.points[2]?.t).toBeCloseTo(5, 8);
    expect(segs[1]?.points[0]?.t).toBeCloseTo(5, 8);
    expect(trapArea(segs[0]!) + trapArea(segs[1]!)).toBeCloseTo(16, 8);

    // all-negative: v0=-6, a=-2, t=4 → x=-6·4 + ½(−2)·16 = -24−16=-40
    const neg = uvtAreaSegments(-6, -2, 4);
    expect(neg).toHaveLength(1);
    expect(neg[0]?.sign).toBe(-1);
    expect(trapArea(neg[0]!)).toBeCloseTo(-40, 8);
    expect(uvtDisplacement(-6, -2, 4)).toBe(-40);

    // rest instant is a single triangle, not two segments
    const rest = uvtAreaSegments(10, -2, 5);
    expect(rest).toHaveLength(1);
    expect(trapArea(rest[0]!)).toBeCloseTo(25, 8);
    expect(uvtAreaSegments(10, -2, 0)).toEqual([]);
  });

  it('does not freeze auto-run when velocity crosses or hits zero', () => {
    const sim = createUvtSim({ v0: 10, acceleration: -2 });
    sim.step(5);
    expect(sim.getState().stopped).toBe(true);
    expect(sim.getState().velocity).toBe(0);
    sim.step(1);
    const after = sim.getState();
    expect(after.time).toBeCloseTo(6, 8);
    expect(after.velocity).toBe(-2);
    expect(after.displacement).toBe(24);
    expect(after.stopped).toBe(false);
    expect(uvtCarX(after.displacement)).not.toBe(C.trackOriginX);
  });

  it('keeps t = 10 s then wraps past the window, and ignores bad steps', () => {
    expect(wrapUvtTime(10)).toBe(10);
    expect(wrapUvtTime(10.25)).toBeCloseTo(0.25, 8);
    expect(wrapUvtTime(-0.5)).toBeCloseTo(9.5, 8);
    const sim = createUvtSim();
    sim.step(10);
    expect(sim.getState().time).toBe(10);
    sim.step(0.25);
    expect(sim.getState().time).toBeCloseTo(0.25, 8);
    const frozen = sim.getState().time;
    sim.step(Number.NaN);
    sim.step(-2);
    expect(sim.getState().time).toBe(frozen);
  });

  it('pauses on autoRun, steps a fixed frame while paused, then resumes', () => {
    const sim = createUvtSim({ v0: 10, acceleration: -3 });
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(1, 8);
    sim.setParams({ autoRun: false });
    sim.step(2);
    expect(sim.getState().time).toBeCloseTo(1, 8);
    sim.stepFrame(C.frameDt);
    expect(sim.getState().time).toBeCloseTo(1 + C.frameDt, 8);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(1 + C.frameDt + 0.5, 8);
  });

  it('keeps time when v0 or a change and remaps v, x at that instant', () => {
    const sim = createUvtSim({ v0: 10, acceleration: -2 });
    sim.step(4);
    sim.setParams({ v0: 6, acceleration: 1 });
    const state = sim.getState();
    expect(state.time).toBeCloseTo(4, 8);
    // v=6+1·4=10, x=6·4 + ½·1·16=24+8=32
    expect(state.velocity).toBe(10);
    expect(state.displacement).toBe(32);
  });

  it('clamps v0 and a, normalizes flags, and resets to construction defaults', () => {
    const sim = createUvtSim({
      v0: 99,
      acceleration: -99,
      autoRun: 0 as unknown as boolean,
      showArea: 'false' as unknown as boolean
    });
    expect(sim.getParams()).toMatchObject({
      v0: 20,
      acceleration: -4,
      autoRun: false,
      showArea: false
    });
    sim.setParams({
      v0: -40,
      acceleration: 9,
      autoRun: '1' as unknown as boolean,
      showArea: 0 as unknown as boolean
    });
    expect(sim.getParams()).toMatchObject({
      v0: -10,
      acceleration: 4,
      autoRun: true,
      showArea: false
    });
    sim.step(2);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      v0: 20,
      acceleration: -4,
      autoRun: false,
      showArea: false
    });
    expect(sim.getState().time).toBe(0);
    expect(sim.getSnapshot()).toEqual(sim.getState());
  });

  it('scales car pose for teaching without changing the x readout', () => {
    const sim = createUvtSim({ v0: 10, acceleration: -3 });
    sim.step(10);
    const state = sim.getState();
    expect(state.displacement).toBe(-50);
    const x = uvtCarX(state.displacement);
    expect(x).toBeCloseTo(C.trackOriginX + -50 * C.trackScale, 8);
    expect(x).toBeGreaterThan(C.trackStartX);
    expect(x).toBeLessThan(C.trackEndX);
    expect(uvtCarX(400)).toBeLessThanOrEqual(C.trackEndX - C.carBodyWidth / 2);
    expect(uvtCarX(-400)).toBeGreaterThanOrEqual(
      C.trackStartX + C.carBodyWidth / 2
    );
  });
});

describe('uniformly varied motion entry readout', () => {
  it('reports t, v, x, rest status and the two formulas', () => {
    const canvas = document.createElement('canvas');
    const scene = createUvtScene({ canvas });
    scene.setParams({ v0: 10, acceleration: -2, autoRun: false });
    scene.stepFrame(5);
    const items = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(items.time).toBe('5.00 s');
    expect(items.velocity).toBe('0.00 m/s');
    expect(items.displacement).toBe('25.00 m');
    expect(items.status).toBe('瞬时静止');
    expect(items.formulaV).toBe('v₀ + at');
    expect(items.formulaX).toBe('v₀t + ½at²');
    scene.stepFrame(1);
    const moving = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(moving.status).toBe('运动中');
    expect(moving.velocity).toBe('-2.00 m/s');
    scene.dispose();
  });
});

describe('uniformly varied motion stage transform', () => {
  it('places the v=0 axis at the graph mid-line and keeps the plot range', () => {
    expect(C.graphAxisY).toBe((C.graphTop + C.graphBottom) / 2);
    expect(C.graphMaxV).toBe(40);
    expect(C.graphMaxT).toBe(10);
    expect(C.graphBottom).toBeLessThan(C.baseHeight - 40);
    expect(C.trackY - C.carBodyHeight - C.carAccelOffsetY).toBeGreaterThan(
      C.transportClearY
    );
  });

  it('fits 800×640 when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(800);
    expect(t.boxH).toBe(640);
    expect(t.fit).toBeCloseTo(Math.min(720 / 800, 500 / 640), 6);
    expect(t.offsetX).toBeCloseTo((720 - 800 * t.fit) / 2, 6);
    expect(t.offsetY).toBeCloseTo((500 - 640 * t.fit) / 2, 6);
  });

  it('treats mobile-stack as a non-floating readout', () => {
    const root = document.createElement('div');
    root.className = 'mobile-stack-layout';
    root.setAttribute('data-testid', 'mobile-stack-layout');
    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    document.body.appendChild(root);
    expect(hasFloatingReadout(canvas)).toBe(false);
    expect(stageLayoutFrom(canvas)).toEqual({
      floatingReadout: false,
      overlayPx: 0
    });
    root.remove();
  });

  it('keeps the stage left of a desktop floating overlay', () => {
    const root = document.createElement('div');
    root.className = 'split-right-shell';
    root.setAttribute('data-testid', 'split-right-layout');
    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    document.body.appendChild(root);
    expect(hasFloatingReadout(canvas)).toBe(true);
    expect(stageLayoutFrom(canvas).overlayPx).toBe(C.overlayFallbackPx);
    const t = stageTransform(971, 831, {
      floatingReadout: true,
      overlayPx: 228,
      overlayTopPx: 60,
      overlayHeightPx: 374
    });
    expect(t.offsetX + t.boxW * t.fit).toBeLessThanOrEqual(971 - 228 + 1e-6);
    root.remove();
  });
});
