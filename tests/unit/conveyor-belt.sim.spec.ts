import { describe, expect, it } from 'vitest';
import { createConveyorSim } from '../../src/scenes/conveyor-belt/scene.sim';

describe('conveyor-belt simulation', () => {
  it('uses the cover defaults and exposes the force decomposition', () => {
    const state = createConveyorSim().getState();
    expect(state.angle).toBe(30);
    expect(state.beltSpeed).toBe(4);
    expect(state.direction).toBe('up');
    expect(state.gravityComponent).toBeCloseTo(5, 6);
    expect(state.normalForce).toBeCloseTo(8.66, 3);
  });

  it('releases from the bottom and approaches belt speed when static friction is sufficient', () => {
    const sim = createConveyorSim({ mu: 0.8 });
    sim.release('bottom');
    for (let i = 0; i < 43; i += 1) sim.step(0.05);
    const state = sim.getState();
    expect(state.blockS).toBeGreaterThan(0);
    expect(state.blockVelocity).toBeCloseTo(4, 1);
    expect(state.regime).toBe('sticking');
    expect(state.status).toContain('相对静止');
  });

  it('keeps sliding when the friction coefficient cannot balance gravity', () => {
    const sim = createConveyorSim({ mu: 0.2 });
    sim.release('bottom');
    for (let i = 0; i < 10; i += 1) sim.step(0.05);
    const state = sim.getState();
    expect(state.regime).toBe('sliding');
    expect(state.acceleration).toBeLessThan(0);
  });

  it('supports reverse belt direction and top release', () => {
    const sim = createConveyorSim({ direction: 'down', beltSpeed: 3 });
    sim.release('top');
    expect(sim.getState().blockS).toBe(8);
    sim.step(0.1);
    expect(sim.getState().beltVelocity).toBe(-3);
    expect(sim.getState().blockS).toBeLessThan(8);
  });

  it('places a block at a clicked normalized position', () => {
    const sim = createConveyorSim();
    sim.placeAt(3.5);
    const state = sim.getState();
    expect(state.blockS).toBe(3.5);
    expect(state.blockVelocity).toBe(0);
    expect(state.placed).toBe(true);
  });
});
