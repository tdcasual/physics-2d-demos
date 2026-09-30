import { describe, expect, it } from 'vitest';
import {
  calculateTrajectory,
  chargeSign,
  circleCenter,
  clampLaunchAngle,
  createDynamicCircleSim,
  criticalRadiusFor,
  dynamicCircleConstants,
  insideField,
  orbitPoint,
  orbitRadius,
  pointerToBaseNorm,
  sourceFor,
  stageTransform,
  tabDefaults,
  vectorFromAngle,
  type DynamicCircleParams
} from '../../src/scenes/dynamic-circle/scene.sim';

const C = dynamicCircleConstants;
const TABLET_OVERLAY = {
  floatingReadout: true as const,
  overlayPx: 245,
  overlayTopPx: 60,
  overlayHeightPx: 374
};

const straightDefaults = {
  tab: 'scaling' as const,
  boundary: 'straight' as const,
  B: 0.1,
  v: 11.5,
  theta: -90,
  y0: 330,
  xBound: 480,
  triX: 480,
  triH: 300,
  circleR: 120,
  circleX: 380,
  circleY: 330,
  autoSweep: false,
  showCenter: true
};

function heading(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

describe('dynamic-circle sim', () => {
  it('uses R = v / |B| with q/m = 1 (hand: 11.5 / 0.1 = 115)', () => {
    expect(orbitRadius(11.5, 0.1)).toBeCloseTo(115, 8);
    expect(orbitRadius(11.5, -0.1)).toBeCloseTo(115, 8);
    expect(orbitRadius(15, 0.1)).toBeCloseTo(150, 8);
    expect(Number.isFinite(orbitRadius(12, 0))).toBe(false);
  });

  it('places the center perpendicular to velocity for B > 0', () => {
    // θ = -90° (up in SVG): v = (0, −1); +q, B into page → center to the left.
    expect(circleCenter({ x: 250, y: 330 }, 115, -90, 0.1)).toEqual({
      x: 135,
      y: 330
    });
    expect(orbitPoint({ x: 250, y: 330 }, 115, -90, 0.1, 0)).toEqual({
      x: 250,
      y: 330
    });
  });

  it('reproduces the initial rotating-circle tangent', () => {
    // R = 15 / 0.1 = 150, θ = 0, ds = 1.5 → Δφ = 1.5/150 = 0.01 rad.
    const point = orbitPoint({ x: 300, y: 330 }, 150, 0, 0.1, 1.5);
    expect(point.x).toBeCloseTo(301.499975, 5);
    expect(point.y).toBeCloseTo(329.9925, 5);
  });

  it('reverses curvature when B reverses', () => {
    const inward = orbitPoint({ x: 300, y: 330 }, 150, 0, 0.1, 30);
    const outward = orbitPoint({ x: 300, y: 330 }, 150, 0, -0.1, 30);
    expect(inward.y).toBeLessThan(330);
    expect(outward.y).toBeGreaterThan(330);
    expect(chargeSign(0.1)).toBe(1);
    expect(chargeSign(-0.1)).toBe(-1);
    expect(vectorFromAngle(5, 90).x).toBeCloseTo(0, 8);
  });

  it('keeps scaling on a Lorentz circle, not a faked vertical parabola', () => {
    const sim = createDynamicCircleSim(straightDefaults);
    const state = sim.getState();
    expect(state.radius).toBeCloseTo(115, 8);
    expect(state.center).not.toBeNull();
    const first = state.trajectory[1];
    const circular = orbitPoint(state.source, 115, -90, 0.1, 1.5);
    expect(first.x).toBeCloseTo(circular.x, 5);
    expect(first.y).toBeCloseTo(circular.y, 5);
    expect(first.x).toBeLessThan(250);
    expect(
      Math.hypot(first.x - state.center!.x, first.y - state.center!.y)
    ).toBeCloseTo(115, 5);
    // After the first Lorentz step the particle has left the strip, so the
    // rest of the path is a straight tangent — not a quadratic fake.
    const pts = state.trajectory;
    expect(heading(pts[3], pts[8])).toBeCloseTo(heading(pts[8], pts[13]), 5);
  });

  it('clips at the straight boundary and continues in a straight line', () => {
    const params: DynamicCircleParams = {
      ...straightDefaults,
      tab: 'rotating',
      theta: 0,
      v: 15,
      xBound: 400
    };
    const sim = createDynamicCircleSim(params);
    const state = sim.getState();
    // R = 15/0.1 = 150; source (300, 330); far wall x = 400.
    expect(state.radius).toBeCloseTo(150, 8);
    expect(state.exitPoint).not.toBeNull();
    expect(state.status).toBe('飞出磁场');
    const pts = state.trajectory;
    const exitAt = pts.findIndex((p) => p.x > 400 || p.y < 80 || p.x < 250);
    expect(exitAt).toBeGreaterThan(2);
    const a = pts[exitAt + 4];
    const b = pts[exitAt + 8];
    const c = pts[exitAt + 12];
    expect(a && b && c).toBeTruthy();
    if (!a || !b || !c) return;
    expect(heading(a, b)).toBeCloseTo(heading(b, c), 5);
    const inside = pts.filter((p) => insideField(p, sim.getParams()));
    for (const p of inside.slice(1, -1)) {
      expect(
        Math.hypot(p.x - state.center!.x, p.y - state.center!.y)
      ).toBeCloseTo(150, 12); // 圆上点到圆心，maxΔ≈6e-14
    }
  });

  it('treats the triangle base as full height on the left wall', () => {
    const sim = createDynamicCircleSim({
      ...straightDefaults,
      boundary: 'triangle',
      triX: 480,
      triH: 300
    });
    const p = sim.getParams();
    // Base at x = 250 has half-height 150, so y = 200 is inside.
    expect(insideField({ x: 250, y: 200 }, p)).toBe(true);
    expect(insideField({ x: 250, y: 330 }, p)).toBe(true);
    expect(insideField({ x: 480, y: 330 }, p)).toBe(true);
    // Near the vertex the allowed band shrinks — y = 200 is outside.
    expect(insideField({ x: 470, y: 200 }, p)).toBe(false);
    expect(insideField({ x: 240, y: 330 }, p)).toBe(false);
  });

  it('enters a circular field from outside then curves', () => {
    const sim = createDynamicCircleSim({
      ...straightDefaults,
      tab: 'rotating',
      theta: 0,
      v: 15,
      boundary: 'circle',
      circleX: 500,
      circleY: 330,
      circleR: 80
    });
    const p = sim.getParams();
    const source = sourceFor(p);
    expect(insideField(source, p)).toBe(false);
    const traj = calculateTrajectory(source, 0, 150, 0.1, p);
    const first = traj.points[1];
    // straight_pre along +x before the circle at x = 420.
    expect(first.y).toBeCloseTo(330, 5);
    expect(first.x).toBeGreaterThan(300);
    expect(traj.exited || traj.points.some((pt) => insideField(pt, p))).toBe(
      true
    );
  });

  it('gives R_c = d for perpendicular entry and none when parallel', () => {
    // θ = 0, s = +1, sin 0 = 0 → R_c = d / 1 = 230 m (480 − 250).
    const headOn = createDynamicCircleSim({
      ...straightDefaults,
      tab: 'rotating',
      theta: 0,
      v: 15
    });
    expect(criticalRadiusFor(headOn.getParams())).toBeCloseTo(230, 8);
    expect(headOn.getState().criticalMetric).toBe('230.0 米');
    // θ = −90°, sin = −1 → 1 + s sin θ = 0 → 无边界相切.
    const parallel = createDynamicCircleSim(straightDefaults);
    expect(criticalRadiusFor(parallel.getParams())).toBeNull();
    expect(parallel.getState().criticalMetric).toBe('无边界相切');
    expect(parallel.getState().status).toBe('飞出磁场');
  });

  it('keeps a small in-field orbit marked as bound', () => {
    // v = 4, B = 0.1 → R = 40. Rotating source (300, 330) stays inside 250–480.
    const sim = createDynamicCircleSim({
      ...straightDefaults,
      tab: 'rotating',
      theta: 0,
      v: 4
    });
    const state = sim.getState();
    expect(state.radius).toBeCloseTo(40, 8);
    expect(state.status).toBe('束缚在内 (安全)');
    expect(state.exitPoint).toBeNull();
  });

  it('applies per-tab launch defaults and keeps sweep values bounded', () => {
    expect(tabDefaults('scaling')).toEqual({ v: 11.5, theta: -90, y0: 330 });
    expect(tabDefaults('rotating')).toEqual({ v: 15, theta: 0, y0: 330 });
    expect(tabDefaults('translating')).toEqual({ v: 15, theta: -90, y0: 330 });
    expect(tabDefaults('comprehensive')).toEqual({
      v: 15,
      theta: -90,
      y0: 330
    });
    const sim = createDynamicCircleSim({ tab: 'scaling', autoSweep: true });
    sim.step(1);
    expect(sim.getParams().v).toBeGreaterThanOrEqual(5);
    expect(sim.getParams().v).toBeLessThanOrEqual(23);
    sim.setTab('rotating');
    sim.step(1);
    expect(sim.getParams().theta).toBeGreaterThanOrEqual(-90);
    expect(sim.getParams().theta).toBeLessThanOrEqual(90);
    sim.setTab('translating');
    sim.step(1);
    expect(sim.getParams().y0).toBeGreaterThanOrEqual(180);
    expect(sim.getParams().y0).toBeLessThanOrEqual(480);
    sim.setTab('comprehensive');
    sim.step(1);
    expect(sim.getParams().v).toBeGreaterThanOrEqual(7);
    expect(sim.getParams().v).toBeLessThanOrEqual(22);
  });

  it('clamps controls and reset returns the reference defaults', () => {
    const sim = createDynamicCircleSim();
    sim.setParams({ B: 4, v: 99, y0: -1, circleR: 999, circleY: 10 });
    expect(sim.getParams()).toMatchObject({
      B: 0.25,
      v: 25,
      y0: 150,
      circleR: 200,
      circleY: 180
    });
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      tab: 'scaling',
      boundary: 'straight',
      B: 0.1,
      v: 11.5,
      theta: -90,
      circleY: 330,
      autoSweep: false,
      showCenter: true
    });
    expect(sim.getState().t).toBe(0);
  });

  it('treats 0 / "false" as autoSweep off so URL numeric 0 round-trips', () => {
    const offZero = createDynamicCircleSim({
      ...straightDefaults,
      autoSweep: 0 as unknown as boolean
    });
    expect(offZero.getParams().autoSweep).toBe(false);
    const offStr = createDynamicCircleSim({
      ...straightDefaults,
      autoSweep: 'false' as unknown as boolean
    });
    expect(offStr.getParams().autoSweep).toBe(false);
    const on = createDynamicCircleSim({
      ...straightDefaults,
      autoSweep: true
    });
    on.setParams({ autoSweep: 0 as unknown as boolean });
    expect(on.getParams().autoSweep).toBe(false);
    on.setParams({ showCenter: 0 as unknown as boolean });
    expect(on.getParams().showCenter).toBe(false);
  });

  it('snaps velocity-handle angles with SVG atan2(Δy, Δx), not a flipped y', () => {
    expect(clampLaunchAngle(55, 0)).toBeCloseTo(0, 8);
    expect(clampLaunchAngle(0, -55)).toBeCloseTo(-90, 8);
    expect(clampLaunchAngle(0, 55)).toBeCloseTo(90, 8);
    expect(clampLaunchAngle(-40, -10)).toBeCloseTo(-90, 8);
    const sim = createDynamicCircleSim({
      ...straightDefaults,
      tab: 'rotating',
      theta: 0,
      v: 15
    });
    // Drag above the gun (y < 330) must yield a negative θ (up), not +90.
    sim.moveHandle('velocity', 300 / 650, 280 / 660);
    expect(sim.getParams().theta).toBeLessThan(0);
  });

  it('fits desktop canvases so a floating overlay does not cover the 650 stage', () => {
    const t = stageTransform(971, 831, {
      floatingReadout: true,
      overlayPx: 212
    });
    expect(t.floatingReadout).toBe(true);
    expect(t.boxW).toBe(650);
    expect(t.offsetX).toBe(0);
    expect(650 * t.fit).toBeLessThanOrEqual(971 - 212 - 16 + 1e-6);
  });

  it('fits mobile canvases to 650×660 when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.fit).toBeCloseTo(Math.min(720 / 650, 500 / 660), 6);
    expect(t.offsetX).toBeCloseTo((720 - 650 * t.fit) / 2, 6);
  });

  it('inverts the stage transform; canvas-wide normalize misses the source', () => {
    const cssW = 971;
    const cssH = 831;
    const layout = { floatingReadout: true, overlayPx: 212 };
    const { fit, offsetX, offsetY } = stageTransform(cssW, cssH, layout);
    const sourceCssX = offsetX + 250 * fit;
    const sourceCssY = offsetY + 330 * fit;
    const n = pointerToBaseNorm(sourceCssX, sourceCssY, cssW, cssH, layout);
    expect(n.x * 650).toBeCloseTo(250, 6);
    expect(n.y * 660).toBeCloseTo(330, 6);
    const naiveX = (sourceCssX / cssW) * 650;
    expect(Math.abs(naiveX - 250)).toBeGreaterThan(20);
  });

  it('picks the straight-boundary handle in 650×660-normalized coordinates', () => {
    const sim = createDynamicCircleSim(straightDefaults);
    expect(sim.pickHandle(480 / 650, 75 / 660)).toBe('boundary');
    sim.setBoundary('triangle');
    expect(sim.pickHandle(480 / 650, 330 / 660)).toBe('triangle');
    sim.setBoundary('circle');
    expect(sim.pickHandle(380 / 650, 330 / 660)).toBe('circle-center');
    expect(sim.pickHandle((380 + 120) / 650, 330 / 660)).toBe('circle-radius');
  });

  it('does not crush 768 split-right into the left-of-overlay gutter', () => {
    const cssW = 520;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const gutterFit = (cssW - 245 - C.overlayGapPx) / C.baseWidth;
    expect(t.fit).toBeGreaterThan(gutterFit + 0.15);
    expect(C.baseWidth * t.fit).toBeGreaterThan(350);
    expect(t.offsetY + C.overlayClearTop * t.fit).toBeGreaterThanOrEqual(
      60 + 374 - 1e-6
    );
    expect(t.offsetX).toBeGreaterThan(0);
    expect(t.offsetX + C.baseWidth * t.fit).toBeLessThanOrEqual(cssW + 1e-6);
  });

  it('does not crush 900 split-right into the left-of-overlay gutter', () => {
    const cssW = 612;
    const cssH = 831;
    const t = stageTransform(cssW, cssH, TABLET_OVERLAY);
    const gutterFit = (cssW - 245 - C.overlayGapPx) / C.baseWidth;
    expect(t.fit).toBeGreaterThan(gutterFit + 0.05);
    expect(C.baseWidth * t.fit).toBeGreaterThan(380);
    expect(t.offsetY + C.overlayClearTop * t.fit).toBeGreaterThanOrEqual(
      60 + 374 - 1e-6
    );
  });

  it('keeps 1024+ split-right in the left overlay gutter', () => {
    const desktop = stageTransform(971, 831, TABLET_OVERLAY);
    expect(desktop.offsetX).toBe(0);
    expect(650 * desktop.fit).toBeLessThanOrEqual(971 - 245 - 16 + 1e-6);
    expect(desktop.fit).toBeCloseTo((971 - 245 - 16) / 650, 5);

    const at1024 = stageTransform(688, 831, TABLET_OVERLAY);
    expect(at1024.offsetX).toBe(0);
    expect(650 * at1024.fit).toBeLessThanOrEqual(688 - 245 - 16 + 1e-6);
    expect(at1024.fit).toBeCloseTo((688 - 245 - 16) / 650, 5);
  });

  it('inverts the tucked 768 transform so the source still maps', () => {
    const cssW = 520;
    const cssH = 831;
    const layout = TABLET_OVERLAY;
    const { fit, offsetX, offsetY } = stageTransform(cssW, cssH, layout);
    const sourceCssX = offsetX + 250 * fit;
    const sourceCssY = offsetY + 330 * fit;
    const n = pointerToBaseNorm(sourceCssX, sourceCssY, cssW, cssH, layout);
    expect(n.x * 650).toBeCloseTo(250, 6);
    expect(n.y * 660).toBeCloseTo(330, 6);
  });
});
