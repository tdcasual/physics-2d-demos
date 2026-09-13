import { describe, expect, it } from 'vitest';
import {
  createVerticalCircleSim,
  verticalCircleConstraintForce,
  verticalCircleCriticalBottomSpeed,
  verticalCircleSpeedAtAngle,
  verticalCircleTopSpeed
} from '../../src/scenes/vertical-circle/scene.sim';

describe('vertical-circle sim', () => {
  it('matches the energy relation between bottom and top', () => {
    expect(verticalCircleTopSpeed(23.5)).toBeCloseTo(12.34, 2);
    expect(verticalCircleSpeedAtAngle(23.5, 180)).toBeCloseTo(23.5, 8);
    expect(verticalCircleSpeedAtAngle(23.5, 0)).toBeCloseTo(12.34, 2);
  });

  it('computes the default rope tension shown in the reference cover', () => {
    expect(verticalCircleConstraintForce(23.5, -51)).toBeCloseTo(16.35, 2);
    expect(verticalCircleCriticalBottomSpeed('rope')).toBeCloseTo(22.36, 2);
  });

  it('distinguishes rope failure from rod compression', () => {
    const rope = createVerticalCircleSim({
      model: 'rope',
      vBottom: 20,
      theta: 0,
      autoRun: false
    });
    expect(rope.getState().status).toBe('最高点脱轨');
    const rod = createVerticalCircleSim({
      model: 'rod',
      vBottom: 20,
      theta: 0,
      autoRun: false
    });
    expect(rod.getState().status).toBe('杆受压');
  });

  it('clamps controls and supports dragging the ball', () => {
    const sim = createVerticalCircleSim({ autoRun: false });
    sim.setParams({ vBottom: 99, theta: 999 });
    expect(sim.getParams()).toMatchObject({ vBottom: 35, theta: -81 });
    sim.setParams({ theta: 0 });
    expect(sim.pickHandle(320 / 900, 80 / 660)).toBe('ball');
    sim.moveHandle('ball', 320 / 900, 580 / 660);
    expect(sim.getParams().theta).toBeCloseTo(180, 8);
  });
});
