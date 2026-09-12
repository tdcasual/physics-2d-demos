import { describe, expect, it } from 'vitest';
import {
  arcLength,
  chordLength,
  createVtIntegralSim,
  trueAreaOf,
  vAt
} from '../../src/scenes/vt-integral/scene.sim';

describe('vt-integral sim', () => {
  it('reduces or keeps scene1 area error when rectangle count increases', () => {
    const sim = createVtIntegralSim({
      scene: 'scene1',
      rects: 4,
      method: 'mid',
      time: 5,
      curveKind: 'linear'
    });
    const before = sim.getSnapshot().metrics.absErr;
    sim.setRects(20);
    const after = sim.getSnapshot().metrics.absErr;
    expect(after).toBeLessThanOrEqual(before + 1e-6);
  });

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
