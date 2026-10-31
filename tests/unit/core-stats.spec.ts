import { describe, expect, it } from 'vitest';
import {
  linearFit,
  linearFitDroppingOutliers,
  linearFitThroughOrigin,
  mean,
  quadraticFit,
  quadraticFitNoConstant,
  standardError,
  stdDev
} from '../../src/core/stats';

describe('core/stats', () => {
  it('linearFit recovers y = 0.4 + 2x', () => {
    const pts = [0, 0.1, 0.2, 0.3].map((x) => ({ x, y: 0.4 + 2 * x }));
    const fit = linearFit(pts);
    expect(fit).not.toBeNull();
    expect(fit?.slope).toBeCloseTo(2, 10);
    expect(fit?.intercept).toBeCloseTo(0.4, 10);
    expect(fit?.r2).toBeCloseTo(1, 10);
    expect(fit?.n).toBe(4);
  });

  it('linearFit returns null for one point or vertical x', () => {
    expect(linearFit([{ x: 1, y: 1 }])).toBeNull();
    expect(
      linearFit([
        { x: 2, y: 1 },
        { x: 2, y: 3 }
      ])
    ).toBeNull();
  });

  it('linearFitThroughOrigin recovers y = 3x', () => {
    const pts = [1, 2, 3].map((x) => ({ x, y: 3 * x }));
    const fit = linearFitThroughOrigin(pts);
    expect(fit?.slope).toBeCloseTo(3, 10);
    expect(fit?.r2).toBeCloseTo(1, 10);
  });

  it('quadraticFit recovers y = t²', () => {
    const pts = [0, 0.2, 0.4, 0.6].map((x) => ({ x, y: x * x }));
    const q = quadraticFit(pts);
    expect(q).not.toBeNull();
    expect(q?.a).toBeCloseTo(1, 8);
    expect(q?.b).toBeCloseTo(0, 8);
    expect(q?.c).toBeCloseTo(0, 8);
  });

  it('quadraticFitNoConstant matches projectile through-origin curve', () => {
    const pts = [1, 2, 3, 4].map((x) => ({ x, y: 0.5 * x + 0.1 * x * x }));
    const q = quadraticFitNoConstant(pts);
    expect(q?.a).toBeCloseTo(0.5, 8);
    expect(q?.b).toBeCloseTo(0.1, 8);
  });

  it('drops the loud v–t outlier so slope stays near truth', () => {
    const pts = [0.1, 0.2, 0.3, 0.4, 0.5].map((x) => ({
      x,
      y: 0.2 + 2 * x
    }));
    pts[2] = { x: 0.3, y: 0.2 + 2 * 0.3 + 0.4 };
    const { fit, outlierIndices } = linearFitDroppingOutliers(pts);
    expect(outlierIndices.length).toBeGreaterThan(0);
    expect(fit).not.toBeNull();
    expect(fit!.slope).toBeCloseTo(2, 1);
  });

  it('mean / stdDev / standardError skip non-finite and need enough points', () => {
    expect(mean([])).toBeNull();
    expect(mean([1, 3, Number.NaN])).toBe(2);
    expect(stdDev([1])).toBeNull();
    expect(stdDev([2, 4])).toBeCloseTo(Math.sqrt(2), 10);
    expect(standardError([2, 4])).toBeCloseTo(1, 10);
  });
});
