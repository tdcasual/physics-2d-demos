import { describe, expect, it } from 'vitest';
import {
  PARALLELOGRAM_ANGLE_ERROR_DEG,
  PARALLELOGRAM_MAGNITUDE_REL_ERROR,
  addVectors,
  componentVectors,
  createParallelogramSim,
  diagramFitScale,
  includedAngleDeg,
  measuredResultant,
  parallelogramConstants as C,
  parallelogramDiagonal,
  resultantMagnitude,
  resultantVector,
  splitAngles,
  stageTransform,
  vectorMagnitude
} from '../../src/scenes/parallelogram-rule/scene.sim';

const DEG = Math.PI / 180;

describe('parallelogram rule simulation', () => {
  it('calculates the vector magnitude from the included angle', () => {
    expect(resultantMagnitude(1.8, 1.8, 90)).toBeCloseTo(1.8 * Math.sqrt(2), 8);
    const result = resultantVector(1.8, 1.8, 90);
    expect(Math.hypot(result.x, result.y)).toBeCloseTo(1.8 * Math.sqrt(2), 8);
  });

  it('places F1 and F2 at the given included angle and matches the cosine law', () => {
    const f1 = 2.4;
    const f2 = 1.6;
    const angle = 70;
    const parts = componentVectors(f1, f2, angle);
    expect(includedAngleDeg(parts.f1, parts.f2)).toBeCloseTo(angle, 8);
    const diagonal = parallelogramDiagonal(parts.f1, parts.f2);
    const resultant = resultantVector(f1, f2, angle);
    expect(diagonal.x).toBeCloseTo(resultant.x, 10);
    expect(diagonal.y).toBeCloseTo(resultant.y, 10);
    expect(vectorMagnitude(resultant)).toBeCloseTo(
      resultantMagnitude(f1, f2, angle),
      10
    );
    expect(vectorMagnitude(resultant)).toBeCloseTo(
      Math.sqrt(f1 * f1 + f2 * f2 + 2 * f1 * f2 * Math.cos(angle * DEG)),
      10
    );
  });

  it('keeps the parallelogram diagonal on the vertical axis for unequal forces', () => {
    const parts = componentVectors(3, 1.2, 80);
    const diagonal = addVectors(parts.f1, parts.f2);
    expect(diagonal.x).toBeCloseTo(0, 8);
    expect(diagonal.y).toBeGreaterThan(0);
    const { a1, a2 } = splitAngles(3, 1.2, 80);
    expect((a1 + a2) / DEG).toBeCloseTo(80, 8);
    expect(3 * Math.sin(a1)).toBeCloseTo(1.2 * Math.sin(a2), 8);
  });

  it('makes F′ share the origin and nearly the direction of the theoretical resultant', () => {
    const sim = createParallelogramSim({
      f1: 1.82,
      f2: 1.82,
      angle: 90,
      stage: 'compare'
    });
    const state = sim.getState();
    expect(state.samePoint).toBe(true);
    expect(state.sameDirection).toBe(true);
    expect(state.measured).toEqual(measuredResultant(state.resultant));
    expect(state.measuredMagnitude).toBeCloseTo(
      state.theoreticalMagnitude * (1 + PARALLELOGRAM_MAGNITUDE_REL_ERROR),
      8
    );
    expect(state.magnitudeError).toBeCloseTo(
      PARALLELOGRAM_MAGNITUDE_REL_ERROR * 100,
      8
    );
    expect(state.angleError).toBeCloseTo(PARALLELOGRAM_ANGLE_ERROR_DEG, 8);
    expect(includedAngleDeg(state.resultant, state.measured)).toBeCloseTo(
      PARALLELOGRAM_ANGLE_ERROR_DEG,
      8
    );
  });

  it('only claims same-point substitution in the compare stage', () => {
    const sim = createParallelogramSim({ stage: 'construct' });
    expect(sim.getState().samePoint).toBe(false);
    expect(sim.getState().sameDirection).toBe(false);
    sim.setParams({ stage: 'compare' });
    expect(sim.getState().samePoint).toBe(true);
    sim.setParams({ stage: 'components' });
    expect(sim.getParams().stage).toBe('components');
    expect(sim.getState().samePoint).toBe(false);
  });

  it('switches stages, ignores unknown values, and restores them on reset', () => {
    const sim = createParallelogramSim({ stage: 'components' });
    expect(sim.setParams({ stage: 'construct' }).stage).toBe('construct');
    expect(sim.setParams({ stage: 'compare' }).stage).toBe('compare');
    expect(
      sim.setParams({ stage: 'nope' as unknown as 'components' }).stage
    ).toBe('components');
    sim.setParams({ stage: 'compare', f1: 3 });
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      f1: 1.82,
      f2: 1.82,
      angle: 90,
      stage: 'components'
    });
    expect(sim.getState().time).toBe(0);
  });

  it('clamps unsafe parameters', () => {
    const sim = createParallelogramSim({ f1: 99, f2: -1, angle: 999 });
    expect(sim.getParams()).toMatchObject({ f1: 4, f2: 0.5, angle: 160 });
    sim.setParams({ f1: 0, angle: 1 });
    expect(sim.getParams().f1).toBe(0.5);
    expect(sim.getParams().angle).toBe(20);
  });

  it('advances time on step and ignores non-positive deltas', () => {
    const sim = createParallelogramSim();
    sim.step(0.4);
    expect(sim.getState().time).toBeCloseTo(0.4, 10);
    sim.step(-2);
    expect(sim.getState().time).toBeCloseTo(0.4, 10);
    sim.step(Number.NaN);
    expect(sim.getState().time).toBeCloseTo(0.4, 10);
    sim.reset();
    expect(sim.getState().time).toBe(0);
  });

  it('keeps the paper clear of a floating readout on desktop', () => {
    const layout = stageTransform(862, 651, {
      floatingReadout: true,
      overlayPx: 218,
      overlayTopPx: 61,
      overlayHeightPx: 225
    });
    expect(layout.floatingReadout).toBe(true);
    expect(layout.offsetX + C.baseWidth * layout.fit).toBeLessThanOrEqual(
      862 - 218 - 16 + 1e-6
    );
    expect(layout.offsetY + C.baseHeight * layout.fit).toBeLessThanOrEqual(
      651 + 1e-6
    );
  });

  it('fills the animation area on a stacked mobile viewport', () => {
    const layout = stageTransform(390, 520, { floatingReadout: false });
    expect(layout.floatingReadout).toBe(false);
    expect(layout.fit).toBeCloseTo(
      Math.min(390 / C.baseWidth, 520 / C.baseHeight),
      8
    );
    expect(layout.offsetX).toBeCloseTo((390 - C.baseWidth * layout.fit) / 2, 8);
  });

  it('scales oversized forces so tips stay on the paper', () => {
    const sim = createParallelogramSim({ f1: 4, f2: 4, angle: 20 });
    const state = sim.getState();
    const fit = diagramFitScale(state);
    const tipY = C.origin.y + state.resultant.y * C.vectorScale * fit;
    expect(tipY).toBeLessThanOrEqual(
      C.baseHeight - C.paperInset - C.handlePad + 1e-6
    );
    expect(fit).toBeLessThan(1);
  });
});
