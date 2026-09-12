import { describe, expect, it } from 'vitest';
import {
  applyTapeOutliers,
  computeDeltaXCm,
  computeSuccessiveAMs2,
  computeVMs,
  countingPeriodS,
  createTickerTapeSim,
  DENSE_TICKS_BEFORE_ORIGIN,
  fitLine,
  fitLineDroppingOutliers,
  fitQuadratic,
  maxOriginTickIndex,
  xCmAt
} from '../../src/scenes/ticker-tape/scene.sim';

describe('ticker-tape kinematics helpers', () => {
  it('counting period is 0.1 s when every 5 ticks (50 Hz)', () => {
    // T = 5 × 1/50 s = 0.1 s（高考「相邻计数点间还有 4 个点未画出」）
    expect(countingPeriodS(5)).toBeCloseTo(0.1, 12);
    expect(countingPeriodS(1)).toBeCloseTo(0.02, 12);
  });

  it('2019 全国Ⅰ卷 22 题：尺读 x 求 v_C 与逐差 a', () => {
    // 尺读（cm）：A=0, B=1.20, C=3.15, D=5.85, E=9.30
    // T = 0.10 s
    // v_C = (x_D − x_B) / (2T) = 4.65 cm / 0.20 s = 0.2325 m/s → 0.233 m/s
    // a = (x_E − 2 x_C + x_A) / (4 T²) = 3.00 cm / 0.04 s² = 0.75 m/s²
    const xCm = [0, 1.2, 3.15, 5.85, 9.3];
    const T = 0.1;
    const v = computeVMs(xCm, T);
    expect(v[2]).not.toBeNull();
    expect(v[2] as number).toBeCloseTo(0.2325, 10);
    expect(computeSuccessiveAMs2(xCm, T)).toBeCloseTo(0.75, 10);
  });

  it('Δx is empty at column 0 and x_i − x_{i-1} afterwards', () => {
    const delta = computeDeltaXCm([0, 5, 12, 21]);
    expect(delta[0]).toBeNull();
    expect(delta[1]).toBe(5);
    expect(delta[2]).toBe(7);
    expect(delta[3]).toBe(9);
  });

  it('endpoints have no two-sided v', () => {
    const v = computeVMs([0, 5, 12, 21], 0.1);
    expect(v[0]).toBeNull();
    expect(v[v.length - 1]).toBeNull();
  });

  it('ua x(t)=100 t² cm is uniformly accelerated: Δx arithmetic with d = a T²', () => {
    // a = 2 m/s², T = 0.1 s → a T² = 0.02 m = 2 cm
    const originT = 0.2;
    const originX = xCmAt('ua', originT);
    const x = [0, 1, 2, 3, 4, 5, 6].map(
      (n) => xCmAt('ua', originT + n * 0.1) - originX
    );
    const d = computeDeltaXCm(x);
    const gaps = d.slice(1) as number[];
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i] - gaps[i - 1]).toBeCloseTo(2, 8);
    }
  });

  it('uniform Δx is constant; variable Δx is not arithmetic', () => {
    const originT = 0.2;
    const sample = (kind: 'uniform' | 'variable') => {
      const originX = xCmAt(kind, originT);
      return [0, 1, 2, 3, 4, 5, 6].map(
        (n) => xCmAt(kind, originT + n * 0.1) - originX
      );
    };
    const uni = computeDeltaXCm(sample('uniform')).slice(1) as number[];
    uni.forEach((g) => expect(g).toBeCloseTo(uni[0], 8));
    const vbl = computeDeltaXCm(sample('variable')).slice(1) as number[];
    const step = vbl[1] - vbl[0];
    expect(
      Math.abs(vbl[vbl.length - 1] - vbl[0] - step * (vbl.length - 1))
    ).toBeGreaterThan(0.5);
  });

  it('tape outliers displace some counting dots; off leaves kinematics', () => {
    const dots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({
      t: i * 0.02,
      xCm: i * 2
    }));
    const counting = [2, 4, 6, 8];
    const off = applyTapeOutliers(dots, counting, 'off', 1);
    expect(off.map((d) => d.xCm)).toEqual(dots.map((d) => d.xCm));
    const noisy = applyTapeOutliers(dots, counting, 'typical', 7);
    const moved = noisy.some((d, i) => d.xCm !== dots[i].xCm);
    expect(moved).toBe(true);
  });

  it('OLS fit of a line recovers slope; two points determine intercept', () => {
    // v = 0.4 + 2 t  → slope 2, intercept 0.4
    const pts = [0, 0.1, 0.2, 0.3].map((t) => ({ t, y: 0.4 + 2 * t }));
    const fit = fitLine(pts);
    expect(fit).not.toBeNull();
    expect(fit?.slope).toBeCloseTo(2, 10);
    expect(fit?.intercept).toBeCloseTo(0.4, 10);
  });

  it('quadratic fit recovers x = t² (匀加速 x–t 不是直线)', () => {
    // x = t² m  → a=1, b=0, c=0
    const pts = [0, 0.2, 0.4, 0.6].map((t) => ({ t, y: t * t }));
    const q = fitQuadratic(pts);
    expect(q).not.toBeNull();
    expect(q?.a).toBeCloseTo(1, 8);
    expect(q?.b).toBeCloseTo(0, 8);
    expect(q?.c).toBeCloseTo(0, 8);
  });

  it('v–t outlier is dropped so the line stays near the true slope', () => {
    // v = 0.2 + 2 t，其中一个点被抬高 0.4 m/s
    const pts = [0.1, 0.2, 0.3, 0.4, 0.5].map((t) => ({ t, y: 0.2 + 2 * t }));
    pts[2] = { t: 0.3, y: 0.2 + 2 * 0.3 + 0.4 };
    const { fit, outlierIndices } = fitLineDroppingOutliers(pts);
    expect(outlierIndices.length).toBeGreaterThan(0);
    expect(fit).not.toBeNull();
    expect(fit!.slope).toBeCloseTo(2, 1);
  });

  it('ua: counting gaps increase (最先打下的是点距小的一端)', () => {
    const originT = 0.2;
    const originX = xCmAt('ua', originT);
    const x = [0, 1, 2, 3, 4, 5, 6].map(
      (n) => xCmAt('ua', originT + n * 0.1) - originX
    );
    const gaps = computeDeltaXCm(x).slice(1) as number[];
    expect(gaps[0]).toBeLessThan(gaps[gaps.length - 1]);
  });

  it('ud x(t) stays increasing through the counting window (does not reverse)', () => {
    let prev = -1;
    for (let i = 0; i <= 40; i++) {
      const x = xCmAt('ud', i * 0.02);
      expect(x).toBeGreaterThan(prev);
      prev = x;
    }
  });

  it('ud: counting gaps decrease (最先打下的是点距大的一端)', () => {
    const originT = 0.2;
    const originX = xCmAt('ud', originT);
    const x = [0, 1, 2, 3, 4, 5, 6].map(
      (n) => xCmAt('ud', originT + n * 0.1) - originX
    );
    const gaps = computeDeltaXCm(x).slice(1) as number[];
    expect(gaps[0]).toBeGreaterThan(gaps[gaps.length - 1]);
  });

  it('noise off: ua v–t collinear with slope = a = 2 m/s²', () => {
    // ua: x = 100 t² cm = t² m ⇒ a = 2 m/s²。中间时刻 v 应落在 v = a t_mid。
    const originT = 0.2;
    const originX = xCmAt('ua', originT);
    const T = 0.1;
    const trueX = [0, 1, 2, 3, 4, 5, 6].map(
      (n) => xCmAt('ua', originT + n * T) - originX
    );
    const vOff = computeVMs(trueX, T);
    const ptsOff = vOff
      .map((v, i) => (v === null ? null : { t: originT + i * T, y: v }))
      .filter((p): p is { t: number; y: number } => p !== null);
    const fitOff = fitLine(ptsOff);
    expect(fitOff).not.toBeNull();
    const maxDevOff = Math.max(
      ...ptsOff.map((p) =>
        Math.abs(p.y - (fitOff!.slope * p.t + fitOff!.intercept))
      )
    );
    expect(maxDevOff).toBeLessThan(1e-9);
    expect(fitOff!.slope).toBeCloseTo(2, 6);
  });
});

describe('ticker-tape sim', () => {
  it('ua tape with countEvery=5 uses T=0.1 s and 7 counting points', () => {
    const sim = createTickerTapeSim({ tapeKind: 'ua', countEvery: 5 });
    const s = sim.getState();
    expect(s.T).toBeCloseTo(0.1, 12);
    expect(s.trueXCm).toHaveLength(7);
    expect(s.countingTickIndices).toHaveLength(7);
    expect(s.originTickIndex).toBeGreaterThan(0);
    expect(s.timingDots[s.originTickIndex]?.t).toBeCloseTo(0.2, 12);
  });

  it('table starts empty; fillFromRuler fills only x', () => {
    const sim = createTickerTapeSim({ tapeKind: 'ua', noise: 'off' });
    const empty = sim.getState();
    expect(empty.measuredXCm.every((x) => x === null)).toBe(true);
    expect(empty.deltaXCm.every((x) => x === null)).toBe(true);
    expect(empty.vMs.every((x) => x === null)).toBe(true);
    sim.fillFromRuler();
    const s = sim.getState();
    expect(s.measuredXCm).toEqual(s.tapeXCm);
    expect(s.deltaXCm.every((x) => x === null)).toBe(true);
    expect(s.vMs.every((x) => x === null)).toBe(true);
  });

  it('setMeasuredX does not auto-fill v or Δx', () => {
    const sim = createTickerTapeSim({ tapeKind: 'ua', noise: 'off' });
    sim.setMeasuredX(2, 12.4);
    const s = sim.getState();
    expect(s.measuredXCm[2]).toBe(12.4);
    expect(s.vMs.every((x) => x === null)).toBe(true);
    expect(s.deltaXCm.every((x) => x === null)).toBe(true);
  });

  it('playback starts at t=0 and finishes at tMax', () => {
    const sim = createTickerTapeSim({ tapeKind: 'ua', speed: 1 });
    sim.startPlayback();
    expect(sim.getState().t).toBe(0);
    expect(sim.getState().playing).toBe(true);
    sim.step(100);
    const s = sim.getState();
    expect(s.finished).toBe(true);
    expect(s.playing).toBe(false);
  });

  it('reset shows the full tape', () => {
    const sim = createTickerTapeSim({ tapeKind: 'uniform' });
    sim.startPlayback();
    sim.reset();
    const s = sim.getState();
    expect(s.t).toBeCloseTo(s.tMax, 8);
    expect(s.playing).toBe(false);
  });

  it('countEvery does not change tape geometry or counting indices', () => {
    const a = createTickerTapeSim({
      tapeKind: 'ua',
      countEvery: 5
    }).getState();
    const b = createTickerTapeSim({
      tapeKind: 'ua',
      countEvery: 1
    }).getState();
    expect(b.timingDots.map((d) => d.xCm)).toEqual(
      a.timingDots.map((d) => d.xCm)
    );
    expect(b.countingTickIndices).toEqual(a.countingTickIndices);
    expect(b.trueXCm).toEqual(a.trueXCm);
    expect(b.tMax).toBeCloseTo(a.tMax, 12);
    expect(b.T).toBeCloseTo(0.1, 12);
    expect(a.countEvery).toBe(5);
    expect(b.countEvery).toBe(1);
  });

  it('setOriginTickIndex keeps x0 = 0 and clears the student table', () => {
    const sim = createTickerTapeSim({ tapeKind: 'ua', noise: 'off' });
    sim.setMeasuredX(1, 3);
    sim.setOriginTickIndex(6);
    const s = sim.getState();
    expect(s.originTickIndex).toBe(6);
    expect(s.countingTickIndices[0]).toBe(6);
    expect(s.trueXCm[0]).toBe(0);
    expect(s.measuredXCm.every((x) => x === null)).toBe(true);
  });

  it('typical tape noise moves a counting point off the kinematic x', () => {
    const sim = createTickerTapeSim({ tapeKind: 'ua', noise: 'typical' });
    const s = sim.getState();
    const moved = s.tapeXCm.some((x, i) => x !== s.trueXCm[i]);
    expect(moved).toBe(true);
  });

  it('ud remains stopped after t = 1 s', () => {
    expect(xCmAt('ud', 1.4)).toBeCloseTo(xCmAt('ud', 1), 10);
  });

  it('origin can travel well past the dense start', () => {
    expect(maxOriginTickIndex()).toBeGreaterThan(
      DENSE_TICKS_BEFORE_ORIGIN + 20
    );
  });

  it('origin index is clamped to the tape', () => {
    const sim = createTickerTapeSim({ tapeKind: 'ua' });
    sim.setOriginTickIndex(-4);
    expect(sim.getState().originTickIndex).toBe(0);
    sim.setOriginTickIndex(400);
    expect(sim.getState().originTickIndex).toBe(maxOriginTickIndex());
  });

  it('reset restores the default origin after a drag', () => {
    const sim = createTickerTapeSim({ tapeKind: 'ua' });
    sim.setOriginTickIndex(0);
    sim.reset();
    expect(sim.getState().originTickIndex).toBe(DENSE_TICKS_BEFORE_ORIGIN);
  });
});
