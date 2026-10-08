import { describe, expect, it } from 'vitest';
import {
  arcLength,
  chordLength,
  createVtIntegralSim,
  polygonPerimeter,
  trueAreaOf,
  vAt,
  VT_N_MAX,
  VT_N_MIN,
  type VtCurveKind,
  type VtMethod
} from '../../src/scenes/vt-integral/scene.sim';

function rectArea(
  kind: VtCurveKind,
  method: VtMethod,
  rects: number,
  time = 5
): number {
  return createVtIntegralSim({
    scene: 'scene1',
    curveKind: kind,
    method,
    rects,
    time
  }).getSnapshot().metrics.rectArea;
}

describe('vt-integral sim · 左/右端点夹逼（v = 0.5t, T = 5 s）', () => {
  // 手算：Δt = T/n，左端点 Σ 0.5·(iΔt)·Δt (i=0..n-1) = 0.25·Δt²·n(n−1)，
  // 右端点 i=1..n → 0.25·Δt²·n(n+1)；真值 ∫₀⁵ 0.5t dt = 6.25 m。
  it('true displacement is 6.25 m', () => {
    expect(trueAreaOf('linear', 5)).toBe(6.25);
  });

  it('n = 10: left 5.625 m, right 6.875 m', () => {
    expect(rectArea('linear', 'left', 10)).toBeCloseTo(5.625, 10);
    expect(rectArea('linear', 'right', 10)).toBeCloseTo(6.875, 10);
  });

  it('n = 50: left 6.125 m, right 6.375 m', () => {
    expect(rectArea('linear', 'left', 50)).toBeCloseTo(6.125, 10);
    expect(rectArea('linear', 'right', 50)).toBeCloseTo(6.375, 10);
  });

  it('left < true < right for increasing v(t), and signed error has matching sign', () => {
    for (const kind of ['linear', 'quadratic'] as const) {
      for (const n of [VT_N_MIN, 10, 23, VT_N_MAX]) {
        const truth = trueAreaOf(kind, 5);
        const left = createVtIntegralSim({
          curveKind: kind,
          method: 'left',
          rects: n
        }).getSnapshot().metrics;
        const right = createVtIntegralSim({
          curveKind: kind,
          method: 'right',
          rects: n
        }).getSnapshot().metrics;
        expect(left.rectArea).toBeLessThan(truth);
        expect(right.rectArea).toBeGreaterThan(truth);
        expect(left.signedErr).toBeLessThan(0);
        expect(right.signedErr).toBeGreaterThan(0);
      }
    }
  });

  it('quadratic v = 0.1t², n = 10: left 3.5625 m, right 4.8125 m (Σi² = 285 / 385)', () => {
    expect(rectArea('quadratic', 'left', 10)).toBeCloseTo(3.5625, 10);
    expect(rectArea('quadratic', 'right', 10)).toBeCloseTo(4.8125, 10);
    expect(trueAreaOf('quadratic', 5)).toBeCloseTo(125 / 30, 10);
  });

  it('error strictly decreases as n grows, matching |Δ| = 6.25/n for the linear case', () => {
    // 线性 v 的左/右端点误差恰为 v(T)·T/(2n) = 6.25/n：4→1.5625, 10→0.625, 20→0.3125, 50→0.125
    const ns = [4, 10, 20, 50];
    const expected = [1.5625, 0.625, 0.3125, 0.125];
    for (const method of ['left', 'right'] as const) {
      const errs = ns.map(
        (n) =>
          createVtIntegralSim({
            curveKind: 'linear',
            method,
            rects: n
          }).getSnapshot().metrics.absErr
      );
      errs.forEach((err, i) => expect(err).toBeCloseTo(expected[i], 10));
      for (let i = 1; i < errs.length; i += 1) {
        expect(errs[i]).toBeLessThan(errs[i - 1]);
      }
    }
    // 非线性（凸）曲线同样严格单调减小
    const quad = ns.map(
      (n) =>
        createVtIntegralSim({
          curveKind: 'quadratic',
          method: 'left',
          rects: n
        }).getSnapshot().metrics.absErr
    );
    for (let i = 1; i < quad.length; i += 1) {
      expect(quad[i]).toBeLessThan(quad[i - 1]);
    }
  });

  it('defaults to the left-endpoint rule with n = 10', () => {
    const { params, metrics } = createVtIntegralSim().getSnapshot();
    expect(params.method).toBe('left');
    expect(params.rects).toBe(10);
    expect(metrics.rectArea).toBeCloseTo(5.625, 10);
  });

  it('clamps n into [VT_N_MIN, VT_N_MAX] = [4, 50]', () => {
    const sim = createVtIntegralSim();
    sim.setRects(200);
    expect(sim.getSnapshot().params.rects).toBe(50);
    sim.setRects(1);
    expect(sim.getSnapshot().params.rects).toBe(4);
  });
});

describe('vt-integral sim · 重置一致性', () => {
  it('reset restores n = 10 for both rectangles and polygon sides, and the left rule', () => {
    const sim = createVtIntegralSim({ scene: 'scene3' });
    sim.setRects(20);
    sim.setMethod('right');
    sim.reset();
    const { params } = sim.getSnapshot();
    expect(params.rects).toBe(10);
    expect(params.circleN).toBe(10);
    expect(params.method).toBe('left');
    expect(params.scene).toBe('scene3');
  });

  it('polygon sides always equal the shared n', () => {
    const sim = createVtIntegralSim();
    sim.setCircleN(12);
    expect(sim.getSnapshot().params.rects).toBe(12);
    expect(sim.getSnapshot().params.circleN).toBe(12);
    sim.setRects(7);
    expect(sim.getSnapshot().params.circleN).toBe(7);
  });
});

describe('vt-integral sim · 割圆术', () => {
  it('inscribed polygon perimeter: n = 6 → 6, n = 4 → 4√2, increasing toward 2π', () => {
    expect(polygonPerimeter(6)).toBeCloseTo(6, 10);
    expect(polygonPerimeter(4)).toBeCloseTo(4 * Math.SQRT2, 10);
    expect(polygonPerimeter(50)).toBeLessThan(2 * Math.PI);
    expect(polygonPerimeter(50)).toBeGreaterThan(polygonPerimeter(10));
    const metrics = createVtIntegralSim({ rects: 6 }).getSnapshot().metrics;
    expect(metrics.polygonPerimeter).toBeCloseTo(6, 10);
    expect(metrics.circumferenceDiff).toBeCloseTo(2 * Math.PI - 6, 10);
  });
});

describe('vt-integral sim', () => {
  it('uses the selected v(t) for true area', () => {
    expect(vAt('constant', 5)).toBe(2);
    expect(vAt('linear', 4)).toBe(2);
    expect(vAt('quadratic', 5)).toBeCloseTo(2.5, 10);
    expect(vAt('sine', Math.PI / 2)).toBeCloseTo(1, 10);

    expect(trueAreaOf('constant', 5)).toBe(10);
    expect(trueAreaOf('linear', 5)).toBe(6.25);
    expect(trueAreaOf('quadratic', 5)).toBeCloseTo(125 / 30, 10);
    expect(trueAreaOf('sine', 5)).toBeCloseTo(1 - Math.cos(5), 10);

    const sim = createVtIntegralSim({
      scene: 'scene1',
      time: 5,
      curveKind: 'constant'
    });
    expect(sim.getSnapshot().metrics.trueArea).toBe(10);
    sim.setCurveKind('linear');
    expect(sim.getSnapshot().metrics.trueArea).toBe(6.25);
  });

  it('chord is shorter than arc, and they meet as A and B approach', () => {
    const amp = 0.45;
    const farChord = chordLength(0.15, 0.85, amp);
    const farArc = arcLength(0.15, 0.85, amp);
    expect(farChord).toBeLessThan(farArc);

    const nearChord = chordLength(0.49, 0.51, amp);
    const nearArc = arcLength(0.49, 0.51, amp);
    expect(nearChord / nearArc).toBeGreaterThan(0.995);

    const sim = createVtIntegralSim({
      scene: 'scene2',
      pointA: 0.2,
      pointB: 0.8
    });
    const far = sim.getSnapshot().metrics;
    expect(far.lineDistance).toBeLessThan(far.curveLength);
    sim.setPointA(0.48);
    sim.setPointB(0.52);
    const near = sim.getSnapshot().metrics;
    expect(near.lineDistance / near.curveLength).toBeGreaterThan(0.99);
  });
});
