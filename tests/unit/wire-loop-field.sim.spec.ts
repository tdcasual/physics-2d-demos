import { describe, expect, it } from 'vitest';
import {
  areaCoverage,
  createWireLoopFieldSim,
  shapeGeometry,
  wireLoopFieldAt,
  wireLoopFieldConstants as C,
  type WireLoopFieldParams
} from '../../src/scenes/wire-loop-field/scene.sim';

const params: WireLoopFieldParams = {
  shape: 'rectangle',
  fieldStrength: 1,
  fieldDirection: 'into',
  velocity: 2,
  resistance: 2,
  autoRun: true,
  showCurrent: true
};

describe('wire loop field simulation', () => {
  it('computes full and partial magnetic area for a rectangle', () => {
    expect(areaCoverage('rectangle', 2)).toBeCloseTo(1, 6);
    expect(
      areaCoverage('rectangle', C.fieldPhysicalLeft - 0.5)
    ).toBeGreaterThan(0);
    expect(areaCoverage('rectangle', C.fieldPhysicalLeft - 0.5)).toBeLessThan(
      1
    );
    expect(areaCoverage('rectangle', C.fieldPhysicalRight + 0.2)).toBeCloseTo(
      0,
      6
    );
  });

  it('shows flux at full overlap and emf only while cutting a boundary', () => {
    const entering = wireLoopFieldAt(params, C.fieldPhysicalLeft - 0.6);
    const full = wireLoopFieldAt(params, C.fieldPhysicalLeft + 0.1);
    expect(entering.region).toBe('entering');
    expect(entering.flux).toBeGreaterThan(0);
    expect(entering.emf).toBeGreaterThan(0);
    expect(full.region).toBe('inside');
    expect(shapeGeometry(full.shape).area).toBeGreaterThan(0);
    expect(full.flux).toBeCloseTo(shapeGeometry(full.shape).area, 4);
    expect(full.emf).toBeCloseTo(0, 5);
  });

  it('changes induced-current direction with field direction', () => {
    const into = wireLoopFieldAt(params, C.fieldPhysicalLeft - 0.6);
    const out = wireLoopFieldAt(
      { ...params, fieldDirection: 'out' },
      C.fieldPhysicalLeft - 0.6
    );
    expect(into.current).toBeCloseTo(-out.current, 8);
    expect(into.currentDirection).not.toBe(out.currentDirection);
  });

  it('advances and resets the moving loop', () => {
    const sim = createWireLoopFieldSim({ ...params });
    const initial = sim.getState().position;
    sim.step(0.5);
    expect(sim.getState().position).toBeGreaterThan(initial);
    sim.reset();
    expect(sim.getState().position).toBeCloseTo(C.startPosition, 8);
    expect(sim.getState().shape).toBe('rectangle');
  });
});
