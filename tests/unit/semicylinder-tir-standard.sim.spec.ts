import { describe, expect, it } from 'vitest';
import {
  createSemicylinderStandardSim,
  deriveSemicylinderStandard,
  semicylinderStandardConstants as C
} from '../../src/scenes/semicylinder-tir-standard/scene.sim';

describe('semicylinder-tir-standard simulation', () => {
  it('computes Snell refraction and critical angle', () => {
    const state = deriveSemicylinderStandard({
      refractiveIndex: 1.5,
      incidentAngle: 27,
      showNormal: true,
      autoRun: false
    });
    expect(state.criticalAngle).toBeCloseTo(41.81, 1);
    expect(state.refractedAngle).toBeCloseTo(42.91, 1);
    expect(state.status).toBe('折射透出');
  });
  it('marks the critical boundary and total internal reflection', () => {
    const critical = deriveSemicylinderStandard({
      refractiveIndex: 1.5,
      incidentAngle: 41.81,
      showNormal: true,
      autoRun: false
    });
    const tir = deriveSemicylinderStandard({
      refractiveIndex: 1.5,
      incidentAngle: 50,
      showNormal: true,
      autoRun: false
    });
    expect(critical.status).toBe('临界角');
    expect(critical.refractedAngle).toBe(90);
    expect(tir.status).toBe('全反射');
    expect(tir.refractedAngle).toBeNull();
    expect(tir.reflectedAngle).toBe(50);
  });
  it('normalizes controls and resets animation', () => {
    const sim = createSemicylinderStandardSim({
      refractiveIndex: 9,
      incidentAngle: -5,
      autoRun: true
    });
    expect(sim.getParams().refractiveIndex).toBe(C.indexMax);
    expect(sim.getParams().incidentAngle).toBe(C.angleMin);
    sim.step(0.5);
    expect(sim.getState().time).toBeGreaterThan(0);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      refractiveIndex: C.defaultIndex,
      incidentAngle: C.defaultAngle,
      autoRun: true
    });
  });
});
