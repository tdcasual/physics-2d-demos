import { describe, expect, it } from 'vitest';
import { createClothesRodSim } from '../../src/scenes/clothes-rod/scene.sim';
describe('clothes-rod simulation', () => {
  it('smooth knot has equal tension', () => {
    const s = createClothesRodSim().getState();
    expect(s.tensionLeft).toBeCloseTo(s.tensionRight, 6);
  });
  it('fixed knot can split tension', () => {
    const s = createClothesRodSim({ model: 'fixed', height: 1 }).getState();
    expect(s.tensionLeft).not.toBeCloseTo(s.tensionRight, 4);
  });
});
