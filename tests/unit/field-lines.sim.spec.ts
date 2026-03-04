import { describe, expect, it } from 'vitest';
import { createFieldLinesSim } from '../../src/scenes/field-lines/scene.sim';

describe('field-lines sim', () => {
  it('switches to custom scene and applies custom charge values', () => {
    const sim = createFieldLinesSim({ scene: 'single', density: 10, q1: 1, q2: -1 });
    sim.setScene('custom');
    sim.setCustomCharges(2.5, -3);
    const snapshot = sim.getSnapshot();
    expect(snapshot.params.scene).toBe('custom');
    expect(snapshot.charges).toHaveLength(2);
    expect(snapshot.charges[0].q).toBe(2.5);
    expect(snapshot.charges[1].q).toBe(-3);
  });
});
