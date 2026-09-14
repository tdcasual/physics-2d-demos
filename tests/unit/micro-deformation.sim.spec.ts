import { describe, expect, it } from 'vitest';
import {
  calculateMicroDeformation,
  createMicroDeformationSim,
  MATERIAL_STIFFNESS
} from '../../src/scenes/micro-deformation/scene.sim';

describe('micro-deformation simulation', () => {
  it('computes Hooke deformation and optical-lever magnification', () => {
    const result = calculateMicroDeformation({
      material: 'wood',
      loadKg: 10,
      mirrorGap: 0.1,
      screenDistance: 4.5,
      deformationMode: 'physical'
    });
    expect(result.forceN).toBeCloseTo(98, 8);
    expect(result.deflectionMicron).toBeCloseTo(19.6, 6);
    expect(result.magnification).toBeCloseTo(270, 8);
    expect(result.screenShiftMm).toBeCloseTo(5.292, 5);
  });

  it('stiffer materials deform less under the same load', () => {
    const wood = calculateMicroDeformation({
      material: 'wood',
      loadKg: 20,
      mirrorGap: 0.1,
      screenDistance: 4.5,
      deformationMode: 'physical'
    });
    const marble = calculateMicroDeformation({
      material: 'marble',
      loadKg: 20,
      mirrorGap: 0.1,
      screenDistance: 4.5,
      deformationMode: 'physical'
    });
    const steel = calculateMicroDeformation({
      material: 'steel',
      loadKg: 20,
      mirrorGap: 0.1,
      screenDistance: 4.5,
      deformationMode: 'physical'
    });
    expect(MATERIAL_STIFFNESS.wood).toBeLessThan(MATERIAL_STIFFNESS.marble);
    expect(MATERIAL_STIFFNESS.marble).toBeLessThan(MATERIAL_STIFFNESS.steel);
    expect(wood.deflectionMicron).toBeGreaterThan(marble.deflectionMicron);
    expect(marble.deflectionMicron).toBeGreaterThan(steel.deflectionMicron);
  });

  it('concept mode exposes deformation while physical mode stays near scale', () => {
    const physical = createMicroDeformationSim({
      material: 'wood',
      loadKg: 10,
      deformationMode: 'physical'
    });
    const concept = createMicroDeformationSim({
      material: 'wood',
      loadKg: 10,
      deformationMode: 'concept'
    });
    expect(concept.getState().visibleDeflectionPx).toBeGreaterThan(
      physical.getState().visibleDeflectionPx
    );
    expect(concept.getState().screenShiftMm).toBeCloseTo(
      physical.getState().screenShiftMm,
      8
    );
  });

  it('autoRun advances the pulse but reset restores the selected defaults', () => {
    const sim = createMicroDeformationSim({ loadKg: 20, autoRun: true });
    const before = sim.getState();
    sim.step(0.5);
    expect(sim.getState().time).toBeCloseTo(0.5, 8);
    expect(sim.getState().pulse).not.toBeCloseTo(before.pulse, 4);
    sim.setParams({ loadKg: 50 });
    sim.reset();
    expect(sim.getParams().loadKg).toBe(20);
    expect(sim.getState().time).toBe(0);
  });
});
