import { describe, expect, it } from 'vitest';
import { createDisplacementTimeScene } from '../../src/scenes/displacement-time/scene.entry';
import {
  carX,
  createDisplacementTimeSim,
  displacementAt,
  displacementTimeConstants as C,
  formulaTerms,
  hasFloatingReadout,
  signedVtArea,
  stageLayoutFrom,
  stageTransform,
  tapeTimes,
  velocityAt,
  vtAreaSegments,
  wrapDisplacementTime,
  zeroCrossingTime
} from '../../src/scenes/displacement-time/scene.sim';

function trapArea(segment: ReturnType<typeof vtAreaSegments>[number]): number {
  const t0 = segment.points[0]!.t;
  const t1 = segment.points[3]!.t;
  const v0 = segment.points[1]!.v;
  const v1 = segment.points[2]!.v;
  return 0.5 * (v0 + v1) * (t1 - t0);
}

describe('displacement-time simulation', () => {
  it('matches v = v0 + a t and x = v0 t + 1/2 a t^2', () => {
    expect(velocityAt(5, 4, 3.73)).toBeCloseTo(19.92, 2);
    expect(displacementAt(5, 4, 3.73)).toBeCloseTo(46.48, 2);
    const terms = formulaTerms(5, 4, 3.73);
    expect(terms.v0t).toBeCloseTo(18.65, 2);
    expect(terms.halfAt2).toBeCloseTo(27.83, 2);
    expect(terms.x).toBeCloseTo(46.48, 2);
    expect(terms.x).toBeCloseTo(terms.v0t + terms.halfAt2, 12);

    expect(velocityAt(5, 4, 0)).toBe(5);
    expect(displacementAt(5, 4, 0)).toBe(0);

    const sim = createDisplacementTimeSim({ v0: 5, acceleration: 4 });
    sim.step(3.73);
    const state = sim.getState();
    expect(state.time).toBeCloseTo(3.73, 6);
    expect(state.velocity).toBeCloseTo(19.92, 2);
    expect(state.displacement).toBeCloseTo(46.48, 2);
  });

  it('keeps signed v-t area equal to displacement, including a<0 and v=0 crossing', () => {
    expect(signedVtArea(5, 4, 3.73)).toBeCloseTo(displacementAt(5, 4, 3.73), 8);

    expect(zeroCrossingTime(5, -4)).toBeCloseTo(1.25, 8);
    expect(displacementAt(5, -4, 2)).toBe(2);
    const segs = vtAreaSegments(5, -4, 2);
    expect(segs).toHaveLength(2);
    expect(segs[0]?.sign).toBe(1);
    expect(segs[1]?.sign).toBe(-1);
    expect(segs[0]?.points[2]?.t).toBeCloseTo(1.25, 8);
    expect(segs[1]?.points[0]?.t).toBeCloseTo(1.25, 8);
    expect(trapArea(segs[0]!) + trapArea(segs[1]!)).toBeCloseTo(2, 8);
    expect(signedVtArea(5, -4, 2)).toBeCloseTo(2, 8);

    const rest = vtAreaSegments(5, -4, 1.25);
    expect(rest).toHaveLength(1);
    expect(trapArea(rest[0]!)).toBeCloseTo(displacementAt(5, -4, 1.25), 8);

    const neg = vtAreaSegments(-6, -2, 2);
    expect(neg).toHaveLength(1);
    expect(neg[0]?.sign).toBe(-1);
    expect(trapArea(neg[0]!)).toBeCloseTo(-16, 8);
    expect(displacementAt(-6, -2, 2)).toBe(-16);
    expect(signedVtArea(-6, -2, 2)).toBeCloseTo(-16, 8);

    expect(vtAreaSegments(5, 4, 0)).toEqual([]);
    expect(signedVtArea(5, 4, 0)).toBe(0);
  });

  it('keeps a = 0 as uniform motion', () => {
    expect(velocityAt(5, 0, 3)).toBe(5);
    expect(displacementAt(5, 0, 3)).toBe(15);
    expect(formulaTerms(5, 0, 3)).toEqual({ v0t: 15, halfAt2: 0, x: 15 });
    expect(zeroCrossingTime(5, 0)).toBeNull();
    const segs = vtAreaSegments(5, 0, 3);
    expect(segs).toHaveLength(1);
    expect(segs[0]?.sign).toBe(1);
    expect(trapArea(segs[0]!)).toBe(15);
    expect(signedVtArea(-4, 0, 2)).toBe(-8);
  });

  it('freezes while paused, steps a fixed frame, then resumes', () => {
    const sim = createDisplacementTimeSim({ v0: 5, acceleration: 4 });
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(1, 6);
    expect(sim.getState().displacement).toBeCloseTo(7, 6);
    sim.setParams({ autoRun: false });
    sim.step(1);
    expect(sim.getState().time).toBeCloseTo(1, 6);
    sim.stepFrame(C.frameDt);
    expect(sim.getState().time).toBeCloseTo(1 + C.frameDt, 8);
    sim.setParams({ autoRun: true });
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(1 + C.frameDt + 0.5, 8);
  });

  it('wraps the four-second timeline and ignores non-finite or non-positive steps', () => {
    expect(wrapDisplacementTime(4)).toBe(4);
    expect(wrapDisplacementTime(4.5)).toBeCloseTo(0.5, 8);
    expect(wrapDisplacementTime(-0.5)).toBeCloseTo(3.5, 8);
    expect(wrapDisplacementTime(Number.NaN)).toBe(0);
    const sim = createDisplacementTimeSim();
    sim.step(4);
    expect(sim.getState().time).toBe(4);
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 6);
    const frozen = sim.getState().time;
    sim.step(Number.NaN);
    sim.step(Number.POSITIVE_INFINITY);
    sim.step(-2);
    sim.step(0);
    expect(sim.getState().time).toBe(frozen);
  });

  it('keeps time when v0 or a change and remaps v, x at that instant', () => {
    const sim = createDisplacementTimeSim({ v0: 5, acceleration: 4 });
    sim.step(2);
    sim.setParams({ v0: -2, acceleration: 3 });
    const state = sim.getState();
    expect(state.time).toBeCloseTo(2, 8);
    expect(state.velocity).toBe(4);
    expect(state.displacement).toBe(2);
  });

  it('clamps v0 and a, normalizes flags, and resets to canonical defaults', () => {
    const sim = createDisplacementTimeSim({
      v0: 99,
      acceleration: -99,
      autoRun: 0 as unknown as boolean,
      showArea: 'false' as unknown as boolean
    });
    expect(sim.getParams()).toMatchObject({
      v0: 20,
      acceleration: -6,
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
      acceleration: 6,
      autoRun: true,
      showArea: false
    });
    sim.setParams({
      v0: Number.NaN,
      acceleration: Number.POSITIVE_INFINITY
    });
    expect(sim.getParams().v0).toBe(-10);
    expect(sim.getParams().acceleration).toBe(6);
    sim.step(2);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      v0: 5,
      acceleration: 4,
      autoRun: true,
      showArea: true
    });
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().velocity).toBe(5);
    expect(sim.getState().displacement).toBe(0);
    expect(sim.getSnapshot()).toEqual(sim.getState());
  });

  it('scales car pose for teaching without changing the x readout', () => {
    const sim = createDisplacementTimeSim({ v0: 5, acceleration: 4 });
    sim.step(3.73);
    const state = sim.getState();
    expect(state.displacement).toBeCloseTo(46.48, 2);
    const x = carX(state.displacement);
    expect(x).toBeGreaterThan(C.trackOriginX);
    expect(x).toBeGreaterThan(C.trackStartX);
    expect(x).toBeLessThan(C.trackEndX);
    expect(carX(400)).toBeLessThanOrEqual(C.trackEndX - C.carWidth / 2);
    expect(carX(-400)).toBeGreaterThanOrEqual(C.trackStartX + C.carWidth / 2);
    expect(carX(-20)).toBeLessThan(C.trackOriginX);
    expect(tapeTimes(3.73)).toHaveLength(18);
    expect(tapeTimes(0)).toEqual([]);
  });
});

describe('displacement-time entry readout', () => {
  it('reports t, v and x without formula cards', () => {
    const canvas = document.createElement('canvas');
    const scene = createDisplacementTimeScene({ canvas });
    scene.setParams({ v0: 5, acceleration: 4, autoRun: false });
    scene.stepFrame(3.73);
    const items = Object.fromEntries(
      scene.getReadoutItems().map((item) => [item.key, item.value])
    );
    expect(items.time).toBe('3.73 s');
    expect(items.velocity).toBe('19.92 m/s');
    expect(items.displacement).toBe('46.48 m');
    expect(Object.keys(items)).toEqual(['time', 'velocity', 'displacement']);
    scene.dispose();
  });
});

describe('displacement-time stage transform', () => {
  it('fits 880×680 when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(880);
    expect(t.boxH).toBe(680);
    expect(t.fit).toBeCloseTo(Math.min(720 / 880, 500 / 680), 6);
    expect(t.offsetX).toBeCloseTo((720 - 880 * t.fit) / 2, 6);
    expect(t.offsetY).toBeCloseTo((500 - 680 * t.fit) / 2, 6);
  });

  it('treats mobile-stack as a non-floating readout', () => {
    const root = document.createElement('div');
    root.className = 'mobile-stack-layout';
    root.setAttribute('data-readout-overlay', 'false');
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

  it('keeps the full animation stage above a docked-bottom readout', () => {
    const gap = C.overlayGapPx;
    const pose = stageTransform(1280, 423, {
      floatingReadout: true,
      overlayPx: 1280,
      overlayTopPx: 265,
      overlayHeightPx: 158
    });
    expect(pose.offsetY + pose.boxH * pose.fit).toBeLessThanOrEqual(
      265 - gap + 1e-6
    );
    expect(pose.offsetX + pose.boxW * pose.fit).toBeLessThanOrEqual(
      1280 + 1e-6
    );
  });

  it('keeps the stage left of a side overlay', () => {
    const pose = stageTransform(971, 831, {
      floatingReadout: true,
      overlayPx: 228,
      overlayTopPx: 60,
      overlayHeightPx: 374
    });
    expect(pose.offsetX + pose.boxW * pose.fit).toBeLessThanOrEqual(
      971 - 228 + 1e-6
    );
    expect(pose.fit).toBeGreaterThan(C.minReadableFit);
  });
});
