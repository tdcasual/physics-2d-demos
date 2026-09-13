import { describe, expect, it } from 'vitest';
import {
  createMagneticConvergenceSim,
  magneticConvergenceConstants
} from '../../src/scenes/magnetic-convergence/scene.sim';

describe('magnetic-convergence simulation', () => {
  it('builds a converging beam set with r/R = 1', () => {
    const sim = createMagneticConvergenceSim({
      radiusRatio: 1,
      particleCount: 7
    });
    const state = sim.getState();
    expect(state.paths).toHaveLength(7);
    expect(state.status).toBe('理想会聚');
    expect(state.focusErrorPx).toBeLessThan(8);
  });

  it('reverses the same trajectories in divergence mode', () => {
    const sim = createMagneticConvergenceSim({
      mode: 'diverge',
      radiusRatio: 1
    });
    const state = sim.getState();
    expect(state.status).toBe('平行射出');
    expect(
      state.paths.every((path) => path.points[0].y === state.focusPoint.y)
    ).toBe(true);
  });

  it('supports emit, clear, and animated phase', () => {
    const sim = createMagneticConvergenceSim({ autoRun: true });
    sim.clear();
    expect(sim.getState().trailsVisible).toBe(false);
    sim.emit();
    expect(sim.getState().trailsVisible).toBe(true);
    const phase = sim.getState().phase;
    sim.step(0.5);
    expect(sim.getState().phase).not.toBe(phase);
    expect(magneticConvergenceConstants.fieldRadius).toBeGreaterThan(200);
  });
});
