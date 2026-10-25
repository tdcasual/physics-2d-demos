import { describe, expect, it } from 'vitest';
import {
  gradeNumber,
  gradeValue,
  matchesExpected,
  rangeOf,
  type GradeRule
} from '../../src/platform/data-workspace';

const coordinate: GradeRule = {
  unit: 'cm',
  format: { decimalPlaces: 2, formatMessage: 'x 须为 2 位小数' },
  expected: 12.34,
  tolerance: { kind: 'ticks', tolerance: 0.03, ticksPerUnit: 100 },
  unitRatios: [10, 100],
  rangeMessage: '与读数不符'
};

describe('data-workspace grading', () => {
  it('runs format → parse → match in that order', () => {
    expect(gradeNumber('12.3', coordinate).feedback).toMatchObject({
      ok: false,
      layer: 'format',
      message: 'x 须为 2 位小数'
    });
    expect(gradeNumber('12.36', coordinate)).toMatchObject({
      value: 12.36,
      feedback: { ok: true, message: '校对通过' }
    });
    expect(gradeNumber('12.40', coordinate).feedback).toMatchObject({
      ok: false,
      layer: 'range',
      message: '与读数不符'
    });
  });

  it('diagnoses unit-ratio slips unless the expectation is near zero', () => {
    expect(gradeNumber('123.40', coordinate).feedback).toMatchObject({
      layer: 'unit',
      message: '数值与答案相差 10 倍，请确认单位是 cm'
    });
    expect(
      gradeValue(0.2, { ...coordinate, expected: 0.02, rangeMessage: 'r' })
    ).toMatchObject({ layer: 'range' });
    expect(
      gradeValue(0.2, {
        ...coordinate,
        expected: 0.02,
        slipNearZeroGuard: false,
        tolerance: { kind: 'epsilon', value: 0.001 },
        rangeMessage: 'r'
      })
    ).toMatchObject({ layer: 'unit' });
  });

  it('reports unavailable expectations as relation and sign flips as range', () => {
    expect(gradeValue(1, { ...coordinate, expected: null })).toMatchObject({
      layer: 'relation'
    });
    expect(
      gradeValue(-5, {
        unit: 'cm',
        expected: { min: 4.9, max: 5.1 },
        tolerance: { kind: 'epsilon', value: 0.05 },
        signFlipMessage: '正负号不对',
        rangeMessage: 'r'
      })
    ).toMatchObject({ layer: 'range', message: '正负号不对' });
  });

  it('matches ranges with slack at both ends', () => {
    const range = rangeOf([1, Number.NaN, 2])!;
    expect(range).toEqual({ min: 1, max: 2 });
    const slack = { kind: 'epsilon', value: 0.1 } as const;
    expect(matchesExpected(1.5, range, slack)).toBe(true);
    expect(matchesExpected(2.05, range, slack)).toBe(true);
    expect(matchesExpected(2.2, range, slack)).toBe(false);
    expect(rangeOf([Number.NaN])).toBeNull();
  });
});
