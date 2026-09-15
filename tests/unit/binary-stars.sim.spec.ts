import { describe, expect, it } from 'vitest';
import {
  binaryStarsConstants as C,
  binaryStarsForce,
  binaryStarsOmega,
  binaryStarsRadii,
  createBinaryStarsSim,
  hasFloatingReadout,
  stageLayoutFrom,
  stageTransform
} from '../../src/scenes/binary-stars/scene.sim';

const TABLET_OVERLAY = {
  floatingReadout: true as const,
  overlayPx: 245,
  overlayTopPx: 60,
  overlayHeightPx: 374
};

function massCenter(
  state: ReturnType<ReturnType<typeof createBinaryStarsSim>['getState']>
) {
  const { m1, m2 } = state.params;
  const total = m1 + m2;
  return {
    x: (m1 * state.position1.x + m2 * state.position2.x) / total,
    y: (m1 * state.position1.y + m2 * state.position2.y) / total
  };
}

describe('binary stars sim', () => {
  it('places each star by r = L · m_other / (m1+m2)', () => {
    // m1=4, m2=2, L=30 → r1=30·2/6=10, r2=30·4/6=20
    const { r1, r2 } = binaryStarsRadii(4, 2, 30);
    expect(r1).toBe(10);
    expect(r2).toBe(20);
    expect(r1 + r2).toBe(30);
    expect(4 * r1).toBe(2 * r2);

    // 质量比 1:4：重的走小圈。r1=30·4/5=24, r2=30·1/5=6
    const flipped = binaryStarsRadii(1, 4, 30);
    expect(flipped.r1).toBe(24);
    expect(flipped.r2).toBe(6);

    const equal = binaryStarsRadii(3, 3, 30);
    expect(equal.r1).toBe(15);
    expect(equal.r2).toBe(15);
  });

  it('uses one ω = √(G(m1+m2)/L³) and F = G m1 m2 / L²', () => {
    // G=1, M=6, L=30, L³=27000 → ω²=6/27000=1/4500, ω=1/√4500≈0.0149071
    expect(binaryStarsOmega(4, 2, 30)).toBeCloseTo(0.014907119, 8);
    // F=8/900=0.008888...
    expect(binaryStarsForce(4, 2, 30)).toBeCloseTo(0.008888889, 8);

    const sim = createBinaryStarsSim();
    const state = sim.getState();
    expect(state.omega).toBeCloseTo(0.014907119, 8);
    expect(state.force).toBeCloseTo(0.008888889, 8);
    // 引力提供向心力：F = m ω² r
    expect(state.params.m1 * state.omega ** 2 * state.r1).toBeCloseTo(
      state.force,
      8
    );
    expect(state.params.m2 * state.omega ** 2 * state.r2).toBeCloseTo(
      state.force,
      8
    );
  });

  it('keeps the center of mass fixed and the star spacing equal to L', () => {
    const sim = createBinaryStarsSim();
    for (const dt of [0, 0.4, 1.7, 3]) {
      sim.step(dt);
      const state = sim.getState();
      const cm = massCenter(state);
      expect(cm.x).toBeCloseTo(C.center.x, 8);
      expect(cm.y).toBeCloseTo(C.center.y, 8);
      const gap = Math.hypot(
        state.position2.x - state.position1.x,
        state.position2.y - state.position1.y
      );
      expect(gap).toBeCloseTo(state.params.distance * C.orbitScale, 8);
      expect(state.r1 + state.r2).toBeCloseTo(state.params.distance, 8);
    }
  });

  it('keeps velocity tangential and gravity pointing at the companion / CM', () => {
    const sim = createBinaryStarsSim();
    sim.step(0.8);
    const state = sim.getState();
    const rx1 = state.position1.x - C.center.x;
    const ry1 = state.position1.y - C.center.y;
    const rx2 = state.position2.x - C.center.x;
    const ry2 = state.position2.y - C.center.y;
    expect(rx1 * state.velocity1.x + ry1 * state.velocity1.y).toBeCloseTo(0, 8);
    expect(rx2 * state.velocity2.x + ry2 * state.velocity2.y).toBeCloseTo(0, 8);
    // 逆时针：r × v > 0
    expect(rx1 * state.velocity1.y - ry1 * state.velocity1.x).toBeGreaterThan(
      0
    );
    expect(rx2 * state.velocity2.y - ry2 * state.velocity2.x).toBeGreaterThan(
      0
    );

    const fx = state.position2.x - state.position1.x;
    const fy = state.position2.y - state.position1.y;
    const toCM1x = C.center.x - state.position1.x;
    const toCM1y = C.center.y - state.position1.y;
    expect(fx * toCM1y - fy * toCM1x).toBeCloseTo(0, 8);
    expect(fx * toCM1x + fy * toCM1y).toBeGreaterThan(0);
  });

  it('advances both stars with the same dθ when time steps', () => {
    const sim = createBinaryStarsSim();
    const before = sim.getState();
    const dt = 0.5;
    sim.step(dt);
    const after = sim.getState();
    expect(after.t).toBeCloseTo(dt, 8);
    expect(after.theta - before.theta).toBeCloseTo(
      before.omega * dt * C.timeScale,
      8
    );
    const angle = (state: typeof before, which: '1' | '2'): number => {
      const p = which === '1' ? state.position1 : state.position2;
      return Math.atan2(p.y - C.center.y, p.x - C.center.x);
    };
    const wrap = (value: number): number =>
      Math.atan2(Math.sin(value), Math.cos(value));
    expect(wrap(angle(after, '1') - angle(before, '1'))).toBeCloseTo(
      wrap(angle(after, '2') - angle(before, '2')),
      8
    );
    sim.step(-4);
    expect(sim.getState().t).toBeCloseTo(dt, 8);
  });

  it('clamps controls, pauses when autoRun is off, and resets phase', () => {
    const sim = createBinaryStarsSim({ m1: 99, m2: -1, distance: 99 });
    expect(sim.getParams()).toMatchObject({ m1: 8, m2: 1, distance: 40 });
    sim.setParams({ autoRun: false });
    const frozenT = sim.getState().t;
    const frozenTheta = sim.getState().theta;
    sim.step(2);
    expect(sim.getState().t).toBe(frozenT);
    expect(sim.getState().theta).toBe(frozenTheta);

    sim.setParams({ autoRun: 0 as never });
    expect(sim.getParams().autoRun).toBe(false);
    sim.setParams({ autoRun: '1' as never, showVectors: '0' as never });
    expect(sim.getParams()).toMatchObject({
      autoRun: true,
      showVectors: false
    });
    sim.step(2);
    expect(sim.getState().t).toBeCloseTo(2, 8);

    sim.reset();
    expect(sim.getState().t).toBe(0);
    expect(sim.getState().theta).toBe(C.phase);
    expect(sim.getParams()).toMatchObject({
      m1: 8,
      m2: 1,
      distance: 40,
      autoRun: true,
      showVectors: true
    });
  });

  it('keeps both stars readable at default and inverted mass ratios', () => {
    const sim = createBinaryStarsSim();
    const def = sim.getState();
    expect(def.r1).toBeLessThan(def.r2);
    expect(
      Math.hypot(def.position1.x - C.center.x, def.position1.y - C.center.y)
    ).toBeCloseTo(def.r1 * C.orbitScale, 8);

    sim.setParams({ m1: 1, m2: 4, distance: 30 });
    const inverted = sim.getState();
    expect(inverted.r1).toBe(24);
    expect(inverted.r2).toBe(6);
    expect(inverted.r1).toBeGreaterThan(inverted.r2);
  });
});

describe('binary stars stage transform', () => {
  it('fits canvases to 640×660 when readout is not floating', () => {
    const t = stageTransform(720, 500, { floatingReadout: false });
    expect(t.floatingReadout).toBe(false);
    expect(t.boxW).toBe(640);
    expect(t.boxH).toBe(660);
    expect(t.fit).toBeCloseTo(Math.min(720 / 640, 500 / 660), 6);
    expect(t.offsetX).toBeCloseTo((720 - 640 * t.fit) / 2, 6);
    expect(t.offsetY).toBeCloseTo((500 - 660 * t.fit) / 2, 6);
    expect(t.offsetX + 640 * t.fit).toBeLessThanOrEqual(720 + 1e-6);
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

  it('treats split-right as a floating readout', () => {
    const root = document.createElement('div');
    root.className = 'split-right-shell';
    root.setAttribute('data-testid', 'split-right-layout');
    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    document.body.appendChild(root);
    expect(hasFloatingReadout(canvas)).toBe(true);
    expect(stageLayoutFrom(canvas).floatingReadout).toBe(true);
    expect(stageLayoutFrom(canvas).overlayPx).toBe(C.overlayFallbackPx);
    root.remove();
  });

  it('keeps the 640 stage left of a desktop floating overlay', () => {
    const t = stageTransform(971, 831, {
      floatingReadout: true,
      overlayPx: 212
    });
    expect(t.floatingReadout).toBe(true);
    expect(t.offsetX).toBe(0);
    expect(640 * t.fit).toBeLessThanOrEqual(971 - 212 - 16 + 1e-6);
  });

  it('keeps default orbits inside the stage and below the transport band', () => {
    const sim = createBinaryStarsSim();
    const state = sim.getState();
    const top1 = state.position1.y - (12 + state.params.m1 * 2.4);
    const top2 = state.position2.y - (12 + state.params.m2 * 2.4);
    expect(Math.min(top1, top2)).toBeGreaterThan(C.transportClearY);
    expect(state.position1.x).toBeGreaterThan(0);
    expect(state.position1.x).toBeLessThan(C.baseWidth);
    expect(state.position2.x).toBeGreaterThan(0);
    expect(state.position2.x).toBeLessThan(C.baseWidth);

    const desktop = stageTransform(862, 651, TABLET_OVERLAY);
    expect(desktop.offsetX + C.baseWidth * desktop.fit).toBeLessThanOrEqual(
      862 - TABLET_OVERLAY.overlayPx - C.overlayGapPx + 1e-6
    );
  });

  it('centers a 390-wide mobile canvas without horizontal overflow', () => {
    const t = stageTransform(390, 520, { floatingReadout: false });
    expect(t.offsetX).toBeGreaterThanOrEqual(-1e-6);
    expect(t.offsetX + 640 * t.fit).toBeLessThanOrEqual(390 + 1e-6);
    expect(t.fit).toBeCloseTo(390 / 640, 6);
  });
});
