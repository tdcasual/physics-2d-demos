import { describe, expect, it } from 'vitest';
import {
  asBoolean,
  asBooleanOr,
  finiteNumber,
  finiteOr
} from '../../src/core/coerce';
import { betterPose, containInRect } from '../../src/scenes/stage-fit';

describe('core/coerce', () => {
  it('finiteOr keeps finite numbers only', () => {
    expect(finiteOr(2.5, 1)).toBe(2.5);
    for (const bad of [NaN, Infinity, -Infinity, '3', null, undefined]) {
      expect(finiteOr(bad, 1)).toBe(1);
    }
  });

  it('finiteNumber additionally parses numeric strings', () => {
    expect(finiteNumber('3.5', 1)).toBe(3.5);
    expect(finiteNumber('  ', 1)).toBe(1);
    expect(finiteNumber('abc', 1)).toBe(1);
    expect(finiteNumber(Infinity, 1)).toBe(1);
  });

  it('asBoolean accepts true / 1 / "1" / "TRUE"', () => {
    for (const yes of [true, 1, '1', 'TRUE']) expect(asBoolean(yes)).toBe(true);
    for (const no of [false, 0, '0', 'yes', null]) {
      expect(asBoolean(no)).toBe(false);
    }
  });

  it('asBooleanOr is tri-state with fallback', () => {
    expect(asBooleanOr(' Off ', true)).toBe(false);
    expect(asBooleanOr('yes', false)).toBe(true);
    expect(asBooleanOr(2, false)).toBe(true);
    expect(asBooleanOr('maybe', true)).toBe(true);
    expect(asBooleanOr(undefined, false)).toBe(false);
  });
});

describe('scenes/stage-fit', () => {
  it('containInRect fits and centers', () => {
    const pose = containInRect(200, 100, 400, 400, 10, 0, 'center');
    expect(pose.fit).toBe(2);
    expect(pose.offsetX).toBe(10);
    expect(pose.offsetY).toBe(100);
    expect(containInRect(200, 100, 400, 100, 0, 0, 'left').offsetX).toBe(0);
  });

  it('betterPose prefers the larger fit, ties keep the first', () => {
    const a = { fit: 1, offsetX: 0, offsetY: 0 };
    const b = { fit: 1, offsetX: 5, offsetY: 5 };
    expect(betterPose(a, b)).toBe(a);
    expect(betterPose(a, { ...b, fit: 1.5 }).fit).toBe(1.5);
  });
});
