import { describe, expect, it } from 'vitest';
import {
  createFieldLinesSim,
  linesForCharge,
  seedLineCount,
  LINES_PER_UNIT_CHARGE,
  PROBE_N_DEFAULT
} from '../../src/scenes/field-lines/scene.sim';

describe('field-lines sim', () => {
  describe('linesForCharge (Gauss: line count ∝ |Q|)', () => {
    it('gives 8 lines for unit charge — teaching convention, not copied from a slider', () => {
      // 约定：单位电荷 8 条线。n 不进入这个函数。
      expect(LINES_PER_UNIT_CHARGE).toBe(8);
      expect(linesForCharge(1)).toBe(8);
      expect(linesForCharge(-1)).toBe(8);
    });

    it('doubles the line count when |Q| doubles', () => {
      expect(linesForCharge(2)).toBe(16);
      expect(linesForCharge(-2)).toBe(16);
    });

    it('is zero for Q = 0', () => {
      expect(linesForCharge(0)).toBe(0);
    });
  });

  describe('seedLineCount', () => {
    it('counts only positive charges when any positive exists (dipole is not double-seeded)', () => {
      expect(seedLineCount([{ q: 1 }, { q: -1 }])).toBe(8);
    });

    it('sums positives for like charges', () => {
      expect(seedLineCount([{ q: 1 }, { q: 1 }])).toBe(16);
    });

    it('falls back to negatives when there is no positive', () => {
      expect(seedLineCount([{ q: -1 }])).toBe(8);
    });
  });

  describe('n vs line count', () => {
    it('changing n does not change charges or seed line count', () => {
      const sim = createFieldLinesSim({ scene: 'single', n: 3 });
      const before = sim.getSnapshot();
      const linesBefore = seedLineCount(before.charges);
      sim.setN(30);
      const after = sim.getSnapshot();
      expect(after.params.n).toBe(30);
      expect(after.charges).toHaveLength(before.charges.length);
      expect(after.charges[0].q).toBe(before.charges[0].q);
      expect(seedLineCount(after.charges)).toBe(linesBefore);
    });

    it('clamps n to [1, 40]', () => {
      const sim = createFieldLinesSim({ n: 3 });
      expect(sim.setN(0).n).toBe(1);
      expect(sim.setN(99).n).toBe(40);
    });

    it('defaults n to 3 (sparse probes, not a finished field-line drawing)', () => {
      const sim = createFieldLinesSim({ scene: 'single' });
      expect(sim.getParams().n).toBe(PROBE_N_DEFAULT);
      expect(PROBE_N_DEFAULT).toBe(3);
    });
  });

  it('switches to custom scene and applies custom charge values', () => {
    const sim = createFieldLinesSim({
      scene: 'single',
      n: 3,
      q1: 1,
      q2: -1
    });
    sim.setScene('custom');
    sim.setCustomCharges(2.5, -3);
    const snapshot = sim.getSnapshot();
    expect(snapshot.params.scene).toBe('custom');
    expect(snapshot.charges).toHaveLength(2);
    expect(snapshot.charges[0].q).toBe(2.5);
    expect(snapshot.charges[1].q).toBe(-3);
  });
});
