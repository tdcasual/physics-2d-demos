import { describe, expect, it } from 'vitest';
import {
  formatReadoutNumber,
  formatReadoutValue,
  normalizeReadoutItem,
  stripNegativeZero
} from '../../src/platform/readout';

describe('platform/readout', () => {
  it('formats fixed digits and kills negative zero', () => {
    expect(formatReadoutNumber(1.234)).toBe('1.23');
    expect(formatReadoutNumber(-0.001, { digits: 2 })).toBe('0.00');
    expect(formatReadoutNumber(-0.04, { digits: 1 })).toBe('0.0');
    expect(formatReadoutNumber(-0.06, { digits: 1 })).toBe('-0.1');
  });

  it('formats significant figures across magnitudes and carries', () => {
    expect(formatReadoutNumber(0.012345, { sigFigs: 3 })).toBe('0.0123');
    expect(formatReadoutNumber(123.45, { sigFigs: 3 })).toBe('123');
    expect(formatReadoutNumber(9.996, { sigFigs: 3 })).toBe('10.0');
    expect(formatReadoutNumber(0, { sigFigs: 3 })).toBe('0.00');
    expect(formatReadoutNumber(1234, { sigFigs: 3 })).toBe('1230');
    expect(formatReadoutNumber(-1234, { sigFigs: 3 })).toBe('-1230');
    expect(formatReadoutNumber(9999, { sigFigs: 3 })).toBe('10000');
  });

  it('keeps sigFigs extremes finite and falls back on illegal precision', () => {
    expect(() => formatReadoutNumber(1e-110, { sigFigs: 3 })).not.toThrow();
    expect(formatReadoutNumber(1e-110, { sigFigs: 3 })).toMatch(/e-/i);
    expect(formatReadoutNumber(Number.MAX_VALUE, { sigFigs: 3 })).toBe('—');
    expect(formatReadoutNumber(1.234, { sigFigs: 0 })).toBe('1.23');
    expect(formatReadoutNumber(1.234, { sigFigs: 102 })).toBe('1.23');
  });

  it('handles signed values and non-finite input', () => {
    expect(formatReadoutNumber(0.5, { digits: 1, signed: true })).toBe('+0.5');
    expect(formatReadoutNumber(0.01, { digits: 1, signed: true })).toBe('0.0');
    expect(formatReadoutNumber(Number.NaN)).toBe('—');
    expect(formatReadoutNumber(Infinity)).toBe('—');
  });

  it('strips negative zero from pre-formatted strings only', () => {
    expect(stripNegativeZero('-0.00 m')).toBe('0.00 m');
    expect(stripNegativeZero('x = −0.0 mm')).toBe('x = 0.0 mm');
    expect(stripNegativeZero('-0.001 m')).toBe('-0.001 m');
    expect(stripNegativeZero('-0.5 / -0')).toBe('-0.5 / 0');
    expect(stripNegativeZero('10-0')).toBe('10-0');
  });

  it('joins units and normalizes items for downstream consumers', () => {
    expect(formatReadoutValue({ label: 'v', value: 2, unit: 'm/s' })).toBe(
      '2.00 m/s'
    );
    expect(
      normalizeReadoutItem({
        key: 'v',
        label: 'v',
        value: -0.0001,
        digits: 3,
        unit: 'm',
        layout: 'half'
      })
    ).toEqual({ key: 'v', label: 'v', value: '0.000 m', layout: 'half' });
  });
});
