import { describe, expect, it } from 'vitest';
import {
  calculateWedge,
  createWedgeFilmInterferenceSim,
  thicknessAt
} from '../../src/scenes/wedge-film-interference/scene.sim';
describe('wedge-film-interference simulation', () => {
  it('computes linear and nonlinear thickness', () => {
    expect(thicknessAt(0, 800, 0.5, 'linear')).toBeCloseTo(400);
    expect(thicknessAt(0, 800, 0.5, 'quad')).toBeCloseTo(200);
  });
  it('connects thickness to optical path and brightness', () => {
    const s = calculateWedge({
      lambda: 550,
      dTop: 0,
      dBottom: 800,
      n: 1.5,
      profile: 'linear',
      cursorY: 0.25
    });
    expect(s.localThickness).toBeCloseTo(200);
    expect(s.pathDiff).toBeCloseTo(875);
    expect(s.reflectivity).toBeGreaterThanOrEqual(0);
  });
  it('updates and resets parameters', () => {
    const sim = createWedgeFilmInterferenceSim({ lambda: 500 });
    sim.setParams({ cursorY: 0.8 });
    expect(sim.getState().cursorY).toBeCloseTo(0.8);
    sim.reset();
    expect(sim.getParams().lambda).toBe(500);
  });
});
