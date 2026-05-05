/**
 * 双缝干涉 — 物理模拟单元测试
 */

import { describe, it, expect } from 'vitest';
import { createDoubleSlitSim } from '../../src/scenes/double-slit/scene.sim';

describe('double-slit simulation', () => {
  it('computes correct fringe spacing for red light', () => {
    const sim = createDoubleSlitSim({ lambda: 650, L: 1.0, d: 0.5, step: 'geometry' });
    const state = sim.getState();
    // Δx = λL/d = 650e-9 * 1.0 / 0.5e-3 = 1.3e-3 m = 1.3 mm
    expect(state.deltaX).toBeCloseTo(1.3e-3, 6);
  });

  it('computes correct fringe spacing for green light', () => {
    const sim = createDoubleSlitSim({ lambda: 550, L: 1.0, d: 0.5, step: 'geometry' });
    const state = sim.getState();
    // Δx = 550e-9 * 1.0 / 0.5e-3 = 1.1e-3 m
    expect(state.deltaX).toBeCloseTo(1.1e-3, 6);
  });

  it('scales linearly with L', () => {
    const sim1 = createDoubleSlitSim({ lambda: 650, L: 1.0, d: 0.5, step: 'geometry' });
    const sim2 = createDoubleSlitSim({ lambda: 650, L: 2.0, d: 0.5, step: 'geometry' });
    expect(sim2.getState().deltaX).toBeCloseTo(sim1.getState().deltaX * 2, 6);
  });

  it('scales inversely with d', () => {
    const sim1 = createDoubleSlitSim({ lambda: 650, L: 1.0, d: 0.5, step: 'geometry' });
    const sim2 = createDoubleSlitSim({ lambda: 650, L: 1.0, d: 1.0, step: 'geometry' });
    expect(sim2.getState().deltaX).toBeCloseTo(sim1.getState().deltaX / 2, 6);
  });

  it('generates symmetric fringe positions', () => {
    const sim = createDoubleSlitSim({ lambda: 650, L: 1.0, d: 0.5, step: 'geometry' });
    const { fringePositions } = sim.getState();
    expect(fringePositions.length).toBe(21); // -10 to 10
    expect(fringePositions[10]).toBe(0); // central fringe
    expect(fringePositions[11]).toBeCloseTo(fringePositions[9] * -1, 10);
  });

  it('updates params via setParams', () => {
    const sim = createDoubleSlitSim({ lambda: 650, L: 1.0, d: 0.5, step: 'geometry' });
    sim.setParams({ lambda: 400 });
    const state = sim.getState();
    expect(state.params.lambda).toBe(400);
    expect(state.deltaX).toBeCloseTo(400e-9 * 1.0 / 0.5e-3, 6);
  });

  it('resets to initial values', () => {
    const sim = createDoubleSlitSim({ lambda: 650, L: 1.0, d: 0.5, step: 'geometry' });
    sim.setParams({ lambda: 400, L: 2.0, d: 0.1 });
    sim.reset();
    const state = sim.getState();
    expect(state.params.lambda).toBe(650);
    expect(state.params.L).toBe(1.0);
    expect(state.params.d).toBe(0.5);
  });
});
